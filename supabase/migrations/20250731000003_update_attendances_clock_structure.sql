-- attendancesテーブルの構造を新しいclock形式に変更
-- 複数の勤務セッションを管理できるようにする

-- ================================
-- 1. 既存データを削除
-- ================================

-- 既存のattendancesデータを全て削除
DELETE FROM attendances;

-- ================================
-- 2. 新しいカラムを追加
-- ================================

-- clock_recordsカラムを追加（新しい構造）
ALTER TABLE attendances 
ADD COLUMN IF NOT EXISTS clock_records JSONB DEFAULT '[]';

-- コメントを追加
COMMENT ON COLUMN attendances.clock_records IS '複数の勤務セッション記録（clock形式）';

-- ================================
-- 3. 依存するビューを削除
-- ================================

-- 古いカラムに依存するビューを削除
DROP VIEW IF EXISTS active_attendances CASCADE;
DROP VIEW IF EXISTS attendance_with_overtime CASCADE;

-- ================================
-- 4. 古いカラムを削除
-- ================================

-- 古いカラムを削除
ALTER TABLE attendances DROP COLUMN IF EXISTS clock_in_time;
ALTER TABLE attendances DROP COLUMN IF EXISTS clock_out_time;
ALTER TABLE attendances DROP COLUMN IF EXISTS break_records;

-- ================================
-- 5. インデックスの更新
-- ================================

-- clock_recordsカラム用のGINインデックスを作成
CREATE INDEX IF NOT EXISTS idx_attendances_clock_records 
ON attendances USING GIN (clock_records) 
WHERE deleted_at IS NULL;

-- ================================
-- 6. 関数の作成
-- ================================

-- 新しいclock_recordsから総勤務時間を計算する関数
CREATE OR REPLACE FUNCTION calculate_total_work_minutes_from_clock(
    clock_records JSONB
) RETURNS INTEGER AS $$
DECLARE
    total_minutes INTEGER := 0;
    clock_record JSONB;
    in_time TIMESTAMP WITH TIME ZONE;
    out_time TIMESTAMP WITH TIME ZONE;
    break_minutes INTEGER;
    work_minutes INTEGER;
BEGIN
    -- 各clockレコードを処理
    FOR clock_record IN SELECT * FROM jsonb_array_elements(clock_records)
    LOOP
        -- in_timeとout_timeを取得
        in_time := (clock_record->>'in_time')::TIMESTAMP WITH TIME ZONE;
        out_time := (clock_record->>'out_time')::TIMESTAMP WITH TIME ZONE;
        
        -- 両方の時刻が存在する場合のみ計算
        IF in_time IS NOT NULL AND out_time IS NOT NULL THEN
            -- 休憩時間を計算
            break_minutes := calculate_break_minutes(clock_record->'breaks');
            
            -- 勤務時間を計算（分単位）
            work_minutes := EXTRACT(EPOCH FROM (out_time - in_time)) / 60;
            
            -- 休憩時間を差し引く
            total_minutes := total_minutes + (work_minutes - break_minutes);
        END IF;
    END LOOP;
    
    RETURN total_minutes;
END;
$$ LANGUAGE plpgsql;

-- 休憩時間を計算するヘルパー関数
CREATE OR REPLACE FUNCTION calculate_break_minutes(
    breaks JSONB
) RETURNS INTEGER AS $$
DECLARE
    total_break_minutes INTEGER := 0;
    break_record JSONB;
    break_start TIMESTAMP WITH TIME ZONE;
    break_end TIMESTAMP WITH TIME ZONE;
BEGIN
    -- 各休憩記録を処理
    FOR break_record IN SELECT * FROM jsonb_array_elements(breaks)
    LOOP
        break_start := (break_record->>'break_start')::TIMESTAMP WITH TIME ZONE;
        break_end := (break_record->>'break_end')::TIMESTAMP WITH TIME ZONE;
        
        IF break_start IS NOT NULL AND break_end IS NOT NULL THEN
            total_break_minutes := total_break_minutes + 
                EXTRACT(EPOCH FROM (break_end - break_start)) / 60;
        END IF;
    END LOOP;
    
    RETURN total_break_minutes;
END;
$$ LANGUAGE plpgsql;

-- ================================
-- 7. 新しいビューの作成
-- ================================

-- active_attendancesビューを新しい構造で再作成
CREATE OR REPLACE VIEW active_attendances AS
SELECT 
    a.*,
    -- 最初のセッションの出勤時刻
    (a.clock_records->0->>'in_time')::TIMESTAMP WITH TIME ZONE as first_clock_in_time,
    -- 最後のセッションの退勤時刻
    (a.clock_records->(jsonb_array_length(a.clock_records)-1)->>'out_time')::TIMESTAMP WITH TIME ZONE as last_clock_out_time,
    -- 総勤務時間（分）
    calculate_total_work_minutes_from_clock(a.clock_records) as total_work_minutes
FROM attendances a
WHERE a.deleted_at IS NULL;

-- attendance_with_overtimeビューを新しい構造で再作成
CREATE OR REPLACE VIEW attendance_with_overtime AS
SELECT 
    a.*,
    wt.overtime_threshold_minutes,
    CASE 
        WHEN a.actual_work_minutes IS NOT NULL AND wt.overtime_threshold_minutes IS NOT NULL 
        THEN GREATEST(0, a.actual_work_minutes - wt.overtime_threshold_minutes)
        ELSE 0
    END as calculated_overtime_minutes,
    -- 新しいclock_recordsから計算した勤務時間
    calculate_total_work_minutes_from_clock(a.clock_records) as calculated_work_minutes_from_clock
FROM attendances a
LEFT JOIN work_types wt ON a.work_type_id = wt.id
WHERE a.deleted_at IS NULL;

-- ================================
-- 8. 確認用クエリ
-- ================================

-- 移行結果を確認
DO $$
DECLARE
    total_records INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_records FROM attendances;
    
    RAISE NOTICE 'attendancesテーブルを新しいclock_records構造に移行しました';
    RAISE NOTICE '現在のレコード数: %', total_records;
    RAISE NOTICE '新しい構造でクリーンな状態になりました';
END $$; 