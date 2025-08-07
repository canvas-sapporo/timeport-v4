-- Remove break_duration_minutes column from work_types table
-- Migration: 20250808000002_remove_break_duration_minutes

-- Remove break_duration_minutes column
ALTER TABLE public.work_types 
DROP COLUMN IF EXISTS break_duration_minutes;
