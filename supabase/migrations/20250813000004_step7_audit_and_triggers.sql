BEGIN;

-- 1) 汎用：監査ログ書き込み関数
CREATE OR REPLACE FUNCTION public.fn_write_audit_log(
  p_action text,
  p_target text,
  p_target_id uuid,
  p_before jsonb,
  p_after jsonb,
  p_details jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE sql
AS $$
  INSERT INTO public.audit_logs(
    action, target_type, target_id, before_data, after_data, details, created_date, created_at, updated_at
  ) VALUES (
    p_action, p_target, p_target_id, p_before, p_after, p_details, CURRENT_DATE, now(), now()
  );
$$;

-- 2) テーブルごとのトリガ用関数
CREATE OR REPLACE FUNCTION public.tr_audit_row_change() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  v_action text;
  v_before jsonb;
  v_after jsonb;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    v_action := 'insert';
    v_before := NULL;
    v_after  := to_jsonb(NEW);
    PERFORM public.fn_write_audit_log(v_action, TG_TABLE_NAME, NEW.id, v_before, v_after, '{}'::jsonb);
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    v_action := 'update';
    v_before := to_jsonb(OLD);
    v_after  := to_jsonb(NEW);
    PERFORM public.fn_write_audit_log(v_action, TG_TABLE_NAME, NEW.id, v_before, v_after, '{}'::jsonb);
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    v_action := 'delete';
    v_before := to_jsonb(OLD);
    v_after  := NULL;
    PERFORM public.fn_write_audit_log(v_action, TG_TABLE_NAME, OLD.id, v_before, v_after, '{}'::jsonb);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- 3) 対象テーブルへトリガ付与
DROP TRIGGER IF EXISTS tr_audit_leave_grants       ON public.leave_grants;
DROP TRIGGER IF EXISTS tr_audit_leave_consumptions ON public.leave_consumptions;
DROP TRIGGER IF EXISTS tr_audit_leave_policies     ON public.leave_policies;
DROP TRIGGER IF EXISTS tr_audit_leave_req_details  ON public.leave_request_details;

CREATE TRIGGER tr_audit_leave_grants
AFTER INSERT OR UPDATE OR DELETE ON public.leave_grants
FOR EACH ROW EXECUTE FUNCTION public.tr_audit_row_change();

CREATE TRIGGER tr_audit_leave_consumptions
AFTER INSERT OR UPDATE OR DELETE ON public.leave_consumptions
FOR EACH ROW EXECUTE FUNCTION public.tr_audit_row_change();

CREATE TRIGGER tr_audit_leave_policies
AFTER INSERT OR UPDATE OR DELETE ON public.leave_policies
FOR EACH ROW EXECUTE FUNCTION public.tr_audit_row_change();

CREATE TRIGGER tr_audit_leave_req_details
AFTER INSERT OR UPDATE OR DELETE ON public.leave_request_details
FOR EACH ROW EXECUTE FUNCTION public.tr_audit_row_change();

COMMIT;


