-- 現在のユーザーのcompany_idを「鈴木」ユーザーと同じ企業に修正
-- ================================

-- 現在のユーザー（鈴木太郎）のcompany_idを修正
-- 鈴木ユーザーのcompany_id: eb119af1-6e82-4baa-b6d4-ce63f7b376ca
UPDATE user_profiles 
SET company_id = 'eb119af1-6e82-4baa-b6d4-ce63f7b376ca'
WHERE id = 'af3cc5f5-6831-407f-b91d-b3fc96b72adc'; -- 現在のユーザーID（ログから確認）

-- 他のユーザーも同じ企業に統一（必要に応じて）
-- UPDATE user_profiles 
-- SET company_id = 'eb119af1-6e82-4baa-b6d4-ce63f7b376ca'
-- WHERE company_id = '3a44f9fd-527a-4225-a484-7864d21aeb51'; 