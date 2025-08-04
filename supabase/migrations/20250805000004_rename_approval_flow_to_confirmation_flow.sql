-- レポートテンプレートテーブルのapproval_flowフィールドをconfirmation_flowに変更
-- 承認フローから確認フローへの変更

-- 1. 新しいconfirmation_flowカラムを追加
ALTER TABLE report_templates 
ADD COLUMN confirmation_flow JSONB;

-- 2. 既存のapproval_flowデータをconfirmation_flowに移行
-- 既存データがある場合は、デフォルトの確認フロー構造に変換
UPDATE report_templates 
SET confirmation_flow = '[
  {
    "step": 1,
    "name": "確認",
    "description": "レポートの確認",
    "confirmer_role": "any",
    "required": true,
    "auto_confirm": false
  }
]'::jsonb
WHERE approval_flow IS NOT NULL;

-- 3. confirmation_flowカラムをNOT NULLに設定
ALTER TABLE report_templates 
ALTER COLUMN confirmation_flow SET NOT NULL;

-- 4. 古いapproval_flowカラムを削除
ALTER TABLE report_templates 
DROP COLUMN approval_flow;

-- 5. コメントを追加
COMMENT ON COLUMN report_templates.confirmation_flow IS '確認フロー設定（未確認→確認済み）'; 