import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

async function fetchPending() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: st } = await sb.from('statuses').select('id').eq('code', 'leave_pending').single();
  if (!st?.id) return [] as any[];

  const { data } = await sb
    .from('requests')
    .select('id, title, user_id, created_at')
    .eq('status_id', st.id)
    .order('created_at', { ascending: false });

  return (data ?? []) as any[];
}

export default async function AdminLeaveList() {
  const rows = await fetchPending();
  return (
    <div className="p-6 space-y-3">
      <h1 className="text-xl font-semibold">有給申請（承認待ち）</h1>
      <div className="space-y-2">
        {rows.map((r: any) => (
          <div key={r.id} className="border rounded-xl p-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{r.title}</div>
              <div className="text-xs opacity-60">
                ID: {r.id} / 申請者: {r.user_id} / {new Date(r.created_at).toLocaleString()}
              </div>
            </div>
            <Link className="underline text-sm" href={`/admin/leaves/${r.id}`}>
              詳細
            </Link>
          </div>
        ))}
        {rows.length === 0 && <div className="text-sm opacity-60">承認待ちはありません</div>}
      </div>
    </div>
  );
}
