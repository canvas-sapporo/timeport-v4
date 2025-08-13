-- ============================================
-- Step 4: RPC for allocation / confirm / release
-- ============================================

BEGIN;

-- JSONスキーマ例:
-- needs = [
--   {"consumed_on": "2025-08-13", "quantity": 4.0},  -- 時間(h)
--   {"consumed_on": "2025-08-14", "quantity": 2.0}
-- ]

CREATE OR REPLACE FUNCTION public.fn_allocate_leave(
  p_user_id uuid,
  p_leave_type_id uuid,
  p_request_id uuid,
  p_needs jsonb,                    -- [{"consumed_on":"YYYY-MM-DD","quantity":number}, ...]
  p_is_hold boolean,
  p_manual_grant_ids uuid[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_need         RECORD;
  v_needed_hours numeric;
  v_consumed_on  date;

  v_grant        RECORD;
  v_grant_left   numeric;
  v_take         numeric;
  v_total_alloc  numeric := 0;

  v_rows jsonb := '[]'::jsonb;  -- 戻り値（挿入したconsumptionsの簡易サマリ）
BEGIN
  IF p_user_id IS NULL OR p_leave_type_id IS NULL OR p_request_id IS NULL OR p_needs IS NULL THEN
    RAISE EXCEPTION 'fn_allocate_leave: invalid arguments';
  END IF;

  -- needsを1件ずつ処理
  FOR v_need IN
    SELECT
      (n->>'consumed_on')::date   AS consumed_on,
      (n->>'quantity')::numeric   AS quantity
    FROM jsonb_array_elements(p_needs) AS n
  LOOP
    v_needed_hours := COALESCE(v_need.quantity,0);
    v_consumed_on  := v_need.consumed_on;

    IF v_needed_hours <= 0 THEN
      CONTINUE;
    END IF;

    -- 1) manual_grant_ids がある場合はその順で消費
    IF p_manual_grant_ids IS NOT NULL AND array_length(p_manual_grant_ids,1) > 0 THEN
      FOR v_grant IN
        SELECT g.*
        FROM public.leave_grants g
        WHERE g.user_id = p_user_id
          AND g.leave_type_id = p_leave_type_id
          AND (g.expires_on IS NULL OR g.expires_on >= CURRENT_DATE)
          AND g.id = ANY(p_manual_grant_ids)
        ORDER BY array_position(p_manual_grant_ids, g.id)
      LOOP
        -- 残量 = 付与 - 既消費（HOLD含む/問わず）
        SELECT COALESCE(g.quantity - SUM(c.quantity), g.quantity)
          INTO v_grant_left
        FROM public.leave_grants g
        LEFT JOIN public.leave_consumptions c
          ON c.grant_id = g.id
        WHERE g.id = v_grant.id
        GROUP BY g.id;

        v_grant_left := COALESCE(v_grant_left,0);
        IF v_grant_left <= 0 THEN
          CONTINUE;
        END IF;

        v_take := LEAST(v_needed_hours, v_grant_left);
        IF v_take > 0 THEN
          INSERT INTO public.leave_consumptions(
            request_id, user_id, leave_type_id, grant_id, quantity, consumed_on, is_hold
          ) VALUES (
            p_request_id, p_user_id, p_leave_type_id, v_grant.id, v_take, v_consumed_on, p_is_hold
          );

          v_rows := v_rows || jsonb_build_array(jsonb_build_object(
            'grant_id', v_grant.id,
            'consumed_on', v_consumed_on,
            'quantity', v_take,
            'is_hold', p_is_hold
          ));

          v_needed_hours := v_needed_hours - v_take;
          v_total_alloc  := v_total_alloc + v_take;
        END IF;

        EXIT WHEN v_needed_hours <= 0;
      END LOOP;
    END IF;

    -- 2) まだ必要分が残っていれば FIFO で消費
    IF v_needed_hours > 0 THEN
      FOR v_grant IN
        SELECT g.*
        FROM public.leave_grants g
        WHERE g.user_id = p_user_id
          AND g.leave_type_id = p_leave_type_id
          AND (g.expires_on IS NULL OR g.expires_on >= CURRENT_DATE)
          AND (p_manual_grant_ids IS NULL OR NOT (g.id = ANY(p_manual_grant_ids)))
        ORDER BY g.expires_on NULLS LAST, g.granted_on ASC, g.id ASC
      LOOP
        SELECT COALESCE(g.quantity - SUM(c.quantity), g.quantity)
          INTO v_grant_left
        FROM public.leave_grants g
        LEFT JOIN public.leave_consumptions c
          ON c.grant_id = g.id
        WHERE g.id = v_grant.id
        GROUP BY g.id;

        v_grant_left := COALESCE(v_grant_left,0);
        IF v_grant_left <= 0 THEN
          CONTINUE;
        END IF;

        v_take := LEAST(v_needed_hours, v_grant_left);
        IF v_take > 0 THEN
          INSERT INTO public.leave_consumptions(
            request_id, user_id, leave_type_id, grant_id, quantity, consumed_on, is_hold
          ) VALUES (
            p_request_id, p_user_id, p_leave_type_id, v_grant.id, v_take, v_consumed_on, p_is_hold
          );

          v_rows := v_rows || jsonb_build_array(jsonb_build_object(
            'grant_id', v_grant.id,
            'consumed_on', v_consumed_on,
            'quantity', v_take,
            'is_hold', p_is_hold
          ));

        v_needed_hours := v_needed_hours - v_take;
        v_total_alloc  := v_total_alloc + v_take;
        END IF;

        EXIT WHEN v_needed_hours <= 0;
      END LOOP;
    END IF;

    -- 3) 残量が足りずに必要時間が残ったらエラー（allow_negative=false想定）
    IF v_needed_hours > 0 THEN
      RAISE EXCEPTION 'Insufficient leave balance for % on % (short %.2f h)', p_leave_type_id, v_consumed_on, v_needed_hours;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'allocated_hours', v_total_alloc,
    'rows', v_rows
  );
END;
$$;


-- HOLD → 確定（承認時）
CREATE OR REPLACE FUNCTION public.fn_confirm_leave(p_request_id uuid)
RETURNS integer
LANGUAGE sql
AS $$
  WITH upd AS (
    UPDATE public.leave_consumptions
       SET is_hold = false
     WHERE request_id = p_request_id
       AND is_hold = true
    RETURNING 1
  )
  SELECT COUNT(*) FROM upd;
$$;

-- 却下/取消: HOLDの解放（削除）
CREATE OR REPLACE FUNCTION public.fn_release_leave(p_request_id uuid)
RETURNS integer
LANGUAGE sql
AS $$
  WITH del AS (
    DELETE FROM public.leave_consumptions
     WHERE request_id = p_request_id
       AND is_hold = true
    RETURNING 1
  )
  SELECT COUNT(*) FROM del;
$$;

-- 承認後の取消: 逆仕訳（負値を同grantへ）
CREATE OR REPLACE FUNCTION public.fn_reverse_confirmed_leave(p_request_id uuid, p_reason text DEFAULT 'reverse')
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_row RECORD;
  v_out jsonb := '[]'::jsonb;
BEGIN
  FOR v_row IN
    SELECT *
    FROM public.leave_consumptions
    WHERE request_id = p_request_id
      AND is_hold = false
  LOOP
    INSERT INTO public.leave_consumptions(
      request_id, user_id, leave_type_id, grant_id, quantity, consumed_on, is_hold, created_at, created_by
    ) VALUES (
      p_request_id, v_row.user_id, v_row.leave_type_id, v_row.grant_id, -v_row.quantity, v_row.consumed_on, false, now(), v_row.created_by
    );

    v_out := v_out || jsonb_build_object(
      'grant_id', v_row.grant_id,
      'consumed_on', v_row.consumed_on,
      'quantity', -v_row.quantity
    );
  END LOOP;

  RETURN v_out;
END;
$$;

COMMIT;


