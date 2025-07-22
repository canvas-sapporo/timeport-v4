-- Add is_active column to groups table
ALTER TABLE groups ADD COLUMN is_active BOOLEAN DEFAULT true NOT NULL;

-- Update existing groups to be active
UPDATE groups SET is_active = true WHERE is_active IS NULL;

-- Add comment
COMMENT ON COLUMN groups.is_active IS 'グループの有効/無効ステータス'; 