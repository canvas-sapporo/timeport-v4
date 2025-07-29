-- chat_usersテーブルのRLSポリシーで無限再帰が発生している問題を修正
-- ================================

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Users can read chat participants" ON chat_users;
DROP POLICY IF EXISTS "Admins can manage chat participants" ON chat_users;
DROP POLICY IF EXISTS "Users can update their own participation" ON chat_users;

-- 修正されたポリシーを作成
-- 参加しているチャットの参加者情報のみ読み取り可能（無限再帰を回避）
CREATE POLICY "Users can read chat participants" ON chat_users
    FOR SELECT USING (
        user_id = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM chats c
            WHERE c.id = chat_users.chat_id 
            AND c.created_by = auth.uid()
            AND c.deleted_at IS NULL
        )
        AND chat_users.deleted_at IS NULL
    );

-- チャット参加者追加（管理者のみ）
CREATE POLICY "Admins can manage chat participants" ON chat_users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role IN ('admin', 'system-admin')
        )
    );

-- 自分の参加状況更新
CREATE POLICY "Users can update their own participation" ON chat_users
    FOR UPDATE USING (user_id = auth.uid());

-- チャット作成者による参加者追加
CREATE POLICY "Chat creators can add participants" ON chat_users
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM chats c
            WHERE c.id = chat_users.chat_id 
            AND c.created_by = auth.uid()
            AND c.deleted_at IS NULL
        )
    ); 