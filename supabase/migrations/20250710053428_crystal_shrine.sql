/*
  # Organization to Group Migration

  1. Schema Changes
    - Rename organization_type to group_type in feature_settings
    - Rename organization_id to group_id in feature_settings
    - Update existing data to use new column names

  2. Data Migration
    - Update all existing records to use new naming convention
    - Maintain backward compatibility during transition

  3. Index Updates
    - Update indexes to reflect new column names
*/

-- Add new columns with group naming
ALTER TABLE feature_settings ADD COLUMN IF NOT EXISTS group_type TEXT;
ALTER TABLE feature_settings ADD COLUMN IF NOT EXISTS group_id UUID;

-- Migrate existing data
UPDATE feature_settings 
SET group_type = organization_type, 
    group_id = organization_id::uuid 
WHERE group_type IS NULL;

-- Update constraints
ALTER TABLE feature_settings DROP CONSTRAINT IF EXISTS feature_settings_organization_type_check;
ALTER TABLE feature_settings ADD CONSTRAINT feature_settings_group_type_check 
  CHECK (group_type IN ('company', 'workplace', 'department', 'user'));

-- Drop old unique constraint and create new one
ALTER TABLE feature_settings DROP CONSTRAINT IF EXISTS feature_settings_feature_code_organization_type_organization_key;
ALTER TABLE feature_settings ADD CONSTRAINT feature_settings_feature_code_group_type_group_id_key 
  UNIQUE(feature_code, group_type, group_id);

-- Update indexes
DROP INDEX IF EXISTS idx_feature_settings_organization;
CREATE INDEX IF NOT EXISTS idx_feature_settings_group ON feature_settings(group_type, group_id);

-- Remove old columns (after data migration is complete)
-- Note: In production, you might want to keep these for a transition period
-- ALTER TABLE feature_settings DROP COLUMN IF EXISTS organization_type;
-- ALTER TABLE feature_settings DROP COLUMN IF EXISTS organization_id;