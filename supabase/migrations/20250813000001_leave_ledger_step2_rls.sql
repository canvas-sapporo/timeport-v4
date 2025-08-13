-- ============================================
-- Step 2: RLS policies for leave_* tables
-- ============================================

BEGIN;

-- 0) 補助関数（会社判定 & 管理者判定）
CREATE OR REPLACE VIEW public.v_user_companies AS
SELECT u.id AS user_id,
       COALESCE(et.company_id, g.company_id) AS company_id
FROM auth.users u
LEFT JOIN public.user_profiles up ON up.id = u.id
LEFT JOIN public.employment_types et ON et.id = up.employment_type_id
LEFT JOIN public.user_groups ug ON ug.user_id = u.id
LEFT JOIN public.groups g ON g.id = ug.group_id;

CREATE OR REPLACE FUNCTION public.fn_user_company_id(uid uuid)
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT company_id
  FROM public.v_user_companies
  WHERE user_id = uid
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.fn_is_company_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(up.role IN ('admin','system-admin'), false)
  FROM public.user_profiles up
  WHERE up.id = uid
  LIMIT 1
$$;

-- 1) RLS有効化
ALTER TABLE public.leave_grants          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_consumptions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_policies        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_request_details ENABLE ROW LEVEL SECURITY;

-- 2) leave_policies（会社単位）
DROP POLICY IF EXISTS p_lp_select ON public.leave_policies;
DROP POLICY IF EXISTS p_lp_ins    ON public.leave_policies;
DROP POLICY IF EXISTS p_lp_upd    ON public.leave_policies;
DROP POLICY IF EXISTS p_lp_del    ON public.leave_policies;

CREATE POLICY p_lp_select ON public.leave_policies
FOR SELECT
USING (company_id = fn_user_company_id(auth.uid()));

-- 会社管理者のみ登録・更新・削除可
CREATE POLICY p_lp_ins ON public.leave_policies
FOR INSERT
WITH CHECK (
  company_id = fn_user_company_id(auth.uid())
  AND fn_is_company_admin(auth.uid()) = true
);

CREATE POLICY p_lp_upd ON public.leave_policies
FOR UPDATE
USING (
  company_id = fn_user_company_id(auth.uid())
  AND fn_is_company_admin(auth.uid()) = true
)
WITH CHECK (
  company_id = fn_user_company_id(auth.uid())
  AND fn_is_company_admin(auth.uid()) = true
);

CREATE POLICY p_lp_del ON public.leave_policies
FOR DELETE
USING (
  company_id = fn_user_company_id(auth.uid())
  AND fn_is_company_admin(auth.uid()) = true
);

-- 3) leave_grants（付与明細）
DROP POLICY IF EXISTS p_lg_select_self   ON public.leave_grants;
DROP POLICY IF EXISTS p_lg_select_admin  ON public.leave_grants;
DROP POLICY IF EXISTS p_lg_ins_admin     ON public.leave_grants;
DROP POLICY IF EXISTS p_lg_upd_admin     ON public.leave_grants;
DROP POLICY IF EXISTS p_lg_del_admin     ON public.leave_grants;

-- 閲覧: 自分の分
CREATE POLICY p_lg_select_self ON public.leave_grants
FOR SELECT
USING (user_id = auth.uid());

-- 閲覧: 会社管理者は同一会社の全員分
CREATE POLICY p_lg_select_admin ON public.leave_grants
FOR SELECT
USING (
  fn_is_company_admin(auth.uid()) = true
  AND fn_user_company_id(user_id) = fn_user_company_id(auth.uid())
);

-- 付与作成・更新・削除は会社管理者のみ
CREATE POLICY p_lg_ins_admin ON public.leave_grants
FOR INSERT
WITH CHECK (
  fn_is_company_admin(auth.uid()) = true
  AND fn_user_company_id(user_id) = fn_user_company_id(auth.uid())
);

CREATE POLICY p_lg_upd_admin ON public.leave_grants
FOR UPDATE
USING (
  fn_is_company_admin(auth.uid()) = true
  AND fn_user_company_id(user_id) = fn_user_company_id(auth.uid())
)
WITH CHECK (
  fn_is_company_admin(auth.uid()) = true
  AND fn_user_company_id(user_id) = fn_user_company_id(auth.uid())
);

CREATE POLICY p_lg_del_admin ON public.leave_grants
FOR DELETE
USING (
  fn_is_company_admin(auth.uid()) = true
  AND fn_user_company_id(user_id) = fn_user_company_id(auth.uid())
);

-- 4) leave_consumptions（消費明細）
DROP POLICY IF EXISTS p_lc_select_self    ON public.leave_consumptions;
DROP POLICY IF EXISTS p_lc_select_admin   ON public.leave_consumptions;
DROP POLICY IF EXISTS p_lc_ins_self_hold  ON public.leave_consumptions;
DROP POLICY IF EXISTS p_lc_ins_admin      ON public.leave_consumptions;
DROP POLICY IF EXISTS p_lc_upd_admin      ON public.leave_consumptions;
DROP POLICY IF EXISTS p_lc_del_self_hold  ON public.leave_consumptions;
DROP POLICY IF EXISTS p_lc_del_admin      ON public.leave_consumptions;

-- 閲覧: 自分の分
CREATE POLICY p_lc_select_self ON public.leave_consumptions
FOR SELECT
USING (user_id = auth.uid());

-- 閲覧: 会社管理者
CREATE POLICY p_lc_select_admin ON public.leave_consumptions
FOR SELECT
USING (
  fn_is_company_admin(auth.uid()) = true
  AND fn_user_company_id(user_id) = fn_user_company_id(auth.uid())
);

-- 追加: 一般ユーザーは「仮押さえのみ」自分の分を作成可
CREATE POLICY p_lc_ins_self_hold ON public.leave_consumptions
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND is_hold = true
  AND fn_user_company_id(user_id) = fn_user_company_id(auth.uid())
);

-- 追加: 管理者は会社内のどれでも作成可（確定・逆仕訳含む）
CREATE POLICY p_lc_ins_admin ON public.leave_consumptions
FOR INSERT
WITH CHECK (
  fn_is_company_admin(auth.uid()) = true
  AND fn_user_company_id(user_id) = fn_user_company_id(auth.uid())
);

-- 更新: 管理者のみ（承認で is_hold=false へ、逆仕訳など）
CREATE POLICY p_lc_upd_admin ON public.leave_consumptions
FOR UPDATE
USING (
  fn_is_company_admin(auth.uid()) = true
  AND fn_user_company_id(user_id) = fn_user_company_id(auth.uid())
)
WITH CHECK (
  fn_is_company_admin(auth.uid()) = true
  AND fn_user_company_id(user_id) = fn_user_company_id(auth.uid())
);

-- 削除: 一般ユーザーは自分の「仮押さえのみ」取消可（却下や下書き戻し）
CREATE POLICY p_lc_del_self_hold ON public.leave_consumptions
FOR DELETE
USING (
  user_id = auth.uid()
  AND is_hold = true
);

-- 削除: 管理者は会社内の任意を削除可（運用で逆仕訳推奨だが、緊急用に許容）
CREATE POLICY p_lc_del_admin ON public.leave_consumptions
FOR DELETE
USING (
  fn_is_company_admin(auth.uid()) = true
  AND fn_user_company_id(user_id) = fn_user_company_id(auth.uid())
);

-- 5) leave_request_details（申請明細）
DROP POLICY IF EXISTS p_lrd_select ON public.leave_request_details;
DROP POLICY IF EXISTS p_lrd_ins    ON public.leave_request_details;
DROP POLICY IF EXISTS p_lrd_upd    ON public.leave_request_details;
DROP POLICY IF EXISTS p_lrd_del    ON public.leave_request_details;

-- Select: 申請者本人 or 同社の管理者
CREATE POLICY p_lrd_select ON public.leave_request_details
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.requests r
    WHERE r.id = request_id
      AND (
            r.user_id = auth.uid()
         OR ( fn_is_company_admin(auth.uid()) = true
              AND fn_user_company_id(r.user_id) = fn_user_company_id(auth.uid())
            )
          )
  )
);

-- Insert: 申請者本人 or 同社の管理者
CREATE POLICY p_lrd_ins ON public.leave_request_details
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.requests r
    WHERE r.id = request_id
      AND (
            r.user_id = auth.uid()
         OR ( fn_is_company_admin(auth.uid()) = true
              AND fn_user_company_id(r.user_id) = fn_user_company_id(auth.uid())
            )
          )
  )
);

-- Update/Delete: 申請者本人 or 同社の管理者
CREATE POLICY p_lrd_upd ON public.leave_request_details
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.requests r
    WHERE r.id = request_id
      AND (
            r.user_id = auth.uid()
         OR ( fn_is_company_admin(auth.uid()) = true
              AND fn_user_company_id(r.user_id) = fn_user_company_id(auth.uid())
            )
          )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.requests r
    WHERE r.id = request_id
      AND (
            r.user_id = auth.uid()
         OR ( fn_is_company_admin(auth.uid()) = true
              AND fn_user_company_id(r.user_id) = fn_user_company_id(auth.uid())
            )
          )
  )
);

CREATE POLICY p_lrd_del ON public.leave_request_details
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.requests r
    WHERE r.id = request_id
      AND (
            r.user_id = auth.uid()
         OR ( fn_is_company_admin(auth.uid()) = true
              AND fn_user_company_id(r.user_id) = fn_user_company_id(auth.uid())
            )
          )
  )
);

COMMIT;


