import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

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
  if (!time) return '--:--';

  try {
    const dateObj = typeof time === 'string' ? new Date(time) : time;

    if (isNaN(dateObj.getTime())) {
      return '--:--';
    }

    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');

    return `${hours}:${minutes}`;
  } catch (error) {
    console.error('時刻フォーマットエラー:', error);
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
 * 日本時間での日付を取得する関数
 * @param date 基準日時（デフォルト: 現在時刻）
 * @returns YYYY-MM-DD形式の日本時間での日付文字列
 */
export function getJSTDate(date: Date = new Date()): string {
  const jstOffset = 9 * 60; // JSTはUTC+9
  const jstTime = new Date(date.getTime() + jstOffset * 60 * 1000);
  return jstTime.toISOString().split('T')[0];
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
 * 日時文字列をJSTでフォーマットしてHTML datetime-local入力用に変換する関数
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
      timezoneOffset: date.getTimezoneOffset()
    });
    
    // JSTオフセット（+9時間）を適用
    const jstOffset = 9 * 60; // JSTはUTC+9
    const jstTime = new Date(date.getTime() + jstOffset * 60 * 1000);
    
    console.log('formatDateTimeForInput - JST変換後:', { 
      jstTime: jstTime.toISOString(),
      jstTimeString: jstTime.toString()
    });
    
    const result = jstTime.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
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
