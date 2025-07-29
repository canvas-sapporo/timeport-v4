-- chat_usersテーブルのポリシーを修正してチャット機能を正常化
-- 2025-07-31

-- ================================
-- 1. 既存のchat_usersポリシーを削除
-- ================================

DROP POLICY IF EXISTS "chat_users_read_policy" ON chat_users;
DROP POLICY IF EXISTS "chat_users_insert_policy" ON chat_users;
DROP POLICY IF EXISTS "chat_users_update_policy" ON chat_users;

-- ================================
-- 2. 新しいchat_usersポリシーを設定
-- ================================

-- 認証済みユーザーは参加しているチャットの参加者情報を読み取り可能
CREATE POLICY "chat_users_read_policy" ON chat_users
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
CREATE POLICY "chat_users_insert_policy" ON chat_users
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ユーザーは自分の参加情報を更新可能
CREATE POLICY "chat_users_update_policy" ON chat_users
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

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
AND tablename = 'chat_users'
ORDER BY policyname;

-- チャット関連テーブルのRLS設定を確認
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('chats', 'chat_messages', 'chat_users', 'chat_message_reactions')
ORDER BY tablename; 