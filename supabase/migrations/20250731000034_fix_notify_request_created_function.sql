-- Fix notify_request_created function to use request_forms instead of request_types
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
        NEW.id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql; 