-- supabase/migrations/20250809000000_add_object_config_to_request_forms.sql
ALTER TABLE request_forms
  ADD COLUMN IF NOT EXISTS object_config JSONB;

-- 任意（検索やフィルタを想定するなら）
CREATE INDEX IF NOT EXISTS idx_request_forms_object_config
  ON request_forms USING GIN (object_config);