-- user_profilesテーブルにcompany_idカラムを追加
-- 2025-07-31

-- ================================
-- user_profilesテーブルにcompany_idカラムを追加
-- ================================

-- company_idカラムを追加
ALTER TABLE user_profiles ADD COLUMN company_id UUID REFERENCES companies(id);

-- 既存のユーザーに対してcompany_idを設定（デフォルトの会社IDを使用）
-- 注意: 実際の環境では適切な会社IDを設定する必要があります
UPDATE user_profiles 
SET company_id = (SELECT id FROM companies LIMIT 1)
WHERE company_id IS NULL;

-- company_idをNOT NULLに変更
ALTER TABLE user_profiles ALTER COLUMN company_id SET NOT NULL;

-- company_idにインデックスを追加
CREATE INDEX idx_user_profiles_company ON user_profiles(company_id) WHERE deleted_at IS NULL;

-- ================================
-- RLSポリシーの更新
-- ================================

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "users_can_read_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON user_profiles;

-- 新しいポリシーを作成（company_idを考慮）
CREATE POLICY "users_can_read_own_profile" ON user_profiles
    FOR SELECT
    USING (
        id = auth.uid() OR
        (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('admin', 'system-admin')
    );

CREATE POLICY "users_can_update_own_profile" ON user_profiles
    FOR UPDATE
    USING (id = auth.uid());

-- 管理者が同じ会社のユーザーを管理できるポリシー
CREATE POLICY "admin_manage_company_users" ON user_profiles
    FOR ALL
    USING (
        (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('admin', 'system-admin') AND
        company_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid())
    );

-- ================================
-- コメント追加
-- ================================

COMMENT ON COLUMN user_profiles.company_id IS '所属会社ID'; 