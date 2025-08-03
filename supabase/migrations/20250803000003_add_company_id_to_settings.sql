-- Add company_id column to settings table
ALTER TABLE settings ADD COLUMN company_id UUID REFERENCES companies(id);

-- Create index for company_id
CREATE INDEX IF NOT EXISTS idx_settings_company_id ON settings(company_id);

-- Add comment
COMMENT ON COLUMN settings.company_id IS 'Company ID for company-specific settings. NULL means global settings.'; 