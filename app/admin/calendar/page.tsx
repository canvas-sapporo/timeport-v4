import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

async function fetchCalendars() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
  const { data } = await sb
    .from('business_calendars')
    .select('id, company_id, name, timezone, non_working_weekdays, is_active');
  return data ?? ([] as any[]);
}

export default async function CalendarListPage() {
  const list = await fetchCalendars();
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">会社カレンダー</h1>
      <div className="space-y-2">
        {list.map((c: any) => (
          <div key={c.id} className="border rounded-xl p-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{c.name}</div>
              <div className="text-xs opacity-70">
                TZ: {c.timezone} / 非稼働: {JSON.stringify(c.non_working_weekdays)}
              </div>
            </div>
            <Link className="underline text-sm" href={`/admin/calendar/${c.id}`}>
              編集
            </Link>
          </div>
        ))}
        {list.length === 0 && <div className="text-sm opacity-60">カレンダーがありません</div>}
      </div>
    </div>
  );
}
