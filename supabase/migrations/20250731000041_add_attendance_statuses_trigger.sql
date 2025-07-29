-- 企業作成時にattendance_statusesを自動生成するトリガー
-- 2025-07-31

-- ================================
-- 1. デフォルトのattendance_statusesを作成する関数
-- ================================

CREATE OR REPLACE FUNCTION create_default_attendance_statuses(company_id UUID)
RETURNS VOID AS $$
BEGIN
    -- 既にattendance_statusesが存在する場合はスキップ
    IF EXISTS (SELECT 1 FROM attendance_statuses WHERE attendance_statuses.company_id = create_default_attendance_statuses.company_id AND deleted_at IS NULL) THEN
        RETURN;
    END IF;

    -- デフォルトのattendance_statusesを作成
    INSERT INTO attendance_statuses (company_id, name, display_name, color, font_color, background_color, sort_order, is_required, logic, description) VALUES
        (company_id, 'late_early_leave', '遅刻・早退', 'destructive', '#ffffff', '#dc2626', 1, true,
         '{"type": "function", "name": "isLateEarlyLeave", "conditions": [{"field": "late_minutes", "operator": "greater_than", "value": 0}, {"field": "early_leave_minutes", "operator": "greater_than", "value": 0}]}',
         '遅刻かつ早退した勤務状態'),
        (company_id, 'late', '遅刻', 'destructive', '#ffffff', '#ef4444', 2, true,
         '{"type": "function", "name": "isLate", "conditions": [{"field": "clock_records", "operator": "has_sessions", "value": true}, {"field": "late_minutes", "operator": "greater_than", "value": 0}]}',
         '遅刻した勤務状態'),
        (company_id, 'early_leave', '早退', 'secondary', '#ffffff', '#f97316', 3, true,
         '{"type": "function", "name": "isEarlyLeave", "conditions": [{"field": "clock_records", "operator": "has_sessions", "value": true}, {"field": "early_leave_minutes", "operator": "greater_than", "value": 0}]}',
         '早退した勤務状態'),
        (company_id, 'normal', '正常', 'outline', '#3b82f6', '#ffffff', 4, true,
         '{"type": "function", "name": "isNormal", "conditions": [{"field": "clock_records", "operator": "has_sessions", "value": true}, {"field": "clock_records", "operator": "has_completed_sessions", "value": true}]}',
         '通常の勤務状態'),
        (company_id, 'absent', '欠勤', 'outline', '#6b7280', '#f3f4f6', 5, true,
         '{"type": "function", "name": "isAbsent", "conditions": [{"field": "clock_records", "operator": "empty", "value": true}]}',
         '欠勤状態');
END;
$$ LANGUAGE plpgsql;

-- ================================
-- 2. 企業作成時に自動でデフォルトattendance_statusesを作成するトリガー関数
-- ================================

CREATE OR REPLACE FUNCTION trigger_create_default_attendance_statuses()
RETURNS TRIGGER AS $$
BEGIN
    -- 新しい企業が作成された場合のみ実行
    IF TG_OP = 'INSERT' THEN
        PERFORM create_default_attendance_statuses(NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ================================
-- 3. companiesテーブルにトリガーを追加
-- ================================

CREATE TRIGGER create_default_attendance_statuses_trigger
    AFTER INSERT ON companies
    FOR EACH ROW
    EXECUTE FUNCTION trigger_create_default_attendance_statuses();

-- ================================
-- 4. 既存の企業に対してデフォルトattendance_statusesを作成
-- ================================

DO $$
DECLARE
    company_record RECORD;
BEGIN
    FOR company_record IN SELECT id FROM companies WHERE deleted_at IS NULL
    LOOP
        PERFORM create_default_attendance_statuses(company_record.id);
    END LOOP;
END $$; 