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
 * GET /api/leaves/grants?user_id=...&leave_type_id=...
 * - 付与行ごとの「残量(確定のみ)」「残量(確定+HOLD込み)」を算出して返す
 * - 並び順は FIFO: expires_on ASC NULLS LAST, granted_on ASC
 */
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('user_id');
  const leaveTypeId = req.nextUrl.searchParams.get('leave_type_id');

  if (!userId) {
    return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
  }

  const supabase = getAnonClient();

  // 1) grants を取得
  let { data: grants, error } = await supabase
    .from('leave_grants')
    .select('*')
    .eq('user_id', userId)
    .order('expires_on', { ascending: true, nullsFirst: false })
    .order('granted_on', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (leaveTypeId) grants = (grants ?? []).filter(g => g.leave_type_id === leaveTypeId);

  // 2) grant_id→消費（確定/全体）を集計
  const grantIds = (grants ?? []).map(g => g.id);
  let consumedConfirmed: Record<string, number> = {};
  let consumedAll: Record<string, number> = {};

  if (grantIds.length > 0) {
    const { data: cons, error: err1 } = await supabase
      .from('leave_consumptions')
      .select('grant_id, quantity, is_hold')
      .in('grant_id', grantIds);
    if (err1) return NextResponse.json({ error: err1.message }, { status: 400 });

    for (const c of cons ?? []) {
      consumedAll[c.grant_id] = (consumedAll[c.grant_id] ?? 0) + (Number(c.quantity) || 0);
      if (!c.is_hold) {
        consumedConfirmed[c.grant_id] = (consumedConfirmed[c.grant_id] ?? 0) + (Number(c.quantity) || 0);
      }
    }
  }

  // 3) レスポンス生成
  const rows = (grants ?? []).map(g => {
    const q = Number(g.quantity) || 0;
    const usedConfirmed = consumedConfirmed[g.id] ?? 0;
    const usedAll = consumedAll[g.id] ?? 0;

    return {
      ...g,
      remaining_confirmed: q - usedConfirmed, // 承認済みのみ控除（残高計算と一致）
      remaining_including_holds: q - usedAll, // HOLD込みで控除
    };
  });

  return NextResponse.json({ data: rows });
}


