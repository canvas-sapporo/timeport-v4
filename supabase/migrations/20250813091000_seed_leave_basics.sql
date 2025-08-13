-- 初期データ投入: 休暇種別とポリシー（最小）
-- 2025-08-13

-- ================================
-- 1) 各会社に基本の休暇種別を作成（重複回避）
--    - paid_leave: 有給休暇
--    - unpaid_leave: 欠勤（無給）
--    - special_leave: 特別休暇
-- ================================

WITH base_leave_types AS (
  SELECT c.id AS company_id, v.code, v.name, v.description
  FROM companies c
  CROSS JOIN (
    VALUES
      ('paid_leave', '有給休暇', '法定有給休暇'),
      ('unpaid_leave', '欠勤', '無給欠勤'),
      ('special_leave', '特別休暇', '会社独自の特別休暇')
  ) AS v(code, name, description)
)
INSERT INTO leave_types (id, company_id, code, name, description, is_active, display_order, created_at, updated_at)
SELECT gen_random_uuid(), blt.company_id, blt.code, blt.name, blt.description, TRUE,
       ROW_NUMBER() OVER (PARTITION BY blt.company_id ORDER BY blt.code), NOW(), NOW()
FROM base_leave_types blt
WHERE NOT EXISTS (
  SELECT 1 FROM leave_types lt
  WHERE lt.company_id = blt.company_id
    AND lt.code = blt.code
    AND lt.deleted_at IS NULL
);

-- ================================
-- 2) 休暇ポリシー（既定値）
--    - paid_leave: 基本付与日数/繰越上限を設定
--    - unpaid/special: デフォルト最小で作成（必要に応じて管理画面から調整）
-- ================================

WITH target_leave_types AS (
  SELECT lt.company_id, lt.id AS leave_type_id, lt.code
  FROM leave_types lt
  WHERE lt.code IN ('paid_leave','unpaid_leave','special_leave')
    AND lt.deleted_at IS NULL
)
INSERT INTO leave_policies (
  company_id,
  leave_type_id,
  accrual_method,
  base_days_by_service,
  carryover_max_days
)
SELECT 
  t.company_id,
  t.leave_type_id,
  'anniversary'::text,
  CASE 
    WHEN t.code = 'paid_leave' THEN '{"0":10, "1":11, "2":12, "3":14, "4":16, "5":18, "6":20}'::jsonb
    ELSE '{}'::jsonb
  END,
  CASE WHEN t.code = 'paid_leave' THEN 20::decimal ELSE NULL END
FROM target_leave_types t
WHERE NOT EXISTS (
  SELECT 1 FROM leave_policies p
  WHERE p.company_id = t.company_id
    AND p.leave_type_id = t.leave_type_id
    AND p.deleted_at IS NULL
);


