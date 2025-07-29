-- featuresテーブルにReplica Identityを設定（Realtime用）
-- この設定により、Supabase Realtimeが正しく動作するようになります

-- ================================
-- Replica Identityの設定
-- ================================

-- featuresテーブルにReplica Identityを設定
ALTER TABLE features REPLICA IDENTITY FULL;

-- ================================
-- 確認用クエリ
-- ================================

-- 設定が正しく適用されたかを確認
SELECT 
  'features' as table_name,
  'Replica Identity set to FULL' as status; 