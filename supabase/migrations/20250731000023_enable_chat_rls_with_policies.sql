-- チャット関連テーブルのRLSを有効化し、適切なポリシーを設定
-- 2025-07-31

-- ================================
-- 1. chatsテーブルのRLS設定
-- ================================
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザーは自分の企業のチャットを読み取り可能
CREATE POLICY "users_can_read_company_chats" ON chats
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

-- 認証済みユーザーは自分の企業のチャットを作成可能
CREATE POLICY "users_can_create_company_chats" ON chats
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

-- ================================
-- 2. chat_messagesテーブルのRLS設定
-- ================================
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザーは参加しているチャットのメッセージを読み取り可能
CREATE POLICY "users_can_read_chat_messages" ON chat_messages
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

-- 認証済みユーザーは参加しているチャットにメッセージを送信可能
CREATE POLICY "users_can_insert_chat_messages" ON chat_messages
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

-- ユーザーは自分のメッセージを更新可能
CREATE POLICY "users_can_update_own_messages" ON chat_messages
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ================================
-- 3. chat_usersテーブルのRLS設定
-- ================================
ALTER TABLE chat_users ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザーは参加しているチャットの参加者情報を読み取り可能
CREATE POLICY "users_can_read_chat_users" ON chat_users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_users cu
      WHERE cu.chat_id = chat_users.chat_id
      AND cu.user_id = auth.uid()
      AND cu.deleted_at IS NULL
    )
  );

-- 認証済みユーザーはチャットに参加可能
CREATE POLICY "users_can_insert_chat_users" ON chat_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM chat_users cu
      WHERE cu.chat_id = chat_users.chat_id
      AND cu.user_id = auth.uid()
      AND cu.role = 'admin'
      AND cu.deleted_at IS NULL
    )
  );

-- ユーザーは自分の参加情報を更新可能
CREATE POLICY "users_can_update_own_chat_user" ON chat_users
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ================================
-- 4. chat_message_reactionsテーブルのRLS設定
-- ================================
ALTER TABLE chat_message_reactions ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザーは参加しているチャットのリアクションを読み取り可能
CREATE POLICY "users_can_read_reactions" ON chat_message_reactions
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

-- 認証済みユーザーはリアクションを追加可能
CREATE POLICY "users_can_insert_reactions" ON chat_message_reactions
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

-- ユーザーは自分のリアクションを削除可能
CREATE POLICY "users_can_delete_own_reactions" ON chat_message_reactions
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ================================
-- 5. 確認用クエリ
-- ================================

-- RLS設定を確認
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('chats', 'chat_messages', 'chat_users', 'chat_message_reactions')
ORDER BY tablename;

-- Realtime設定を確認
SELECT 
    schemaname,
    tablename
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
AND tablename IN ('chats', 'chat_messages', 'chat_users', 'chat_message_reactions')
ORDER BY tablename; 