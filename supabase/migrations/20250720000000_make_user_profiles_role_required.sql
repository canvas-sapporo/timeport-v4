-- user_profiles.roleを必須にするマイグレーション
-- 2025-07-20

-- 既存のNULL値をデフォルト値に更新
UPDATE user_profiles 
SET role = 'member' 
WHERE role IS NULL;

-- roleカラムをNOT NULLに変更
ALTER TABLE user_profiles 
ALTER COLUMN role SET NOT NULL;

-- デフォルト値を削除（NOT NULL制約があるため不要）
ALTER TABLE user_profiles 
ALTER COLUMN role DROP DEFAULT; 