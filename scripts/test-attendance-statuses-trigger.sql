-- attendance_statusesトリガーのテスト
-- Supabaseの管理画面のSQL Editorで実行してください

-- ================================
-- 1. テスト用の企業を作成（トリガーのテスト）
-- ================================

-- テスト用企業を作成
INSERT INTO companies (name, code, address, phone, is_active) VALUES
('テスト企業（トリガーテスト）', 'TEST_TRIGGER', '東京都渋谷区テスト1-1-1', '03-1234-5678', true)
RETURNING id, name, code;

-- ================================
-- 2. 作成されたattendance_statusesを確認
-- ================================

-- テスト企業のattendance_statusesを確認
SELECT 
    c.name as company_name,
    c.code as company_code,
    as.name,
    as.display_name,
    as.color,
    as.font_color,
    as.background_color,
    as.sort_order,
    as.is_required,
    as.created_at
FROM companies c
JOIN attendance_statuses as ON c.id = as.company_id AND as.deleted_at IS NULL
WHERE c.code = 'TEST_TRIGGER'
ORDER BY as.sort_order;

-- ================================
-- 3. 全企業のattendance_statuses状況を確認
-- ================================

-- 企業ごとのattendance_statuses数を確認
SELECT 
    c.name as company_name,
    c.code as company_code,
    COUNT(as.id) as status_count,
    CASE 
        WHEN COUNT(as.id) = 4 THEN '✅ 正常'
        WHEN COUNT(as.id) > 0 THEN '⚠️ 不完全'
        ELSE '❌ 未作成'
    END as status
FROM companies c
LEFT JOIN attendance_statuses as ON c.id = as.company_id AND as.deleted_at IS NULL
WHERE c.deleted_at IS NULL
GROUP BY c.id, c.name, c.code
ORDER BY c.name;

-- ================================
-- 4. テスト用企業を削除（クリーンアップ）
-- ================================

-- テスト用企業を削除（attendance_statusesもCASCADEで削除される）
DELETE FROM companies WHERE code = 'TEST_TRIGGER';

-- 削除確認
SELECT 'テスト企業削除完了' as status; 