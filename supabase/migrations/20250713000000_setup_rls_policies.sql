-- RLSポリシー設定マイグレーション
-- 画像の権限設定に基づいて各テーブルにRLSポリシーを設定

-- ================================
-- 1. companies テーブル
-- ================================
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- system-admin: w (書き込み権限)
CREATE POLICY "system_admin_manage_companies" ON companies
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

-- admin: r (読み取り権限)
CREATE POLICY "admin_read_companies" ON companies
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- member: r (読み取り権限)
CREATE POLICY "member_read_companies" ON companies
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'member'
    )
  );

-- ================================
-- 2. groups テーブル
-- ================================
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- admin: w (書き込み権限)
CREATE POLICY "admin_manage_groups" ON groups
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

-- member: r (読み取り権限)
CREATE POLICY "member_read_groups" ON groups
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'member'
    )
  );

-- ================================
-- 3. user_groups テーブル
-- ================================
-- admin: w (書き込み権限)
CREATE POLICY "admin_manage_user_groups" ON user_groups
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

-- member: r (読み取り権限)
CREATE POLICY "member_read_user_groups" ON user_groups
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'member'
    )
  );

-- ================================
-- 4. user_profiles テーブル
-- ================================
-- admin: w (書き込み権限)
CREATE POLICY "admin_manage_user_profiles" ON user_profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() 
      AND up.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() 
      AND up.role = 'admin'
    )
  );

-- member: w (書き込み権限) - 自分のプロフィールのみ
CREATE POLICY "member_manage_own_profile" ON user_profiles
  FOR ALL
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ================================
-- 5. employment_types テーブル
-- ================================
ALTER TABLE employment_types ENABLE ROW LEVEL SECURITY;

-- admin: w (書き込み権限)
CREATE POLICY "admin_manage_employment_types" ON employment_types
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

-- member: r (読み取り権限)
CREATE POLICY "member_read_employment_types" ON employment_types
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'member'
    )
  );

-- ================================
-- 6. work_types テーブル
-- ================================
ALTER TABLE work_types ENABLE ROW LEVEL SECURITY;

-- admin: w (書き込み権限)
CREATE POLICY "admin_manage_work_types" ON work_types
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

-- member: r (読み取り権限)
CREATE POLICY "member_read_work_types" ON work_types
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'member'
    )
  );

-- ================================
-- 7. user_work_type_history テーブル
-- ================================
ALTER TABLE user_work_type_history ENABLE ROW LEVEL SECURITY;

-- member: r (読み取り権限)
CREATE POLICY "member_read_work_type_history" ON user_work_type_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'member'
    )
  );

-- ================================
-- 8. leave_types テーブル
-- ================================
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;

-- admin: w (書き込み権限)
CREATE POLICY "admin_manage_leave_types" ON leave_types
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

-- member: r (読み取り権限)
CREATE POLICY "member_read_leave_types" ON leave_types
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'member'
    )
  );

-- ================================
-- 9. attendances テーブル
-- ================================
-- admin: w (書き込み権限) - 全勤怠記録を管理
CREATE POLICY "admin_manage_all_attendances" ON attendances
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

-- member: w (書き込み権限) - 自分の勤怠記録のみ
CREATE POLICY "member_manage_own_attendances" ON attendances
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ================================
-- 10. request_statuses テーブル
-- ================================
ALTER TABLE request_statuses ENABLE ROW LEVEL SECURITY;

-- admin: w (書き込み権限)
CREATE POLICY "admin_manage_request_statuses" ON request_statuses
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

-- member: r (読み取り権限)
CREATE POLICY "member_read_request_statuses" ON request_statuses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'member'
    )
  );

-- ================================
-- 11. request_types テーブル
-- ================================
ALTER TABLE request_types ENABLE ROW LEVEL SECURITY;

-- admin: w (書き込み権限)
CREATE POLICY "admin_manage_request_types" ON request_types
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

-- member: r (読み取り権限)
CREATE POLICY "member_read_request_types" ON request_types
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'member'
    )
  );

-- ================================
-- 12. requests テーブル
-- ================================
-- admin: w (書き込み権限) - 全申請を管理
CREATE POLICY "admin_manage_all_requests" ON requests
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

-- member: w (書き込み権限) - 自分の申請のみ
CREATE POLICY "member_manage_own_requests" ON requests
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ================================
-- 13. forms テーブル
-- ================================
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;

-- admin: w (書き込み権限)
CREATE POLICY "admin_manage_forms" ON forms
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

-- member: r (読み取り権限)
CREATE POLICY "member_read_forms" ON forms
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'member'
    )
  );

-- ================================
-- 14. request_type_forms テーブル
-- ================================
ALTER TABLE request_type_forms ENABLE ROW LEVEL SECURITY;

-- admin: w (書き込み権限)
CREATE POLICY "admin_manage_request_type_forms" ON request_type_forms
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
-- 15. validations テーブル
-- ================================
ALTER TABLE validations ENABLE ROW LEVEL SECURITY;

-- admin: w (書き込み権限)
CREATE POLICY "admin_manage_validations" ON validations
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

-- member: r (読み取り権限)
CREATE POLICY "member_read_validations" ON validations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'member'
    )
  );

-- ================================
-- 16. features テーブル
-- ================================
ALTER TABLE features ENABLE ROW LEVEL SECURITY;

-- system-admin: r (読み取り権限)
CREATE POLICY "system_admin_read_features" ON features
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'system-admin'
    )
  );

-- ================================
-- 17. feature_companies テーブル
-- ================================
ALTER TABLE feature_companies ENABLE ROW LEVEL SECURITY;

-- system-admin: r (読み取り権限)
CREATE POLICY "system_admin_read_feature_companies" ON feature_companies
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'system-admin'
    )
  );

-- ================================
-- 18. notifications テーブル
-- ================================
-- system-admin: r (読み取り権限)
CREATE POLICY "system_admin_read_notifications" ON notifications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'system-admin'
    )
  );

-- admin: r (読み取り権限)
CREATE POLICY "admin_read_notifications" ON notifications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- member: r (読み取り権限) - 自分の通知のみ
CREATE POLICY "member_read_own_notifications" ON notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- member: w (書き込み権限) - 自分の通知のみ更新
CREATE POLICY "member_update_own_notifications" ON notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ================================
-- 19. logs テーブル
-- ================================
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

-- system-admin: r (読み取り権限)
CREATE POLICY "system_admin_read_logs" ON logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'system-admin'
    )
  );

-- admin: r (読み取り権限)
CREATE POLICY "admin_read_logs" ON logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- member: r (読み取り権限)
CREATE POLICY "member_read_logs" ON logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'member'
    )
  ); 