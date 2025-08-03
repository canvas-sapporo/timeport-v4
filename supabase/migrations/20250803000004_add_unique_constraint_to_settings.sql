-- Add unique constraint for company_id and setting_type
ALTER TABLE settings ADD CONSTRAINT settings_company_setting_type_unique UNIQUE (company_id, setting_type, setting_key);

-- Add comment
COMMENT ON CONSTRAINT settings_company_setting_type_unique ON settings IS 'Unique constraint for company-specific settings by setting type and key'; 