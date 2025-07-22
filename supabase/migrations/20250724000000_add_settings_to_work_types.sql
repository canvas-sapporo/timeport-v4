-- 勤務タイプに設定情報を追加
ALTER TABLE work_types ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

-- インデックスを追加（JSONB検索の最適化）
CREATE INDEX IF NOT EXISTS idx_work_types_settings ON work_types USING GIN (settings) WHERE deleted_at IS NULL;

-- 既存のレコードにデフォルト設定を適用
UPDATE work_types SET settings = '{}' WHERE settings IS NULL;

-- コメントを追加
COMMENT ON COLUMN work_types.settings IS '勤務形態の柔軟な設定情報（残業設定、特別休憩時間、カスタムルール等）'; 