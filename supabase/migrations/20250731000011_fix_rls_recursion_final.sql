-- RLSポリシーの無限再帰問題を完全に解決
-- 2025-07-31

-- ================================
-- 1. user_profilesテーブルのRLSを一時的に無効化
-- ================================

-- RLSを無効化してポリシーをクリア
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- 既存のポリシーをすべて削除
DROP POLICY IF EXISTS "users_can_read_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "admin_manage_company_users" ON user_profiles;
DROP POLICY IF EXISTS "admin_manage_user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "member_manage_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "system-admin_manage_all_profiles" ON user_profiles;

-- ================================
-- 2. シンプルで安全なポリシーを作成
-- ================================

-- RLSを再度有効化
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 基本的な読み取りポリシー（自分のプロフィールのみ）
CREATE POLICY "users_can_read_own_profile" ON user_profiles
    FOR SELECT
    USING (id = auth.uid());

-- 自分のプロフィール更新ポリシー
CREATE POLICY "users_can_update_own_profile" ON user_profiles
    FOR UPDATE
    USING (id = auth.uid());

-- 管理者権限チェック用の関数を作成（無限再帰を避けるため）
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
    -- JWTから直接roleを取得（無限再帰を避ける）
    RETURN (auth.jwt() ->> 'role')::text IN ('admin', 'system-admin');
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 管理者用の読み取りポリシー
CREATE POLICY "admin_can_read_all_profiles" ON user_profiles
    FOR SELECT
    USING (is_admin_user());

-- 管理者用の更新ポリシー
CREATE POLICY "admin_can_update_all_profiles" ON user_profiles
    FOR UPDATE
    USING (is_admin_user());

-- ================================
-- 3. 通知テーブルのRLSも修正
-- ================================

-- 通知テーブルのRLSを一時的に無効化
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "users_can_read_own_notifications" ON notifications;
DROP POLICY IF EXISTS "users_can_update_own_notifications" ON notifications;
DROP POLICY IF EXISTS "system_admin_manage_all_notifications" ON notifications;

-- RLSを再度有効化
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- シンプルな通知ポリシー
CREATE POLICY "users_can_read_own_notifications" ON notifications
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "users_can_update_own_notifications" ON notifications
    FOR UPDATE
    USING (user_id = auth.uid());

-- ================================
-- 4. 機能テーブルのRLSも修正
-- ================================

-- 機能テーブルのRLSを一時的に無効化
ALTER TABLE features DISABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "system_admin_manage_features" ON features;
DROP POLICY IF EXISTS "admin_read_features" ON features;

-- RLSを再度有効化
ALTER TABLE features ENABLE ROW LEVEL SECURITY;

-- シンプルな機能ポリシー
CREATE POLICY "all_users_can_read_features" ON features
    FOR SELECT
    USING (true);

-- 管理者のみが機能を管理可能
CREATE POLICY "admin_manage_features" ON features
    FOR ALL
    USING (is_admin_user());

-- ================================
-- 5. コメント追加
-- ================================

COMMENT ON FUNCTION is_admin_user() IS '管理者権限チェック用関数（無限再帰を避けるためJWTから直接取得）';
COMMENT ON POLICY "users_can_read_own_profile" ON user_profiles IS 'ユーザーは自分のプロフィールのみ読み取り可能';
COMMENT ON POLICY "admin_can_read_all_profiles" ON user_profiles IS '管理者はすべてのプロフィールを読み取り可能'; 