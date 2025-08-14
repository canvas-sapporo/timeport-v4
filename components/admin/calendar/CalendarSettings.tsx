'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Calendar as UICalendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type CalInfo = { day_type: string | null; is_blackout: boolean | null };

export default function CalendarSettings() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = useMemo(
    () => createClient(supabaseUrl, supabaseAnonKey),
    [supabaseUrl, supabaseAnonKey]
  );

  const [companyId, setCompanyId] = useState<string>('');
  const [month, setMonth] = useState<Date>(new Date());
  const [cache, setCache] = useState<Record<string, CalInfo>>({});
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedRange, setSelectedRange] = useState<{ from?: Date; to?: Date }>({});
  const [selectionMode, setSelectionMode] = useState<'single' | 'range'>('single');
  const [dayType, setDayType] = useState<
    'workday' | 'holiday' | 'company_holiday' | 'public_holiday'
  >('workday');
  const [isBlackout, setIsBlackout] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function initCompany() {
      try {
        const { data } = await supabase
          .from('v_user_companies')
          .select('company_id')
          .limit(1)
          .maybeSingle();
        const cid = (data as { company_id?: string } | null)?.company_id || '';
        setCompanyId(cid);
      } catch {
        setCompanyId('');
      }
    }
    initCompany();
  }, [supabase]);

  async function loadMonth(target: Date) {
    if (!companyId) return;
    setLoading(true);
    try {
      const year = target.getFullYear();
      const m = target.getMonth();
      const start = new Date(year, m, 1).toISOString().slice(0, 10);
      const end = new Date(year, m + 1, 0).toISOString().slice(0, 10);
      const { data } = await supabase
        .from('company_calendar_dates')
        .select('calendar_date, day_type, is_blackout')
        .eq('company_id', companyId)
        .gte('calendar_date', start)
        .lte('calendar_date', end);
      const rows =
        (data as Array<{
          calendar_date: string;
          day_type: string | null;
          is_blackout: boolean | null;
        }> | null) || [];
      setCache((prev) => {
        const copy = { ...prev };
        rows.forEach((r) => {
          copy[r.calendar_date] = { day_type: r.day_type, is_blackout: r.is_blackout };
        });
        return copy;
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMonth(month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  async function saveSelected() {
    if (!companyId || !selectedDate) return;
    const d = new Date(selectedDate);
    const ds = d.toISOString().slice(0, 10);
    const payload = {
      company_id: companyId,
      calendar_date: ds,
      day_type: dayType,
      is_blackout: isBlackout,
    } as const;
    await supabase
      .from('company_calendar_dates')
      .upsert(payload, { onConflict: 'company_id,calendar_date' });
    setCache((prev) => ({ ...prev, [ds]: { day_type: dayType, is_blackout: isBlackout } }));
  }

  async function saveRange() {
    if (!companyId || !selectedRange?.from || !selectedRange?.to) return;
    const start = new Date(selectedRange.from);
    const end = new Date(selectedRange.to);
    if (start > end) return;
    const rows: Array<{
      company_id: string;
      calendar_date: string;
      day_type: string;
      is_blackout: boolean;
    }> = [];
    for (let d = new Date(start); d.getTime() <= end.getTime(); d.setDate(d.getDate() + 1)) {
      const ds = d.toISOString().slice(0, 10);
      rows.push({
        company_id: companyId,
        calendar_date: ds,
        day_type: dayType,
        is_blackout: isBlackout,
      });
    }
    if (rows.length === 0) return;
    setLoading(true);
    try {
      await supabase
        .from('company_calendar_dates')
        .upsert(rows, { onConflict: 'company_id,calendar_date' });
      setCache((prev) => {
        const copy = { ...prev } as Record<string, CalInfo>;
        rows.forEach((r) => {
          copy[r.calendar_date] = { day_type: r.day_type, is_blackout: r.is_blackout };
        });
        return copy;
      });
    } finally {
      setLoading(false);
    }
  }

  async function exportMonthCsv() {
    const year = month.getFullYear();
    const m = month.getMonth();
    const start = new Date(year, m, 1);
    const end = new Date(year, m + 1, 0);
    const lines: string[] = ['calendar_date,day_type,is_blackout'];
    for (let d = new Date(start); d.getTime() <= end.getTime(); d.setDate(d.getDate() + 1)) {
      const ds = d.toISOString().slice(0, 10);
      const info = cache[ds];
      const dt = info?.day_type || '';
      const bl = info?.is_blackout ? 'true' : 'false';
      lines.push(`${ds},${dt},${bl}`);
    }
    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `company_calendar_${year}-${String(m + 1).padStart(2, '0')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importCsv(file: File) {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length <= 1) return;
    const header = lines[0].split(',').map((s) => s.trim());
    const idxDate = header.indexOf('calendar_date');
    const idxType = header.indexOf('day_type');
    const idxBlk = header.indexOf('is_blackout');
    if (idxDate < 0 || idxType < 0 || idxBlk < 0) return;
    const rows: Array<{
      company_id: string;
      calendar_date: string;
      day_type: string;
      is_blackout: boolean;
    }> = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      if (cols.length < 3) continue;
      const dateStr = cols[idxDate]?.trim();
      const typeStr = cols[idxType]?.trim();
      const blkStr = cols[idxBlk]?.trim().toLowerCase();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) continue;
      if (!['workday', 'holiday', 'company_holiday', 'public_holiday', ''].includes(typeStr))
        continue;
      const isBlk = blkStr === '1' || blkStr === 'true' || blkStr === 'yes';
      rows.push({
        company_id: companyId,
        calendar_date: dateStr,
        day_type: typeStr || 'workday',
        is_blackout: isBlk,
      });
    }
    if (rows.length === 0) return;
    setLoading(true);
    try {
      const chunkSize = 500;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        // eslint-disable-next-line no-await-in-loop
        await supabase
          .from('company_calendar_dates')
          .upsert(chunk, { onConflict: 'company_id,calendar_date' });
      }
      setCache((prev) => {
        const copy = { ...prev } as Record<string, CalInfo>;
        rows.forEach((r) => {
          copy[r.calendar_date] = { day_type: r.day_type, is_blackout: r.is_blackout };
        });
        return copy;
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
      <div className="md:col-span-2">
        <div className="flex items-center gap-2 mb-2">
          <Button
            variant={selectionMode === 'single' ? 'default' : 'outline'}
            onClick={() => setSelectionMode('single')}
          >
            単日選択
          </Button>
          <Button
            variant={selectionMode === 'range' ? 'default' : 'outline'}
            onClick={() => setSelectionMode('range')}
          >
            期間選択
          </Button>
        </div>
        <UICalendar
          month={month}
          onMonthChange={(m) => {
            setMonth(m);
            loadMonth(m);
          }}
          mode={selectionMode === 'range' ? 'range' : 'single'}
          selected={selectionMode === 'range' ? selectedRange : selectedDate}
          onSelect={(sel: any) => {
            if (selectionMode === 'range') {
              setSelectedRange(sel || {});
            } else {
              setSelectedDate((sel as Date) || undefined);
            }
          }}
          modifiers={{
            publicHoliday: (date) =>
              cache[date.toISOString().slice(0, 10)]?.day_type === 'public_holiday',
            companyHoliday: (date) =>
              cache[date.toISOString().slice(0, 10)]?.day_type === 'company_holiday',
            holiday: (date) => cache[date.toISOString().slice(0, 10)]?.day_type === 'holiday',
            blocked: (date) => !!cache[date.toISOString().slice(0, 10)]?.is_blackout,
          }}
          modifiersClassNames={{
            publicHoliday: 'bg-rose-100 text-rose-800',
            companyHoliday: 'bg-amber-100 text-amber-900',
            holiday: 'bg-slate-200 text-slate-700',
            blocked: 'bg-red-100 text-red-800',
          }}
        />
      </div>
      <div className="space-y-3">
        <div>
          <Label>会社ID</Label>
          <Input value={companyId} onChange={(e) => setCompanyId(e.target.value)} />
        </div>
        <div>
          <Label>休日区分</Label>
          <select
            className="border rounded-md h-9 px-2 w-full"
            value={dayType}
            onChange={(e) => setDayType(e.target.value as any)}
          >
            <option value="workday">workday</option>
            <option value="holiday">holiday</option>
            <option value="company_holiday">company_holiday</option>
            <option value="public_holiday">public_holiday</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <input
            id="blk"
            type="checkbox"
            checked={isBlackout}
            onChange={(e) => setIsBlackout(e.target.checked)}
          />
          <Label htmlFor="blk">取得不可日にする</Label>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={saveSelected} disabled={!selectedDate || !companyId || loading}>
            単日保存
          </Button>
          <Button
            onClick={saveRange}
            disabled={!companyId || !selectedRange?.from || !selectedRange?.to || loading}
          >
            期間保存
          </Button>
          <Button onClick={exportMonthCsv} variant="outline">
            月CSVエクスポート
          </Button>
          <label className="inline-flex items-center gap-2 text-sm text-blue-700 cursor-pointer">
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) importCsv(file);
                e.currentTarget.value = '';
              }}
            />
            <span className="px-3 py-2 border rounded-md hover:bg-gray-50">CSVインポート</span>
          </label>
        </div>
        <div className="text-xs text-gray-600">範囲保存・CSV取込/出力に対応しています。</div>
      </div>
    </div>
  );
}
