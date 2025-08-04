-- Add is_current column to attendances table and update constraints
DO $$
BEGIN
    -- Add is_current column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendances' AND column_name = 'is_current'
    ) THEN
        ALTER TABLE attendances ADD COLUMN is_current BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- Update existing records to set is_current = true
UPDATE attendances SET is_current = TRUE WHERE is_current IS NULL;

-- Make is_current NOT NULL
ALTER TABLE attendances ALTER COLUMN is_current SET NOT NULL;

-- Drop the old unique constraint
ALTER TABLE attendances DROP CONSTRAINT IF EXISTS attendances_user_id_work_date_key;

-- Add new unique constraint for current records only
CREATE UNIQUE INDEX IF NOT EXISTS attendances_user_id_work_date_current_key
  ON attendances(user_id, work_date)
  WHERE is_current = TRUE;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_attendances_user_date_current 
    ON attendances(user_id, work_date, is_current);

-- Add comment to explain the new column
COMMENT ON COLUMN attendances.is_current IS 'Indicates if this is the current attendance record for the user and date. Only one record per user per date can have is_current = TRUE.'; 