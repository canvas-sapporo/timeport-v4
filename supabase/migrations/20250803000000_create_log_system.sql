-- ================================
-- ログシステムの作成
-- ================================

-- system_logsテーブル（システム技術ログ）
CREATE TABLE system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  -- ログレベル
  level TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error', 'fatal')),
  
  -- リクエスト情報
  host TEXT,
  method TEXT,
  path TEXT,
  status_code INTEGER,
  response_time_ms INTEGER,
  
  -- サイズ情報
  request_size_bytes INTEGER,
  response_size_bytes INTEGER,
  memory_usage_mb INTEGER,
  
  -- エラー情報
  error_message TEXT,
  error_stack TEXT,
  
  -- コンテキスト情報
  user_id UUID REFERENCES user_profiles(id),
  company_id UUID REFERENCES companies(id),
  session_id TEXT,
  
  -- ネットワーク情報
  ip_address TEXT,
  user_agent TEXT,
  referer TEXT,
  
  -- トレーシング情報
  trace_id TEXT,
  request_id TEXT,
  
  -- 機能情報
  feature_name TEXT,
  action_type TEXT,
  resource_type TEXT,
  resource_id UUID,
  
  -- 環境情報
  environment TEXT,
  app_version TEXT,
  
  -- 追加メタデータ
  metadata JSONB,
  
  -- パフォーマンス最適化
  created_date DATE
);

-- audit_logsテーブル（ユーザー操作ログ）
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  -- ユーザー情報
  user_id UUID REFERENCES user_profiles(id),
  company_id UUID REFERENCES companies(id),
  
  -- 操作情報
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  
  -- データ変更
  before_data JSONB,
  after_data JSONB,
  
  -- 詳細情報
  details JSONB,
  
  -- ネットワーク情報
  ip_address TEXT,
  user_agent TEXT,
  
  -- セッション情報
  session_id TEXT,
  
  -- パフォーマンス最適化
  created_date DATE
);

-- log_settingsテーブル（ログ設定）
CREATE TABLE log_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 設定情報
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  description TEXT,
  
  -- 作成者情報
  created_by UUID REFERENCES user_profiles(id)
);

-- ================================
-- インデックス作成
-- ================================

-- system_logs インデックス
CREATE INDEX idx_system_logs_created_at ON system_logs(created_at);
CREATE INDEX idx_system_logs_level_date ON system_logs(level, created_date);
CREATE INDEX idx_system_logs_error_date ON system_logs(created_date) WHERE error_message IS NOT NULL;
CREATE INDEX idx_system_logs_user_date ON system_logs(user_id, created_date);
CREATE INDEX idx_system_logs_path_date ON system_logs(path, created_date);
CREATE INDEX idx_system_logs_trace_id ON system_logs(trace_id);
CREATE INDEX idx_system_logs_feature_date ON system_logs(feature_name, created_date);
CREATE INDEX idx_system_logs_env_date ON system_logs(environment, created_date);
CREATE INDEX idx_system_logs_company_date ON system_logs(company_id, created_date);

-- audit_logs インデックス
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_user_date ON audit_logs(user_id, created_date);
CREATE INDEX idx_audit_logs_action_date ON audit_logs(action, created_date);
CREATE INDEX idx_audit_logs_target_date ON audit_logs(target_type, created_date);
CREATE INDEX idx_audit_logs_company_date ON audit_logs(company_id, created_date);

-- ================================
-- デフォルト設定の挿入
-- ================================

INSERT INTO log_settings (setting_key, setting_value, description) VALUES
('system_log_level', '["info", "warn", "error", "fatal"]', '保存するシステムログレベル'),
('system_log_enabled', 'true', 'システムログ機能の有効/無効'),
('audit_log_enabled', 'true', '監査ログ機能の有効/無効'),
('buffer_size', '100', 'ログバッファサイズ（件数）'),
('flush_interval', '5', 'ログフラッシュ間隔（秒）'),
('error_log_immediate', 'true', 'エラーログの即座書き込み有無');

-- ================================
-- RLSポリシー設定
-- ================================

-- system_logs RLS
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- system_adminのみアクセス可能
CREATE POLICY "system_admin_access_system_logs" ON system_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'system_admin'
    )
  );

-- audit_logs RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- system_adminのみアクセス可能
CREATE POLICY "system_admin_access_audit_logs" ON audit_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'system_admin'
    )
  );

-- log_settings RLS
ALTER TABLE log_settings ENABLE ROW LEVEL SECURITY;

-- system_adminのみアクセス可能
CREATE POLICY "system_admin_access_log_settings" ON log_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'system_admin'
    )
  );

-- ================================
-- トリガー設定
-- ================================

-- updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- created_date自動設定トリガー
CREATE OR REPLACE FUNCTION set_created_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_date = DATE(NEW.created_at);
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_system_logs_updated_at BEFORE UPDATE ON system_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_system_logs_created_date BEFORE INSERT ON system_logs
  FOR EACH ROW EXECUTE FUNCTION set_created_date();

CREATE TRIGGER update_audit_logs_updated_at BEFORE UPDATE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_audit_logs_created_date BEFORE INSERT ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION set_created_date();

CREATE TRIGGER update_log_settings_updated_at BEFORE UPDATE ON log_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 