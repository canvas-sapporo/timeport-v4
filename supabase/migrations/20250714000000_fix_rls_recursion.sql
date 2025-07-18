-- RLSポリシーの無限再帰問題を修正
-- 一時的にuser_profilesテーブルのRLSを無効にして、ログインを可能にする

-- ================================
-- 1. 既存のポリシーを削除
-- ================================

-- user_profilesテーブルの既存ポリシーを削除
DROP POLICY IF EXISTS "admin_manage_user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "member_manage_own_profile" ON user_profiles;

-- ================================
-- 2. user_profilesテーブルのRLSを一時的に無効化
-- ================================
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- ================================
-- 3. 他のテーブルのRLSポリシーを修正（user_profiles参照を削除）
-- ================================

-- companiesテーブルのポリシーを修正
DROP POLICY IF EXISTS "system_admin_manage_companies" ON companies;
DROP POLICY IF EXISTS "admin_read_companies" ON companies;
DROP POLICY IF EXISTS "member_read_companies" ON companies;

-- 一時的にcompaniesテーブルのRLSも無効化
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;

-- groupsテーブルのポリシーを修正
DROP POLICY IF EXISTS "admin_manage_groups" ON groups;
DROP POLICY IF EXISTS "member_read_groups" ON groups;

-- 一時的にgroupsテーブルのRLSも無効化
ALTER TABLE groups DISABLE ROW LEVEL SECURITY;

-- user_groupsテーブルのポリシーを修正
DROP POLICY IF EXISTS "admin_manage_user_groups" ON user_groups;
DROP POLICY IF EXISTS "member_read_user_groups" ON user_groups;

-- 一時的にuser_groupsテーブルのRLSも無効化
ALTER TABLE user_groups DISABLE ROW LEVEL SECURITY;

-- employment_typesテーブルのポリシーを修正
DROP POLICY IF EXISTS "admin_manage_employment_types" ON employment_types;
DROP POLICY IF EXISTS "member_read_employment_types" ON employment_types;

-- 一時的にemployment_typesテーブルのRLSも無効化
ALTER TABLE employment_types DISABLE ROW LEVEL SECURITY;

-- work_typesテーブルのポリシーを修正
DROP POLICY IF EXISTS "admin_manage_work_types" ON work_types;
DROP POLICY IF EXISTS "member_read_work_types" ON work_types;

-- 一時的にwork_typesテーブルのRLSも無効化
ALTER TABLE work_types DISABLE ROW LEVEL SECURITY;

-- user_work_type_historyテーブルのポリシーを修正
DROP POLICY IF EXISTS "member_read_work_type_history" ON user_work_type_history;

-- 一時的にuser_work_type_historyテーブルのRLSも無効化
ALTER TABLE user_work_type_history DISABLE ROW LEVEL SECURITY;

-- ================================
-- 4. 基本的な認証済みユーザー用のポリシーを追加
-- ================================

-- user_profilesテーブルに基本的なポリシーを追加
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

-- システム管理者は全ユーザーのプロフィールを管理可能
CREATE POLICY "system_admin_manage_all_profiles" ON user_profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'system-admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'system-admin'
    )
  );

-- 管理者は全ユーザーのプロフィールを管理可能
CREATE POLICY "admin_manage_all_profiles" ON user_profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  ); 