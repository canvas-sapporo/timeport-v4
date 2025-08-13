-- 休暇台帳・ポリシー・カレンダー・ビュー追加
-- 2025-08-13

-- ================================
-- 1. 台帳テーブル（付与・消費）
-- ================================

-- 付与（クレジット）
CREATE TABLE IF NOT EXISTS leave_grants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
    quantity_minutes INTEGER NOT NULL CHECK (quantity_minutes > 0),
    granted_on DATE NOT NULL,
    expires_on DATE,
    source TEXT NOT NULL CHECK (source IN ('policy','manual','import','correction')),
    note TEXT,
    created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 消費（デビット）: FIFO紐付け
CREATE TABLE IF NOT EXISTS leave_consumptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES requests(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
    grant_id UUID NOT NULL REFERENCES leave_grants(id) ON DELETE RESTRICT,
    quantity_minutes INTEGER NOT NULL CHECK (quantity_minutes <> 0), -- 逆仕訳は負数許容
    consumed_on DATE NOT NULL,
    created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 一意/検索性
CREATE INDEX IF NOT EXISTS idx_leave_grants_user_type ON leave_grants(user_id, leave_type_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leave_grants_dates ON leave_grants(granted_on, expires_on) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leave_consumptions_user_type ON leave_consumptions(user_id, leave_type_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leave_consumptions_consumed_on ON leave_consumptions(consumed_on) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leave_consumptions_request ON leave_consumptions(request_id) WHERE deleted_at IS NULL;

-- ================================
-- 2. ポリシー
-- ================================

CREATE TABLE IF NOT EXISTS leave_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
    accrual_method TEXT NOT NULL CHECK (accrual_method IN ('anniversary','fiscal_fixed','monthly')),
    base_days_by_service JSONB NOT NULL DEFAULT '{}'::jsonb,
    carryover_max_days DECIMAL(6,2),
    expire_months INTEGER DEFAULT 24,
    allow_negative BOOLEAN NOT NULL DEFAULT FALSE,
    hold_on_apply BOOLEAN NOT NULL DEFAULT TRUE,
    deduction_timing TEXT NOT NULL DEFAULT 'approve' CHECK (deduction_timing IN ('apply','approve')),
    business_day_only BOOLEAN NOT NULL DEFAULT TRUE,
    blackout_dates JSONB DEFAULT '[]'::jsonb,
    -- 拡張: 時間/単位・丸め
    day_hours INTEGER NOT NULL DEFAULT 8,
    min_booking_unit_minutes INTEGER NOT NULL DEFAULT 60,
    rounding_minutes INTEGER NOT NULL DEFAULT 15,
    allowed_units TEXT[] NOT NULL DEFAULT ARRAY['day','half','hour'],
    half_day_mode TEXT NOT NULL DEFAULT 'fixed_hours' CHECK (half_day_mode IN ('fixed_hours','am_pm')),
    allow_multi_day BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(company_id, leave_type_id)
);

CREATE INDEX IF NOT EXISTS idx_leave_policies_company_type ON leave_policies(company_id, leave_type_id) WHERE deleted_at IS NULL;

-- ================================
-- 3. 申請明細（正規化）
-- ================================

CREATE TABLE IF NOT EXISTS leave_request_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
    start_at TIMESTAMPTZ NOT NULL,
    end_at   TIMESTAMPTZ NOT NULL,
    quantity_minutes INTEGER NOT NULL CHECK (quantity_minutes > 0),
    unit TEXT NOT NULL CHECK (unit IN ('day','half','hour')),
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_leave_request_details_request ON leave_request_details(request_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leave_request_details_type_start ON leave_request_details(leave_type_id, start_at) WHERE deleted_at IS NULL;

-- ================================
-- 4. 会社カレンダー（最小）
-- ================================

CREATE TABLE IF NOT EXISTS company_calendar_dates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    calendar_date DATE NOT NULL,
    day_type TEXT NOT NULL DEFAULT 'holiday' CHECK (day_type IN ('holiday','workday','company_holiday','public_holiday')),
    is_blackout BOOLEAN NOT NULL DEFAULT FALSE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(company_id, calendar_date)
);

CREATE INDEX IF NOT EXISTS idx_company_calendar_company_date ON company_calendar_dates(company_id, calendar_date) WHERE deleted_at IS NULL;

-- ================================
-- 5. ビュー
-- ================================

-- ユーザー→会社解決（勤務形態優先、次点グループ）
DROP VIEW IF EXISTS v_user_companies;
CREATE VIEW v_user_companies AS
SELECT 
    u.id AS user_id,
    COALESCE(wt.company_id, et.company_id, g.company_id) AS company_id
FROM auth.users u
LEFT JOIN user_profiles up ON up.id = u.id AND up.deleted_at IS NULL
LEFT JOIN work_types wt ON wt.id = up.current_work_type_id AND wt.deleted_at IS NULL
LEFT JOIN employment_types et ON et.id = up.employment_type_id AND et.deleted_at IS NULL
LEFT JOIN user_groups ug ON ug.user_id = u.id AND ug.deleted_at IS NULL
LEFT JOIN groups g ON g.id = ug.group_id AND g.deleted_at IS NULL;

-- 残高ビュー（期限切れは除外）。消費は符号付き（逆仕訳対応）
DROP VIEW IF EXISTS v_leave_balances;
CREATE VIEW v_leave_balances AS
SELECT
  g.user_id,
  g.leave_type_id,
  COALESCE(SUM(g.quantity_minutes), 0)
    - COALESCE((
        SELECT COALESCE(SUM(c.quantity_minutes), 0)
        FROM leave_consumptions c
        WHERE c.user_id = g.user_id
          AND c.leave_type_id = g.leave_type_id
          AND c.deleted_at IS NULL
      ), 0) AS balance_minutes
FROM leave_grants g
WHERE (g.expires_on IS NULL OR g.expires_on >= CURRENT_DATE)
  AND g.deleted_at IS NULL
GROUP BY g.user_id, g.leave_type_id;

-- ================================
-- 6. RLS（最小: 本人=閲覧、管理者=全権）
-- ================================

-- leave_grants
ALTER TABLE leave_grants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view own leave_grants" ON leave_grants;
CREATE POLICY "Members can view own leave_grants" ON leave_grants
  FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Members can manage own leave_grants via service" ON leave_grants;
CREATE POLICY "Members can manage own leave_grants via service" ON leave_grants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all leave_grants" ON leave_grants;
CREATE POLICY "Admins can manage all leave_grants" ON leave_grants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('system-admin','admin')
        AND up.deleted_at IS NULL
    )
  );

-- leave_consumptions
ALTER TABLE leave_consumptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view own leave_consumptions" ON leave_consumptions;
CREATE POLICY "Members can view own leave_consumptions" ON leave_consumptions
  FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Members can manage own leave_consumptions via service" ON leave_consumptions;
CREATE POLICY "Members can manage own leave_consumptions via service" ON leave_consumptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all leave_consumptions" ON leave_consumptions;
CREATE POLICY "Admins can manage all leave_consumptions" ON leave_consumptions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('system-admin','admin')
        AND up.deleted_at IS NULL
    )
  );

-- leave_policies（参照は全社員、更新は管理者想定）
ALTER TABLE leave_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Employees can read leave_policies of own company" ON leave_policies;
CREATE POLICY "Employees can read leave_policies of own company" ON leave_policies
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM v_user_companies v
      WHERE v.user_id = auth.uid()
        AND v.company_id = leave_policies.company_id
    )
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS "Admins can manage leave_policies" ON leave_policies;
CREATE POLICY "Admins can manage leave_policies" ON leave_policies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('system-admin','admin')
        AND up.deleted_at IS NULL
    )
  );

-- leave_request_details（申請者/管理者のみ）
ALTER TABLE leave_request_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can read own leave_request_details" ON leave_request_details;
CREATE POLICY "Members can read own leave_request_details" ON leave_request_details
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM requests r
      WHERE r.id = leave_request_details.request_id
        AND r.user_id = auth.uid()
        AND r.deleted_at IS NULL
    )
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS "Members can insert own leave_request_details" ON leave_request_details;
CREATE POLICY "Members can insert own leave_request_details" ON leave_request_details
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM requests r
      WHERE r.id = leave_request_details.request_id
        AND r.user_id = auth.uid()
        AND r.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS "Admins can manage all leave_request_details" ON leave_request_details;
CREATE POLICY "Admins can manage all leave_request_details" ON leave_request_details
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('system-admin','admin')
        AND up.deleted_at IS NULL
    )
  );

-- company_calendar_dates（全社員参照可、更新は管理者）
ALTER TABLE company_calendar_dates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Employees can read own company calendar" ON company_calendar_dates;
CREATE POLICY "Employees can read own company calendar" ON company_calendar_dates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM v_user_companies v
      WHERE v.user_id = auth.uid()
        AND v.company_id = company_calendar_dates.company_id
    )
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS "Admins can manage company calendar" ON company_calendar_dates;
CREATE POLICY "Admins can manage company calendar" ON company_calendar_dates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('system-admin','admin')
        AND up.deleted_at IS NULL
    )
  );

-- ================================
-- 7. トリガー（updated_at自動更新）
-- ================================

DROP TRIGGER IF EXISTS update_leave_grants_updated_at ON leave_grants;
CREATE TRIGGER update_leave_grants_updated_at
    BEFORE UPDATE ON leave_grants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_leave_consumptions_updated_at ON leave_consumptions;
CREATE TRIGGER update_leave_consumptions_updated_at
    BEFORE UPDATE ON leave_consumptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_leave_policies_updated_at ON leave_policies;
CREATE TRIGGER update_leave_policies_updated_at
    BEFORE UPDATE ON leave_policies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_leave_request_details_updated_at ON leave_request_details;
CREATE TRIGGER update_leave_request_details_updated_at
    BEFORE UPDATE ON leave_request_details
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_company_calendar_dates_updated_at ON company_calendar_dates;
CREATE TRIGGER update_company_calendar_dates_updated_at
    BEFORE UPDATE ON company_calendar_dates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


