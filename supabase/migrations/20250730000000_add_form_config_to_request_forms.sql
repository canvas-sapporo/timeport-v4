-- Add form_config and approval_flow fields to request_forms table
-- Remove company_id dependency for request forms

-- Add new columns
ALTER TABLE request_forms 
ADD COLUMN IF NOT EXISTS form_config JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS approval_flow JSONB DEFAULT '[]';

-- Remove company_id column (if it exists)
ALTER TABLE request_forms 
DROP COLUMN IF EXISTS company_id;

-- Update indexes
DROP INDEX IF EXISTS idx_request_forms_company_id;

-- Add new indexes for the new fields
CREATE INDEX IF NOT EXISTS idx_request_forms_form_config ON request_forms USING GIN(form_config);
CREATE INDEX IF NOT EXISTS idx_request_forms_approval_flow ON request_forms USING GIN(approval_flow);

-- Update RLS policies to remove company_id dependency
DROP POLICY IF EXISTS "admin_manage_request_forms" ON request_forms;
DROP POLICY IF EXISTS "member_read_request_forms" ON request_forms;

CREATE POLICY "admin_manage_request_forms" ON request_forms
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "member_read_request_forms" ON request_forms
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'member'
    )
  ); 