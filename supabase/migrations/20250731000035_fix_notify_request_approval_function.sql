-- Fix notify_request_approval function to use status IDs instead of status codes
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
      NEW.id
    );
  END IF;
  
  -- リクエストが却下された場合、申請者に通知
  IF NEW.status_id = rejected_status_id AND OLD.status_id != rejected_status_id THEN
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