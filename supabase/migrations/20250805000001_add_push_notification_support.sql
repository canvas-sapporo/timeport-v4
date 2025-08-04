-- プッシュ通知機能の追加
-- 既存のsend_notification関数を拡張してプッシュ通知も送信するように修正

-- プッシュ通知送信用の関数を作成
CREATE OR REPLACE FUNCTION send_push_notification(
  p_user_id UUID,
  p_title VARCHAR(255),
  p_message TEXT,
  p_type VARCHAR(50),
  p_link_url TEXT DEFAULT NULL,
  p_priority VARCHAR(20) DEFAULT 'normal',
  p_metadata JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  notification_id UUID;
  subscription_count INTEGER;
BEGIN
  -- 1. データベースに通知を保存
  INSERT INTO notifications (
    user_id,
    title,
    message,
    type,
    link_url,
    priority,
    metadata
  ) VALUES (
    p_user_id,
    p_title,
    p_message,
    p_type,
    p_link_url,
    p_priority,
    p_metadata
  ) RETURNING id INTO notification_id;
  
  -- 2. プッシュ通知の購読数を確認
  SELECT COUNT(*) INTO subscription_count
  FROM push_subscriptions
  WHERE user_id = p_user_id AND is_active = true;
  
  -- 3. プッシュ通知の購読がある場合は、HTTPリクエストでプッシュ通知を送信
  IF subscription_count > 0 THEN
    -- プッシュ通知の送信は外部APIで処理するため、ここではログのみ記録
    RAISE NOTICE 'Push notification should be sent for user % with % subscriptions', p_user_id, subscription_count;
  END IF;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error sending push notification: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 既存のsend_notification関数を更新してプッシュ通知も送信するように修正
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
  -- 既存の通知保存処理
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
  
  -- プッシュ通知も送信
  PERFORM send_push_notification(
    p_user_id,
    p_title,
    p_message,
    p_type,
    NULL, -- link_url
    'normal', -- priority
    p_metadata
  );
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- リクエスト作成時の通知送信トリガーを更新
CREATE OR REPLACE FUNCTION notify_request_created()
RETURNS TRIGGER AS $$
DECLARE
  request_form RECORD;
  approver_id UUID;
BEGIN
  -- リクエストフォームの承認フローを取得
  SELECT approval_flow INTO request_form
  FROM request_forms
  WHERE id = NEW.request_form_id;
  
  -- 最初の承認者に通知
  IF request_form.approval_flow IS NOT NULL AND jsonb_array_length(request_form.approval_flow) > 0 THEN
    approver_id := (request_form.approval_flow->0->>'approver_id')::UUID;
    
    IF approver_id IS NOT NULL THEN
      PERFORM send_notification(
        approver_id,
        '新しいリクエスト',
        '新しいリクエスト「' || COALESCE(NEW.title, '無題') || '」が作成されました。承認をお願いします。',
        'request_created',
        NEW.id,
        jsonb_build_object('request_id', NEW.id, 'request_title', NEW.title)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- リクエスト承認時の通知送信トリガーを更新
CREATE OR REPLACE FUNCTION notify_request_approval()
RETURNS TRIGGER AS $$
DECLARE
  approved_status_id UUID;
  rejected_status_id UUID;
BEGIN
  -- 承認済みステータスのIDを取得
  SELECT id INTO approved_status_id
  FROM statuses
  WHERE code = 'approved' AND category = 'request';
  
  -- 却下ステータスのIDを取得
  SELECT id INTO rejected_status_id
  FROM statuses
  WHERE code = 'rejected' AND category = 'request';
  
  -- リクエストが承認された場合、申請者に通知
  IF NEW.status_id = approved_status_id AND OLD.status_id != approved_status_id THEN
    PERFORM send_notification(
      NEW.user_id,
      'リクエスト承認',
      'リクエスト「' || COALESCE(NEW.title, '無題') || '」が承認されました。',
      'request_approval',
      NEW.id,
      jsonb_build_object('request_id', NEW.id, 'request_title', NEW.title, 'status', 'approved')
    );
  END IF;
  
  -- リクエストが却下された場合、申請者に通知
  IF NEW.status_id = rejected_status_id AND OLD.status_id != rejected_status_id THEN
    PERFORM send_notification(
      NEW.user_id,
      'リクエスト却下',
      'リクエスト「' || COALESCE(NEW.title, '無題') || '」が却下されました。',
      'request_rejection',
      NEW.id,
      jsonb_build_object('request_id', NEW.id, 'request_title', NEW.title, 'status', 'rejected')
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- コメント追加時の通知送信トリガーを更新
CREATE OR REPLACE FUNCTION notify_request_comment()
RETURNS TRIGGER AS $$
DECLARE
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
        jsonb_build_object(
          'request_id', NEW.id,
          'request_title', NEW.title,
          'comment', new_comment->>'content',
          'comment_user_id', comment_user_id
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- プッシュ通知の統計情報を取得する関数
CREATE OR REPLACE FUNCTION get_push_notification_stats()
RETURNS TABLE(
  total_subscriptions INTEGER,
  active_subscriptions INTEGER,
  total_notifications INTEGER,
  unread_notifications INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM push_subscriptions)::INTEGER as total_subscriptions,
    (SELECT COUNT(*) FROM push_subscriptions WHERE is_active = true)::INTEGER as active_subscriptions,
    (SELECT COUNT(*) FROM notifications)::INTEGER as total_notifications,
    (SELECT COUNT(*) FROM notifications WHERE is_read = false)::INTEGER as unread_notifications;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- プッシュ通知の購読状況をクリーンアップする関数
CREATE OR REPLACE FUNCTION cleanup_expired_push_subscriptions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- 30日以上更新されていない非アクティブな購読を削除
  DELETE FROM push_subscriptions 
  WHERE is_active = false 
    AND updated_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 定期実行用のクリーンアップ関数を呼び出すトリガー（オプション）
-- このトリガーは、通知テーブルに大量のレコードが挿入された時に実行される
CREATE OR REPLACE FUNCTION trigger_cleanup_push_subscriptions()
RETURNS TRIGGER AS $$
BEGIN
  -- 1000件以上の通知がある場合にクリーンアップを実行
  IF (SELECT COUNT(*) FROM notifications) > 1000 THEN
    PERFORM cleanup_expired_push_subscriptions();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- クリーンアップトリガーを作成（オプション）
DROP TRIGGER IF EXISTS trigger_cleanup_push_subscriptions ON notifications;
CREATE TRIGGER trigger_cleanup_push_subscriptions
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION trigger_cleanup_push_subscriptions(); 