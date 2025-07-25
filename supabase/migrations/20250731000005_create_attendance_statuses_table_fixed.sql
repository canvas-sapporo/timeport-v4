-- Create attendance_statuses table
CREATE TABLE IF NOT EXISTS attendance_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL, -- システム内部名 (normal, late, early_leave, absent, etc.)
  display_name VARCHAR(100) NOT NULL, -- 表示名 (正常, 遅刻, 早退, 欠勤, etc.)
  color VARCHAR(20) NOT NULL DEFAULT 'default', -- バッジの色 (default, destructive, secondary, outline, etc.)
  font_color VARCHAR(7) NOT NULL DEFAULT '#000000', -- フォント色 (hex color)
  background_color VARCHAR(7) NOT NULL DEFAULT '#ffffff', -- 背景色 (hex color)
  sort_order INTEGER NOT NULL DEFAULT 0, -- 表示順序
  is_active BOOLEAN NOT NULL DEFAULT true, -- 有効/無効フラグ
  is_required BOOLEAN NOT NULL DEFAULT false, -- 必須フラグ（削除不可）
  logic TEXT, -- ステータス判定ロジック（JSON形式）
  description TEXT, -- 説明
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_attendance_statuses_company_id ON attendance_statuses(company_id);
CREATE INDEX IF NOT EXISTS idx_attendance_statuses_is_active ON attendance_statuses(is_active);
CREATE INDEX IF NOT EXISTS idx_attendance_statuses_sort_order ON attendance_statuses(sort_order);
CREATE INDEX IF NOT EXISTS idx_attendance_statuses_is_required ON attendance_statuses(is_required);

-- Enable RLS
ALTER TABLE attendance_statuses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view attendance statuses for their company" ON attendance_statuses
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM user_groups ug
      JOIN groups g ON ug.group_id = g.id
      WHERE ug.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage attendance statuses for their company" ON attendance_statuses
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

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_attendance_statuses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_attendance_statuses_updated_at_trigger
  BEFORE UPDATE ON attendance_statuses
  FOR EACH ROW
  EXECUTE FUNCTION update_attendance_statuses_updated_at();

-- Create function to prevent deletion of required statuses
CREATE OR REPLACE FUNCTION prevent_required_status_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_required = true THEN
    RAISE EXCEPTION '必須の勤怠ステータスは削除できません';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent deletion of required statuses
CREATE TRIGGER prevent_required_status_deletion_trigger
  BEFORE DELETE ON attendance_statuses
  FOR EACH ROW
  EXECUTE FUNCTION prevent_required_status_deletion();

-- Insert default attendance statuses for existing companies
INSERT INTO attendance_statuses (company_id, name, display_name, color, font_color, background_color, sort_order, is_required, logic, description)
SELECT
  c.id, 'normal', '正常', 'default', '#ffffff', '#3b82f6', 1, true,
  '{"type": "function", "name": "isNormal", "conditions": [{"field": "clock_records", "operator": "has_sessions", "value": true}, {"field": "clock_records", "operator": "has_completed_sessions", "value": true}]}',
  '通常の勤務状態'
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM attendance_statuses WHERE company_id = c.id AND name = 'normal');

INSERT INTO attendance_statuses (company_id, name, display_name, color, font_color, background_color, sort_order, is_required, logic, description)
SELECT
  c.id, 'late', '遅刻', 'destructive', '#ffffff', '#ef4444', 2, true,
  '{"type": "function", "name": "isLate", "conditions": [{"field": "clock_records", "operator": "has_sessions", "value": true}, {"field": "late_minutes", "operator": "greater_than", "value": 0}]}',
  '遅刻した勤務状態'
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM attendance_statuses WHERE company_id = c.id AND name = 'late');

INSERT INTO attendance_statuses (company_id, name, display_name, color, font_color, background_color, sort_order, is_required, logic, description)
SELECT
  c.id, 'early_leave', '早退', 'secondary', '#ffffff', '#f97316', 3, true,
  '{"type": "function", "name": "isEarlyLeave", "conditions": [{"field": "clock_records", "operator": "has_sessions", "value": true}, {"field": "early_leave_minutes", "operator": "greater_than", "value": 0}]}',
  '早退した勤務状態'
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM attendance_statuses WHERE company_id = c.id AND name = 'early_leave');

INSERT INTO attendance_statuses (company_id, name, display_name, color, font_color, background_color, sort_order, is_required, logic, description)
SELECT
  c.id, 'absent', '欠勤', 'outline', '#6b7280', '#f3f4f6', 4, true,
  '{"type": "function", "name": "isAbsent", "conditions": [{"field": "clock_records", "operator": "empty", "value": true}]}',
  '欠勤状態'
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM attendance_statuses WHERE company_id = c.id AND name = 'absent');

-- Add unique constraint (partial index for soft delete)
CREATE UNIQUE INDEX IF NOT EXISTS unique_company_status_name_active 
  ON attendance_statuses (company_id, name) 
  WHERE deleted_at IS NULL; 