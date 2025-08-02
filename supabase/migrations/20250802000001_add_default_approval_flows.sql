-- リクエストフォームにデフォルトの承認フローを設定するマイグレーション
-- 2025-08-02

-- 承認フローが設定されていないリクエストフォームにデフォルトの承認フローを設定
UPDATE request_forms 
SET 
    approval_flow = '[
        {
            "step": 1,
            "name": "直属上司承認",
            "description": "直属上司による承認",
            "approver_role": "direct_manager",
            "required": true,
            "auto_approve": false
        }
    ]'::jsonb,
    updated_at = NOW()
WHERE deleted_at IS NULL 
    AND (approval_flow IS NULL OR approval_flow = '[]'::jsonb);

-- 更新されたフォームの数を確認
SELECT '承認フローを設定したフォーム数:' as info, COUNT(*) as count
FROM request_forms 
WHERE deleted_at IS NULL 
    AND approval_flow IS NOT NULL 
    AND approval_flow != '[]'::jsonb; 