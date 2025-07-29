-- 勤怠ステータス「正常」のスタイルを青枠・青文字・白背景に変更
-- 2025-07-31

-- 既存の「正常」ステータスのスタイルを更新
UPDATE attendance_statuses 
SET 
  color = 'outline',
  font_color = '#3b82f6',
  background_color = '#ffffff',
  updated_at = NOW()
WHERE 
  name = 'normal' 
  AND is_required = true;

-- 更新されたレコード数を確認
SELECT 
  COUNT(*) as updated_records
FROM attendance_statuses 
WHERE name = 'normal' AND is_required = true;

-- 更新後のスタイルを確認
SELECT 
  name,
  display_name,
  color,
  font_color,
  background_color
FROM attendance_statuses 
WHERE name = 'normal' AND is_required = true; 