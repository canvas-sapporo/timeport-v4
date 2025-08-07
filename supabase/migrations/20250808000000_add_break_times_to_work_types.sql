-- Add break_times column to work_types table and remove break_duration_minutes
-- Migration: 20250808000000_add_break_times_to_work_types

-- Add break_times column (JSONB)
ALTER TABLE public.work_types 
ADD COLUMN break_times jsonb DEFAULT '[]'::jsonb;

-- Add comment for break_times column
COMMENT ON COLUMN public.work_types.break_times IS 'Array of break time configurations. Each item contains: id, name, start_time, end_time, order';

-- Create index for break_times column for better query performance
CREATE INDEX IF NOT EXISTS idx_work_types_break_times 
ON public.work_types USING gin (break_times) 
WHERE deleted_at IS NULL;

-- Note: break_duration_minutes column will be removed in a separate migration
-- after updating dependent views and functions
