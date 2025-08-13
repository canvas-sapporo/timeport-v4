import { createClient } from '@supabase/supabase-js';
import { ApprovePanel } from './parts/ApprovePanel';

async function fetchRequest(id: string) {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: req } = await sb.from('requests').select('*').eq('id', id).single();
  const { data: details } = await sb
    .from('leave_request_details')
    .select('*')
    .eq('request_id', id)
    .order('start_at', { ascending: true });
  const { data: hist } = await sb
    .from('request_approval_history')
    .select('*')
    .eq('request_id', id)
    .order('processed_at', { ascending: true });

  return { req, details: details ?? [], hist: hist ?? [] } as any;
}

export default async function LeaveDetail({ params }: { params: { id: string } }) {
  const { req, details, hist } = await fetchRequest(params.id);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">申請詳細</h1>
      <div className="rounded-xl border p-4">
        <div className="text-sm">ID: {req?.id}</div>
        <div className="text-sm">申請者: {req?.user_id}</div>
        <div className="text-sm">タイトル: {req?.title}</div>
      </div>

      <div className="rounded-xl border p-4">
        <h2 className="font-medium mb-2">明細</h2>
        <div className="space-y-2">
          {details.map((d: any) => (
            <div key={d.id} className="text-sm">
              {new Date(d.start_at).toLocaleString()} → {new Date(d.end_at).toLocaleString()} /{' '}
              {d.unit} / {d.quantity} / {d.reason ?? ''}
            </div>
          ))}
          {details.length === 0 && <div className="text-sm opacity-60">明細なし</div>}
        </div>
      </div>

      <div className="rounded-xl border p-4">
        <h2 className="font-medium mb-2">履歴</h2>
        <div className="space-y-1 text-xs">
          {hist.map((h: any) => (
            <div key={h.id}>
              [{h.action}] {h.comment ?? ''} / {h.approver_id ?? '-'} /{' '}
              {new Date(h.processed_at).toLocaleString()}
            </div>
          ))}
          {hist.length === 0 && <div className="opacity-60">履歴なし</div>}
        </div>
      </div>

      <ApprovePanel requestId={params.id} />
    </div>
  );
}
