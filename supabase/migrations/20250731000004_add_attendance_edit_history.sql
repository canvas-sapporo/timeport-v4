-- Add columns for attendance edit history management
DO $$
BEGIN
    -- Add source_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendances' AND column_name = 'source_id'
    ) THEN
        ALTER TABLE attendances ADD COLUMN source_id UUID;
    END IF;

    -- Add edit_reason column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendances' AND column_name = 'edit_reason'
    ) THEN
        ALTER TABLE attendances ADD COLUMN edit_reason TEXT;
    END IF;

    -- Add edited_by column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendances' AND column_name = 'edited_by'
    ) THEN
        ALTER TABLE attendances ADD COLUMN edited_by UUID REFERENCES user_profiles(id);
    END IF;
END $$;

-- Note: Foreign key constraint for source_id is not added to avoid circular reference issues
-- The relationship will be managed at the application level

-- Add indexes if they don't exist
DO $$
BEGIN
    -- Add index for source_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_attendances_source_id'
    ) THEN
        CREATE INDEX idx_attendances_source_id ON attendances(source_id);
    END IF;

    -- Add index for created_at if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_attendances_created_at'
    ) THEN
        CREATE INDEX idx_attendances_created_at ON attendances(created_at DESC);
    END IF;
END $$;

-- Add comments to explain the new columns
DO $$
BEGIN
    -- Add comment for source_id if column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendances' AND column_name = 'source_id'
    ) THEN
        COMMENT ON COLUMN attendances.source_id IS 'Reference to the original attendance record. NULL means this is the original record.';
    END IF;

    -- Add comment for edit_reason if column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendances' AND column_name = 'edit_reason'
    ) THEN
        COMMENT ON COLUMN attendances.edit_reason IS 'Reason for editing the attendance record';
    END IF;

    -- Add comment for edited_by if column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendances' AND column_name = 'edited_by'
    ) THEN
        COMMENT ON COLUMN attendances.edited_by IS 'User who edited the attendance record';
    END IF;
END $$; 