-- 既存企業に複合ステータス「late_early_leave」を追加
-- 2025-07-31

-- ================================
-- 1. 既存の企業に対して新しいステータスを追加
-- ================================

-- 既存の企業に対して新しいステータスを追加
INSERT INTO attendance_statuses (company_id, name, display_name, color, font_color, background_color, sort_order, is_required, logic, description)
SELECT
  c.id, 'late_early_leave', '遅刻・早退', 'destructive', '#ffffff', '#dc2626', 1, true,
  '{"type": "function", "name": "isLateEarlyLeave", "conditions": [{"field": "late_minutes", "operator": "greater_than", "value": 0}, {"field": "early_leave_minutes", "operator": "greater_than", "value": 0}]}',
  '遅刻かつ早退した勤務状態'
FROM companies c 
WHERE NOT EXISTS (
  SELECT 1 FROM attendance_statuses 
  WHERE company_id = c.id AND name = 'late_early_leave'
);

-- ================================
-- 2. 既存のステータスのソート順を調整
-- ================================

-- 既存のステータスのソート順を更新
UPDATE attendance_statuses 
SET sort_order = CASE 
  WHEN name = 'late_early_leave' THEN 1
  WHEN name = 'late' THEN 2
  WHEN name = 'early_leave' THEN 3
  WHEN name = 'normal' THEN 4
  WHEN name = 'absent' THEN 5
  ELSE sort_order
END
WHERE name IN ('late_early_leave', 'late', 'early_leave', 'normal', 'absent');

-- ================================
-- 3. 確認クエリ
-- ================================

-- 企業ごとのステータス状況を確認
SELECT
  c.name as company_name,
  ast.name as status_name,
  ast.display_name as status_display_name,
  ast.sort_order,
  ast.is_required
FROM companies c
JOIN attendance_statuses ast ON c.id = ast.company_id
WHERE c.deleted_at IS NULL AND ast.deleted_at IS NULL
ORDER BY c.name, ast.sort_order; 