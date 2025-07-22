-- attendancesテーブルからUNIQUE(user_id, work_date)制約を削除
-- 1日に複数回の出退勤を許可するため

-- 制約が存在する場合のみ削除
DO $$
DECLARE
    constraint_name text;
BEGIN
    -- 制約名を動的に取得
    SELECT conname INTO constraint_name
    FROM pg_constraint 
    WHERE conrelid = 'attendances'::regclass 
    AND contype = 'u' 
    AND array_length(conkey, 1) = 2
    AND conkey[1] = (SELECT attnum FROM pg_attribute WHERE attrelid = 'attendances'::regclass AND attname = 'user_id')
    AND conkey[2] = (SELECT attnum FROM pg_attribute WHERE attrelid = 'attendances'::regclass AND attname = 'work_date');
    
    -- 制約が存在する場合のみ削除
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE attendances DROP CONSTRAINT ' || constraint_name;
        RAISE NOTICE '制約 % を削除しました', constraint_name;
    ELSE
        RAISE NOTICE '削除対象の制約が見つかりませんでした';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- エラーが発生した場合は無視
        RAISE NOTICE '制約削除中にエラーが発生しました: %', SQLERRM;
END $$;

-- コメントを追加（既存の場合はスキップ）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_description 
        WHERE objoid = 'attendances'::regclass 
        AND objsubid = 0
        AND description = '1日に複数回の出退勤を記録可能な勤怠テーブル'
    ) THEN
        COMMENT ON TABLE attendances IS '1日に複数回の出退勤を記録可能な勤怠テーブル';
    END IF;
END $$; 