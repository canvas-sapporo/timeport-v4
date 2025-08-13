BEGIN;

-- ===============================
-- Reset for listed migrations:
-- 20250813000000_leave_ledger_step1.sql
-- 20250813000001_leave_ledger_step2_rls.sql
-- 20250813000002_step4_allocate_functions.sql
-- 20250813000003_step6_grant_job.sql
-- 20250813000004_step7_audit_and_triggers.sql
-- 20250813000005_step8_status_seed.sql
-- 20250813000006_step9_business_calendar.sql
-- ===============================

-- Step 7 (audit triggers on leave_* tables): drop triggers only
DROP TRIGGER IF EXISTS tr_audit_leave_grants       ON public.leave_grants;
DROP TRIGGER IF EXISTS tr_audit_leave_consumptions ON public.leave_consumptions;
DROP TRIGGER IF EXISTS tr_audit_leave_policies     ON public.leave_policies;
DROP TRIGGER IF EXISTS tr_audit_leave_req_details  ON public.leave_request_details;

-- Step 4 (RPC functions for allocation/confirm/release)
DROP FUNCTION IF EXISTS public.fn_allocate_leave(uuid, uuid, uuid, jsonb, boolean, uuid[]) CASCADE;
DROP FUNCTION IF EXISTS public.fn_confirm_leave(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.fn_release_leave(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.fn_reverse_confirmed_leave(uuid, text) CASCADE;

-- Step 6 (grant job functions and schema additions)
DROP FUNCTION IF EXISTS public.fn_issue_leave_grants(uuid, date) CASCADE;
DROP FUNCTION IF EXISTS public.fn_due_leave_grants(uuid, date) CASCADE;

-- indexes/columns added in Step 6
DROP INDEX IF EXISTS public.idx_user_profiles_hire_date;
ALTER TABLE IF EXISTS public.user_profiles DROP COLUMN IF EXISTS hire_date;
ALTER TABLE IF EXISTS public.leave_policies DROP COLUMN IF EXISTS settings;

-- Step 9 (business calendar schema, policies, and function)
DROP FUNCTION IF EXISTS public.fn_is_business_day(uuid, date) CASCADE;

-- Policies
DROP POLICY IF EXISTS p_bcd_cud    ON public.business_calendar_dates;
DROP POLICY IF EXISTS p_bcd_select ON public.business_calendar_dates;
DROP POLICY IF EXISTS p_bc_cud     ON public.business_calendars;
DROP POLICY IF EXISTS p_bc_select  ON public.business_calendars;

-- Disable RLS before drop (defensive)
ALTER TABLE IF EXISTS public.business_calendar_dates DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.business_calendars     DISABLE ROW LEVEL SECURITY;

-- companies FK column, then calendar tables and index
ALTER TABLE IF EXISTS public.companies DROP COLUMN IF EXISTS business_calendar_id;
DROP INDEX IF EXISTS public.idx_bcd_calendar_date;
DROP TABLE IF EXISTS public.business_calendar_dates CASCADE;
DROP TABLE IF EXISTS public.business_calendars CASCADE;

-- Step 8 (status seed cleanup)
DELETE FROM public.statuses WHERE code IN (
  'leave_pending','leave_approved','leave_rejected','leave_canceled'
);

-- Step 2 (RLS on leave_* tables): drop policies and disable RLS
-- leave_request_details
DROP POLICY IF EXISTS p_lrd_del   ON public.leave_request_details;
DROP POLICY IF EXISTS p_lrd_upd   ON public.leave_request_details;
DROP POLICY IF EXISTS p_lrd_ins   ON public.leave_request_details;
DROP POLICY IF EXISTS p_lrd_select ON public.leave_request_details;

-- leave_consumptions
DROP POLICY IF EXISTS p_lc_del_admin     ON public.leave_consumptions;
DROP POLICY IF EXISTS p_lc_del_self_hold ON public.leave_consumptions;
DROP POLICY IF EXISTS p_lc_upd_admin     ON public.leave_consumptions;
DROP POLICY IF EXISTS p_lc_ins_admin     ON public.leave_consumptions;
DROP POLICY IF EXISTS p_lc_ins_self_hold ON public.leave_consumptions;
DROP POLICY IF EXISTS p_lc_select_admin  ON public.leave_consumptions;
DROP POLICY IF EXISTS p_lc_select_self   ON public.leave_consumptions;

-- leave_grants
DROP POLICY IF EXISTS p_lg_del_admin    ON public.leave_grants;
DROP POLICY IF EXISTS p_lg_upd_admin    ON public.leave_grants;
DROP POLICY IF EXISTS p_lg_ins_admin    ON public.leave_grants;
DROP POLICY IF EXISTS p_lg_select_admin ON public.leave_grants;
DROP POLICY IF EXISTS p_lg_select_self  ON public.leave_grants;

-- leave_policies
DROP POLICY IF EXISTS p_lp_del    ON public.leave_policies;
DROP POLICY IF EXISTS p_lp_upd    ON public.leave_policies;
DROP POLICY IF EXISTS p_lp_ins    ON public.leave_policies;
DROP POLICY IF EXISTS p_lp_select ON public.leave_policies;

ALTER TABLE IF EXISTS public.leave_grants          DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.leave_consumptions    DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.leave_policies        DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.leave_request_details DISABLE ROW LEVEL SECURITY;

-- Step 1 (leave ledger core): drop views, indexes, and tables
DROP VIEW IF EXISTS public.v_leave_balances;
-- NOTE: v_user_companies is intentionally preserved as it may be used beyond leave.

-- indexes
DROP INDEX IF EXISTS public.idx_leave_consumptions_user_type;
DROP INDEX IF EXISTS public.idx_leave_grants_user_type;
DROP INDEX IF EXISTS public.uq_leave_grants_unique_issue;

-- tables (respecting FK dependencies)
DROP TABLE IF EXISTS public.leave_request_details CASCADE;
DROP TABLE IF EXISTS public.leave_consumptions CASCADE;
DROP TABLE IF EXISTS public.leave_policies CASCADE;
DROP TABLE IF EXISTS public.leave_grants CASCADE;

COMMIT;


