-- Extend leave_policies for anniversary/monthly options

ALTER TABLE IF EXISTS public.leave_policies
  ADD COLUMN IF NOT EXISTS anniversary_offset_days INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_proration BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS monthly_proration_basis TEXT NOT NULL DEFAULT 'days' CHECK (monthly_proration_basis IN ('days','hours')),
  ADD COLUMN IF NOT EXISTS monthly_min_attendance_rate NUMERIC(5,2) DEFAULT 0;

COMMENT ON COLUMN public.leave_policies.anniversary_offset_days IS '入社記念日の前倒し/後倒し付与(±日)';
COMMENT ON COLUMN public.leave_policies.monthly_proration IS '月次付与の按分を有効にするか';
COMMENT ON COLUMN public.leave_policies.monthly_proration_basis IS '按分の基準: days/hours';
COMMENT ON COLUMN public.leave_policies.monthly_min_attendance_rate IS '付与の下限出勤率(0-1)';


