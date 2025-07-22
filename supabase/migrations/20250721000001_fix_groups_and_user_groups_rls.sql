-- groupsテーブルとuser_groupsテーブルのRLSポリシー修正
-- adminユーザーがgroupsテーブルとuser_groupsテーブルにアクセスできるようにする

-- ================================
-- 1. groupsテーブルのRLSポリシー修正
-- ================================

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "admin_manage_groups" ON groups;
DROP POLICY IF EXISTS "member_read_groups" ON groups;
DROP POLICY IF EXISTS "authenticated_users_can_read_groups" ON groups;

-- groupsテーブルのRLSを一時的に無効化
ALTER TABLE groups DISABLE ROW LEVEL SECURITY;

-- 基本的な認証済みユーザー用のポリシーを追加
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザーはgroupsテーブルを読み取り可能
CREATE POLICY "groups_authenticated_read" ON groups
  FOR SELECT
  TO authenticated
  USING (true);

-- adminユーザーはgroupsテーブルを管理可能
CREATE POLICY "groups_admin_manage" ON groups
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

-- ================================
-- 2. user_groupsテーブルのRLSポリシー修正
-- ================================

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "admin_manage_user_groups" ON user_groups;
DROP POLICY IF EXISTS "member_read_user_groups" ON user_groups;
DROP POLICY IF EXISTS "authenticated_users_can_read_user_groups" ON user_groups;

-- user_groupsテーブルのRLSを一時的に無効化
ALTER TABLE user_groups DISABLE ROW LEVEL SECURITY;

-- 基本的な認証済みユーザー用のポリシーを追加
ALTER TABLE user_groups ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザーはuser_groupsテーブルを読み取り可能
CREATE POLICY "user_groups_authenticated_read" ON user_groups
  FOR SELECT
  TO authenticated
  USING (true);

-- adminユーザーはuser_groupsテーブルを管理可能
CREATE POLICY "user_groups_admin_manage" ON user_groups
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