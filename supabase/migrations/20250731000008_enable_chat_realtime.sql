-- チャット関連テーブルのRealtime機能を有効化
-- 2025-07-31

-- ================================
-- Realtime機能の有効化
-- ================================

-- chat_messagesテーブルのRealtimeを有効化
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- chat_usersテーブルのRealtimeを有効化
ALTER PUBLICATION supabase_realtime ADD TABLE chat_users;

-- chat_message_reactionsテーブルのRealtimeを有効化
ALTER PUBLICATION supabase_realtime ADD TABLE chat_message_reactions;

-- ================================
-- 確認用クエリ
-- ================================

-- Realtimeが有効になっているテーブルを確認
SELECT 
    schemaname,
    tablename,
    attname,
    atttypid::regtype as data_type
FROM pg_publication_tables pt
JOIN pg_attribute a ON a.attrelid = pt.tablename::regclass
WHERE pt.pubname = 'supabase_realtime'
AND a.attnum > 0
AND NOT a.attisdropped
ORDER BY tablename, attnum; 