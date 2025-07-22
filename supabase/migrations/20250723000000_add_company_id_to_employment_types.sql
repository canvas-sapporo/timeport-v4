-- employment_typesテーブルにcompany_idを追加
-- 企業別の雇用形態管理を可能にする

-- 1. employment_typesテーブルにcompany_idカラムを追加
ALTER TABLE employment_types ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- 2. 既存のemployment_typesレコードを削除（company_idがないため）
DELETE FROM employment_types;

-- 3. company_idをNOT NULLに設定
ALTER TABLE employment_types ALTER COLUMN company_id SET NOT NULL;

-- 4. 企業別の雇用形態コードの一意性制約を追加
CREATE UNIQUE INDEX idx_employment_types_company_code ON employment_types(company_id, code) WHERE deleted_at IS NULL;

-- 5. 企業別の雇用形態インデックスを追加
CREATE INDEX idx_employment_types_company ON employment_types(company_id) WHERE deleted_at IS NULL;

-- 6. 企業作成時にデフォルト雇用形態を作成する関数
CREATE OR REPLACE FUNCTION create_default_employment_types(company_id UUID)
RETURNS VOID AS $$
BEGIN
    -- 既に雇用形態が存在する場合はスキップ
    IF EXISTS (SELECT 1 FROM employment_types WHERE employment_types.company_id = create_default_employment_types.company_id AND deleted_at IS NULL) THEN
        RETURN;
    END IF;

    -- デフォルトの雇用形態を作成
    INSERT INTO employment_types (company_id, code, name, description, is_active, display_order) VALUES
        (company_id, 'REGULAR', '正メンバー', '正メンバーとして雇用される形態', true, 1),
        (company_id, 'CONTRACT', '契約メンバー', '契約に基づく雇用形態', true, 2),
        (company_id, 'PART_TIME', 'パートタイム', 'パートタイム勤務の雇用形態', true, 3),
        (company_id, 'INTERN', 'インターン', 'インターンシップの雇用形態', true, 4);
END;
$$ LANGUAGE plpgsql;

-- 7. 企業作成時に自動でデフォルト雇用形態を作成するトリガー関数
CREATE OR REPLACE FUNCTION trigger_create_default_employment_types()
RETURNS TRIGGER AS $$
BEGIN
    -- 新しい企業が作成された場合のみ実行
    IF TG_OP = 'INSERT' THEN
        PERFORM create_default_employment_types(NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. companiesテーブルにトリガーを追加
CREATE TRIGGER create_default_employment_types_trigger
    AFTER INSERT ON companies
    FOR EACH ROW
    EXECUTE FUNCTION trigger_create_default_employment_types();

-- 9. 既存の企業に対してデフォルト雇用形態を作成
-- 注意: この部分は既存の企業がある場合のみ実行される
DO $$
DECLARE
    company_record RECORD;
BEGIN
    FOR company_record IN SELECT id FROM companies WHERE deleted_at IS NULL
    LOOP
        PERFORM create_default_employment_types(company_record.id);
    END LOOP;
END $$; 