-- 既存のwork_dateを日本時間に変換するマイグレーション
-- 実行日時: 2025-01-01

-- 既存のwork_dateを日本時間（JST）に変換
-- UTCから9時間を加算してJSTに変換
UPDATE attendances 
SET work_date = (work_date::timestamp + INTERVAL '9 hours')::date
WHERE work_date IS NOT NULL;

-- 変換結果を確認するためのクエリ（実行後削除可能）
-- SELECT 
--   id,
--   user_id,
--   work_date,
--   created_at,
--   updated_at
-- FROM attendances 
-- WHERE work_date IS NOT NULL
-- ORDER BY created_at DESC
-- LIMIT 10; 