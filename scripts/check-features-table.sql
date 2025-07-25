-- featuresテーブルの構造確認
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'features' 
ORDER BY ordinal_position;

-- featuresテーブルのデータ確認
SELECT * FROM features LIMIT 5;

-- feature_companiesテーブルの存在確認
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'feature_companies'
) as feature_companies_exists; 