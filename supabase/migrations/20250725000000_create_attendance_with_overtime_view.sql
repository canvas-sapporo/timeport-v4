-- 残業時間を計算するビューを作成
CREATE OR REPLACE VIEW attendance_with_overtime AS
SELECT 
    a.*,
    wt.overtime_threshold_minutes,
    CASE 
        WHEN a.actual_work_minutes IS NOT NULL AND wt.overtime_threshold_minutes IS NOT NULL 
        THEN GREATEST(0, a.actual_work_minutes - wt.overtime_threshold_minutes)
        ELSE 0
    END as calculated_overtime_minutes
FROM attendances a
LEFT JOIN work_types wt ON a.work_type_id = wt.id
WHERE a.deleted_at IS NULL;

-- ビューの説明を追加
COMMENT ON VIEW attendance_with_overtime IS '勤怠記録に残業時間を計算して追加したビュー'; 