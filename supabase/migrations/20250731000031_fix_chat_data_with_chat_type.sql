-- テスト用のチャットデータを作成（chat_typeカラムを含む）
-- 2025-07-31

-- ================================
-- 1. 現在のデータ状況を確認
-- ================================

-- チャット関連テーブルの現在のデータ数を確認
SELECT 'chats' as table_name, COUNT(*) as count FROM chats
UNION ALL
SELECT 'chat_users' as table_name, COUNT(*) as count FROM chat_users
UNION ALL
SELECT 'chat_messages' as table_name, COUNT(*) as count FROM chat_messages
UNION ALL
SELECT 'chat_message_reactions' as table_name, COUNT(*) as count FROM chat_message_reactions;

-- ================================
-- 2. テスト用チャットデータを作成
-- ================================

-- テスト用チャットを作成（chat_typeカラムを含む）
INSERT INTO chats (id, company_id, name, chat_type, created_by, created_at, updated_at, deleted_at)
VALUES (
  gen_random_uuid(),
  'a61d4ced-1033-44da-b9d3-a5a9ebe14978', -- 米沢さんの企業ID
  'テストチャット',
  'group', -- chat_typeを追加
  '25f05fb9-d2b4-4928-976a-b0b79c456c30', -- 米沢さんのユーザーID
  NOW(),
  NOW(),
  NULL
);

-- 作成したチャットのIDを取得
DO $$
DECLARE
    chat_id uuid;
BEGIN
    -- 最新のチャットIDを取得
    SELECT id INTO chat_id FROM chats 
    WHERE name = 'テストチャット' 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    -- チャット参加者を追加（米沢さん）
    INSERT INTO chat_users (id, chat_id, user_id, role, joined_at, created_at, updated_at, deleted_at)
    VALUES (
      gen_random_uuid(),
      chat_id,
      '25f05fb9-d2b4-4928-976a-b0b79c456c30', -- 米沢さんのユーザーID
      'member',
      NOW(),
      NOW(),
      NOW(),
      NULL
    );

    -- チャット参加者を追加（鈴木さん）
    INSERT INTO chat_users (id, chat_id, user_id, role, joined_at, created_at, updated_at, deleted_at)
    VALUES (
      gen_random_uuid(),
      chat_id,
      '623c40b1-d388-40be-ba80-8120902c0d5c', -- 鈴木さんのユーザーID
      'member',
      NOW(),
      NOW(),
      NOW(),
      NULL
    );

    -- テストメッセージを追加
    INSERT INTO chat_messages (id, chat_id, user_id, content, message_type, created_at, updated_at, deleted_at)
    VALUES (
      gen_random_uuid(),
      chat_id,
      '25f05fb9-d2b4-4928-976a-b0b79c456c30', -- 米沢さんのユーザーID
      'こんにちは！チャット機能のテストです。',
      'text',
      NOW(),
      NOW(),
      NULL
    );

    INSERT INTO chat_messages (id, chat_id, user_id, content, message_type, created_at, updated_at, deleted_at)
    VALUES (
      gen_random_uuid(),
      chat_id,
      '623c40b1-d388-40be-ba80-8120902c0d5c', -- 鈴木さんのユーザーID
      'はい、チャット機能が正常に動作していますね！',
      'text',
      NOW(),
      NOW(),
      NULL
    );
END $$;

-- ================================
-- 3. 作成後のデータ状況を確認
-- ================================

-- チャット関連テーブルのデータ数を再確認
SELECT 'chats' as table_name, COUNT(*) as count FROM chats
UNION ALL
SELECT 'chat_users' as table_name, COUNT(*) as count FROM chat_users
UNION ALL
SELECT 'chat_messages' as table_name, COUNT(*) as count FROM chat_messages
UNION ALL
SELECT 'chat_message_reactions' as table_name, COUNT(*) as count FROM chat_message_reactions;

-- 作成したチャットの詳細を確認
SELECT 
  c.id as chat_id,
  c.name as chat_name,
  c.chat_type,
  c.company_id,
  cu.user_id,
  up.family_name || ' ' || up.first_name as user_name,
  cm.content as last_message,
  cm.created_at as last_message_at
FROM chats c
LEFT JOIN chat_users cu ON c.id = cu.chat_id
LEFT JOIN user_profiles up ON cu.user_id = up.id
LEFT JOIN chat_messages cm ON c.id = cm.chat_id
WHERE c.name = 'テストチャット'
ORDER BY cm.created_at DESC; 