-- adminロールのユーザーが自分の企業の情報を更新できるようにRLSポリシーを修正
-- 2025-08-02

-- ================================
-- companiesテーブルのRLSポリシー修正
-- ================================

-- 既存のadmin_read_companiesポリシーを削除
DROP POLICY IF EXISTS "admin_read_companies" ON companies;

-- adminロールのユーザーが自分の企業の情報を読み取り・更新できるポリシーを作成
CREATE POLICY "admin_manage_own_company" ON companies
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      JOIN user_groups ON user_profiles.id = user_groups.user_id
      JOIN groups ON user_groups.group_id = groups.id
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
      AND groups.company_id = companies.id
      AND user_groups.deleted_at IS NULL
      AND groups.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      JOIN user_groups ON user_profiles.id = user_groups.user_id
      JOIN groups ON user_groups.group_id = groups.id
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
      AND groups.company_id = companies.id
      AND user_groups.deleted_at IS NULL
      AND groups.deleted_at IS NULL
    )
  );

-- ================================
-- コメント追加
-- ================================

COMMENT ON POLICY "admin_manage_own_company" ON companies IS 'adminロールのユーザーが自分の企業の情報を管理できるポリシー'; 