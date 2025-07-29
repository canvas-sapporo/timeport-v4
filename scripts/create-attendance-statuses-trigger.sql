-- 企業作成時にattendance_statusesを自動生成するトリガー
-- Supabaseの管理画面のSQL Editorで実行してください
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
        (company_id, 'normal', '正常', 'outline', '#3b82f6', '#ffffff', 1, true,
         '{"type": "function", "name": "isNormal", "conditions": [{"field": "clock_records", "operator": "has_sessions", "value": true}, {"field": "clock_records", "operator": "has_completed_sessions", "value": true}]}',
         '通常の勤務状態'),
        (company_id, 'late', '遅刻', 'destructive', '#ffffff', '#ef4444', 2, true,
         '{"type": "function", "name": "isLate", "conditions": [{"field": "clock_records", "operator": "has_sessions", "value": true}, {"field": "late_minutes", "operator": "greater_than", "value": 0}]}',
         '遅刻した勤務状態'),
        (company_id, 'early_leave', '早退', 'secondary', '#ffffff', '#f97316', 3, true,
         '{"type": "function", "name": "isEarlyLeave", "conditions": [{"field": "clock_records", "operator": "has_sessions", "value": true}, {"field": "early_leave_minutes", "operator": "greater_than", "value": 0}]}',
         '早退した勤務状態'),
        (company_id, 'absent', '欠勤', 'outline', '#6b7280', '#f3f4f6', 4, true,
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

-- 既存のトリガーがある場合は削除
DROP TRIGGER IF EXISTS create_default_attendance_statuses_trigger ON companies;

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

-- ================================
-- 5. 作成結果の確認
-- ================================

-- 企業ごとのattendance_statuses数を確認
SELECT 
    c.name as company_name,
    c.id as company_id,
    COUNT(as.id) as status_count
FROM companies c
LEFT JOIN attendance_statuses as ON c.id = as.company_id AND as.deleted_at IS NULL
WHERE c.deleted_at IS NULL
GROUP BY c.id, c.name
ORDER BY c.name;

-- 作成されたattendance_statusesの詳細確認
SELECT 
    c.name as company_name,
    as.name,
    as.display_name,
    as.color,
    as.font_color,
    as.background_color,
    as.sort_order,
    as.is_required
FROM companies c
JOIN attendance_statuses as ON c.id = as.company_id AND as.deleted_at IS NULL
WHERE c.deleted_at IS NULL
ORDER BY c.name, as.sort_order; 