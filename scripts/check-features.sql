-- 機能フラグの確認と修正
-- SupabaseダッシュボードのSQL Editorで実行してください

-- 1. 現在の機能フラグを確認
SELECT 
    company_id,
    feature_code,
    is_active,
    created_at,
    updated_at
FROM features 
WHERE company_id = 'a61d4ced-1033-44da-b9d3-a5a9ebe14978'
ORDER BY feature_code;

-- 2. チャット機能を有効化
UPDATE features 
SET is_active = true, updated_at = NOW()
WHERE company_id = 'a61d4ced-1033-44da-b9d3-a5a9ebe14978' 
AND feature_code = 'chat';

-- 3. 修正後の機能フラグを確認
SELECT 
    company_id,
    feature_code,
    is_active,
    created_at,
    updated_at
FROM features 
WHERE company_id = 'a61d4ced-1033-44da-b9d3-a5a9ebe14978'
ORDER BY feature_code;

-- 4. 会社情報も確認
SELECT 
    id,
    name,
    is_active,
    created_at
FROM companies 
WHERE id = 'a61d4ced-1033-44da-b9d3-a5a9ebe14978'; 