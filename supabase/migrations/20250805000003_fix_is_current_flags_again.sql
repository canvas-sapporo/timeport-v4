-- 既存のattendancesテーブルのis_currentフラグを再修正
-- 同じ日付・ユーザーの組み合わせで、最新のレコードのみis_current=trueに設定

-- 一時的にすべてのレコードをis_current=falseに設定
UPDATE attendances 
SET is_current = false 
WHERE deleted_at IS NULL;

-- 各日付・ユーザーの組み合わせで最新のレコードをis_current=trueに設定
WITH latest_records AS (
  SELECT DISTINCT ON (user_id, work_date) 
    id,
    user_id,
    work_date,
    created_at
  FROM attendances 
  WHERE deleted_at IS NULL
  ORDER BY user_id, work_date, created_at DESC
)
UPDATE attendances 
SET is_current = true 
WHERE id IN (SELECT id FROM latest_records);

-- 修正結果を確認するためのクエリ
SELECT 
  user_id, 
  work_date, 
  COUNT(*) as total_records,
  COUNT(CASE WHEN is_current = true THEN 1 END) as current_records
FROM attendances 
WHERE deleted_at IS NULL
GROUP BY user_id, work_date
HAVING COUNT(CASE WHEN is_current = true THEN 1 END) != 1
ORDER BY user_id, work_date; 