-- 承認フローに実際の承認者IDを設定するマイグレーション
-- 2025-08-02

-- 管理者ユーザーを取得して承認者として設定
DO $$
DECLARE
    admin_user_id UUID;
    updated_count INTEGER;
BEGIN
    -- 管理者ユーザーを取得（最初の管理者を承認者として設定）
    SELECT id INTO admin_user_id 
    FROM user_profiles 
    WHERE role = 'admin' AND deleted_at IS NULL 
    ORDER BY created_at 
    LIMIT 1;
    
    IF admin_user_id IS NULL THEN
        RAISE NOTICE '管理者ユーザーが見つかりません';
        RETURN;
    END IF;
    
    RAISE NOTICE '承認者として設定する管理者ID: %', admin_user_id;
    
    -- 承認フローを更新して承認者IDを設定
    UPDATE request_forms 
    SET 
        approval_flow = jsonb_build_array(
            jsonb_build_object(
                'step', 1,
                'name', '管理者承認',
                'description', '管理者による承認',
                'approver_id', admin_user_id,
                'required', true,
                'auto_approve', false
            )
        ),
        updated_at = NOW()
    WHERE deleted_at IS NULL 
        AND (approval_flow IS NULL OR approval_flow = '[]'::jsonb);
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    RAISE NOTICE '承認フローを更新したフォーム数: %', updated_count;
END $$; 