-- user_profilesテーブルからcompany_id列を削除
-- 新しい構造: users → user_groups → groups → companies で会社情報を取得
-- ================================

-- 既存のcompany_id列を削除
ALTER TABLE user_profiles DROP COLUMN IF EXISTS company_id;

-- 関連するインデックスも削除（存在する場合）
DROP INDEX IF EXISTS idx_user_profiles_company;

-- 関連するRLSポリシーを更新（必要に応じて）
-- 注: 既存のポリシーでcompany_idを参照している場合は、
-- 新しい構造に対応するように修正が必要 