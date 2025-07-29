-- Realtimeテスト用：チャット関連テーブルのRLSを一時的に無効化
-- 2025-07-31

-- ================================
-- RLSの一時的な無効化
-- ================================

-- chat_messagesテーブルのRLSを無効化
ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;

-- chat_usersテーブルのRLSを無効化
ALTER TABLE chat_users DISABLE ROW LEVEL SECURITY;

-- chatsテーブルのRLSを無効化
ALTER TABLE chats DISABLE ROW LEVEL SECURITY;

-- chat_message_reactionsテーブルのRLSを無効化
ALTER TABLE chat_message_reactions DISABLE ROW LEVEL SECURITY;

-- ================================
-- Realtime設定の確認
-- ================================

-- Realtimeが有効になっているテーブルを確認
SELECT 
    schemaname,
    tablename
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- ================================
-- テスト用の確認クエリ
-- ================================

-- 現在のチャットメッセージ数を確認
SELECT COUNT(*) as message_count FROM chat_messages;

-- 現在のチャットユーザー数を確認
SELECT COUNT(*) as user_count FROM chat_users; 