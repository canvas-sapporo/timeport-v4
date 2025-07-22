-- Rename request_type_id to request_form_id in requests table
-- 2025-07-31

-- Drop existing foreign key constraint
ALTER TABLE requests 
DROP CONSTRAINT IF EXISTS requests_request_type_id_fkey;

-- Rename the column
ALTER TABLE requests 
RENAME COLUMN request_type_id TO request_form_id;

-- Add new foreign key constraint referencing request_forms table
ALTER TABLE requests 
ADD CONSTRAINT requests_request_form_id_fkey 
FOREIGN KEY (request_form_id) REFERENCES request_forms(id) ON DELETE CASCADE;

-- Update indexes
DROP INDEX IF EXISTS idx_requests_type_status;
CREATE INDEX idx_requests_form_status ON requests(request_form_id, status_id) WHERE deleted_at IS NULL;

-- Add comment to the column
COMMENT ON COLUMN requests.request_form_id IS '申請フォームID（request_formsテーブルを参照）'; 