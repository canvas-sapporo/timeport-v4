-- 既存の勤怠データの遅刻・早退時間を再計算し、ステータスを修正

-- ================================
-- 1. 遅刻・早退時間の再計算関数
-- ================================

CREATE OR REPLACE FUNCTION recalculate_attendance_times()
RETURNS VOID AS $$
DECLARE
    attendance_record RECORD;
    work_type_record RECORD;
    clock_in_time TIMESTAMP WITH TIME ZONE;
    clock_out_time TIMESTAMP WITH TIME ZONE;
    calculated_work_start_time TIMESTAMP WITH TIME ZONE;
    calculated_work_end_time TIMESTAMP WITH TIME ZONE;
    late_minutes_calc INTEGER := 0;
    early_leave_minutes_calc INTEGER := 0;
    late_threshold INTEGER := 15;
    new_status_name TEXT;
    new_status_id UUID;
BEGIN
    -- 全ての勤怠記録を処理
    FOR attendance_record IN 
        SELECT 
            a.id,
            a.user_id,
            a.work_date,
            a.work_type_id,
            a.clock_records,
            COALESCE(a.late_minutes, 0) as late_minutes,
            COALESCE(a.early_leave_minutes, 0) as early_leave_minutes,
            a.attendance_status_id
        FROM attendances a
        WHERE a.deleted_at IS NULL
    LOOP
        -- 勤務形態の情報を取得
        SELECT 
            work_start_time,
            work_end_time,
            late_threshold_minutes
        INTO work_type_record
        FROM work_types 
        WHERE id = attendance_record.work_type_id 
        AND deleted_at IS NULL;
        
        -- 勤務形態が見つからない場合はスキップ
        IF work_type_record IS NULL THEN
            CONTINUE;
        END IF;
        
        -- 遅刻許容時間を設定
        late_threshold := COALESCE(work_type_record.late_threshold_minutes, 15);
        
        -- clock_recordsから最初の出勤時刻と最後の退勤時刻を取得
        IF attendance_record.clock_records IS NOT NULL AND jsonb_array_length(attendance_record.clock_records) > 0 THEN
            -- 最初のセッションの出勤時刻
            IF (attendance_record.clock_records->0->>'in_time') IS NOT NULL AND (attendance_record.clock_records->0->>'in_time') != '' THEN
                clock_in_time := (attendance_record.clock_records->0->>'in_time')::TIMESTAMP WITH TIME ZONE;
            ELSE
                clock_in_time := NULL;
            END IF;
            
            -- 最後のセッションの退勤時刻
            IF (attendance_record.clock_records->(jsonb_array_length(attendance_record.clock_records)-1)->>'out_time') IS NOT NULL AND (attendance_record.clock_records->(jsonb_array_length(attendance_record.clock_records)-1)->>'out_time') != '' THEN
                clock_out_time := (attendance_record.clock_records->(jsonb_array_length(attendance_record.clock_records)-1)->>'out_time')::TIMESTAMP WITH TIME ZONE;
            ELSE
                clock_out_time := NULL;
            END IF;
            
            -- 勤務開始時刻を計算
            calculated_work_start_time := (attendance_record.work_date::date || ' ' || work_type_record.work_start_time)::TIMESTAMP WITH TIME ZONE;
            
            -- 勤務終了時刻を計算
            calculated_work_end_time := (attendance_record.work_date::date || ' ' || work_type_record.work_end_time)::TIMESTAMP WITH TIME ZONE;
            
            -- 遅刻時間を計算
            IF clock_in_time IS NOT NULL AND calculated_work_start_time IS NOT NULL THEN
                -- UTC時間をJST（+9時間）に変換してから計算
                late_minutes_calc := EXTRACT(EPOCH FROM ((clock_in_time + INTERVAL '9 hours') - calculated_work_start_time)) / 60;
                IF late_minutes_calc > late_threshold THEN
                    late_minutes_calc := late_minutes_calc - late_threshold;
                ELSE
                    late_minutes_calc := 0;
                END IF;
            END IF;
            
            -- 早退時間を計算
            IF clock_out_time IS NOT NULL AND calculated_work_end_time IS NOT NULL THEN
                -- UTC時間をJST（+9時間）に変換してから計算
                early_leave_minutes_calc := EXTRACT(EPOCH FROM (calculated_work_end_time - (clock_out_time + INTERVAL '9 hours'))) / 60;
                IF early_leave_minutes_calc < 0 THEN
                    early_leave_minutes_calc := 0;
                END IF;
            END IF;
        END IF;
        
        -- ステータスを決定
        IF attendance_record.clock_records IS NULL OR jsonb_array_length(attendance_record.clock_records) = 0 THEN
            new_status_name := 'absent';
        ELSIF clock_out_time IS NULL THEN
            new_status_name := 'normal'; -- 勤務中
        ELSIF late_minutes_calc > 0 THEN
            new_status_name := 'late';
        ELSIF early_leave_minutes_calc > 0 THEN
            new_status_name := 'early_leave';
        ELSE
            new_status_name := 'normal';
        END IF;
        
        -- attendance_statusesテーブルから対応するステータスIDを取得
        SELECT id INTO new_status_id
        FROM attendance_statuses
        WHERE name = new_status_name
        AND company_id IN (
            SELECT g.company_id 
            FROM user_groups ug
            JOIN groups g ON ug.group_id = g.id
            WHERE ug.user_id = attendance_record.user_id
        )
        AND deleted_at IS NULL
        LIMIT 1;
        
        -- データを更新
        UPDATE attendances 
        SET 
            late_minutes = late_minutes_calc,
            early_leave_minutes = early_leave_minutes_calc,
            attendance_status_id = new_status_id,
            updated_at = NOW()
        WHERE id = attendance_record.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ================================
-- 2. 再計算を実行
-- ================================

SELECT recalculate_attendance_times();

-- ================================
-- 3. 関数を削除（クリーンアップ）
-- ================================

DROP FUNCTION IF EXISTS recalculate_attendance_times(); 