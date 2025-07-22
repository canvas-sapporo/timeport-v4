-- TimePort データベース設計 修正版

-- ================================
-- 共通カラム仕様
-- ================================
-- 全テーブルに以下の共通カラムが存在:
-- id UUID PRIMARY KEY DEFAULT gen_random_uuid()
-- created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()  
-- deleted_at TIMESTAMP WITH TIME ZONE (ソフトデリート)

-- ================================
-- 1. 基本マスターテーブル（参照される側を先に定義）
-- ================================

-- 会社テーブル
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 雇用形態テーブル
CREATE TABLE employment_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 勤務パターンテーブル
CREATE TABLE work_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    work_start_time TIME NOT NULL,
    work_end_time TIME NOT NULL,
    break_duration_minutes INTEGER DEFAULT 60,
    is_flexible BOOLEAN DEFAULT FALSE,
    flex_start_time TIME,
    flex_end_time TIME,
    core_start_time TIME,
    core_end_time TIME,
    overtime_threshold_minutes INTEGER DEFAULT 480,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 休暇種別テーブル
CREATE TABLE leave_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    max_days_per_year DECIMAL(4,1),
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- ================================
-- 2. 組織・グループ関連テーブル
-- ================================

-- グループテーブル（グループ・チーム・勤務地等）
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    parent_group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    code VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- ================================
-- 3. ユーザー関連テーブル
-- ================================

-- ユーザープロフィールテーブル
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    code VARCHAR(50),
    family_name VARCHAR(255) NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    family_name_kana VARCHAR(255) NOT NULL,
    first_name_kana VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('system-admin', 'admin', 'member')),
    employment_type_id UUID REFERENCES employment_types(id),
    current_work_type_id UUID REFERENCES work_types(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- ユーザーグループ関連テーブル（正規化アプローチ）
CREATE TABLE user_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, group_id)
);

-- ユーザー勤務タイプ履歴テーブル
CREATE TABLE user_work_type_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    work_type_id UUID REFERENCES work_types(id) ON DELETE CASCADE,
    effective_date DATE NOT NULL,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- ================================
-- 4. 勤怠記録テーブル
-- ================================

-- 勤怠記録テーブル
CREATE TABLE attendances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    work_date DATE NOT NULL,
    work_type_id UUID REFERENCES work_types(id),
    clock_in_time TIMESTAMP WITH TIME ZONE,
    clock_out_time TIMESTAMP WITH TIME ZONE,
    break_records JSONB DEFAULT '[]',
    actual_work_minutes INTEGER,
    description TEXT,
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, work_date)
);

-- ================================
-- 5. 申請・承認関連テーブル
-- ================================

-- 申請ステータスマスターテーブル
CREATE TABLE request_statuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7), -- HEXカラーコード
    display_order INTEGER DEFAULT 0,
    settings JSONB DEFAULT '{}', -- 業務ロジック用設定（is_initial, is_final等）
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 申請種別テーブル
CREATE TABLE request_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    default_status_id UUID REFERENCES request_statuses(id),
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 申請テーブル
CREATE TABLE requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_type_id UUID REFERENCES request_types(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    form_data JSONB NOT NULL,
    target_date DATE,
    start_date DATE,
    end_date DATE,
    status_id UUID REFERENCES request_statuses(id),
    comments JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- ================================
-- 6. フォーム・バリデーション関連テーブル
-- ================================

-- フォーム項目テーブル
CREATE TABLE forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    field_name VARCHAR(100) NOT NULL,
    field_type VARCHAR(50) NOT NULL,
    field_label VARCHAR(255) NOT NULL,
    field_options JSONB DEFAULT '{}',
    is_required BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 申請種別フォーム関連テーブル（中間テーブル）
CREATE TABLE request_type_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_type_id UUID REFERENCES request_types(id) ON DELETE CASCADE,
    form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 0,
    is_required BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(request_type_id, form_id)
);

-- バリデーションルールテーブル
CREATE TABLE validations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
    rule_type VARCHAR(50) NOT NULL,
    rule_value VARCHAR(255),
    error_message VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- ================================
-- 7. 機能制御・通知関連テーブル
-- ================================

-- 機能制御テーブル
CREATE TABLE features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_code VARCHAR(50) UNIQUE NOT NULL,
    feature_name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 機能・会社関連テーブル（中間テーブル）
CREATE TABLE feature_companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_id UUID REFERENCES features(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT TRUE,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(feature_id, company_id)
);

-- 通知テーブル
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link_url VARCHAR(500),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- ================================
-- 8. 操作ログテーブル
-- ================================

-- 操作ログテーブル
CREATE TABLE logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50),
    target_id UUID,
    before_data JSONB,
    after_data JSONB,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- ================================
-- 9. インデックス作成
-- ================================

-- パフォーマンス最適化用インデックス
CREATE INDEX idx_companies_code ON companies(code) WHERE deleted_at IS NULL;
CREATE INDEX idx_groups_company ON groups(company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_groups_parent ON groups(parent_group_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_user_profiles_email ON user_profiles(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_user_profiles_role ON user_profiles(role) WHERE deleted_at IS NULL;
CREATE INDEX idx_user_profiles_work_type ON user_profiles(current_work_type_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_user_groups_user ON user_groups(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_user_groups_group ON user_groups(group_id) WHERE deleted_at IS NULL;

CREATE INDEX idx_work_types_company ON work_types(company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_leave_types_company ON leave_types(company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_user_work_type_history_user ON user_work_type_history(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_user_work_type_history_effective ON user_work_type_history(effective_date) WHERE deleted_at IS NULL;

CREATE INDEX idx_attendances_user_date ON attendances(user_id, work_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_attendances_date ON attendances(work_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_attendances_approved ON attendances(approved_by, approved_at) WHERE deleted_at IS NULL;

CREATE INDEX idx_request_statuses_company ON request_statuses(company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_request_types_company ON request_types(company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_requests_user_status ON requests(user_id, status_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_requests_type_status ON requests(request_type_id, status_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_requests_dates ON requests(start_date, end_date) WHERE deleted_at IS NULL;

CREATE INDEX idx_forms_company ON forms(company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_request_type_forms_request_type ON request_type_forms(request_type_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_request_type_forms_form ON request_type_forms(form_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_validations_form ON validations(form_id) WHERE deleted_at IS NULL;

CREATE INDEX idx_features_code ON features(feature_code) WHERE deleted_at IS NULL;
CREATE INDEX idx_feature_companies_feature ON feature_companies(feature_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_feature_companies_company ON feature_companies(company_id) WHERE deleted_at IS NULL;

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE deleted_at IS NULL;
CREATE INDEX idx_notifications_expires ON notifications(expires_at) WHERE deleted_at IS NULL;

CREATE INDEX idx_logs_user_action ON logs(user_id, action) WHERE deleted_at IS NULL;
CREATE INDEX idx_logs_target ON logs(target_type, target_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_logs_created ON logs(created_at) WHERE deleted_at IS NULL;

-- ソフトデリート用インデックス
CREATE INDEX idx_companies_deleted ON companies(deleted_at);
CREATE INDEX idx_groups_deleted ON groups(deleted_at);
CREATE INDEX idx_user_profiles_deleted ON user_profiles(deleted_at);
CREATE INDEX idx_attendances_deleted ON attendances(deleted_at);
CREATE INDEX idx_requests_deleted ON requests(deleted_at);

-- ================================
-- 10. ビュー作成
-- ================================

-- アクティブユーザーVIEW（姓名結合付き）
CREATE VIEW active_users AS 
SELECT 
    up.*,
    CONCAT(up.family_name, ' ', up.first_name) AS full_name,
    CONCAT(up.first_name, ' ', up.family_name) AS full_name_western,
    CONCAT(up.family_name_kana, ' ', up.first_name_kana) AS full_name_kana,
    wt.name AS work_type_name,
    et.name AS employment_type_name
FROM user_profiles up
LEFT JOIN work_types wt ON up.current_work_type_id = wt.id AND wt.deleted_at IS NULL
LEFT JOIN employment_types et ON up.employment_type_id = et.id AND et.deleted_at IS NULL
WHERE up.deleted_at IS NULL;

-- ユーザーグループ詳細VIEW
CREATE VIEW user_group_details AS
SELECT 
    ug.user_id,
    ug.group_id,
    g.name AS group_name,
    g.code AS group_code,
    g.company_id,
    c.name AS company_name
FROM user_groups ug
JOIN groups g ON ug.group_id = g.id AND g.deleted_at IS NULL
JOIN companies c ON g.company_id = c.id AND c.deleted_at IS NULL
WHERE ug.deleted_at IS NULL;

-- アクティブ勤怠記録VIEW
CREATE VIEW active_attendances AS 
SELECT 
    a.*,
    up.full_name,
    wt.name AS work_type_name
FROM attendances a
JOIN active_users up ON a.user_id = up.id
LEFT JOIN work_types wt ON a.work_type_id = wt.id AND wt.deleted_at IS NULL
WHERE a.deleted_at IS NULL;

-- アクティブ申請VIEW
CREATE VIEW active_requests AS 
SELECT 
    r.*,
    up.full_name,
    rt.name AS request_type_name,
    rs.name AS status_name
FROM requests r
JOIN active_users up ON r.user_id = up.id
JOIN request_types rt ON r.request_type_id = rt.id AND rt.deleted_at IS NULL
LEFT JOIN request_statuses rs ON r.status_id = rs.id AND rs.deleted_at IS NULL
WHERE r.deleted_at IS NULL;

-- アクティブグループVIEW
CREATE VIEW active_groups AS 
SELECT * FROM groups WHERE deleted_at IS NULL;

-- アクティブ勤務タイプVIEW
CREATE VIEW active_work_types AS 
SELECT * FROM work_types WHERE deleted_at IS NULL;

-- アクティブ休暇種別VIEW
CREATE VIEW active_leave_types AS 
SELECT * FROM leave_types WHERE deleted_at IS NULL;

-- アクティブ雇用形態VIEW
CREATE VIEW active_employment_types AS 
SELECT * FROM employment_types WHERE deleted_at IS NULL;

-- アクティブ機能VIEW
CREATE VIEW active_features AS 
SELECT * FROM features WHERE deleted_at IS NULL;

-- 申請種別フォーム詳細VIEW
CREATE VIEW request_type_form_details AS
SELECT 
    rtf.request_type_id,
    rtf.form_id,
    rtf.display_order,
    rtf.is_required,
    f.field_name,
    f.field_type,
    f.field_label,
    f.field_options
FROM request_type_forms rtf
JOIN forms f ON rtf.form_id = f.id AND f.deleted_at IS NULL
WHERE rtf.deleted_at IS NULL
ORDER BY rtf.request_type_id, rtf.display_order;

-- ================================
-- 11. RLS (Row Level Security) 設定
-- ================================

-- user_profilesのRLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id AND deleted_at IS NULL);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id AND deleted_at IS NULL);

-- user_groupsのRLS
ALTER TABLE user_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own groups" ON user_groups
    FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);

-- attendancesのRLS
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own attendance" ON attendances
    FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can manage own attendance" ON attendances
    FOR ALL USING (auth.uid() = user_id AND deleted_at IS NULL);

-- requestsのRLS
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own requests" ON requests
    FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can manage own requests" ON requests
    FOR ALL USING (auth.uid() = user_id AND deleted_at IS NULL);

-- 管理者用ポリシー
CREATE POLICY "Admins can manage all attendance" ON attendances
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('system-admin', 'admin')
            AND deleted_at IS NULL
        )
    );

CREATE POLICY "Admins can manage all requests" ON requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('system-admin', 'admin')
            AND deleted_at IS NULL
        )
    );

-- 通知のRLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id AND deleted_at IS NULL);

-- ================================
-- 12. トリガー設定
-- ================================

-- updated_at自動更新関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 各テーブルにupdated_atトリガーを設定
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_groups_updated_at BEFORE UPDATE ON user_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendances_updated_at BEFORE UPDATE ON attendances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_requests_updated_at BEFORE UPDATE ON requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_request_type_forms_updated_at BEFORE UPDATE ON request_type_forms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 勤務タイプ履歴管理トリガー
CREATE OR REPLACE FUNCTION manage_work_type_history()
RETURNS TRIGGER AS $$
BEGIN
    -- 既存の履歴レコードを終了
    IF OLD.current_work_type_id IS NOT NULL AND OLD.current_work_type_id != NEW.current_work_type_id THEN
        UPDATE user_work_type_history 
        SET end_date = CURRENT_DATE
        WHERE user_id = NEW.id 
        AND end_date IS NULL;
    END IF;
    
    -- 新しい履歴レコードを作成
    IF NEW.current_work_type_id IS NOT NULL AND (OLD.current_work_type_id IS NULL OR OLD.current_work_type_id != NEW.current_work_type_id) THEN
        INSERT INTO user_work_type_history (user_id, work_type_id, effective_date)
        VALUES (NEW.id, NEW.current_work_type_id, CURRENT_DATE);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER manage_user_work_type_history 
    AFTER UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION manage_work_type_history();
