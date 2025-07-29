-- 機能フラグの挿入（存在しない場合）
-- SupabaseダッシュボードのSQL Editorで実行してください

-- 1. チャット機能を挿入（存在しない場合）
INSERT INTO features (company_id, feature_code, is_active, created_at, updated_at)
SELECT 
    'a61d4ced-1033-44da-b9d3-a5a9ebe14978',
    'chat',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM features 
    WHERE company_id = 'a61d4ced-1033-44da-b9d3-a5a9ebe14978' 
    AND feature_code = 'chat'
);

-- 2. レポート機能を挿入（存在しない場合）
INSERT INTO features (company_id, feature_code, is_active, created_at, updated_at)
SELECT 
    'a61d4ced-1033-44da-b9d3-a5a9ebe14978',
    'report',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM features 
    WHERE company_id = 'a61d4ced-1033-44da-b9d3-a5a9ebe14978' 
    AND feature_code = 'report'
);

-- 3. スケジュール機能を挿入（存在しない場合）
INSERT INTO features (company_id, feature_code, is_active, created_at, updated_at)
SELECT 
    'a61d4ced-1033-44da-b9d3-a5a9ebe14978',
    'schedule',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM features 
    WHERE company_id = 'a61d4ced-1033-44da-b9d3-a5a9ebe14978' 
    AND feature_code = 'schedule'
);

-- 4. 挿入後の機能フラグを確認
SELECT 
    company_id,
    feature_code,
    is_active,
    created_at,
    updated_at
FROM features 
WHERE company_id = 'a61d4ced-1033-44da-b9d3-a5a9ebe14978'
ORDER BY feature_code; 