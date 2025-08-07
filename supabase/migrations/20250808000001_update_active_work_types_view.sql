-- Update active_work_types view to exclude break_duration_minutes and include break_times
-- Migration: 20250808000001_update_active_work_types_view

-- Drop the existing view
DROP VIEW IF EXISTS active_work_types;

-- Recreate the view with explicit column selection
CREATE VIEW active_work_types AS 
SELECT 
    id,
    company_id,
    code,
    name,
    work_start_time,
    work_end_time,
    break_times,
    is_flexible,
    flex_start_time,
    flex_end_time,
    core_start_time,
    core_end_time,
    overtime_threshold_minutes,
    late_threshold_minutes,
    description,
    settings,
    is_active,
    display_order,
    created_at,
    updated_at,
    deleted_at
FROM work_types 
WHERE deleted_at IS NULL;
