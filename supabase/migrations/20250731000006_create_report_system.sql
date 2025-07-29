-- Create report_statuses table
CREATE TABLE IF NOT EXISTS report_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL, -- システム内部名 (draft, submitted, unread, read, review, resubmit, completed)
  display_name VARCHAR(100) NOT NULL, -- 表示名 (作成中, 提出済み, 未読, 既読, レビュー, 再提出, 完了)
  font_color VARCHAR(7) NOT NULL DEFAULT '#000000', -- 文字色 (hex color)
  background_color VARCHAR(7) NOT NULL DEFAULT '#ffffff', -- 背景色 (hex color)
  order_index INTEGER NOT NULL DEFAULT 0, -- 表示順序
  is_active BOOLEAN NOT NULL DEFAULT true, -- 有効/無効フラグ
  is_required BOOLEAN NOT NULL DEFAULT false, -- 必須フラグ（削除不可）
  description TEXT, -- 説明
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create report_templates table
CREATE TABLE IF NOT EXISTS report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE SET NULL, -- NULLの場合は全グループで使用可能
  name VARCHAR(255) NOT NULL, -- 例：「日報テンプレート」「週報テンプレート」
  description TEXT,
  form_config JSONB NOT NULL, -- 動的フォーム設定
  approval_flow JSONB NOT NULL, -- 承認フロー設定
  status_flow JSONB NOT NULL, -- ステータス遷移ルール
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES report_templates(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content JSONB NOT NULL, -- 動的フォームデータ
  current_status_id UUID NOT NULL REFERENCES report_statuses(id) ON DELETE RESTRICT,
  report_date DATE NOT NULL, -- レポート対象日
  submitted_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create report_approvals table
CREATE TABLE IF NOT EXISTS report_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  status_id UUID NOT NULL REFERENCES report_statuses(id) ON DELETE RESTRICT, -- 承認時のステータスを記録
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create report_attachments table
CREATE TABLE IF NOT EXISTS report_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL, -- Supabase Storage パス
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_report_statuses_company_id ON report_statuses(company_id);
CREATE INDEX IF NOT EXISTS idx_report_statuses_is_active ON report_statuses(is_active);
CREATE INDEX IF NOT EXISTS idx_report_statuses_order_index ON report_statuses(order_index);

CREATE INDEX IF NOT EXISTS idx_report_templates_company_id ON report_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_report_templates_group_id ON report_templates(group_id);
CREATE INDEX IF NOT EXISTS idx_report_templates_is_active ON report_templates(is_active);

CREATE INDEX IF NOT EXISTS idx_reports_company_id ON reports(company_id);
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_template_id ON reports(template_id);
CREATE INDEX IF NOT EXISTS idx_reports_current_status_id ON reports(current_status_id);
CREATE INDEX IF NOT EXISTS idx_reports_report_date ON reports(report_date);
CREATE INDEX IF NOT EXISTS idx_reports_submitted_at ON reports(submitted_at);

CREATE INDEX IF NOT EXISTS idx_report_approvals_report_id ON report_approvals(report_id);
CREATE INDEX IF NOT EXISTS idx_report_approvals_approver_id ON report_approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_report_approvals_status_id ON report_approvals(status_id);

CREATE INDEX IF NOT EXISTS idx_report_attachments_report_id ON report_attachments(report_id);

-- Enable RLS
ALTER TABLE report_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_attachments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for report_statuses
CREATE POLICY "Users can view report statuses for their company" ON report_statuses
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM user_groups ug
      JOIN groups g ON ug.group_id = g.id
      WHERE ug.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage report statuses for their company" ON report_statuses
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM user_groups ug
      JOIN groups g ON ug.group_id = g.id
      WHERE ug.user_id = auth.uid()
    ) AND
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create RLS policies for report_templates
CREATE POLICY "Users can view report templates for their company and group" ON report_templates
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM user_groups ug
      JOIN groups g ON ug.group_id = g.id
      WHERE ug.user_id = auth.uid()
    ) AND
    (group_id IS NULL OR group_id IN (
      SELECT group_id FROM user_groups WHERE user_id = auth.uid()
    ))
  );

CREATE POLICY "Admins can manage report templates for their company" ON report_templates
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM user_groups ug
      JOIN groups g ON ug.group_id = g.id
      WHERE ug.user_id = auth.uid()
    ) AND
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create RLS policies for reports
CREATE POLICY "Users can view their own reports" ON reports
  FOR SELECT USING (
    user_id = auth.uid() AND
    company_id IN (
      SELECT company_id FROM user_groups ug
      JOIN groups g ON ug.group_id = g.id
      WHERE ug.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view reports they need to approve" ON reports
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM user_groups ug
      JOIN groups g ON ug.group_id = g.id
      WHERE ug.user_id = auth.uid()
    ) AND
    EXISTS (
      SELECT 1 FROM report_approvals ra
      WHERE ra.report_id = reports.id AND ra.approver_id = auth.uid()
    )
  );

CREATE POLICY "Users can create reports" ON reports
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    company_id IN (
      SELECT company_id FROM user_groups ug
      JOIN groups g ON ug.group_id = g.id
      WHERE ug.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own reports" ON reports
  FOR UPDATE USING (
    user_id = auth.uid() AND
    company_id IN (
      SELECT company_id FROM user_groups ug
      JOIN groups g ON ug.group_id = g.id
      WHERE ug.user_id = auth.uid()
    )
  );

-- Create RLS policies for report_approvals
CREATE POLICY "Users can view report approvals for their reports" ON report_approvals
  FOR SELECT USING (
    report_id IN (
      SELECT id FROM reports WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view report approvals they are involved in" ON report_approvals
  FOR SELECT USING (
    approver_id = auth.uid() OR
    report_id IN (
      SELECT id FROM reports WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Approvers can create report approvals" ON report_approvals
  FOR INSERT WITH CHECK (
    approver_id = auth.uid() AND
    report_id IN (
      SELECT ra.report_id FROM report_approvals ra
      WHERE ra.approver_id = auth.uid()
    )
  );

-- Create RLS policies for report_attachments
CREATE POLICY "Users can view attachments for their reports" ON report_attachments
  FOR SELECT USING (
    report_id IN (
      SELECT id FROM reports WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view attachments for reports they need to approve" ON report_attachments
  FOR SELECT USING (
    report_id IN (
      SELECT ra.report_id FROM report_approvals ra
      WHERE ra.approver_id = auth.uid()
    )
  );

CREATE POLICY "Users can create attachments for their reports" ON report_attachments
  FOR INSERT WITH CHECK (
    report_id IN (
      SELECT id FROM reports WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete attachments for their reports" ON report_attachments
  FOR DELETE USING (
    report_id IN (
      SELECT id FROM reports WHERE user_id = auth.uid()
    )
  );

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_report_statuses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_report_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_report_approvals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_report_attachments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_report_statuses_updated_at_trigger
  BEFORE UPDATE ON report_statuses
  FOR EACH ROW
  EXECUTE FUNCTION update_report_statuses_updated_at();

CREATE TRIGGER update_report_templates_updated_at_trigger
  BEFORE UPDATE ON report_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_report_templates_updated_at();

CREATE TRIGGER update_reports_updated_at_trigger
  BEFORE UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION update_reports_updated_at();

CREATE TRIGGER update_report_approvals_updated_at_trigger
  BEFORE UPDATE ON report_approvals
  FOR EACH ROW
  EXECUTE FUNCTION update_report_approvals_updated_at();

CREATE TRIGGER update_report_attachments_updated_at_trigger
  BEFORE UPDATE ON report_attachments
  FOR EACH ROW
  EXECUTE FUNCTION update_report_attachments_updated_at();

-- Create function to prevent deletion of required statuses
CREATE OR REPLACE FUNCTION prevent_required_report_status_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_required = true THEN
    RAISE EXCEPTION '必須のレポートステータスは削除できません';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent deletion of required statuses
CREATE TRIGGER prevent_required_report_status_deletion_trigger
  BEFORE DELETE ON report_statuses
  FOR EACH ROW
  EXECUTE FUNCTION prevent_required_report_status_deletion();

-- Insert default report statuses for existing companies
INSERT INTO report_statuses (company_id, name, display_name, font_color, background_color, order_index, is_required, description)
SELECT
  c.id, 'draft', '作成中', '#ffffff', '#6b7280', 1, true,
  'レポート作成中の状態'
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM report_statuses WHERE company_id = c.id AND name = 'draft');

INSERT INTO report_statuses (company_id, name, display_name, font_color, background_color, order_index, is_required, description)
SELECT
  c.id, 'submitted', '提出済み', '#ffffff', '#3b82f6', 2, true,
  'レポートが提出された状態'
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM report_statuses WHERE company_id = c.id AND name = 'submitted');

INSERT INTO report_statuses (company_id, name, display_name, font_color, background_color, order_index, is_required, description)
SELECT
  c.id, 'unread', '未読', '#ffffff', '#f59e0b', 3, true,
  '承認者が未読の状態'
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM report_statuses WHERE company_id = c.id AND name = 'unread');

INSERT INTO report_statuses (company_id, name, display_name, font_color, background_color, order_index, is_required, description)
SELECT
  c.id, 'read', '既読', '#ffffff', '#10b981', 4, true,
  '承認者が既読の状態'
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM report_statuses WHERE company_id = c.id AND name = 'read');

INSERT INTO report_statuses (company_id, name, display_name, font_color, background_color, order_index, is_required, description)
SELECT
  c.id, 'review', 'レビュー', '#ffffff', '#8b5cf6', 5, true,
  'レビュー中の状態'
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM report_statuses WHERE company_id = c.id AND name = 'review');

INSERT INTO report_statuses (company_id, name, display_name, font_color, background_color, order_index, is_required, description)
SELECT
  c.id, 'resubmit', '再提出', '#ffffff', '#ef4444', 6, true,
  '再提出が必要な状態'
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM report_statuses WHERE company_id = c.id AND name = 'resubmit');

INSERT INTO report_statuses (company_id, name, display_name, font_color, background_color, order_index, is_required, description)
SELECT
  c.id, 'completed', '完了', '#ffffff', '#059669', 7, true,
  'レポートが完了した状態'
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM report_statuses WHERE company_id = c.id AND name = 'completed');

-- Create unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS unique_company_report_status_name_active 
ON report_statuses(company_id, name) 
WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS unique_company_report_template_name_active 
ON report_templates(company_id, name) 
WHERE deleted_at IS NULL;