'use client';

import { useState } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GrantPickerDialog } from './GrantPickerDialog';
import { allocateLeave } from '@/app/actions/leaves/allocate';

const FormSchema = z.object({
  userId: z.string().uuid(),
  leaveTypeId: z.string().uuid(),
  requestId: z.string().uuid(), // 既存 requests を事前作成しておく想定（下書き or 申請時生成でも可）
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  unit: z.enum(['day', 'half', 'hour']).default('hour'),
  quantity: z.coerce.number().positive(),
});

export function LeaveRequestForm({
  defaultUserId,
  defaultLeaveTypeId,
  defaultRequestId,
  hoursPerDay = 8,
  policyMinUnit = '1h',
}: {
  defaultUserId: string;
  defaultLeaveTypeId: string;
  defaultRequestId: string;
  hoursPerDay?: number;
  policyMinUnit?: '1h' | '0.5d' | '1d';
}) {
  const [form, setForm] = useState({
    userId: defaultUserId,
    leaveTypeId: defaultLeaveTypeId,
    requestId: defaultRequestId,
    startAt: new Date().toISOString(),
    endAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // +1h
    unit: 'hour' as 'day' | 'half' | 'hour',
    quantity: 1,
  });
  const [manualGrantIds, setManualGrantIds] = useState<string[] | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const onSubmit = async () => {
    setSubmitting(true);
    setMsg(null);
    try {
      FormSchema.parse(form);

      const res = await allocateLeave({
        userId: form.userId,
        leaveTypeId: form.leaveTypeId,
        requestId: form.requestId,
        policyMinUnit,
        hoursPerDay,
        mode: 'hold', // 申請時はHOLD
        details: [
          {
            startAt: form.startAt,
            endAt: form.endAt,
            unit: form.unit,
            quantity: form.quantity,
          },
        ],
        manualGrantIds,
      });

      setMsg(`HOLD作成に成功: ${JSON.stringify(res)}`);
    } catch (e: any) {
      setMsg(`エラー: ${e.message ?? String(e)}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-sm">開始日時</label>
          <Input
            type="datetime-local"
            value={toLocalInput(form.startAt)}
            onChange={(e) => setForm((f) => ({ ...f, startAt: fromLocalInput(e.target.value) }))}
          />
        </div>
        <div>
          <label className="text-sm">終了日時</label>
          <Input
            type="datetime-local"
            value={toLocalInput(form.endAt)}
            onChange={(e) => setForm((f) => ({ ...f, endAt: fromLocalInput(e.target.value) }))}
          />
        </div>
        <div>
          <label className="text-sm">単位</label>
          <Select value={form.unit} onValueChange={(v: any) => setForm((f) => ({ ...f, unit: v }))}>
            <SelectTrigger>
              <SelectValue placeholder="単位" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">日</SelectItem>
              <SelectItem value="half">半日</SelectItem>
              <SelectItem value="hour">時間</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm">数量</label>
          <Input
            type="number"
            step="1"
            value={form.quantity}
            onChange={(e) => setForm((f) => ({ ...f, quantity: Number(e.target.value) }))}
          />
        </div>
      </div>

      <GrantPickerDialog
        userId={form.userId}
        leaveTypeId={form.leaveTypeId}
        onPicked={(r) => setManualGrantIds(r.manualGrantIds)}
      />

      <div className="flex items-center gap-2">
        <Button onClick={onSubmit} disabled={submitting}>
          {submitting ? '送信中…' : '申請（HOLD作成）'}
        </Button>
        {manualGrantIds?.length ? (
          <span className="text-xs opacity-70">
            優先順（{manualGrantIds.length}件）を適用します
          </span>
        ) : (
          <span className="text-xs opacity-70">デフォルト（FIFO）で消費します</span>
        )}
      </div>

      {msg && <div className="text-xs whitespace-pre-wrap">{msg}</div>}
    </div>
  );
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const h = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${y}-${m}-${day}T${h}:${min}`;
}
function fromLocalInput(local: string) {
  // local（ローカルタイム）→ ISO（UTC）へ
  const d = new Date(local);
  return d.toISOString();
}
