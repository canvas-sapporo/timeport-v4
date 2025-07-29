-- 一時的にチャット関連テーブルのRLSを無効にして動作確認
-- ================================

-- chat_usersテーブルのRLSを一時的に無効化
ALTER TABLE chat_users DISABLE ROW LEVEL SECURITY;

-- chatsテーブルのRLSを一時的に無効化
ALTER TABLE chats DISABLE ROW LEVEL SECURITY;

-- chat_messagesテーブルのRLSを一時的に無効化
ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;

-- chat_message_reactionsテーブルのRLSを一時的に無効化
ALTER TABLE chat_message_reactions DISABLE ROW LEVEL SECURITY; 