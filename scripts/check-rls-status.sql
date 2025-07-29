-- RLS設定の現在の状態を確認
-- SupabaseダッシュボードのSQL Editorで実行してください

-- 1. チャット関連テーブルのRLS設定を確認
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('chat_messages', 'chat_users', 'chats', 'chat_message_reactions')
ORDER BY tablename;

-- 2. Realtimeが有効になっているテーブルを確認
SELECT 
    schemaname,
    tablename
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
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
LIMIT 3; 