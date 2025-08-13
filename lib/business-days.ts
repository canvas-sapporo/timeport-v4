// 営業日判定とブラックアウト日対応（まずは土日休＋明示ブラックアウトに対応する簡易版）

export interface BusinessDayOptions {
  // 0=Sun,1=Mon,...6=Sat を非営業日とする（デフォルト: 土日が非営業日）
  nonWorkingWeekdays?: number[];
  // "YYYY-MM-DD" 文字列の配列をブラックアウト（取得不可）日として扱う
  blackoutDates?: string[];
  // 会社のタイムゾーン（表示用。実計算は日付境界だけ意識）
  tz?: string; // 'Asia/Tokyo' 等（現状は未使用）
}

const defaultNonWorking = [0, 6]; // Sun/Sat

export function isBusinessDay(date: Date, opts?: BusinessDayOptions): boolean {
  const nonWorking = opts?.nonWorkingWeekdays ?? defaultNonWorking;
  const dow = date.getDay();
  if (nonWorking.includes(dow)) return false;
  const iso = toISODate(date);
  if (opts?.blackoutDates?.includes(iso)) return false;
  return true;
}

export function toISODate(d: Date) {
  // ローカル日付を"YYYY-MM-DD"に（JST前提UIならローカルでOK）
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** [start,end]を営業日の配列に展開（両端含む） */
export function expandRangeToBusinessDates(
  start: Date,
  end: Date,
  opts?: BusinessDayOptions
): string[] {
  const res: string[] = [];
  let cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (cur <= last) {
    if (isBusinessDay(cur, opts)) res.push(toISODate(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return res;
}


