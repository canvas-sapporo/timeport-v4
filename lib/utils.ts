import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { fromZonedTime, toZonedTime, format } from 'date-fns-tz';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 日時を「YYYY年MM月DD日hh:mm」形式でフォーマット
 * @param date 日付文字列またはDateオブジェクト
 * @param includeTime 時刻を含めるかどうか（デフォルト: true）
 * @returns フォーマットされた日時文字列
 */
export function formatDateTime(
  date: string | Date | null | undefined,
  includeTime: boolean = true
): string {
  if (!date) return '--:--';

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) {
      return '--:--';
    }

    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');

    if (!includeTime) {
      return `${year}年${month}月${day}日`;
    }

    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');

    return `${year}年${month}月${day}日${hours}:${minutes}`;
  } catch (error) {
    console.error('日時フォーマットエラー:', error);
    return '--:--';
  }
}

/**
 * 時刻のみを「hh:mm」形式でフォーマット
 * @param time 時刻文字列またはDateオブジェクト
 * @returns フォーマットされた時刻文字列
 */
export function formatTime(time: string | Date | null | undefined): string {
  console.log('formatTime 入力:', time, '型:', typeof time);

  if (!time) {
    console.log('formatTime 空の値、--:--を返す');
    return '--:--';
  }

  try {
    // 時刻のみの文字列（HH:mm:ss形式）の場合
    if (typeof time === 'string' && time.match(/^\d{2}:\d{2}:\d{2}$/)) {
      console.log('formatTime UTC時刻として処理:', time);
      const jstTime = convertUTCTimeToJST(time);
      console.log('formatTime JST時刻に変換:', jstTime);
      return jstTime.substring(0, 5); // HH:mm形式で返す
    }

    // 日付付きの文字列またはDateオブジェクトの場合
    const dateObj = typeof time === 'string' ? new Date(time) : time;

    if (isNaN(dateObj.getTime())) {
      console.log('formatTime 無効な日付、--:--を返す');
      return '--:--';
    }

    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    const result = `${hours}:${minutes}`;
    console.log('formatTime 通常の時刻処理:', result);
    return result;
  } catch (error) {
    console.error('formatTime エラー:', error);
    return '--:--';
  }
}

/**
 * 日付のみを「YYYY年MM月DD日」形式でフォーマット
 * @param date 日付文字列またはDateオブジェクト
 * @returns フォーマットされた日付文字列
 */
export function formatDate(date: string | Date | null | undefined): string {
  return formatDateTime(date, false);
}

/**
 * ひらがなをカタカナに変換
 * @param text 変換する文字列
 * @returns カタカナに変換された文字列
 */
export function hiraganaToKatakana(text: string): string {
  return text.replace(/[\u3041-\u3096]/g, (char) => {
    return String.fromCharCode(char.charCodeAt(0) + 0x60);
  });
}

/**
 * 日本時間での日付を取得する関数（date-fns-tz使用）
 * @param date 基準日時（デフォルト: 現在時刻）
 * @returns YYYY-MM-DD形式の日本時間での日付文字列
 */
export function getJSTDate(date: Date = new Date()): string {
  // date-fns-tzを使用してJST日付を取得
  const jstDate = toZonedTime(date, 'Asia/Tokyo');
  return format(jstDate, 'yyyy-MM-dd', { timeZone: 'Asia/Tokyo' });
}

/**
 * 分を時間と分の形式でフォーマット（0h00m形式）
 * @param minutes 分
 * @returns フォーマットされた時間文字列（例: 0h00m, 1h30m）
 */
export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h${String(mins).padStart(2, '0')}m`;
}

/**
 * 勤怠記録の変更内容を比較して変更された項目を取得
 * @param current 現在のレコード
 * @param previous 前のレコード
 * @returns 変更された項目の配列
 */
export function getAttendanceChanges(
  current: Record<string, unknown>,
  previous: Record<string, unknown>
): Array<{
  field: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
}> {
  const changes: Array<{
    field: string;
    fieldName: string;
    oldValue: string;
    newValue: string;
  }> = [];

  // 比較するフィールドの定義（実際に存在するフィールド）
  const fields = [
    { key: 'work_type_name', name: '勤務タイプ' },
    { key: 'status', name: 'ステータス' },
    { key: 'auto_calculated', name: '自動計算' },
    { key: 'description', name: '備考' },
    { key: 'actual_work_minutes', name: '実際勤務時間' },
    { key: 'overtime_minutes', name: '残業時間' },
    { key: 'late_minutes', name: '遅刻時間' },
    { key: 'early_leave_minutes', name: '早退時間' },
  ];

  fields.forEach(({ key, name }) => {
    const currentValue = current[key];
    const previousValue = previous[key];

    // 値が異なる場合のみ追加
    if (currentValue !== previousValue) {
      let oldValue = previousValue;
      let newValue = currentValue;

      // 時間（分）の場合はフォーマット
      if (
        key === 'actual_work_minutes' ||
        key === 'overtime_minutes' ||
        key === 'late_minutes' ||
        key === 'early_leave_minutes'
      ) {
        oldValue =
          previousValue !== null && previousValue !== undefined
            ? formatMinutes(previousValue as number)
            : '0h00m';
        newValue =
          currentValue !== null && currentValue !== undefined
            ? formatMinutes(currentValue as number)
            : '0h00m';
      }

      // 自動計算の場合は日本語表示
      if (key === 'auto_calculated') {
        oldValue = previousValue ? '有効' : '無効';
        newValue = currentValue ? '有効' : '無効';
      }

      // ステータスの場合は日本語表示
      if (key === 'status') {
        const statusMap: Record<string, string> = {
          normal: '正常',
          late: '遅刻',
          early_leave: '早退',
          absent: '欠勤',
        };
        oldValue = statusMap[previousValue as string] || (previousValue as string);
        newValue = statusMap[currentValue as string] || (currentValue as string);
      }

      // 空の値の場合は「未設定」と表示
      if (oldValue === '' || oldValue === null || oldValue === undefined) {
        oldValue = '未設定';
      }
      if (newValue === '' || newValue === null || newValue === undefined) {
        newValue = '未設定';
      }

      changes.push({
        field: key,
        fieldName: name,
        oldValue: String(oldValue),
        newValue: String(newValue),
      });
    }
  });

  // 休憩時間の変更をチェック（clock_recordsから）
  const currentClockRecords = current.clock_records as
    | Array<{ breaks: Array<unknown> }>
    | undefined;
  const previousClockRecords = previous.clock_records as
    | Array<{ breaks: Array<unknown> }>
    | undefined;

  const currentBreaks = currentClockRecords?.[0]?.breaks || [];
  const previousBreaks = previousClockRecords?.[0]?.breaks || [];

  if (JSON.stringify(currentBreaks) !== JSON.stringify(previousBreaks)) {
    const currentBreakCount = currentBreaks.length;
    const previousBreakCount = previousBreaks.length;

    changes.push({
      field: 'breaks',
      fieldName: '休憩時間',
      oldValue: `${previousBreakCount}回`,
      newValue: `${currentBreakCount}回`,
    });
  }

  // clock_recordsの変更をチェック（出勤・退勤時刻の変更を検出）
  if (JSON.stringify(current.clock_records) !== JSON.stringify(previous.clock_records)) {
    const currentRecords = current.clock_records as
      | Array<{ in_time: string; out_time: string }>
      | undefined;
    const previousRecords = previous.clock_records as
      | Array<{ in_time: string; out_time: string }>
      | undefined;

    const currentLatest = currentRecords?.[currentRecords.length - 1];
    const previousLatest = previousRecords?.[previousRecords.length - 1];

    if (currentLatest && previousLatest) {
      // 出勤時刻の変更をチェック
      if (currentLatest.in_time !== previousLatest.in_time) {
        changes.push({
          field: 'clock_in_time',
          fieldName: '出勤時刻',
          oldValue: previousLatest.in_time ? formatTime(previousLatest.in_time) : '--:--',
          newValue: currentLatest.in_time ? formatTime(currentLatest.in_time) : '--:--',
        });
      }

      // 退勤時刻の変更をチェック
      if (currentLatest.out_time !== previousLatest.out_time) {
        changes.push({
          field: 'clock_out_time',
          fieldName: '退勤時刻',
          oldValue: previousLatest.out_time ? formatTime(previousLatest.out_time) : '--:--',
          newValue: currentLatest.out_time ? formatTime(currentLatest.out_time) : '--:--',
        });
      }
    }
  }

  return changes;
}

/**
 * 指定された日時を日本時間の日付に変換する関数
 * @param dateString ISO形式の日時文字列
 * @returns YYYY-MM-DD形式の日本時間での日付文字列
 */
export function getJSTDateFromString(dateString: string): string {
  const date = new Date(dateString);
  return getJSTDate(date);
}

/**
 * 日時文字列をJSTでフォーマットしてHTML datetime-local入力用に変換する関数（date-fns-tz使用）
 * @param dateTimeString ISO形式の日時文字列
 * @returns YYYY-MM-DDTHH:mm形式のJST日時文字列
 */
export function formatDateTimeForInput(dateTimeString: string): string {
  if (!dateTimeString) return '';
  try {
    console.log('formatDateTimeForInput 開始:', { dateTimeString });

    const date = new Date(dateTimeString);
    console.log('formatDateTimeForInput - 元のDate:', {
      date: date.toISOString(),
      dateString: date.toString(),
      timezoneOffset: date.getTimezoneOffset(),
    });

    // date-fns-tzを使用してJST時刻に変換
    const jstDate = toZonedTime(date, 'Asia/Tokyo');
    const result = format(jstDate, 'yyyy-MM-dd\'T\'HH:mm', { timeZone: 'Asia/Tokyo' });

    console.log('formatDateTimeForInput - JST変換後:', {
      jstDate: jstDate.toISOString(),
      result,
    });

    console.log('formatDateTimeForInput 完了:', { result });
    return result;
  } catch (error) {
    console.error('formatDateTimeForInput エラー:', error);
    return '';
  }
}

/**
 * 日時を日本時間で表示用にフォーマットする関数
 * @param dateTime ISO形式の日時文字列またはDateオブジェクト
 * @param options フォーマットオプション
 * @returns フォーマットされた日時文字列
 */
export function formatDateTimeForDisplay(
  dateTime: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }
): string {
  if (!dateTime) return '--:--';

  try {
    const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime;

    if (isNaN(date.getTime())) {
      return '--:--';
    }

    return date.toLocaleString('ja-JP', options);
  } catch {
    return '--:--';
  }
}

/**
 * 日時を日本時間で表示用にフォーマットする関数（日付のみ）
 * @param dateTime ISO形式の日時文字列またはDateオブジェクト
 * @returns フォーマットされた日付文字列
 */
export function formatDateForDisplay(dateTime: string | Date | null | undefined): string {
  return formatDateTimeForDisplay(dateTime, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * UTC時刻をJST時刻に変換する関数（date-fns-tz使用）
 * @param utcTime UTC時刻（HH:mm:ss形式またはHH:mm形式）
 * @returns JST時刻（HH:mm:ss形式）
 */
export function convertUTCTimeToJST(utcTime: string): string {
  if (!utcTime || utcTime.trim() === '') return '';

  try {
    // 今日の日付と組み合わせてUTC日時を作成
    const today = new Date();
    const utcDateTime = new Date(Date.UTC(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      parseInt(utcTime.split(':')[0], 10),
      parseInt(utcTime.split(':')[1], 10),
      utcTime.split(':').length > 2 ? parseInt(utcTime.split(':')[2], 10) : 0
    ));

    // date-fns-tzを使用してJST時刻に変換
    const jstDate = toZonedTime(utcDateTime, 'Asia/Tokyo');
    return format(jstDate, 'HH:mm:ss', { timeZone: 'Asia/Tokyo' });
  } catch (error) {
    console.error('convertUTCTimeToJST エラー:', error);
    return '';
  }
}

// ================================
// 統一された時間変換関数（date-fns-tz使用）
// ================================

/**
 * JST時刻をUTC時刻に変換する関数（date-fns-tz使用）
 * @param jstTime JST時刻（HH:mm:ss形式またはHH:mm形式）
 * @returns UTC時刻（HH:mm:ss形式）
 */
export function convertJSTTimeToUTC(jstTime: string): string {
  if (!jstTime || jstTime.trim() === '') return '';

  try {
    // 今日の日付と組み合わせてJST日時を作成
    const today = new Date();
    const jstDateTime = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      parseInt(jstTime.split(':')[0], 10),
      parseInt(jstTime.split(':')[1], 10),
      jstTime.split(':').length > 2 ? parseInt(jstTime.split(':')[2], 10) : 0
    );

    // date-fns-tzを使用してUTC時刻に変換
    const utcDate = fromZonedTime(jstDateTime, 'Asia/Tokyo');
    return format(utcDate, 'HH:mm:ss');
  } catch (error) {
    console.error('convertJSTTimeToUTC エラー:', error);
    return '';
  }
}

/**
 * UTC日時をJST日時に変換する関数（date-fns-tz使用）
 * @param utcDateTime UTC日時（ISO文字列またはDateオブジェクト）
 * @returns JST日時（Dateオブジェクト）
 */
export function convertUTCToJST(utcDateTime: string | Date): Date {
  const date = typeof utcDateTime === 'string' ? new Date(utcDateTime) : utcDateTime;
  return toZonedTime(date, 'Asia/Tokyo');
}

/**
 * JST日時をUTC日時に変換する関数（date-fns-tz使用）
 * @param jstDateTime JST日時（ISO文字列またはDateオブジェクト）
 * @returns UTC日時（Dateオブジェクト）
 */
export function convertJSTToUTC(jstDateTime: string | Date): Date {
  const date = typeof jstDateTime === 'string' ? new Date(jstDateTime) : jstDateTime;
  return fromZonedTime(date, 'Asia/Tokyo');
}

/**
 * JST日時文字列をUTC日時文字列に変換する関数（date-fns-tz使用）
 * @param jstDateTimeStr JST日時文字列（YYYY-MM-DDTHH:mm:ss形式）
 * @returns UTC日時文字列（ISO形式）
 */
export function convertJSTDateTimeToUTC(jstDateTimeStr: string): string {
  if (!jstDateTimeStr) return '';
  
  try {
    // 日時文字列の形式をチェック
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(jstDateTimeStr)) {
      console.warn('convertJSTDateTimeToUTC: 無効な日時形式:', jstDateTimeStr);
      return '';
    }
    
    const jstDate = new Date(jstDateTimeStr);
    
    // 無効な日付かチェック
    if (isNaN(jstDate.getTime())) {
      console.warn('convertJSTDateTimeToUTC: 無効な日付:', jstDateTimeStr);
      return '';
    }
    
    const utcDate = fromZonedTime(jstDate, 'Asia/Tokyo');
    return utcDate.toISOString();
  } catch (error) {
    console.error('convertJSTDateTimeToUTC エラー:', error);
    return '';
  }
}

/**
 * UTC日時文字列をJST日時文字列に変換する関数（date-fns-tz使用）
 * @param utcDateTimeStr UTC日時文字列（ISO形式）
 * @returns JST日時文字列（YYYY-MM-DDTHH:mm:ss形式）
 */
export function convertUTCDateTimeToJST(utcDateTimeStr: string): string {
  if (!utcDateTimeStr) return '';
  
  try {
    const utcDate = new Date(utcDateTimeStr);
    const jstDate = toZonedTime(utcDate, 'Asia/Tokyo');
    return format(jstDate, 'yyyy-MM-dd HH:mm:ss', { timeZone: 'Asia/Tokyo' });
  } catch (error) {
    console.error('convertUTCDateTimeToJST エラー:', error);
    return '';
  }
}

/**
 * 現在のJST日時を取得する関数（date-fns-tz使用）
 * @returns JST日時（Dateオブジェクト）
 */
export function getCurrentJST(): Date {
  return toZonedTime(new Date(), 'Asia/Tokyo');
}

/**
 * JST日付文字列を取得する関数（date-fns-tz使用）
 * @param date 基準日時（デフォルト: 現在時刻）
 * @returns YYYY-MM-DD形式のJST日付文字列
 */
export function getJSTDateString(date: Date = new Date()): string {
  const jstDate = toZonedTime(date, 'Asia/Tokyo');
  return format(jstDate, 'yyyy-MM-dd', { timeZone: 'Asia/Tokyo' });
}

/**
 * JST時刻文字列を取得する関数（date-fns-tz使用）
 * @param date 基準日時（デフォルト: 現在時刻）
 * @returns HH:mm:ss形式のJST時刻文字列
 */
export function getJSTTimeString(date: Date = new Date()): string {
  const jstDate = toZonedTime(date, 'Asia/Tokyo');
  return format(jstDate, 'HH:mm:ss', { timeZone: 'Asia/Tokyo' });
}

/**
 * datetime-local入力用のJST日時文字列を生成する関数（date-fns-tz使用）
 * @param utcDateTimeStr UTC日時文字列（ISO形式）
 * @returns YYYY-MM-DDTHH:mm形式のJST日時文字列
 */
export function formatDateTimeForInputJST(utcDateTimeStr: string): string {
  if (!utcDateTimeStr) return '';
  
  try {
    const utcDate = new Date(utcDateTimeStr);
    const jstDate = toZonedTime(utcDate, 'Asia/Tokyo');
    return format(jstDate, 'yyyy-MM-dd\'T\'HH:mm', { timeZone: 'Asia/Tokyo' });
  } catch (error) {
    console.error('formatDateTimeForInputJST エラー:', error);
    return '';
  }
}
