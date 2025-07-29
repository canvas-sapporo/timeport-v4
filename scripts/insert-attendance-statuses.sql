-- 指定された会社IDに対してattendance_statusesデータを作成
-- 会社ID: a61d4ced-1033-44da-b9d3-a5a9ebe14978

-- 既存のデータを削除（同じ会社IDのもの）
DELETE FROM attendance_statuses 
WHERE company_id = 'a61d4ced-1033-44da-b9d3-a5a9ebe14978';

-- 正常ステータス（青枠・青文字・白背景）
INSERT INTO attendance_statuses (
  company_id, 
  name, 
  display_name, 
  color, 
  font_color, 
  background_color, 
  sort_order, 
  is_required, 
  logic, 
  description
) VALUES (
  'a61d4ced-1033-44da-b9d3-a5a9ebe14978',
  'normal',
  '正常',
  'outline',
  '#3b82f6',
  '#ffffff',
  1,
  true,
  '{"type": "function", "name": "isNormal", "conditions": [{"field": "clock_records", "operator": "has_sessions", "value": true}, {"field": "clock_records", "operator": "has_completed_sessions", "value": true}]}',
  '通常の勤務状態'
);

-- 遅刻ステータス
INSERT INTO attendance_statuses (
  company_id, 
  name, 
  display_name, 
  color, 
  font_color, 
  background_color, 
  sort_order, 
  is_required, 
  logic, 
  description
) VALUES (
  'a61d4ced-1033-44da-b9d3-a5a9ebe14978',
  'late',
  '遅刻',
  'destructive',
  '#ffffff',
  '#ef4444',
  2,
  true,
  '{"type": "function", "name": "isLate", "conditions": [{"field": "clock_records", "operator": "has_sessions", "value": true}, {"field": "late_minutes", "operator": "greater_than", "value": 0}]}',
  '遅刻した勤務状態'
);

-- 早退ステータス
INSERT INTO attendance_statuses (
  company_id, 
  name, 
  display_name, 
  color, 
  font_color, 
  background_color, 
  sort_order, 
  is_required, 
  logic, 
  description
) VALUES (
  'a61d4ced-1033-44da-b9d3-a5a9ebe14978',
  'early_leave',
  '早退',
  'secondary',
  '#ffffff',
  '#f97316',
  3,
  true,
  '{"type": "function", "name": "isEarlyLeave", "conditions": [{"field": "clock_records", "operator": "has_sessions", "value": true}, {"field": "early_leave_minutes", "operator": "greater_than", "value": 0}]}',
  '早退した勤務状態'
);

-- 欠勤ステータス
INSERT INTO attendance_statuses (
  company_id, 
  name, 
  display_name, 
  color, 
  font_color, 
  background_color, 
  sort_order, 
  is_required, 
  logic, 
  description
) VALUES (
  'a61d4ced-1033-44da-b9d3-a5a9ebe14978',
  'absent',
  '欠勤',
  'outline',
  '#6b7280',
  '#f3f4f6',
  4,
  true,
  '{"type": "function", "name": "isAbsent", "conditions": [{"field": "clock_records", "operator": "empty", "value": true}]}',
  '欠勤状態'
);

-- 作成されたデータを確認
SELECT 
  name,
  display_name,
  color,
  font_color,
  background_color,
  sort_order,
  is_required
FROM attendance_statuses 
WHERE company_id = 'a61d4ced-1033-44da-b9d3-a5a9ebe14978'
ORDER BY sort_order; 