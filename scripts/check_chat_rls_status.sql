-- チャット関連テーブルのRLSポリシーとデータ状況を確認
-- 2025-07-31

-- ================================
-- 1. RLSポリシーの確認
-- ================================

-- chatsテーブルのRLSポリシー
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'chats'
ORDER BY policyname;

-- chat_usersテーブルのRLSポリシー
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'chat_users'
ORDER BY policyname;

-- chat_messagesテーブルのRLSポリシー
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'chat_messages'
ORDER BY policyname;

-- ================================
-- 2. データの確認
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

-- ================================
-- 3. 現在のユーザーでのアクセステスト
-- ================================

-- 米沢さんのユーザーIDでチャットにアクセスできるかテスト
-- 注意: このクエリは実際のユーザーIDで実行する必要があります
SELECT 
    'chats' as table_name,
    COUNT(*) as accessible_count
FROM chats 
WHERE EXISTS (
    SELECT 1 FROM chat_users cu
    WHERE cu.chat_id = chats.id
    AND cu.user_id = '25f05fb9-d2b4-4928-976a-b0b79c456c30'::uuid
    AND cu.deleted_at IS NULL
)
AND deleted_at IS NULL

UNION ALL

SELECT 
    'chat_users' as table_name,
    COUNT(*) as accessible_count
FROM chat_users 
WHERE user_id = '25f05fb9-d2b4-4928-976a-b0b79c456c30'::uuid
AND deleted_at IS NULL

UNION ALL

SELECT 
    'chat_messages' as table_name,
    COUNT(*) as accessible_count
FROM chat_messages 
WHERE EXISTS (
    SELECT 1 FROM chat_users cu
    WHERE cu.chat_id = chat_messages.chat_id
    AND cu.user_id = '25f05fb9-d2b4-4928-976a-b0b79c456c30'::uuid
    AND cu.deleted_at IS NULL
)
AND deleted_at IS NULL; 