-- 申請システムのデータベース設計統一
-- 2025-07-27

-- ================================
-- 1. ステータステーブルの作成（汎用）
-- ================================

CREATE TABLE statuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7), -- HEXカラーコード
    category VARCHAR(50) NOT NULL, -- request, attendance, user, etc.
    display_order INTEGER DEFAULT 0,
    settings JSONB DEFAULT '{}', -- 業務ロジック用設定
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(company_id, code, category)
);

-- ================================
-- 2. 申請種別テーブルの更新
-- ================================

-- 既存のrequest_typesテーブルに新しいカラムを追加
ALTER TABLE request_types 
ADD COLUMN IF NOT EXISTS form_config JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS approval_flow JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'general';

-- 既存のrequest_statusesテーブルを削除（statusesテーブルに統合）
DROP TABLE IF EXISTS request_statuses CASCADE;

-- request_typesテーブルのdefault_status_idをstatusesテーブルを参照するように変更
ALTER TABLE request_types 
DROP CONSTRAINT IF EXISTS request_types_default_status_id_fkey;

ALTER TABLE request_types 
ADD CONSTRAINT request_types_default_status_id_fkey 
FOREIGN KEY (default_status_id) REFERENCES statuses(id) ON DELETE SET NULL;

-- ================================
-- 3. 申請テーブルの更新
-- ================================

-- 既存のrequestsテーブルに新しいカラムを追加
ALTER TABLE requests 
ADD COLUMN IF NOT EXISTS title VARCHAR(255),
ADD COLUMN IF NOT EXISTS current_approval_step INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS submission_comment TEXT,
ADD COLUMN IF NOT EXISTS amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS days_count DECIMAL(4,1);

-- status_idをstatusesテーブルを参照するように変更
ALTER TABLE requests 
DROP CONSTRAINT IF EXISTS requests_status_id_fkey;

ALTER TABLE requests 
ADD CONSTRAINT requests_status_id_fkey 
FOREIGN KEY (status_id) REFERENCES statuses(id) ON DELETE SET NULL;

-- ================================
-- 4. 承認履歴テーブルの作成
-- ================================

CREATE TABLE request_approval_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    approver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL CHECK (action IN ('approve', 'reject', 'return', 'delegate')),
    comment TEXT,
    next_approver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- ================================
-- 5. 不要なテーブルの削除
-- ================================

-- formsテーブルとrequest_type_formsテーブルを削除（form_configに統合）
DROP TABLE IF EXISTS request_type_forms CASCADE;
DROP TABLE IF EXISTS forms CASCADE;
DROP TABLE IF EXISTS validations CASCADE;

-- ================================
-- 6. インデックスの作成
-- ================================

-- statusesテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_statuses_company_category ON statuses(company_id, category) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_statuses_code ON statuses(code) WHERE deleted_at IS NULL;

-- request_typesテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_request_types_category ON request_types(category) WHERE deleted_at IS NULL;

-- requestsテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_requests_current_step ON requests(current_approval_step) WHERE deleted_at IS NULL;

-- 既存のインデックスを削除して新しいインデックスを作成
DROP INDEX IF EXISTS idx_requests_dates;
CREATE INDEX idx_requests_dates ON requests(target_date, start_date, end_date) WHERE deleted_at IS NULL;

-- request_approval_historyテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_request_approval_history_request ON request_approval_history(request_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_request_approval_history_approver ON request_approval_history(approver_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_request_approval_history_processed ON request_approval_history(processed_at) WHERE deleted_at IS NULL;

-- ================================
-- 7. デフォルトステータスデータの挿入
-- ================================

-- システム全体で使用するデフォルトステータス
INSERT INTO statuses (company_id, code, name, description, color, category, display_order, settings) VALUES
-- 申請関連ステータス
(NULL, 'draft', '下書き', '申請が下書き状態', '#6B7280', 'request', 1, '{"is_initial": true, "is_editable": true, "is_withdrawable": true}'),
(NULL, 'pending', '承認待ち', '承認者の承認を待っている状態', '#F59E0B', 'request', 2, '{"is_editable": false, "is_withdrawable": true}'),
(NULL, 'approved', '承認済み', '申請が承認された状態', '#10B981', 'request', 3, '{"is_final": true, "is_approved": true, "is_editable": false}'),
(NULL, 'rejected', '却下', '申請が却下された状態', '#EF4444', 'request', 4, '{"is_final": true, "is_rejected": true, "is_editable": false}'),
(NULL, 'withdrawn', '取り下げ', '申請者が取り下げた状態', '#9CA3AF', 'request', 5, '{"is_final": true, "is_editable": false}'),
(NULL, 'expired', '期限切れ', '承認期限が過ぎた状態', '#6B7280', 'request', 6, '{"is_final": true, "is_editable": false}'),

-- 勤怠関連ステータス
(NULL, 'pending', '承認待ち', '勤怠記録が承認を待っている状態', '#F59E0B', 'attendance', 1, '{"is_editable": true}'),
(NULL, 'approved', '承認済み', '勤怠記録が承認された状態', '#10B981', 'attendance', 2, '{"is_final": true, "is_approved": true}'),
(NULL, 'rejected', '却下', '勤怠記録が却下された状態', '#EF4444', 'attendance', 3, '{"is_final": true, "is_rejected": true}'),

-- ユーザー関連ステータス
(NULL, 'active', '有効', 'ユーザーが有効な状態', '#10B981', 'user', 1, '{"is_active": true}'),
(NULL, 'inactive', '無効', 'ユーザーが無効な状態', '#6B7280', 'user', 2, '{"is_active": false}'),
(NULL, 'suspended', '停止', 'ユーザーが一時停止された状態', '#F59E0B', 'user', 3, '{"is_active": false}');

-- ================================
-- 8. トリガーの作成
-- ================================

-- request_approval_historyテーブルのupdated_atトリガー
DROP TRIGGER IF EXISTS update_request_approval_history_updated_at ON request_approval_history;
CREATE TRIGGER update_request_approval_history_updated_at 
    BEFORE UPDATE ON request_approval_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- statusesテーブルのupdated_atトリガー
DROP TRIGGER IF EXISTS update_statuses_updated_at ON statuses;
CREATE TRIGGER update_statuses_updated_at 
    BEFORE UPDATE ON statuses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================
-- 9. RLSポリシーの設定
-- ================================

-- statusesテーブルのRLS
ALTER TABLE statuses ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Users can view statuses for their company" ON statuses;
DROP POLICY IF EXISTS "Admins can manage statuses for their company" ON statuses;

CREATE POLICY "Users can view statuses for their company" ON statuses
    FOR SELECT USING (
        company_id IS NULL OR 
        company_id IN (
            SELECT g.company_id 
            FROM user_profiles up 
            JOIN user_groups ug ON up.id = ug.user_id
            JOIN groups g ON ug.group_id = g.id
            WHERE up.id = auth.uid() AND up.deleted_at IS NULL AND ug.deleted_at IS NULL AND g.deleted_at IS NULL
        )
    );

CREATE POLICY "Admins can manage statuses for their company" ON statuses
    FOR ALL USING (
        company_id IN (
            SELECT g.company_id 
            FROM user_profiles up 
            JOIN user_groups ug ON up.id = ug.user_id
            JOIN groups g ON ug.group_id = g.id
            WHERE up.id = auth.uid() AND up.role IN ('admin', 'system-admin') 
            AND up.deleted_at IS NULL AND ug.deleted_at IS NULL AND g.deleted_at IS NULL
        )
    );

-- request_approval_historyテーブルのRLS
ALTER TABLE request_approval_history ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Users can view approval history for their requests" ON request_approval_history;
DROP POLICY IF EXISTS "Approvers can view approval history for requests they can approve" ON request_approval_history;
DROP POLICY IF EXISTS "Users can insert approval history for their actions" ON request_approval_history;

CREATE POLICY "Users can view approval history for their requests" ON request_approval_history
    FOR SELECT USING (
        request_id IN (
            SELECT id FROM requests WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Approvers can view approval history for requests they can approve" ON request_approval_history
    FOR SELECT USING (
        approver_id = auth.uid() OR
        request_id IN (
            SELECT r.id 
            FROM requests r 
            JOIN request_types rt ON r.request_type_id = rt.id
            WHERE rt.approval_flow::jsonb @> jsonb_build_array(
                jsonb_build_object('approver_id', auth.uid()::text)
            )
        )
    );

CREATE POLICY "Users can insert approval history for their actions" ON request_approval_history
    FOR INSERT WITH CHECK (
        approver_id = auth.uid()
    );

-- ================================
-- 10. ビューの更新
-- ================================

-- active_requestsビューを更新
DROP VIEW IF EXISTS active_requests;
CREATE OR REPLACE VIEW active_requests AS 
SELECT 
    r.*,
    rt.name as request_type_name,
    rt.code as request_type_code,
    rt.category as request_category,
    s.name as status_name,
    s.code as status_code,
    s.color as status_color,
    up.family_name || ' ' || up.first_name as applicant_name
FROM requests r
JOIN request_types rt ON r.request_type_id = rt.id
LEFT JOIN statuses s ON r.status_id = s.id
JOIN user_profiles up ON r.user_id = up.id
WHERE r.deleted_at IS NULL 
    AND rt.deleted_at IS NULL 
    AND up.deleted_at IS NULL;

-- 申請詳細ビューの作成
DROP VIEW IF EXISTS request_details;
CREATE OR REPLACE VIEW request_details AS 
SELECT 
    r.*,
    rt.name as request_type_name,
    rt.code as request_type_code,
    rt.category as request_category,
    rt.form_config,
    rt.approval_flow,
    s.name as status_name,
    s.code as status_code,
    s.color as status_color,
    s.settings as status_settings,
    up.family_name || ' ' || up.first_name as applicant_name,
    up.code as applicant_code,
    g.name as applicant_group_name,
    rah.approval_history
FROM requests r
JOIN request_types rt ON r.request_type_id = rt.id
LEFT JOIN statuses s ON r.status_id = s.id
JOIN user_profiles up ON r.user_id = up.id
LEFT JOIN groups g ON up.id IN (
    SELECT ug.user_id 
    FROM user_groups ug 
    WHERE ug.group_id = g.id
)
LEFT JOIN LATERAL (
    SELECT jsonb_agg(
        jsonb_build_object(
            'step_number', rah.step_number,
            'approver_id', rah.approver_id,
            'approver_name', approver.family_name || ' ' || approver.first_name,
            'action', rah.action,
            'comment', rah.comment,
            'processed_at', rah.processed_at
        ) ORDER BY rah.step_number, rah.processed_at
    ) as approval_history
    FROM request_approval_history rah
    JOIN user_profiles approver ON rah.approver_id = approver.id
    WHERE rah.request_id = r.id AND rah.deleted_at IS NULL
) rah ON true
WHERE r.deleted_at IS NULL 
    AND rt.deleted_at IS NULL 
    AND up.deleted_at IS NULL; 