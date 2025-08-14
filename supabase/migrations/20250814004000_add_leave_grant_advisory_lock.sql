-- Advisory lock helpers to prevent concurrent leave grant runs per (company, leave_type, grant_date)

CREATE OR REPLACE FUNCTION public.try_start_leave_grant(company_id UUID, leave_type_id UUID, grant_date DATE)
RETURNS BOOLEAN
LANGUAGE sql
AS $$
  SELECT pg_try_advisory_lock(
    hashtext(company_id::text),
    hashtext( (leave_type_id::text || ':' || grant_date::text) )
  );
$$;

COMMENT ON FUNCTION public.try_start_leave_grant(UUID, UUID, DATE) IS 'Attempt to acquire advisory lock for (company_id, leave_type_id, grant_date). Returns true if acquired.';

CREATE OR REPLACE FUNCTION public.finish_leave_grant(company_id UUID, leave_type_id UUID, grant_date DATE)
RETURNS BOOLEAN
LANGUAGE sql
AS $$
  SELECT pg_advisory_unlock(
    hashtext(company_id::text),
    hashtext( (leave_type_id::text || ':' || grant_date::text) )
  );
$$;

COMMENT ON FUNCTION public.finish_leave_grant(UUID, UUID, DATE) IS 'Release advisory lock for (company_id, leave_type_id, grant_date). Returns true if released.';


