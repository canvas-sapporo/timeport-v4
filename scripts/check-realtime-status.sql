-- Supabase Realtime設定の現在の状態を確認
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
AND tablename IN ('chat_messages', 'chat_users', 'chats', 'chat_message_reactions')
ORDER BY tablename;

-- 3. 現在のメッセージ数を確認
SELECT COUNT(*) as message_count FROM chat_messages;

-- 4. 最新のメッセージを確認
SELECT 
    id,
    chat_id,
    user_id,
    content,
    created_at
FROM chat_messages 
ORDER BY created_at DESC 
LIMIT 5;

-- 5. Realtimeが有効になっているか確認
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

-- 6. テスト用：新しいメッセージを挿入
INSERT INTO chat_messages (chat_id, user_id, content, message_type)
VALUES (
    '7dd3d89f-3381-460f-a44e-ed6a86e8cf57',
    '25f05fb9-d2b4-4928-976a-b0b79c456c30',
    'SQLからのテストメッセージ ' || NOW(),
    'text'
)
RETURNING id, content, created_at; 