-- チャット関連テーブルのRLSポリシーで無限再帰を修正
-- 2025-07-31

-- ================================
-- 1. 既存のポリシーを削除
-- ================================

-- chat_messagesテーブルの既存ポリシーを削除
DROP POLICY IF EXISTS "users_can_read_chat_messages" ON chat_messages;
DROP POLICY IF EXISTS "users_can_insert_chat_messages" ON chat_messages;
DROP POLICY IF EXISTS "users_can_update_own_messages" ON chat_messages;

-- chat_usersテーブルの既存ポリシーを削除
DROP POLICY IF EXISTS "users_can_read_chat_users" ON chat_users;
DROP POLICY IF EXISTS "users_can_insert_chat_users" ON chat_users;
DROP POLICY IF EXISTS "users_can_update_own_chat_user" ON chat_users;

-- chatsテーブルの既存ポリシーを削除
DROP POLICY IF EXISTS "users_can_read_company_chats" ON chats;
DROP POLICY IF EXISTS "users_can_create_company_chats" ON chats;

-- chat_message_reactionsテーブルの既存ポリシーを削除
DROP POLICY IF EXISTS "users_can_read_reactions" ON chat_message_reactions;
DROP POLICY IF EXISTS "users_can_insert_reactions" ON chat_message_reactions;
DROP POLICY IF EXISTS "users_can_delete_own_reactions" ON chat_message_reactions;

-- ================================
-- 2. 無限再帰を避けた新しいポリシーを設定
-- ================================

-- chat_messagesテーブルのポリシー
-- 認証済みユーザーは参加しているチャットのメッセージを読み取り可能
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

-- 認証済みユーザーは参加しているチャットにメッセージを送信可能
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

-- ユーザーは自分のメッセージを更新可能
CREATE POLICY "chat_messages_update_policy" ON chat_messages
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ================================
-- 3. chat_usersテーブルのポリシー（無限再帰を避ける）
-- ================================

-- 認証済みユーザーは自分の参加情報を読み取り可能
CREATE POLICY "chat_users_read_own_policy" ON chat_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 認証済みユーザーはチャットに参加可能（自分自身の参加のみ）
CREATE POLICY "chat_users_insert_own_policy" ON chat_users
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ユーザーは自分の参加情報を更新可能
CREATE POLICY "chat_users_update_own_policy" ON chat_users
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ================================
-- 4. chatsテーブルのポリシー
-- ================================

-- 認証済みユーザーは自分の会社のチャットを読み取り可能
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

-- 認証済みユーザーは自分の会社のチャットを作成可能
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

-- ================================
-- 5. chat_message_reactionsテーブルのポリシー
-- ================================

-- 認証済みユーザーは参加しているチャットのリアクションを読み取り可能
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

-- 認証済みユーザーはリアクションを追加可能
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

-- ユーザーは自分のリアクションを削除可能
CREATE POLICY "reactions_delete_policy" ON chat_message_reactions
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ================================
-- 6. 確認用クエリ
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

-- ポリシー設定を確認
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
WHERE schemaname = 'public' 
AND tablename IN ('chats', 'chat_messages', 'chat_users', 'chat_message_reactions')
ORDER BY tablename, policyname; 