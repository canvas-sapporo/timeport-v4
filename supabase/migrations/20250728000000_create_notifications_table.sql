-- 通知テーブルの更新
-- 既存のnotificationsテーブルに新しいカラムを追加
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS related_request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- typeカラムの制約を更新
ALTER TABLE notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('request_approval', 'request_rejection', 'request_comment', 'request_created', 'system', 'attendance', 'general'));

-- user_idの参照をuser_profilesに変更
ALTER TABLE notifications 
DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;

ALTER TABLE notifications 
ADD CONSTRAINT notifications_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_related_request_id ON notifications(related_request_id) WHERE deleted_at IS NULL;

-- RLSポリシーの設定
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "System admins can manage all notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;

-- ユーザーは自分の通知のみ閲覧可能
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- ユーザーは自分の通知のみ更新可能
CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- システム管理者はすべての通知を管理可能
CREATE POLICY "System admins can manage all notifications" ON notifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'system-admin'
    )
  );

-- 通知の作成はシステムまたは承認者による
CREATE POLICY "System can create notifications" ON notifications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'system-admin')
    )
  );

-- 更新トリガーの作成
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_notifications_updated_at ON notifications;
CREATE TRIGGER trigger_update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_notifications_updated_at();

-- 通知送信用の関数
CREATE OR REPLACE FUNCTION send_notification(
  p_user_id UUID,
  p_title VARCHAR(255),
  p_message TEXT,
  p_type VARCHAR(50),
  p_related_request_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (
    user_id,
    title,
    message,
    type,
    related_request_id,
    metadata
  ) VALUES (
    p_user_id,
    p_title,
    p_message,
    p_type,
    p_related_request_id,
    p_metadata
  ) RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- リクエスト承認時の通知送信トリガー
CREATE OR REPLACE FUNCTION notify_request_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- リクエストが承認された場合、申請者に通知
  IF NEW.status_id = 'approved' AND OLD.status_id != 'approved' THEN
    PERFORM send_notification(
      NEW.user_id,
      'リクエスト承認',
      'リクエスト「' || COALESCE(NEW.title, '無題') || '」が承認されました。',
      'request_approval',
      NEW.id
    );
  END IF;
  
  -- リクエストが却下された場合、申請者に通知
  IF NEW.status_id = 'rejected' AND OLD.status_id != 'rejected' THEN
    PERFORM send_notification(
      NEW.user_id,
      'リクエスト却下',
      'リクエスト「' || COALESCE(NEW.title, '無題') || '」が却下されました。',
      'request_rejection',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_request_approval ON requests;
CREATE TRIGGER trigger_notify_request_approval
  AFTER UPDATE ON requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_request_approval();

-- コメント追加時の通知送信トリガー（requestsテーブルのcommentsカラム更新時）
CREATE OR REPLACE FUNCTION notify_request_comment()
RETURNS TRIGGER AS $$
DECLARE
  request_user_id UUID;
  request_title VARCHAR(255);
  new_comment JSONB;
  comment_user_id UUID;
BEGIN
  -- 新しいコメントが追加された場合のみ処理
  IF NEW.comments IS NOT NULL AND OLD.comments IS NOT NULL AND 
     jsonb_array_length(NEW.comments) > jsonb_array_length(OLD.comments) THEN
    
    -- 最新のコメントを取得
    new_comment := NEW.comments->(jsonb_array_length(NEW.comments) - 1);
    comment_user_id := (new_comment->>'user_id')::UUID;
    
    -- コメント投稿者がリクエスト申請者でない場合のみ通知
    IF comment_user_id != NEW.user_id THEN
      PERFORM send_notification(
        NEW.user_id,
        '新しいコメント',
        'リクエスト「' || COALESCE(NEW.title, '無題') || '」に新しいコメントが追加されました。',
        'request_comment',
        NEW.id,
        jsonb_build_object('comment', new_comment->>'content')
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_request_comment ON requests;
CREATE TRIGGER trigger_notify_request_comment
  AFTER UPDATE ON requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_request_comment();

-- リクエスト作成時の通知送信トリガー
CREATE OR REPLACE FUNCTION notify_request_created()
RETURNS TRIGGER AS $$
DECLARE
  request_type RECORD;
  approver_id UUID;
BEGIN
  -- リクエストタイプの承認フローを取得
  SELECT approval_flow INTO request_type
  FROM request_types
  WHERE id = NEW.request_type_id;
  
  -- 最初の承認者に通知
  IF request_type.approval_flow IS NOT NULL AND jsonb_array_length(request_type.approval_flow) > 0 THEN
    approver_id := (request_type.approval_flow->0->>'approver_id')::UUID;
    
    IF approver_id IS NOT NULL THEN
      PERFORM send_notification(
        approver_id,
        '新しいリクエスト',
        '新しいリクエスト「' || COALESCE(NEW.title, '無題') || '」が作成されました。承認をお願いします。',
        'request_created',
        NEW.id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_request_created ON requests;
CREATE TRIGGER trigger_notify_request_created
  AFTER INSERT ON requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_request_created(); 