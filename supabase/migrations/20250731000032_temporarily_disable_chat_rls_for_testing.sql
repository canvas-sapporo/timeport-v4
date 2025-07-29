-- チャット関連テーブルのRLSを一時的に無効にしてテスト
-- 2025-07-31

-- ================================
-- 1. 現在のRLS状況を確認
-- ================================

-- RLSが有効になっているテーブルを確認
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('chats', 'chat_users', 'chat_messages', 'chat_message_reactions')
AND schemaname = 'public';

-- ================================
-- 2. RLSを一時的に無効化
-- ================================

-- チャット関連テーブルのRLSを無効化
ALTER TABLE chats DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_message_reactions DISABLE ROW LEVEL SECURITY;

-- ================================
-- 3. 無効化後の状況を確認
-- ================================

-- RLSが無効になったことを確認
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('chats', 'chat_users', 'chat_messages', 'chat_message_reactions')
AND schemaname = 'public';

-- ================================
-- 4. テストデータの確認
-- ================================

-- テストチャットの存在確認
SELECT 
    id,
    name,
    chat_type,
    company_id,
    created_by,
    created_at
FROM chats 
WHERE name = 'テストチャット';

-- チャット参加者の確認
SELECT 
    cu.id,
    cu.chat_id,
    cu.user_id,
    cu.role,
    up.family_name || ' ' || up.first_name as user_name,
    c.name as chat_name
FROM chat_users cu
JOIN chats c ON cu.chat_id = c.id
JOIN user_profiles up ON cu.user_id = up.id
WHERE c.name = 'テストチャット';

-- メッセージの確認
SELECT 
    cm.id,
    cm.chat_id,
    cm.user_id,
    cm.content,
    cm.message_type,
    up.family_name || ' ' || up.first_name as user_name,
    c.name as chat_name
FROM chat_messages cm
JOIN chats c ON cm.chat_id = c.id
JOIN user_profiles up ON cm.user_id = up.id
WHERE c.name = 'テストチャット'
ORDER BY cm.created_at; 