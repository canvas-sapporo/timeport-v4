import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getAnonClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('Supabase env not set');
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
  );
}

/**
 * GET /api/leaves/balance?user_id=...&leave_type_id=...
 * - v_leave_balances をそのまま返す（balance_hours）
 */
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('user_id');
  const leaveTypeId = req.nextUrl.searchParams.get('leave_type_id');
  const supabase = getAnonClient();

  let query = supabase.from('v_leave_balances').select('*');
  if (userId) query = query.eq('user_id', userId);
  if (leaveTypeId) query = query.eq('leave_type_id', leaveTypeId);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ data });
}


