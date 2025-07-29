-- user_profilesテーブルにチャット送信キー設定フィールドを追加
-- 2025-07-31

-- ================================
-- 1. 現在のuser_profilesテーブル構造を確認
-- ================================

-- user_profilesテーブルの現在のカラムを確認
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- ================================
-- 2. チャット送信キー設定フィールドを追加
-- ================================

-- chat_send_key_shift_enterフィールドを追加（デフォルトはtrue）
ALTER TABLE user_profiles 
ADD COLUMN chat_send_key_shift_enter BOOLEAN NOT NULL DEFAULT true;

-- フィールドにコメントを追加
COMMENT ON COLUMN user_profiles.chat_send_key_shift_enter IS 'チャット送信キー設定: true=Shift+Enter, false=Enter';

-- ================================
-- 3. 既存データの確認
-- ================================

-- 追加後のフィールド値を確認
SELECT 
    id,
    family_name,
    first_name,
    email,
    chat_send_key_shift_enter
FROM user_profiles 
LIMIT 5;

-- ================================
-- 4. 設定値の統計確認
-- ================================

-- 設定値の分布を確認
SELECT 
    chat_send_key_shift_enter,
    COUNT(*) as user_count
FROM user_profiles 
GROUP BY chat_send_key_shift_enter; 