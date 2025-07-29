-- featuresテーブルの設計変更
-- company_idとis_active列を追加し、feature_companiesテーブルを削除

-- ================================
-- 1. 既存のfeature_companiesテーブルを削除
-- ================================

-- 既存のインデックスを削除
DROP INDEX IF EXISTS idx_feature_companies_feature;
DROP INDEX IF EXISTS idx_feature_companies_company;

-- feature_companiesテーブルを削除
DROP TABLE IF EXISTS feature_companies CASCADE;

-- ================================
-- 2. featuresテーブルに新しい列を追加
-- ================================

-- 既存のユニーク制約を削除（新しい制約を追加する前に）
ALTER TABLE features DROP CONSTRAINT IF EXISTS features_feature_code_key;

-- company_id列を追加
ALTER TABLE features 
ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- is_active列を追加
ALTER TABLE features 
ADD COLUMN is_active BOOLEAN DEFAULT FALSE;

-- settings列を追加（企業ごとの詳細設定用）
ALTER TABLE features 
ADD COLUMN settings JSONB DEFAULT '{}';

-- ================================
-- 3. 制約の追加
-- ================================

-- feature_codeとcompany_idの組み合わせでユニーク制約を追加
ALTER TABLE features 
ADD CONSTRAINT features_code_company_unique UNIQUE (feature_code, company_id);

-- ================================
-- 4. インデックスの作成
-- ================================

-- company_idのインデックス
CREATE INDEX idx_features_company ON features(company_id) WHERE deleted_at IS NULL;

-- is_activeのインデックス
CREATE INDEX idx_features_active ON features(is_active) WHERE deleted_at IS NULL;

-- company_idとis_activeの複合インデックス
CREATE INDEX idx_features_company_active ON features(company_id, is_active) WHERE deleted_at IS NULL;

-- settings JSONBのインデックス
CREATE INDEX idx_features_settings ON features USING GIN(settings) WHERE deleted_at IS NULL;

-- ================================
-- 5. RLSポリシーの更新
-- ================================

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "system-admin_read_features" ON features;

-- 新しいポリシーを作成
CREATE POLICY "system-admin_manage_features" ON features
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'system-admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'system-admin'
    )
  );

-- 企業管理者とメンバーは読み取りのみ可能
CREATE POLICY "admin_member_read_features" ON features
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role IN ('admin', 'member')
    )
  );

-- ================================
-- 6. 既存データの処理とデフォルト機能データの挿入
-- ================================

-- 既存のfeaturesテーブルのデータを確認し、必要に応じて削除
-- 新しい設計では、feature_codeとcompany_idの組み合わせでユニークになるため、
-- 既存の単一のfeature_codeレコードは削除する
DELETE FROM features WHERE company_id IS NULL;

-- 既存の企業を取得して、各企業に対して機能を追加
INSERT INTO features (feature_code, feature_name, description, company_id, is_active, settings)
SELECT 
  'chat',
  'チャット機能',
  '社内チャット機能',
  c.id,
  FALSE,
  '{}'
FROM companies c
WHERE c.deleted_at IS NULL
ON CONFLICT (feature_code, company_id) DO NOTHING;

INSERT INTO features (feature_code, feature_name, description, company_id, is_active, settings)
SELECT 
  'report',
  'レポート機能',
  '勤怠レポート・分析機能',
  c.id,
  FALSE,
  '{}'
FROM companies c
WHERE c.deleted_at IS NULL
ON CONFLICT (feature_code, company_id) DO NOTHING;

INSERT INTO features (feature_code, feature_name, description, company_id, is_active, settings)
SELECT 
  'schedule',
  'スケジュール機能',
  '勤務スケジュール管理機能',
  c.id,
  FALSE,
  '{}'
FROM companies c
WHERE c.deleted_at IS NULL
ON CONFLICT (feature_code, company_id) DO NOTHING;

-- ================================
-- 7. ビューの更新
-- ================================

-- 既存のactive_featuresビューを削除
DROP VIEW IF EXISTS active_features;

-- 新しいactive_featuresビューを作成
CREATE VIEW active_features AS 
SELECT 
  f.*,
  c.name AS company_name,
  c.code AS company_code
FROM features f
JOIN companies c ON f.company_id = c.id AND c.deleted_at IS NULL
WHERE f.deleted_at IS NULL; 