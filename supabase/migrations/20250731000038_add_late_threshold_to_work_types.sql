-- work_typesテーブルに遅刻許容時間フィールドを追加
ALTER TABLE work_types ADD COLUMN IF NOT EXISTS late_threshold_minutes INTEGER DEFAULT 15;

-- 既存のレコードにデフォルト値を設定
UPDATE work_types SET late_threshold_minutes = 15 WHERE late_threshold_minutes IS NULL;

-- コメントを追加
COMMENT ON COLUMN work_types.late_threshold_minutes IS '遅刻許容時間（分）。この時間を超えると遅刻とみなされる。';

-- 設定が正しく適用されたかを確認
SELECT 
  'work_types' as table_name,
  'late_threshold_minutes column added' as status; 