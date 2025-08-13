'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function CalendarEditor({ calendar, dates }: { calendar: any; dates: any[] }) {
  const [nonWorking, setNonWorking] = useState<number[]>(calendar?.non_working_weekdays ?? [0, 6]);
  const [rows, setRows] = useState<any[]>(dates ?? []);
  const [newDate, setNewDate] = useState<string>('');
  const [kind, setKind] = useState<'holiday' | 'workday_override' | 'blackout'>('holiday');
  const [title, setTitle] = useState<string>('');

  const toggleWeekday = (d: number) => {
    setNonWorking((nw) => (nw.includes(d) ? nw.filter((x) => x !== d) : [...nw, d].sort()));
  };

  const addRow = () => {
    if (!newDate) return;
    setRows((prev) => [
      ...prev,
      { the_date: newDate, kind, title, note: null, id: `tmp-${Date.now()}` },
    ]);
    setNewDate('');
    setTitle('');
  };

  const save = async () => {
    const res = await fetch('/api/admin/calendar/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        calendarId: calendar.id,
        nonWorkingWeekdays: nonWorking,
        dates: rows.map((r) => ({
          id: r.id?.startsWith('tmp-') ? null : r.id,
          the_date: r.the_date,
          kind: r.kind,
          title: r.title ?? null,
          note: r.note ?? null,
        })),
      }),
    });
    const json = await res.json();
    alert(json.ok ? '保存しました' : `エラー: ${json.error}`);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border p-4 space-y-2">
        <div className="font-medium">週次：非稼働曜日</div>
        <div className="flex gap-2 flex-wrap">
          {['日', '月', '火', '水', '木', '金', '土'].map((label, idx) => (
            <button
              key={idx}
              onClick={() => toggleWeekday(idx)}
              className={`px-3 py-1 rounded-full border ${nonWorking.includes(idx) ? 'bg-gray-200' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border p-4 space-y-3">
        <div className="font-medium">個別日付（祝日/振替/ブラックアウト）</div>
        <div className="flex gap-2 items-center">
          <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
          <Select value={kind} onValueChange={(v) => setKind(v as any)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="holiday">祝日（非稼働）</SelectItem>
              <SelectItem value="workday_override">稼働に上書き</SelectItem>
              <SelectItem value="blackout">ブラックアウト（取得不可）</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="タイトル" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Button onClick={addRow}>追加</Button>
        </div>

        <div className="space-y-2 max-h-[40vh] overflow-y-auto">
          {rows.map((r) => (
            <div
              key={`${r.id}-${r.the_date}-${r.kind}`}
              className="grid grid-cols-[120px_180px_1fr_auto] items-center gap-2 border rounded-xl p-2"
            >
              <div className="text-sm">{r.the_date}</div>
              <div className="text-sm">{r.kind}</div>
              <Input
                value={r.title ?? ''}
                onChange={(e) =>
                  setRows((prev) =>
                    prev.map((x) => (x === r ? { ...x, title: e.target.value } : x))
                  )
                }
              />
              <Button
                variant="ghost"
                onClick={() => setRows((prev) => prev.filter((x) => x !== r))}
              >
                削除
              </Button>
            </div>
          ))}
          {rows.length === 0 && <div className="text-sm opacity-60">登録なし</div>}
        </div>
      </div>

      <Button onClick={save}>保存</Button>
    </div>
  );
}
