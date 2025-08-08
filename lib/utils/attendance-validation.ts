/**
 * attendanceオブジェクトのバリデーション用ユーティリティ
 */

import type { ClockRecord, ClockBreakRecord } from '@/schemas/attendance';
import type { ObjectValidationRule } from '@/schemas/request';
import {
  getJSTDate,
  convertJSTDateTimeToUTC,
  getJSTDateString,
  convertJSTToUTC,
} from '@/lib/utils';

// ================================
// 日付バリデーション
// ================================

/**
 * 過去日付のみ許可するバリデーション
 */
export function validatePastDateOnly(dateString: string): { isValid: boolean; error?: string } {
  const inputDate = new Date(dateString);
  const today = new Date();
  today.setHours(23, 59, 59, 999); // 今日の終了時刻

  if (inputDate > today) {
    return {
      isValid: false,
      error: '過去の日付のみ入力可能です',
    };
  }

  return { isValid: true };
}

// ================================
// clock_recordsバリデーション
// ================================

/**
 * clock_recordsの基本構造バリデーション
 */
export function validateClockRecordsStructure(clockRecords: unknown): {
  isValid: boolean;
  error?: string;
} {
  if (!Array.isArray(clockRecords)) {
    return {
      isValid: false,
      error: 'clock_recordsは配列形式である必要があります',
    };
  }

  if (clockRecords.length === 0) {
    return {
      isValid: false,
      error: '少なくとも1つの勤務セッションが必要です',
    };
  }

  for (let i = 0; i < clockRecords.length; i++) {
    const session = clockRecords[i];
    const sessionIndex = i + 1;

    // 必須フィールドのチェック
    if (!session.in_time) {
      return {
        isValid: false,
        error: `${sessionIndex}番目のセッションに出勤時刻が設定されていません`,
      };
    }

    // 最後のセッション以外は退勤時刻が必須
    if (i === clockRecords.length - 1 && !session.out_time) {
      return {
        isValid: false,
        error: '最後のセッションに退勤時刻が設定されていません',
      };
    }

    // 出勤時刻と退勤時刻の整合性チェック
    if (session.out_time && new Date(session.in_time) >= new Date(session.out_time)) {
      return {
        isValid: false,
        error: `${sessionIndex}番目のセッションで退勤時刻が出勤時刻より前になっています`,
      };
    }

    // セッション間の整合性チェック
    if (i > 0) {
      const prevSession = clockRecords[i - 1];
      if (prevSession.out_time && new Date(session.in_time) <= new Date(prevSession.out_time)) {
        return {
          isValid: false,
          error: `${sessionIndex}番目のセッションの出勤時刻が前のセッションの退勤時刻より前になっています`,
        };
      }
    }

    // 休憩記録のバリデーション
    if (session.breaks && Array.isArray(session.breaks)) {
      for (let j = 0; j < session.breaks.length; j++) {
        const breakRecord = session.breaks[j];
        const breakIndex = j + 1;

        if (!breakRecord.break_start || !breakRecord.break_end) {
          return {
            isValid: false,
            error: `${sessionIndex}番目のセッションの${breakIndex}番目の休憩に開始時刻または終了時刻が設定されていません`,
          };
        }

        // 休憩時刻の整合性チェック
        if (new Date(breakRecord.break_start) >= new Date(breakRecord.break_end)) {
          return {
            isValid: false,
            error: `${sessionIndex}番目のセッションの${breakIndex}番目の休憩で終了時刻が開始時刻より前になっています`,
          };
        }

        // 休憩が勤務時間内にあるかチェック
        const sessionStart = new Date(session.in_time);
        const sessionEnd = session.out_time ? new Date(session.out_time) : new Date();
        const breakStart = new Date(breakRecord.break_start);
        const breakEnd = new Date(breakRecord.break_end);

        if (breakStart < sessionStart || breakEnd > sessionEnd) {
          return {
            isValid: false,
            error: `${sessionIndex}番目のセッションの${breakIndex}番目の休憩が勤務時間外に設定されています`,
          };
        }
      }

      // 休憩時間の重複チェック
      for (let j = 0; j < session.breaks.length - 1; j++) {
        for (let k = j + 1; k < session.breaks.length; k++) {
          const break1 = session.breaks[j];
          const break2 = session.breaks[k];

          const break1Start = new Date(break1.break_start);
          const break1End = new Date(break1.break_end);
          const break2Start = new Date(break2.break_start);
          const break2End = new Date(break2.break_end);

          if (
            (break1Start < break2End && break1End > break2Start) ||
            (break2Start < break1End && break2End > break1Start)
          ) {
            return {
              isValid: false,
              error: `${sessionIndex}番目のセッションで休憩時間が重複しています`,
            };
          }
        }
      }
    }
  }

  return { isValid: true };
}

// ================================
// 統合バリデーション
// ================================

/**
 * attendanceオブジェクトの統合バリデーション
 */
export function validateAttendanceObject(
  data: Record<string, unknown>,
  validationRules: ObjectValidationRule[]
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const rule of validationRules) {
    switch (rule.type) {
      case 'date_past_only':
        if (data.work_date) {
          const result = validatePastDateOnly(data.work_date as string);
          if (!result.isValid) {
            errors.push(result.error!);
          }
        }
        break;

      case 'clock_records_valid':
        if (data.clock_records) {
          const result = validateClockRecordsStructure(data.clock_records);
          if (!result.isValid) {
            errors.push(result.error!);
          }
        }
        break;

      case 'required_field':
        if (rule.target_field && !(data[rule.target_field] as string)) {
          errors.push(rule.message);
        }
        break;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ================================
// ヘルパー関数
// ================================

/**
 * clock_recordsのデフォルト構造を生成
 */
export function createDefaultClockRecord(
  workDate?: string,
  workTypeDetail?: {
    work_start_time: string;
    work_end_time: string;
    break_times?: Array<{
      id: string;
      name: string;
      order: number;
      start_time: string;
      end_time: string;
    }>;
  }
): ClockRecord {
  let defaultInTime: string;
  let defaultOutTime: string;

  console.log('createDefaultClockRecord 開始:', { workDate, workTypeDetail });

  if (workDate) {
    if (workTypeDetail) {
      // work_start_timeとwork_end_timeはUTC時刻（HH:MM:SS形式）として保存されている
      // 指定された勤務日と組み合わせてUTCタイムスタンプを生成する

      console.log('createDefaultClockRecord - work_types設定値:', {
        work_start_time: workTypeDetail.work_start_time,
        work_end_time: workTypeDetail.work_end_time,
        workDate,
      });

      // work_typesテーブルの時刻はUTCとして保存されている
      // 指定された日付と組み合わせてUTCタイムスタンプを生成
      const [year, month, day] = workDate.split('-').map(Number);
      const [inHours, inMinutes] = workTypeDetail.work_start_time.split(':').map(Number);
      const [outHours, outMinutes] = workTypeDetail.work_end_time.split(':').map(Number);

      // UTCタイムスタンプを生成（work_typesの時刻はすでにUTCなのでそのまま使用）
      const utcInTime = new Date(Date.UTC(year, month - 1, day, inHours, inMinutes));
      const utcOutTime = new Date(Date.UTC(year, month - 1, day, outHours, outMinutes));

      defaultInTime = utcInTime.toISOString();
      defaultOutTime = utcOutTime.toISOString();

      console.log('createDefaultClockRecord - UTC時刻生成:', {
        workStartTime: workTypeDetail.work_start_time,
        workEndTime: workTypeDetail.work_end_time,
        utcInTime: utcInTime.toISOString(),
        utcOutTime: utcOutTime.toISOString(),
        defaultInTime,
        defaultOutTime,
      });
    } else {
      // 従来のデフォルト値を使用（JST時刻として扱う）
      const jstInTimeStr = `${workDate}T09:00:00`;
      const jstOutTimeStr = `${workDate}T18:00:00`;

      console.log('createDefaultClockRecord - 従来のJST時刻文字列生成:', {
        jstInTimeStr,
        jstOutTimeStr,
      });

      // 新しい統一された関数を使用してJST時刻をUTC時刻に変換
      defaultInTime = convertJSTDateTimeToUTC(jstInTimeStr);
      defaultOutTime = convertJSTDateTimeToUTC(jstOutTimeStr);

      console.log('createDefaultClockRecord - 従来のUTC時刻生成:', {
        jstInTimeStr,
        jstOutTimeStr,
        defaultInTime,
        defaultOutTime,
      });
    }
  } else {
    // 現在の日付のJST時刻を生成
    const todayStr = getJSTDate();

    if (workTypeDetail) {
      // work_start_timeとwork_end_timeはJST時刻（HH:MM:SS形式）
      // 今日のJST日付と組み合わせてJST時刻を作成し、UTC時刻に変換
      const jstInTimeStr = `${todayStr}T${workTypeDetail.work_start_time}`;
      const jstOutTimeStr = `${todayStr}T${workTypeDetail.work_end_time}`;

      console.log('createDefaultClockRecord - 今日のJST時刻文字列生成:', {
        work_start_time: workTypeDetail.work_start_time,
        work_end_time: workTypeDetail.work_end_time,
        jstInTimeStr,
        jstOutTimeStr,
      });

      // 新しい統一された関数を使用してJST時刻をUTC時刻に変換
      defaultInTime = convertJSTDateTimeToUTC(jstInTimeStr);
      defaultOutTime = convertJSTDateTimeToUTC(jstOutTimeStr);

      console.log('createDefaultClockRecord - 今日のJST→UTC変換:', {
        jstInTimeStr,
        jstOutTimeStr,
        defaultInTime,
        defaultOutTime,
      });
    } else {
      // 従来のデフォルト値を使用（JST時刻として扱う）
      const jstInTimeStr = `${todayStr}T09:00:00`;
      const jstOutTimeStr = `${todayStr}T18:00:00`;

      console.log('createDefaultClockRecord - 今日の従来のJST時刻文字列生成:', {
        jstInTimeStr,
        jstOutTimeStr,
      });

      // 新しい統一された関数を使用してJST時刻をUTC時刻に変換
      defaultInTime = convertJSTDateTimeToUTC(jstInTimeStr);
      defaultOutTime = convertJSTDateTimeToUTC(jstOutTimeStr);

      console.log('createDefaultClockRecord - 今日の従来のUTC時刻生成:', {
        jstInTimeStr,
        jstOutTimeStr,
        defaultInTime,
        defaultOutTime,
      });
    }
  }

  // work_typesのbreak_timesを使用してデフォルトの休憩記録を作成
  let defaultBreaks: ClockBreakRecord[] = [];

  if (workTypeDetail?.break_times && workTypeDetail.break_times.length > 0) {
    console.log('createDefaultClockRecord - break_times使用:', workTypeDetail.break_times);

    defaultBreaks = workTypeDetail.break_times
      .sort((a, b) => a.order - b.order) // orderでソート
      .map((breakTime) => {
        const targetDate = workDate || getJSTDate();

        // break_timesの時刻はJST時刻として扱う
        const jstBreakStartStr = `${targetDate}T${breakTime.start_time}:00`;
        const jstBreakEndStr = `${targetDate}T${breakTime.end_time}:00`;

        // 新しい統一された関数を使用してJST時刻をUTC時刻に変換
        const breakStart = convertJSTDateTimeToUTC(jstBreakStartStr);
        const breakEnd = convertJSTDateTimeToUTC(jstBreakEndStr);

        // 変換に失敗した場合はフォールバック値を使用
        if (!breakStart || !breakEnd) {
          console.warn('createDefaultClockRecord: 休憩時刻変換に失敗、フォールバック値を使用');
          return {
            break_start: `${targetDate}T${breakTime.start_time}:00`,
            break_end: `${targetDate}T${breakTime.end_time}:00`,
          };
        }

        return {
          break_start: breakStart,
          break_end: breakEnd,
        };
      });

    console.log('createDefaultClockRecord - デフォルト休憩記録生成:', defaultBreaks);
  }

  // 変換に失敗した場合のフォールバック
  if (!defaultInTime || !defaultOutTime) {
    console.warn('createDefaultClockRecord: 時刻変換に失敗、フォールバック値を使用');
    const fallbackDate = workDate || getJSTDate();
    const fallbackInTime = `${fallbackDate}T09:00:00`;
    const fallbackOutTime = `${fallbackDate}T18:00:00`;

    return {
      in_time: fallbackInTime,
      out_time: fallbackOutTime,
      breaks: defaultBreaks,
    };
  }

  const result = {
    in_time: defaultInTime,
    out_time: defaultOutTime,
    breaks: defaultBreaks,
  };

  console.log('createDefaultClockRecord 完了:', result);
  return result;
}

/**
 * 休憩記録のデフォルト構造を生成
 */
export function createDefaultBreakRecord(workDate?: string): ClockBreakRecord {
  let defaultBreakStart: string;
  let defaultBreakEnd: string;

  if (workDate) {
    // 指定された勤務日のJST時刻を生成
    const jstBreakStartStr = `${workDate}T12:00:00`;
    const jstBreakEndStr = `${workDate}T13:00:00`;

    // 新しい統一された関数を使用してJST時刻をUTC時刻に変換
    defaultBreakStart = convertJSTDateTimeToUTC(jstBreakStartStr);
    defaultBreakEnd = convertJSTDateTimeToUTC(jstBreakEndStr);
  } else {
    // 現在の日付のJST時刻を生成
    const todayStr = getJSTDateString();
    const jstBreakStartStr = `${todayStr}T12:00:00`;
    const jstBreakEndStr = `${todayStr}T13:00:00`;

    // 新しい統一された関数を使用してJST時刻をUTC時刻に変換
    defaultBreakStart = convertJSTDateTimeToUTC(jstBreakStartStr);
    defaultBreakEnd = convertJSTDateTimeToUTC(jstBreakEndStr);
  }

  // 変換に失敗した場合のフォールバック
  if (!defaultBreakStart || !defaultBreakEnd) {
    console.warn('createDefaultBreakRecord: 時刻変換に失敗、フォールバック値を使用');
    const fallbackDate = workDate || getJSTDateString();
    const fallbackStart = `${fallbackDate}T12:00:00`;
    const fallbackEnd = `${fallbackDate}T13:00:00`;

    return {
      break_start: fallbackStart,
      break_end: fallbackEnd,
    };
  }

  return {
    break_start: defaultBreakStart,
    break_end: defaultBreakEnd,
  };
}

/**
 * 日付文字列をフォーマット
 */
export function formatDateForInput(dateString: string): string {
  try {
    const date = new Date(dateString);
    return getJSTDate(date);
  } catch {
    return '';
  }
}

/**
 * 日時文字列をフォーマット
 */
export function formatDateTimeForInput(dateTimeString: string): string {
  try {
    const date = new Date(dateTimeString);
    return date.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
  } catch {
    return '';
  }
}
