-- companiesテーブルにis_active列を追加
ALTER TABLE companies
ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE; 