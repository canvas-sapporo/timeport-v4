-- ============================================
-- Step 1: Leave Ledger Core DDL (No RLS here)
-- ============================================

-- 付与明細：leave_grants
CREATE TABLE IF NOT EXISTS public.leave_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  leave_type_id uuid NOT NULL REFERENCES public.leave_types(id),
  quantity numeric(8,2) NOT NULL,          -- 時間（例：8h=1日）
  granted_on date NOT NULL,                 -- 付与基準日
  expires_on date,                          -- 失効日（繰越含む）
  source text NOT NULL CHECK (source IN ('policy','manual','import','correction')),
  note text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES public.user_profiles(id)
);

-- 消費明細：leave_consumptions
CREATE TABLE IF NOT EXISTS public.leave_consumptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES public.requests(id),       -- 申請と紐づく（取消/差戻し検知）
  user_id uuid NOT NULL REFERENCES auth.users(id),
  leave_type_id uuid NOT NULL REFERENCES public.leave_types(id),
  grant_id uuid NOT NULL REFERENCES public.leave_grants(id) ON DELETE RESTRICT,
  quantity numeric(8,2) NOT NULL,                       -- 時間（取消の逆仕訳は負値も許容）
  consumed_on date NOT NULL,                            -- 実取得日（範囲申請は日割りで作成）
  is_hold boolean NOT NULL DEFAULT false,               -- 申請時の仮押さえ
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES public.user_profiles(id)
);

-- 会社/休暇種別ポリシー：leave_policies
CREATE TABLE IF NOT EXISTS public.leave_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  leave_type_id uuid NOT NULL REFERENCES public.leave_types(id),
  accrual_method text NOT NULL CHECK (accrual_method IN ('anniversary','fiscal_fixed','monthly')),
  base_days_by_service jsonb NOT NULL DEFAULT '{}'::jsonb,  -- { "0":10, "1":11, ... }
  prorate_parttime boolean NOT NULL DEFAULT true,
  carryover_max_days numeric(8,2),                          -- NULL=上限なし
  expire_months integer DEFAULT 24,                         -- 付与から24ヶ月など
  min_unit text NOT NULL DEFAULT '1h',                      -- '1h'|'0.5d'|'1d'...
  allow_negative boolean NOT NULL DEFAULT false,
  hold_on_apply boolean NOT NULL DEFAULT true,
  deduction_timing text NOT NULL DEFAULT 'approve' CHECK (deduction_timing IN ('apply','approve')),
  business_day_only boolean NOT NULL DEFAULT true,
  blackout_dates jsonb DEFAULT '[]'::jsonb,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, leave_type_id)
);

-- 申請明細の正規化：leave_request_details
CREATE TABLE IF NOT EXISTS public.leave_request_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  leave_type_id uuid NOT NULL REFERENCES public.leave_types(id),
  start_at timestamptz NOT NULL,                           -- 時間休対応
  end_at timestamptz NOT NULL,
  quantity numeric(8,2) NOT NULL,                          -- 時間
  unit text NOT NULL CHECK (unit IN ('day','half','hour')),
  reason text
);

-- 重複付与の防止（同一基準日の二重発行防止）
CREATE UNIQUE INDEX IF NOT EXISTS uq_leave_grants_unique_issue
  ON public.leave_grants(user_id, leave_type_id, granted_on);

-- 性能用インデックス
CREATE INDEX IF NOT EXISTS idx_leave_grants_user_type
  ON public.leave_grants(user_id, leave_type_id, granted_on);

CREATE INDEX IF NOT EXISTS idx_leave_consumptions_user_type
  ON public.leave_consumptions(user_id, leave_type_id, consumed_on);

-- 残高ビュー（期限切れ除外、確定のみ集計）
CREATE OR REPLACE VIEW public.v_leave_balances AS
WITH g AS (
  SELECT user_id, leave_type_id,
         COALESCE(SUM(quantity) FILTER (WHERE expires_on IS NULL OR expires_on >= CURRENT_DATE),0) AS granted
  FROM public.leave_grants
  GROUP BY user_id, leave_type_id
),
c AS (
  SELECT user_id, leave_type_id,
         COALESCE(SUM(quantity),0) AS consumed
  FROM public.leave_consumptions
  WHERE is_hold = false
  GROUP BY user_id, leave_type_id
)
SELECT
  g.user_id,
  g.leave_type_id,
  (g.granted - COALESCE(c.consumed,0)) AS balance_hours
FROM g
LEFT JOIN c ON c.user_id = g.user_id AND c.leave_type_id = g.leave_type_id;

-- ユーザー→会社解決（RLSで利用予定）
CREATE OR REPLACE VIEW public.v_user_companies AS
SELECT u.id AS user_id,
       COALESCE(et.company_id, g.company_id) AS company_id
FROM auth.users u
LEFT JOIN public.user_profiles up ON up.id = u.id
LEFT JOIN public.employment_types et ON et.id = up.employment_type_id
LEFT JOIN public.user_groups ug ON ug.user_id = u.id
LEFT JOIN public.groups g ON g.id = ug.group_id;


