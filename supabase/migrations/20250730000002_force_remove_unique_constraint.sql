-- attendancesテーブルからUNIQUE制約を強制的に削除
-- 1日に複数回の出退勤を許可するため

-- 制約名を直接指定して削除
ALTER TABLE attendances DROP CONSTRAINT IF EXISTS attendances_user_id_work_date_key;

-- 他の可能性のある制約名も削除
ALTER TABLE attendances DROP CONSTRAINT IF EXISTS attendances_pkey;
ALTER TABLE attendances DROP CONSTRAINT IF EXISTS attendances_user_id_work_date_unique;

-- 制約が残っているか確認
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    RAISE NOTICE '現在のattendancesテーブルの制約一覧:';
    FOR constraint_record IN 
        SELECT conname, contype 
        FROM pg_constraint 
        WHERE conrelid = 'attendances'::regclass
    LOOP
        RAISE NOTICE '制約名: %, タイプ: %', constraint_record.conname, constraint_record.contype;
    END LOOP;
END $$; 