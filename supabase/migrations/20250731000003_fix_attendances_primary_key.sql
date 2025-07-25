-- Fix attendances table primary key constraint
-- First, check if there's already a primary key constraint
DO $$
BEGIN
    -- Check if primary key constraint exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'attendances_pkey' 
        AND table_name = 'attendances'
    ) THEN
        -- Add primary key constraint if it doesn't exist
        ALTER TABLE attendances ADD CONSTRAINT attendances_pkey PRIMARY KEY (id);
    END IF;
END $$; 