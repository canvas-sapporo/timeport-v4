'use client';

import { useState } from 'react';
import { decideLeaveRequest } from '@/app/actions/leaves/request-flow';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export function ApprovePanel({ requestId }: { requestId: string }) {
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState<'approve' | 'reject' | 'cancel' | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const run = async (action: 'approve' | 'reject' | 'cancel') => {
    setBusy(action);
    setMsg(null);
    try {
      const res = await decideLeaveRequest({ requestId, action, comment, approverId: undefined });
      setMsg(`${action} ok: ${JSON.stringify(res)}`);
    } catch (e: any) {
      setMsg(e.message ?? String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-xl border p-4 space-y-3">
      <h2 className="font-medium">承認操作</h2>
      <Textarea
        placeholder="コメント（任意）"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <div className="flex gap-2">
        <Button onClick={() => run('approve')} disabled={!!busy}>
          {busy === 'approve' ? '処理中…' : '承認'}
        </Button>
        <Button variant="destructive" onClick={() => run('reject')} disabled={!!busy}>
          {busy === 'reject' ? '処理中…' : '却下'}
        </Button>
        <Button variant="outline" onClick={() => run('cancel')} disabled={!!busy}>
          {busy === 'cancel' ? '処理中…' : '承認後取消'}
        </Button>
      </div>
      {msg && <div className="text-xs whitespace-pre-wrap">{msg}</div>}
    </div>
  );
}
