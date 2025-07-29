-- Add approved_by field to requests table
-- 2025-07-31

-- Add approved_by column to requests table
ALTER TABLE requests 
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL;

-- Add approved_at column to requests table
ALTER TABLE requests 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- Create index for approved_by column
CREATE INDEX IF NOT EXISTS idx_requests_approved_by ON requests(approved_by) WHERE deleted_at IS NULL;

-- Add comment to the columns
COMMENT ON COLUMN requests.approved_by IS '承認者ID（user_profilesテーブルを参照）';
COMMENT ON COLUMN requests.approved_at IS '承認日時';

-- Update the approveRequest function to set approved_by and approved_at
CREATE OR REPLACE FUNCTION update_request_approval_info()
RETURNS TRIGGER AS $$
BEGIN
  -- 承認済みステータスのIDを取得
  DECLARE
    approved_status_id UUID;
  BEGIN
    SELECT id INTO approved_status_id
    FROM statuses
    WHERE code = 'approved' AND category = 'request';
    
    -- ステータスが承認済みに変更された場合、承認者情報を設定
    IF NEW.status_id = approved_status_id AND OLD.status_id != approved_status_id THEN
      NEW.approved_by := auth.uid();
      NEW.approved_at := NOW();
    END IF;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating approval info
DROP TRIGGER IF EXISTS trigger_update_request_approval_info ON requests;
CREATE TRIGGER trigger_update_request_approval_info
  BEFORE UPDATE ON requests
  FOR EACH ROW
  EXECUTE FUNCTION update_request_approval_info(); 