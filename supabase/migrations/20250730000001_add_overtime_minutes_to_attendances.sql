-- attendancesテーブルにovertime_minutesカラムを追加（既存の場合はスキップ）
-- 残業時間（分）を記録するためのカラム

DO $$
BEGIN
    -- カラムが存在しない場合のみ追加
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendances' 
        AND column_name = 'overtime_minutes'
    ) THEN
        ALTER TABLE attendances ADD COLUMN overtime_minutes INTEGER DEFAULT 0;
    END IF;
END $$;

-- 既存のレコードに対してovertime_minutesを0に設定（NULLの場合のみ）
UPDATE attendances 
SET overtime_minutes = 0 
WHERE overtime_minutes IS NULL;

-- コメントを追加（既存の場合はスキップ）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_description 
        WHERE objoid = 'attendances'::regclass 
        AND objsubid = (SELECT attnum FROM pg_attribute WHERE attrelid = 'attendances'::regclass AND attname = 'overtime_minutes')
    ) THEN
        COMMENT ON COLUMN attendances.overtime_minutes IS '残業時間（分）';
    END IF;
END $$; 