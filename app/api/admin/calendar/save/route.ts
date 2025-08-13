import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/leave/supabase-admin';

export async function POST(req: NextRequest) {
  const sb = getAdminSupabase();
  const body = await req.json();

  const { calendarId, nonWorkingWeekdays, dates } = body ?? {};
  if (!calendarId) return NextResponse.json({ error: 'calendarId required' }, { status: 400 });

  const { error: uErr } = await sb
    .from('business_calendars')
    .update({ non_working_weekdays: nonWorkingWeekdays, updated_at: new Date().toISOString() })
    .eq('id', calendarId);
  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 400 });

  const { data: cur } = await sb.from('business_calendar_dates').select('id').eq('calendar_id', calendarId);
  const curIds = new Set((cur ?? []).map((x:any)=>x.id));

  const keep = new Set<string>();
  const upserts: any[] = [];

  for (const r of (dates as any[]) ?? []) {
    if (r.id) {
      keep.add(r.id);
      upserts.push({ id: r.id, calendar_id: calendarId, the_date: r.the_date, kind: r.kind, title: r.title, note: r.note });
    } else {
      upserts.push({ calendar_id: calendarId, the_date: r.the_date, kind: r.kind, title: r.title, note: r.note });
    }
  }

  if (upserts.length) {
    const { error: upErr } = await sb.from('business_calendar_dates').upsert(upserts, { onConflict: 'id' });
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });
  }

  const delIds = Array.from(curIds).filter((id) => !keep.has(id));
  if (delIds.length) {
    const { error: dErr } = await sb.from('business_calendar_dates').delete().in('id', delIds);
    if (dErr) return NextResponse.json({ error: dErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}


