-- user_profilesテーブルからprimary_group_idカラムを削除
-- 2025-07-22

-- primary_group_idカラムを削除
ALTER TABLE user_profiles DROP COLUMN IF EXISTS primary_group_id;

-- コメント追加
COMMENT ON TABLE user_profiles IS 'ユーザープロフィールテーブル（primary_group_idは削除済み、user_groupsテーブルで管理）'; 