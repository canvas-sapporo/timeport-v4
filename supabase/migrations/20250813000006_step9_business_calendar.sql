BEGIN;

-- 1) カレンダ本体（会社ごと）
CREATE TABLE IF NOT EXISTS public.business_calendars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  name text NOT NULL DEFAULT 'Default',
  timezone text NOT NULL DEFAULT 'Asia/Tokyo',
  non_working_weekdays jsonb NOT NULL DEFAULT '[0,6]'::jsonb,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, name)
);

-- 2) 個別日付の上書き
CREATE TABLE IF NOT EXISTS public.business_calendar_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id uuid NOT NULL REFERENCES public.business_calendars(id) ON DELETE CASCADE,
  the_date date NOT NULL,
  kind text NOT NULL CHECK (kind IN ('holiday','workday_override','blackout')),
  title text,
  note text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(calendar_id, the_date, kind)
);

CREATE INDEX IF NOT EXISTS idx_bcd_calendar_date ON public.business_calendar_dates(calendar_id, the_date);

-- 3) 会社のデフォルトカレンダ関連付け
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS business_calendar_id uuid
  REFERENCES public.business_calendars(id);

-- 4) 会社→デフォルトカレンダ自動作成
DO $$
DECLARE r RECORD;
DECLARE cal_id uuid;
BEGIN
  FOR r IN SELECT c.id AS company_id FROM public.companies c LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.business_calendars bc WHERE bc.company_id = r.company_id
    ) THEN
      INSERT INTO public.business_calendars(company_id, name) VALUES (r.company_id, 'Default') RETURNING id INTO cal_id;
      UPDATE public.companies SET business_calendar_id = cal_id WHERE id = r.company_id;
    ELSIF NOT EXISTS (
      SELECT 1 FROM public.companies c2 WHERE c2.id = r.company_id AND c2.business_calendar_id IS NOT NULL
    ) THEN
      SELECT id INTO cal_id FROM public.business_calendars WHERE company_id = r.company_id ORDER BY created_at LIMIT 1;
      UPDATE public.companies SET business_calendar_id = cal_id WHERE id = r.company_id;
    END IF;
  END LOOP;
END$$;

-- 5) 会社の営業日判定関数
CREATE OR REPLACE FUNCTION public.fn_is_business_day(p_company_id uuid, p_date date)
RETURNS boolean
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_cal_id uuid;
  v_non_working int[];
  v_dow int;
  v_has_blackout boolean;
  v_is_holiday boolean;
  v_has_work_override boolean;
BEGIN
  IF p_company_id IS NULL OR p_date IS NULL THEN
    RETURN false;
  END IF;

  SELECT business_calendar_id INTO v_cal_id FROM public.companies WHERE id = p_company_id;
  IF v_cal_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT ARRAY_AGG((value)::int) INTO v_non_working
  FROM (
    SELECT jsonb_array_elements(non_working_weekdays) AS value
    FROM public.business_calendars WHERE id = v_cal_id
  ) t;

  v_dow := EXTRACT(DOW FROM p_date);

  SELECT EXISTS(
    SELECT 1 FROM public.business_calendar_dates
     WHERE calendar_id = v_cal_id AND the_date = p_date AND kind = 'blackout'
  ) INTO v_has_blackout;

  SELECT EXISTS(
    SELECT 1 FROM public.business_calendar_dates
     WHERE calendar_id = v_cal_id AND the_date = p_date AND kind = 'holiday'
  ) INTO v_is_holiday;

  SELECT EXISTS(
    SELECT 1 FROM public.business_calendar_dates
     WHERE calendar_id = v_cal_id AND the_date = p_date AND kind = 'workday_override'
  ) INTO v_has_work_override;

  IF v_has_blackout THEN
    RETURN false;
  END IF;

  IF (v_dow = ANY (v_non_working) OR v_is_holiday) AND NOT v_has_work_override THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

-- 6) RLS
ALTER TABLE public.business_calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_calendar_dates ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.fn_user_company_id(uid uuid)
RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT company_id FROM public.v_user_companies WHERE user_id = uid LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.fn_is_company_admin(uid uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT COALESCE(up.role IN ('admin','system-admin'), false) FROM public.user_profiles up WHERE up.id = uid LIMIT 1;
$$;

DROP POLICY IF EXISTS p_bc_select ON public.business_calendars;
DROP POLICY IF EXISTS p_bc_cud    ON public.business_calendars;
DROP POLICY IF EXISTS p_bcd_select ON public.business_calendar_dates;
DROP POLICY IF EXISTS p_bcd_cud    ON public.business_calendar_dates;

CREATE POLICY p_bc_select ON public.business_calendars
FOR SELECT USING (company_id = fn_user_company_id(auth.uid()));

CREATE POLICY p_bc_cud ON public.business_calendars
FOR ALL USING (
  company_id = fn_user_company_id(auth.uid()) AND fn_is_company_admin(auth.uid()) = true
) WITH CHECK (
  company_id = fn_user_company_id(auth.uid()) AND fn_is_company_admin(auth.uid()) = true
);

CREATE POLICY p_bcd_select ON public.business_calendar_dates
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.business_calendars bc WHERE bc.id = calendar_id AND bc.company_id = fn_user_company_id(auth.uid()))
);

CREATE POLICY p_bcd_cud ON public.business_calendar_dates
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.business_calendars bc WHERE bc.id = calendar_id AND bc.company_id = fn_user_company_id(auth.uid()) AND fn_is_company_admin(auth.uid()) = true)
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.business_calendars bc WHERE bc.id = calendar_id AND bc.company_id = fn_user_company_id(auth.uid()) AND fn_is_company_admin(auth.uid()) = true)
);

COMMIT;


