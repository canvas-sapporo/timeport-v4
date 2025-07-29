-- Supabase Realtime設定確認用SQL
-- SupabaseダッシュボードのSQL Editorで実行してください

-- 1. Realtimeが有効になっているテーブルを確認
SELECT 
    schemaname,
    tablename
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- 2. チャット関連テーブルのRLS設定を確認
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('chat_messages', 'chat_users', 'chats', 'chat_message_reactions');

-- 3. Realtimeが有効になっているか確認
SELECT 
    t.table_name,
    CASE 
        WHEN pt.tablename IS NOT NULL THEN '有効'
        ELSE '無効'
    END as realtime_status
FROM information_schema.tables t
LEFT JOIN pg_publication_tables pt ON pt.tablename = t.table_name
WHERE t.table_schema = 'public'
AND t.table_name IN ('chat_messages', 'chat_users', 'chats', 'chat_message_reactions');

-- 4. 現在のメッセージ数を確認
SELECT COUNT(*) as message_count FROM chat_messages;

-- 5. 最新のメッセージを確認
SELECT 
    id,
    chat_id,
    user_id,
    content,
    created_at
FROM chat_messages 
ORDER BY created_at DESC 
LIMIT 5; 