-- user_profilesテーブルのRLSポリシー修正
-- 無限再帰問題を解決し、基本的な認証ポリシーを設定

-- ================================
-- 1. 既存のポリシーを削除
-- ================================
DROP POLICY IF EXISTS "users_can_read_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "admin_manage_user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "member_manage_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "system-admin_manage_all_profiles" ON user_profiles;
DROP POLICY IF EXISTS "admin_manage_all_profiles" ON user_profiles;

-- ================================
-- 2. user_profilesテーブルのRLSを一時的に無効化
-- ================================
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- ================================
-- 3. 基本的な認証済みユーザー用のポリシーを追加
-- ================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザーは自分のプロフィールを読み取り可能
CREATE POLICY "users_can_read_own_profile" ON user_profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- 認証済みユーザーは自分のプロフィールを更新可能
CREATE POLICY "users_can_update_own_profile" ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid()); 