import { createClient } from '@supabase/supabase-js';
import { CalendarEditor } from './parts/CalendarEditor';

async function fetchCalendar(id: string) {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
  const { data: cal } = await sb.from('business_calendars').select('*').eq('id', id).single();
  const { data: dates } = await sb
    .from('business_calendar_dates')
    .select('*')
    .eq('calendar_id', id)
    .order('the_date', { ascending: true });
  return { cal, dates: dates ?? [] } as any;
}

export default async function CalendarDetail({ params }: { params: { id: string } }) {
  const { cal, dates } = await fetchCalendar(params.id);
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">カレンダー編集</h1>
      <CalendarEditor calendar={cal} dates={dates} />
    </div>
  );
}
