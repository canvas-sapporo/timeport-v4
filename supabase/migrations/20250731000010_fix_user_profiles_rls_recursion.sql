-- user_profilesテーブルのRLSポリシーの無限再帰問題を修正
-- 2025-07-31

-- ================================
-- 既存のポリシーを削除
-- ================================

-- 既存のポリシーをすべて削除
DROP POLICY IF EXISTS "users_can_read_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "admin_manage_company_users" ON user_profiles;
DROP POLICY IF EXISTS "admin_manage_user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "member_manage_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "system-admin_manage_all_profiles" ON user_profiles;

-- ================================
-- 新しいポリシーを作成（無限再帰を回避）
-- ================================

-- 基本的な読み取りポリシー（自分のプロフィールと管理者権限）
CREATE POLICY "users_can_read_own_profile" ON user_profiles
    FOR SELECT
    USING (
        id = auth.uid() OR
        -- 管理者権限チェック（無限再帰を避けるため直接auth.jwt()を使用）
        (auth.jwt() ->> 'role')::text IN ('admin', 'system-admin')
    );

-- 自分のプロフィール更新ポリシー
CREATE POLICY "users_can_update_own_profile" ON user_profiles
    FOR UPDATE
    USING (id = auth.uid());

-- 管理者が同じ企業のユーザーを管理できるポリシー
CREATE POLICY "admin_manage_company_users" ON user_profiles
    FOR ALL
    USING (
        -- 管理者権限チェック
        (auth.jwt() ->> 'role')::text IN ('admin', 'system-admin') AND
        -- 同じ企業のユーザーのみ（company_idカラムが存在する場合）
        (company_id IS NULL OR company_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid()))
    );

-- ================================
-- 通知テーブルのRLSポリシーも修正
-- ================================

-- 通知テーブルの既存ポリシーを削除
DROP POLICY IF EXISTS "users_can_read_own_notifications" ON notifications;
DROP POLICY IF EXISTS "users_can_update_own_notifications" ON notifications;

-- 通知テーブルの新しいポリシーを作成
CREATE POLICY "users_can_read_own_notifications" ON notifications
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "users_can_update_own_notifications" ON notifications
    FOR UPDATE
    USING (user_id = auth.uid());

-- システム管理者がすべての通知を管理できるポリシー
CREATE POLICY "system_admin_manage_all_notifications" ON notifications
    FOR ALL
    USING ((auth.jwt() ->> 'role')::text = 'system-admin');

-- ================================
-- 機能テーブルのRLSポリシーも修正
-- ================================

-- 機能テーブルの既存ポリシーを削除
DROP POLICY IF EXISTS "system_admin_manage_features" ON features;
DROP POLICY IF EXISTS "admin_read_features" ON features;

-- 機能テーブルの新しいポリシーを作成
CREATE POLICY "system_admin_manage_features" ON features
    FOR ALL
    USING ((auth.jwt() ->> 'role')::text = 'system-admin');

CREATE POLICY "admin_read_features" ON features
    FOR SELECT
    USING ((auth.jwt() ->> 'role')::text IN ('admin', 'system-admin'));

-- ================================
-- コメント追加
-- ================================

COMMENT ON POLICY "users_can_read_own_profile" ON user_profiles IS 'ユーザーは自分のプロフィールと管理者権限で他のプロフィールを読み取り可能';
COMMENT ON POLICY "users_can_update_own_profile" ON user_profiles IS 'ユーザーは自分のプロフィールを更新可能';
COMMENT ON POLICY "admin_manage_company_users" ON user_profiles IS '管理者は同じ企業のユーザーを管理可能'; 