-- Rename request_types table to request_forms
ALTER TABLE request_types RENAME TO request_forms;

-- Update RLS policies
DROP POLICY IF EXISTS "admin_manage_request_types" ON request_forms;
DROP POLICY IF EXISTS "member_read_request_types" ON request_forms;

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

-- Update triggers
DROP TRIGGER IF EXISTS handle_updated_at ON request_forms;
CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON request_forms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update indexes
DROP INDEX IF EXISTS idx_request_types_company_id;
DROP INDEX IF EXISTS idx_request_types_category;
DROP INDEX IF EXISTS idx_request_types_is_active;
DROP INDEX IF EXISTS idx_request_types_deleted_at;

CREATE INDEX idx_request_forms_company_id ON request_forms(company_id);
CREATE INDEX idx_request_forms_category ON request_forms(category);
CREATE INDEX idx_request_forms_is_active ON request_forms(is_active);
CREATE INDEX idx_request_forms_deleted_at ON request_forms(deleted_at);

-- Update foreign key constraints in other tables
-- Note: This assumes there are other tables referencing request_types
-- If there are, they would need to be updated as well 