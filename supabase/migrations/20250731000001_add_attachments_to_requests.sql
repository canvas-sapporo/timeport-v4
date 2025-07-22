-- Add attachments column to requests table
-- 2025-07-31

-- Add attachments column to requests table
ALTER TABLE requests 
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';

-- Add index for attachments column
CREATE INDEX IF NOT EXISTS idx_requests_attachments ON requests USING GIN(attachments);

-- Add comment to the column
COMMENT ON COLUMN requests.attachments IS '申請に添付されたファイルの情報を格納するJSONB配列'; 