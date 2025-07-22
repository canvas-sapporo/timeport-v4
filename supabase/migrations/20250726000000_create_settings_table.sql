-- Settings テーブルの作成
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role VARCHAR(20) NOT NULL CHECK (role IN ('system-admin', 'admin', 'member')),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  setting_type VARCHAR(50) NOT NULL,
  setting_key VARCHAR(100) NOT NULL,
  setting_value JSONB NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  -- 制約
  CONSTRAINT settings_role_user_check CHECK (
    (role = 'system-admin' AND user_id IS NULL) OR
    (role IN ('admin', 'member') AND user_id IS NOT NULL)
  ),
  CONSTRAINT settings_unique_key UNIQUE (role, user_id, setting_type, setting_key)
);

-- インデックスの作成
CREATE INDEX idx_settings_role ON settings(role) WHERE deleted_at IS NULL;
CREATE INDEX idx_settings_user ON settings(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_settings_type_key ON settings(setting_type, setting_key) WHERE deleted_at IS NULL;
CREATE INDEX idx_settings_default ON settings(is_default) WHERE deleted_at IS NULL;
CREATE INDEX idx_settings_deleted ON settings(deleted_at);

-- updated_at トリガーの作成
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS の有効化
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- RLS ポリシーの作成
-- 個人設定の読み取り（自分の設定のみ）
CREATE POLICY "Users can read their own settings" ON settings
    FOR SELECT USING (
        auth.uid() = user_id AND deleted_at IS NULL
    );

-- ロール別デフォルト設定の読み取り
CREATE POLICY "Users can read role default settings" ON settings
    FOR SELECT USING (
        user_id IS NULL AND role = (
            SELECT role FROM user_profiles WHERE id = auth.uid()
        ) AND deleted_at IS NULL
    );

-- システムデフォルト設定の読み取り（全ユーザー）
CREATE POLICY "Users can read system default settings" ON settings
    FOR SELECT USING (
        role = 'system-admin' AND user_id IS NULL AND deleted_at IS NULL
    );

-- 個人設定の作成・更新・削除（自分の設定のみ）
CREATE POLICY "Users can manage their own settings" ON settings
    FOR ALL USING (
        auth.uid() = user_id AND deleted_at IS NULL
    );

-- 管理者はロール別デフォルト設定を管理可能
CREATE POLICY "Admins can manage role default settings" ON settings
    FOR ALL USING (
        user_id IS NULL AND role = (
            SELECT role FROM user_profiles WHERE id = auth.uid()
        ) AND deleted_at IS NULL
    );

-- システム管理者は全設定を管理可能
CREATE POLICY "System admins can manage all settings" ON settings
    FOR ALL USING (
        (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'system-admin' AND deleted_at IS NULL
    );

-- デフォルト設定の挿入
INSERT INTO settings (role, setting_type, setting_key, setting_value, is_default) VALUES
-- CSV出力設定のデフォルト
('system-admin', 'csv_export', 'default', '{
  "name": "デフォルト",
  "period": {
    "type": "date_range",
    "start_date": null,
    "end_date": null
  },
  "columns": [
    "date", "clock_in", "clock_out", "work_hours", 
    "overtime", "break_time", "work_type", "late", 
    "early_leave", "status", "approval_status", 
    "approver", "updated_at", "notes"
  ],
  "format": {
    "encoding": "UTF-8",
    "delimiter": "comma",
    "date_format": "YYYY/MM/DD",
    "time_format": "HH:MM",
    "empty_value": "blank"
  }
}', true),

-- 勤怠設定のデフォルト
('system-admin', 'attendance', 'default', '{
  "late_threshold_minutes": 15,
  "early_leave_threshold_minutes": 30,
  "work_hours_per_day": 480,
  "overtime_threshold_minutes": 480
}', true); 