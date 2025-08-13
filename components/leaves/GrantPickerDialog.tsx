'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';

type GrantRow = {
  id: string;
  leave_type_id: string;
  quantity: number;
  granted_on: string;
  expires_on: string | null;
  remaining_confirmed: number;
  remaining_including_holds: number;
};

export type GrantPickerResult = {
  manualGrantIds: string[]; // 優先消費順
};

export function GrantPickerDialog({
  userId,
  leaveTypeId,
  trigger,
  onPicked,
}: {
  userId: string;
  leaveTypeId?: string;
  trigger?: React.ReactNode;
  onPicked: (result: GrantPickerResult) => void;
}) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<GrantRow[]>([]);
  const [order, setOrder] = useState<string[]>([]); // 表示順（＝優先消費順）

  useEffect(() => {
    if (!open) return;
    const q = new URLSearchParams({
      user_id: userId,
      ...(leaveTypeId ? { leave_type_id: leaveTypeId } : {}),
    });
    fetch(`/api/leaves/grants?${q.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        const list: GrantRow[] = json.data ?? [];
        setRows(list);
        setOrder(list.map((r) => r.id)); // デフォルトFIFO
      });
  }, [open, userId, leaveTypeId]);

  const orderedRows = useMemo(
    () => order.map((id) => rows.find((r) => r.id === id)).filter(Boolean) as GrantRow[],
    [order, rows]
  );

  const move = (id: string, dir: -1 | 1) => {
    const idx = order.indexOf(id);
    if (idx < 0) return;
    const j = idx + dir;
    if (j < 0 || j >= order.length) return;
    const next = order.slice();
    [next[idx], next[j]] = [next[j], next[idx]];
    setOrder(next);
  };

  const handleApply = () => {
    onPicked({ manualGrantIds: order });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button variant="outline">消費元を選択</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>消費元（付与明細）の優先順</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {orderedRows.map((r, i) => (
            <div
              key={r.id}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-xl border p-3"
            >
              <div>
                <div className="text-sm font-medium">
                  付与日: {r.granted_on} / 失効: {r.expires_on ?? 'なし'}
                </div>
                <div className="text-xs opacity-70">
                  付与: {r.quantity}h / 残(確定基準): {r.remaining_confirmed}h / 残(HOLD含む):{' '}
                  {r.remaining_including_holds}h
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => move(r.id, -1)} disabled={i === 0}>
                ↑
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => move(r.id, +1)}
                disabled={i === orderedRows.length - 1}
              >
                ↓
              </Button>
            </div>
          ))}
          {orderedRows.length === 0 && (
            <div className="text-sm opacity-70">付与データがありません。</div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={handleApply} disabled={orderedRows.length === 0}>
            この順序で適用
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
