-- Supabase Realtime有効化スクリプト
-- SupabaseダッシュボードのSQL Editorで実行してください

-- 1. チャット関連テーブルのRealtimeを有効化
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_users;
ALTER PUBLICATION supabase_realtime ADD TABLE chats;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_message_reactions;

-- 2. 確認：Realtimeが有効になっているテーブルを表示
SELECT 
    schemaname,
    tablename
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
AND tablename IN ('chat_messages', 'chat_users', 'chats', 'chat_message_reactions')
ORDER BY tablename;

-- 3. RLSを一時的に無効化（Realtimeテスト用）
ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE chats DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_message_reactions DISABLE ROW LEVEL SECURITY;

-- 4. 確認：RLS設定を表示
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('chat_messages', 'chat_users', 'chats', 'chat_message_reactions'); 