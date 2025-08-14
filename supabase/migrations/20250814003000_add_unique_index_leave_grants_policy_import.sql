-- Unique index to prevent duplicate policy/import grants for same user/type/date
-- Allows corrections via source <> 'policy'/'import' and respects soft-delete

CREATE UNIQUE INDEX IF NOT EXISTS uq_leave_grants_policy_import
ON public.leave_grants (user_id, leave_type_id, granted_on, source)
WHERE deleted_at IS NULL AND source IN ('policy','import');


