-- attendancesテーブルに必要なカラムを追加
-- 2025-07-31

-- ================================
-- 1. late_minutesカラムを追加
-- ================================

DO $$
BEGIN
    -- カラムが存在しない場合のみ追加
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendances' 
        AND column_name = 'late_minutes'
    ) THEN
        ALTER TABLE attendances ADD COLUMN late_minutes INTEGER DEFAULT 0;
        COMMENT ON COLUMN attendances.late_minutes IS '遅刻時間（分）';
    END IF;
END $$;

-- ================================
-- 2. early_leave_minutesカラムを追加
-- ================================

DO $$
BEGIN
    -- カラムが存在しない場合のみ追加
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendances' 
        AND column_name = 'early_leave_minutes'
    ) THEN
        ALTER TABLE attendances ADD COLUMN early_leave_minutes INTEGER DEFAULT 0;
        COMMENT ON COLUMN attendances.early_leave_minutes IS '早退時間（分）';
    END IF;
END $$;

-- ================================
-- 3. attendance_status_idカラムを追加
-- ================================

DO $$
BEGIN
    -- カラムが存在しない場合のみ追加
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendances' 
        AND column_name = 'attendance_status_id'
    ) THEN
        ALTER TABLE attendances ADD COLUMN attendance_status_id UUID REFERENCES attendance_statuses(id);
        COMMENT ON COLUMN attendances.attendance_status_id IS '勤怠ステータスID（attendance_statusesテーブルへの参照）';
    END IF;
END $$;

-- ================================
-- 4. 既存のレコードに対してデフォルト値を設定
-- ================================

-- late_minutesを0に設定（NULLの場合のみ）
UPDATE attendances 
SET late_minutes = 0 
WHERE late_minutes IS NULL;

-- early_leave_minutesを0に設定（NULLの場合のみ）
UPDATE attendances 
SET early_leave_minutes = 0 
WHERE early_leave_minutes IS NULL;

-- ================================
-- 5. 確認クエリ
-- ================================

-- カラムが正しく追加されたか確認
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'attendances' 
AND column_name IN ('late_minutes', 'early_leave_minutes', 'attendance_status_id')
ORDER BY column_name; 