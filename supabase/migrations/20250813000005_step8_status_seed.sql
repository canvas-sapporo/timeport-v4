BEGIN;

-- 会社汎用のLeaveカテゴリ用ステータスが未導入なら投入（codeは一意運用想定）
-- statuses(category='leave') に pending/approved/rejected/canceled を用意
-- 会社スコープで必要なら company_id 列に合わせてINSERTを分岐させる（ここではNULL=共通として投入）

INSERT INTO public.statuses (company_id, code, name, description, category, display_order, is_active)
SELECT NULL, 'leave_pending', '申請中', '承認待ち', 'leave', 10, true
WHERE NOT EXISTS (SELECT 1 FROM public.statuses WHERE code='leave_pending');

INSERT INTO public.statuses (company_id, code, name, description, category, display_order, is_active)
SELECT NULL, 'leave_approved', '承認', '承認済み', 'leave', 20, true
WHERE NOT EXISTS (SELECT 1 FROM public.statuses WHERE code='leave_approved');

INSERT INTO public.statuses (company_id, code, name, description, category, display_order, is_active)
SELECT NULL, 'leave_rejected', '却下', '差戻し/却下', 'leave', 30, true
WHERE NOT EXISTS (SELECT 1 FROM public.statuses WHERE code='leave_rejected');

INSERT INTO public.statuses (company_id, code, name, description, category, display_order, is_active)
SELECT NULL, 'leave_canceled', '取消', '承認後の取消', 'leave', 40, true
WHERE NOT EXISTS (SELECT 1 FROM public.statuses WHERE code='leave_canceled');

COMMIT;


