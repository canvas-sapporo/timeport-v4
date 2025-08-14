-- Add fiscal_start_month to leave_policies
-- 1-12 の整数。fiscal_fixed（年度固定）方式の期首月を表す

ALTER TABLE IF EXISTS public.leave_policies
  ADD COLUMN IF NOT EXISTS fiscal_start_month INTEGER NOT NULL DEFAULT 4 CHECK (fiscal_start_month >= 1 AND fiscal_start_month <= 12);

-- 既存行に対してDEFAULT適用（Postgresは追加時点でデフォルトを持つため明示UPDATEは不要）

-- メタ情報
COMMENT ON COLUMN public.leave_policies.fiscal_start_month IS '年度固定方式の期首月 (1-12)。デフォルトは4';


