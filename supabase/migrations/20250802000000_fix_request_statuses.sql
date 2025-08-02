-- 既存のリクエストレコードのステータスIDを修正するマイグレーション
-- 2025-08-02

-- 既存のリクエストレコードにデフォルトステータスを設定
DO $$
DECLARE
    draft_status_id UUID;
    pending_status_id UUID;
    updated_count INTEGER;
BEGIN
    -- 下書きステータスIDを取得
    SELECT id INTO draft_status_id 
    FROM statuses 
    WHERE code = 'draft' AND category = 'request' 
    LIMIT 1;
    
    -- 承認待ちステータスIDを取得
    SELECT id INTO pending_status_id 
    FROM statuses 
    WHERE code = 'pending' AND category = 'request' 
    LIMIT 1;
    
    -- ステータスIDが空のリクエストにデフォルトステータスを設定
    -- 作成日が最近のものは「承認待ち」、古いものは「下書き」として設定
    UPDATE requests 
    SET 
        status_id = CASE 
            WHEN created_at >= NOW() - INTERVAL '7 days' THEN pending_status_id
            ELSE draft_status_id
        END,
        updated_at = NOW()
    WHERE deleted_at IS NULL AND status_id IS NULL;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    RAISE NOTICE '更新完了: %件のリクエストを更新しました。下書きステータスID = %, 承認待ちステータスID = %', 
        updated_count, draft_status_id, pending_status_id;
END $$; 