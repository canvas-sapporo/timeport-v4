'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function GrantRunner() {
  const [msg, setMsg] = useState<string | null>(null);
  const run = async () => {
    setMsg(null);
    const res = await fetch('/api/leaves/grant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Cron-Secret': process.env.NEXT_PUBLIC_DEV_CRON_SECRET ?? '', // 開発時のみ
      },
      body: JSON.stringify({}),
    });
    const json = await res.json();
    setMsg(JSON.stringify(json));
  };
  return (
    <div className="space-y-2">
      <Button onClick={run}>付与ジョブを手動実行</Button>
      {msg && <pre className="text-xs whitespace-pre-wrap">{msg}</pre>}
    </div>
  );
}
