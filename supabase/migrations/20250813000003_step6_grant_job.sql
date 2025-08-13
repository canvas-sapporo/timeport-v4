BEGIN;

-- 1) 入社日（雇用日）を user_profiles に追加（無い場合のみ）
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS hire_date date;

CREATE INDEX IF NOT EXISTS idx_user_profiles_hire_date
  ON public.user_profiles(hire_date);

-- 2) leave_policies に settings(jsonb) 追加（無い場合のみ）
ALTER TABLE public.leave_policies
  ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{}'::jsonb;

-- settings の例:
-- { "monthly_day": 1, "fiscal_mmdd": "04-01", "hours_per_day": 8 }

-- 3) 今日付与すべきレコードを計算する関数
CREATE OR REPLACE FUNCTION public.fn_due_leave_grants(
  p_company_id uuid DEFAULT NULL,
  p_today date DEFAULT CURRENT_DATE
) RETURNS TABLE (
  user_id uuid,
  leave_type_id uuid,
  granted_on date,
  quantity_hours numeric
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_hours_per_day int;
  v_service_years int;
  v_base_days numeric;
  v_monthly_day int;
  v_fiscal_mmdd text;
BEGIN
  -- 会社×ポリシー×ユーザーを走査
  RETURN QUERY
  WITH pol AS (
    SELECT lp.*, COALESCE( (lp.settings->>'hours_per_day')::int, 8 ) AS hpd
    FROM public.leave_policies lp
    WHERE lp.is_active = true
      AND (p_company_id IS NULL OR lp.company_id = p_company_id)
  ),
  ux AS (
    SELECT u.id AS user_id, COALESCE(et.company_id, g.company_id) AS company_id, up.hire_date, up.created_at
    FROM auth.users u
    LEFT JOIN public.user_profiles up ON up.id = u.id
    LEFT JOIN public.employment_types et ON et.id = up.employment_type_id
    LEFT JOIN public.user_groups ug ON ug.user_id = u.id
    LEFT JOIN public.groups g ON g.id = ug.group_id
  ),
  tgt AS (
    SELECT
      ux.user_id,
      p.leave_type_id,
      p.hpd,
      p.accrual_method,
      p.base_days_by_service,
      (p.settings->>'monthly_day')::int        AS monthly_day,
      (p.settings->>'fiscal_mmdd')::text       AS fiscal_mmdd,
      ux.hire_date,
      ux.created_at
    FROM pol p
    JOIN ux ON ux.company_id = p.company_id
  )
  SELECT
    t.user_id,
    t.leave_type_id,
    p_today AS granted_on,
    (CASE
       WHEN t.base_days_by_service IS NULL THEN 0
       ELSE
         -- 勤続年数（hire_date 無ければ created_at を代用）
         (
           SELECT COALESCE(
             (t.base_days_by_service ->> GREATEST(0, FLOOR(EXTRACT(YEAR FROM age(p_today, COALESCE(t.hire_date, t.created_at)))) )::int )::numeric,
             (t.base_days_by_service ->> '0')::numeric,
             0
           )
         )
     END) * t.hpd AS quantity_hours
  FROM tgt t
  WHERE
    -- 付与の「発生日」判定
    (
      -- 1) 入社記念日
      t.accrual_method = 'anniversary'
      AND t.hire_date IS NOT NULL
      AND to_char(t.hire_date, 'MM-DD') = to_char(p_today, 'MM-DD')
    )
    OR
    (
      -- 2) 月次（settings.monthly_day があればその日、無ければ月初）
      t.accrual_method = 'monthly'
      AND (
        COALESCE(t.monthly_day, 1) = EXTRACT(DAY FROM p_today)
      )
    )
    OR
    (
      -- 3) 期首固定（settings.fiscal_mmdd 指定時のみ）
      t.accrual_method = 'fiscal_fixed'
      AND t.fiscal_mmdd IS NOT NULL
      AND t.fiscal_mmdd = to_char(p_today, 'MM-DD')
    )
  ;
END;
$$;

-- 4) 付与を実行する関数（idempotent: 一意制約で重複防止）
CREATE OR REPLACE FUNCTION public.fn_issue_leave_grants(
  p_company_id uuid DEFAULT NULL,
  p_today date DEFAULT CURRENT_DATE
) RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_row RECORD;
  v_count int := 0;
  v_expire_months int;
  v_expires_on date;
  v_policy record;
BEGIN
  FOR v_row IN
    SELECT * FROM public.fn_due_leave_grants(p_company_id, p_today)
  LOOP
    -- 対象ポリシー（expire_months 取得）
    SELECT lp.* INTO v_policy
    FROM public.leave_policies lp
    WHERE lp.leave_type_id = v_row.leave_type_id
      AND EXISTS (
        SELECT 1 FROM public.v_user_companies vc
        WHERE vc.user_id = v_row.user_id
          AND vc.company_id = lp.company_id
      )
    LIMIT 1;

    v_expire_months := COALESCE(v_policy.expire_months, 24);
    v_expires_on := (p_today + (v_expire_months || ' months')::interval)::date;

    -- INSERT（重複時はスキップ）
    INSERT INTO public.leave_grants (user_id, leave_type_id, quantity, granted_on, expires_on, source)
    VALUES (v_row.user_id, v_row.leave_type_id, v_row.quantity_hours, v_row.granted_on, v_expires_on, 'policy')
    ON CONFLICT ON CONSTRAINT uq_leave_grants_unique_issue DO NOTHING;

    IF FOUND THEN
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('granted', v_count, 'date', p_today);
END;
$$;

COMMIT;


