-- すべてのチャット関連ポリシーを完全に削除し、新しいポリシーのみを設定
-- 2025-07-31

-- ================================
-- 1. すべての既存ポリシーを削除
-- ================================

-- chat_messagesテーブルのすべてのポリシーを削除
DROP POLICY IF EXISTS "Chat participants can send messages" ON chat_messages;
DROP POLICY IF EXISTS "Message authors can update their messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can read messages from their chats" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_insert_policy" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_read_policy" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_update_policy" ON chat_messages;
DROP POLICY IF EXISTS "users_can_read_chat_messages" ON chat_messages;
DROP POLICY IF EXISTS "users_can_insert_chat_messages" ON chat_messages;
DROP POLICY IF EXISTS "users_can_update_own_messages" ON chat_messages;

-- chat_usersテーブルのすべてのポリシーを削除
DROP POLICY IF EXISTS "Admins can manage chat participants" ON chat_users;
DROP POLICY IF EXISTS "Users can read chat participants" ON chat_users;
DROP POLICY IF EXISTS "Users can update their own participation" ON chat_users;
DROP POLICY IF EXISTS "chat_users_insert_own_policy" ON chat_users;
DROP POLICY IF EXISTS "chat_users_read_own_policy" ON chat_users;
DROP POLICY IF EXISTS "chat_users_update_own_policy" ON chat_users;
DROP POLICY IF EXISTS "users_can_read_chat_users" ON chat_users;
DROP POLICY IF EXISTS "users_can_insert_chat_users" ON chat_users;
DROP POLICY IF EXISTS "users_can_update_own_chat_user" ON chat_users;

-- chatsテーブルのすべてのポリシーを削除
DROP POLICY IF EXISTS "Admins can create chats" ON chats;
DROP POLICY IF EXISTS "Chat creators and admins can update chats" ON chats;
DROP POLICY IF EXISTS "Users can read chats they participate in" ON chats;
DROP POLICY IF EXISTS "chats_insert_policy" ON chats;
DROP POLICY IF EXISTS "chats_read_policy" ON chats;
DROP POLICY IF EXISTS "users_can_read_company_chats" ON chats;
DROP POLICY IF EXISTS "users_can_create_company_chats" ON chats;

-- chat_message_reactionsテーブルのすべてのポリシーを削除
DROP POLICY IF EXISTS "Chat participants can manage reactions" ON chat_message_reactions;
DROP POLICY IF EXISTS "Users can read reactions from their chats" ON chat_message_reactions;
DROP POLICY IF EXISTS "reactions_delete_policy" ON chat_message_reactions;
DROP POLICY IF EXISTS "reactions_insert_policy" ON chat_message_reactions;
DROP POLICY IF EXISTS "reactions_read_policy" ON chat_message_reactions;
DROP POLICY IF EXISTS "users_can_read_reactions" ON chat_message_reactions;
DROP POLICY IF EXISTS "users_can_insert_reactions" ON chat_message_reactions;
DROP POLICY IF EXISTS "users_can_delete_own_reactions" ON chat_message_reactions;

-- ================================
-- 2. 新しいポリシーを設定（無限再帰を避ける）
-- ================================

-- chat_messagesテーブルのポリシー
CREATE POLICY "chat_messages_read_policy" ON chat_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_users cu
      WHERE cu.chat_id = chat_messages.chat_id
      AND cu.user_id = auth.uid()
      AND cu.deleted_at IS NULL
    )
  );

CREATE POLICY "chat_messages_insert_policy" ON chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM chat_users cu
      WHERE cu.chat_id = chat_messages.chat_id
      AND cu.user_id = auth.uid()
      AND cu.deleted_at IS NULL
    )
  );

CREATE POLICY "chat_messages_update_policy" ON chat_messages
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- chat_usersテーブルのポリシー（無限再帰を避ける）
CREATE POLICY "chat_users_read_policy" ON chat_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "chat_users_insert_policy" ON chat_users
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "chat_users_update_policy" ON chat_users
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- chatsテーブルのポリシー
CREATE POLICY "chats_read_policy" ON chats
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_groups ug
      JOIN groups g ON ug.group_id = g.id
      WHERE ug.user_id = auth.uid()
      AND g.company_id = chats.company_id
      AND ug.deleted_at IS NULL
      AND g.deleted_at IS NULL
    )
  );

CREATE POLICY "chats_insert_policy" ON chats
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_groups ug
      JOIN groups g ON ug.group_id = g.id
      WHERE ug.user_id = auth.uid()
      AND g.company_id = chats.company_id
      AND ug.deleted_at IS NULL
      AND g.deleted_at IS NULL
    )
  );

-- chat_message_reactionsテーブルのポリシー
CREATE POLICY "reactions_read_policy" ON chat_message_reactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_users cu
      JOIN chat_messages cm ON cu.chat_id = cm.chat_id
      WHERE cu.user_id = auth.uid()
      AND cm.id = chat_message_reactions.message_id
      AND cu.deleted_at IS NULL
    )
  );

CREATE POLICY "reactions_insert_policy" ON chat_message_reactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM chat_users cu
      JOIN chat_messages cm ON cu.chat_id = cm.chat_id
      WHERE cu.user_id = auth.uid()
      AND cm.id = chat_message_reactions.message_id
      AND cu.deleted_at IS NULL
    )
  );

CREATE POLICY "reactions_delete_policy" ON chat_message_reactions
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ================================
-- 3. 確認用クエリ
-- ================================

-- 現在のポリシー一覧を確認
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('chats', 'chat_messages', 'chat_users', 'chat_message_reactions')
ORDER BY tablename, policyname;

-- RLS設定を確認
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('chats', 'chat_messages', 'chat_users', 'chat_message_reactions')
ORDER BY tablename; 