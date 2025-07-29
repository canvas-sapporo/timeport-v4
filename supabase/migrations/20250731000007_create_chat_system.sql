-- チャットシステムのデータベース設計
-- 2025-07-31

-- ================================
-- 1. チャットテーブル（チャットルーム）
-- ================================

CREATE TABLE chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255), -- グループチャットの場合のみ使用
    chat_type VARCHAR(20) NOT NULL CHECK (chat_type IN ('direct', 'group')),
    created_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    settings JSONB DEFAULT '{}', -- チャット設定（通知設定など）
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- ================================
-- 2. チャットメッセージテーブル
-- ================================

CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    message_type VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
    content TEXT NOT NULL,
    attachments JSONB DEFAULT '[]', -- 添付ファイル情報
    reply_to_message_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
    edited_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- ================================
-- 3. チャット参加者テーブル
-- ================================

CREATE TABLE chat_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(chat_id, user_id)
);

-- ================================
-- 4. メッセージリアクションテーブル
-- ================================

CREATE TABLE chat_message_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    reaction_type VARCHAR(50) NOT NULL, -- 絵文字やリアクションタイプ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(message_id, user_id, reaction_type)
);

-- ================================
-- 5. インデックスの作成
-- ================================

-- chats テーブルのインデックス
CREATE INDEX idx_chats_company ON chats(company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_chats_type ON chats(chat_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_chats_created_by ON chats(created_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_chats_active ON chats(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_chats_updated_at ON chats(updated_at DESC) WHERE deleted_at IS NULL;

-- chat_messages テーブルのインデックス
CREATE INDEX idx_chat_messages_chat ON chat_messages(chat_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_chat_messages_user ON chat_messages(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_chat_messages_reply ON chat_messages(reply_to_message_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_chat_messages_type ON chat_messages(message_type) WHERE deleted_at IS NULL;

-- chat_users テーブルのインデックス
CREATE INDEX idx_chat_users_chat ON chat_users(chat_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_chat_users_user ON chat_users(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_chat_users_last_read ON chat_users(last_read_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_chat_users_role ON chat_users(role) WHERE deleted_at IS NULL;

-- chat_message_reactions テーブルのインデックス
CREATE INDEX idx_chat_message_reactions_message ON chat_message_reactions(message_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_chat_message_reactions_user ON chat_message_reactions(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_chat_message_reactions_type ON chat_message_reactions(reaction_type) WHERE deleted_at IS NULL;

-- JSONB インデックス
CREATE INDEX idx_chat_messages_attachments ON chat_messages USING GIN(attachments) WHERE deleted_at IS NULL;
CREATE INDEX idx_chats_settings ON chats USING GIN(settings) WHERE deleted_at IS NULL;

-- ================================
-- 6. トリガー関数の作成
-- ================================

-- updated_at を自動更新する関数（既に存在する場合はスキップ）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 各テーブルに updated_at トリガーを追加
CREATE TRIGGER update_chats_updated_at BEFORE UPDATE ON chats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_messages_updated_at BEFORE UPDATE ON chat_messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_users_updated_at BEFORE UPDATE ON chat_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_message_reactions_updated_at BEFORE UPDATE ON chat_message_reactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================
-- 7. RLS（Row Level Security）の有効化
-- ================================

ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_message_reactions ENABLE ROW LEVEL SECURITY;

-- ================================
-- 8. RLS ポリシーの作成
-- ================================

-- chats テーブルのポリシー
-- 参加しているチャットのみ読み取り可能
CREATE POLICY "Users can read chats they participate in" ON chats
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM chat_users 
            WHERE chat_users.chat_id = chats.id 
            AND chat_users.user_id = auth.uid()
            AND chat_users.deleted_at IS NULL
        )
        AND chats.deleted_at IS NULL
    );

-- チャット作成（管理者のみ）
CREATE POLICY "Admins can create chats" ON chats
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role IN ('admin', 'system-admin')
        )
    );

-- チャット更新（作成者または管理者のみ）
CREATE POLICY "Chat creators and admins can update chats" ON chats
    FOR UPDATE USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role IN ('admin', 'system-admin')
        )
    );

-- chat_messages テーブルのポリシー
-- 参加しているチャットのメッセージのみ読み取り可能
CREATE POLICY "Users can read messages from their chats" ON chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM chat_users 
            WHERE chat_users.chat_id = chat_messages.chat_id 
            AND chat_users.user_id = auth.uid()
            AND chat_users.deleted_at IS NULL
        )
        AND chat_messages.deleted_at IS NULL
    );

-- メッセージ送信（参加者のみ）
CREATE POLICY "Chat participants can send messages" ON chat_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM chat_users 
            WHERE chat_users.chat_id = chat_messages.chat_id 
            AND chat_users.user_id = auth.uid()
            AND chat_users.deleted_at IS NULL
        )
    );

-- メッセージ更新（送信者のみ）
CREATE POLICY "Message authors can update their messages" ON chat_messages
    FOR UPDATE USING (user_id = auth.uid());

-- chat_users テーブルのポリシー
-- 参加しているチャットの参加者情報のみ読み取り可能
CREATE POLICY "Users can read chat participants" ON chat_users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM chat_users cu2
            WHERE cu2.chat_id = chat_users.chat_id 
            AND cu2.user_id = auth.uid()
            AND cu2.deleted_at IS NULL
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

-- chat_message_reactions テーブルのポリシー
-- 参加しているチャットのリアクションのみ読み取り可能
CREATE POLICY "Users can read reactions from their chats" ON chat_message_reactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM chat_users 
            JOIN chat_messages ON chat_messages.chat_id = chat_users.chat_id
            WHERE chat_messages.id = chat_message_reactions.message_id
            AND chat_users.user_id = auth.uid()
            AND chat_users.deleted_at IS NULL
        )
        AND chat_message_reactions.deleted_at IS NULL
    );

-- リアクション追加・削除（参加者のみ）
CREATE POLICY "Chat participants can manage reactions" ON chat_message_reactions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM chat_users 
            JOIN chat_messages ON chat_messages.chat_id = chat_users.chat_id
            WHERE chat_messages.id = chat_message_reactions.message_id
            AND chat_users.user_id = auth.uid()
            AND chat_users.deleted_at IS NULL
        )
    );

-- ================================
-- 9. ビューの作成
-- ================================

-- チャット一覧ビュー（参加者情報付き）
CREATE VIEW chat_list_view AS
SELECT 
    c.id,
    c.company_id,
    c.name,
    c.chat_type,
    c.created_by,
    c.settings,
    c.is_active,
    c.created_at,
    c.updated_at,
    COUNT(cu.user_id) as participant_count,
    MAX(cm.created_at) as last_message_at,
    STRING_AGG(DISTINCT up.family_name || ' ' || up.first_name, ', ') as participant_names
FROM chats c
LEFT JOIN chat_users cu ON c.id = cu.chat_id AND cu.deleted_at IS NULL
LEFT JOIN user_profiles up ON cu.user_id = up.id AND up.deleted_at IS NULL
LEFT JOIN chat_messages cm ON c.id = cm.chat_id AND cm.deleted_at IS NULL
WHERE c.deleted_at IS NULL
GROUP BY c.id, c.company_id, c.name, c.chat_type, c.created_by, c.settings, c.is_active, c.created_at, c.updated_at;

-- 未読メッセージ数ビュー
CREATE VIEW unread_message_count_view AS
SELECT 
    cu.user_id,
    cu.chat_id,
    COUNT(cm.id) as unread_count
FROM chat_users cu
LEFT JOIN chat_messages cm ON cu.chat_id = cm.chat_id 
    AND cm.created_at > cu.last_read_at 
    AND cm.user_id != cu.user_id
    AND cm.deleted_at IS NULL
WHERE cu.deleted_at IS NULL
GROUP BY cu.user_id, cu.chat_id;

-- ================================
-- 10. 関数の作成
-- ================================

-- 1対1チャットを作成または取得する関数
CREATE OR REPLACE FUNCTION get_or_create_direct_chat(
    p_user1_id UUID,
    p_user2_id UUID,
    p_company_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_chat_id UUID;
BEGIN
    -- 既存の1対1チャットを検索
    SELECT c.id INTO v_chat_id
    FROM chats c
    JOIN chat_users cu1 ON c.id = cu1.chat_id AND cu1.user_id = p_user1_id AND cu1.deleted_at IS NULL
    JOIN chat_users cu2 ON c.id = cu2.chat_id AND cu2.user_id = p_user2_id AND cu2.deleted_at IS NULL
    WHERE c.chat_type = 'direct' 
    AND c.company_id = p_company_id 
    AND c.deleted_at IS NULL
    LIMIT 1;

    -- 既存のチャットが見つからない場合は新規作成
    IF v_chat_id IS NULL THEN
        INSERT INTO chats (company_id, chat_type, created_by)
        VALUES (p_company_id, 'direct', p_user1_id)
        RETURNING id INTO v_chat_id;

        -- 参加者を追加
        INSERT INTO chat_users (chat_id, user_id) VALUES (v_chat_id, p_user1_id);
        INSERT INTO chat_users (chat_id, user_id) VALUES (v_chat_id, p_user2_id);
    END IF;

    RETURN v_chat_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- メッセージ送信時に最終メッセージ時刻を更新する関数
CREATE OR REPLACE FUNCTION update_chat_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE chats 
    SET updated_at = NOW()
    WHERE id = NEW.chat_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- メッセージ送信時にトリガーを実行
CREATE TRIGGER trigger_update_chat_last_message
    AFTER INSERT ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_last_message();

-- ================================
-- 11. コメントの追加
-- ================================

COMMENT ON TABLE chats IS 'チャットルームテーブル（1対1チャットとグループチャットを管理）';
COMMENT ON TABLE chat_messages IS 'チャットメッセージテーブル（テキスト、画像、ファイル等のメッセージを管理）';
COMMENT ON TABLE chat_users IS 'チャット参加者テーブル（どのユーザーがどのチャットに参加しているかを管理）';
COMMENT ON TABLE chat_message_reactions IS 'メッセージリアクションテーブル（絵文字リアクション等を管理）';

COMMENT ON COLUMN chats.chat_type IS 'チャットタイプ（direct: 1対1, group: グループ）';
COMMENT ON COLUMN chat_messages.message_type IS 'メッセージタイプ（text, image, file, system）';
COMMENT ON COLUMN chat_messages.attachments IS '添付ファイル情報（JSONB形式）';
COMMENT ON COLUMN chat_users.last_read_at IS '最終既読時刻';
COMMENT ON COLUMN chat_message_reactions.reaction_type IS 'リアクションタイプ（絵文字コード等）'; 