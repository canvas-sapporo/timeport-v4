-- ================================
-- audit_logsテーブルのRLSポリシー修正
-- adminユーザーが自分の企業の監査ログにアクセスできるようにする
-- ================================

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "system_admin_access_audit_logs" ON audit_logs;

-- system_admin用のポリシー（全企業のログにアクセス可能）
CREATE POLICY "system_admin_access_audit_logs" ON audit_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'system-admin'
    )
  );

-- admin用のポリシー（自分の企業のログのみアクセス可能）
CREATE POLICY "admin_access_own_company_audit_logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN user_groups ug ON up.id = ug.user_id
      JOIN groups g ON ug.group_id = g.id
      WHERE up.id = auth.uid() 
      AND up.role = 'admin'
      AND g.company_id = audit_logs.company_id
    )
  ); 