/**
 * attendanceオブジェクトのバリデーション用ユーティリティ
 */

import type { ClockRecord, ClockBreakRecord } from '@/schemas/attendance';
import type { ObjectValidationRule } from '@/schemas/request';
import { getJSTDate } from '@/lib/utils';

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
export function createDefaultClockRecord(workDate?: string): ClockRecord {
  const now = new Date();
  const jstOffset = 9 * 60; // JSTはUTC+9
  
  let defaultInTime: string;
  let defaultOutTime: string;
  
  if (workDate) {
    // 指定された勤務日のJST時刻を生成
    const jstInTime = new Date(`${workDate}T09:00:00`);
    const jstOutTime = new Date(`${workDate}T18:00:00`);
    
    // UTC時間に変換
    defaultInTime = new Date(jstInTime.getTime() - jstOffset * 60 * 1000).toISOString();
    defaultOutTime = new Date(jstOutTime.getTime() - jstOffset * 60 * 1000).toISOString();
  } else {
    // 現在の日付のJST時刻を生成
    const today = new Date();
    const jstInTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0, 0);
    const jstOutTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 18, 0, 0);
    
    // UTC時間に変換
    defaultInTime = new Date(jstInTime.getTime() - jstOffset * 60 * 1000).toISOString();
    defaultOutTime = new Date(jstOutTime.getTime() - jstOffset * 60 * 1000).toISOString();
  }

  return {
    in_time: defaultInTime,
    out_time: defaultOutTime,
    breaks: [],
  };
}

/**
 * 休憩記録のデフォルト構造を生成
 */
export function createDefaultBreakRecord(workDate?: string): ClockBreakRecord {
  const now = new Date();
  const jstOffset = 9 * 60; // JSTはUTC+9
  
  let defaultBreakStart: string;
  let defaultBreakEnd: string;
  
  if (workDate) {
    // 指定された勤務日のJST時刻を生成
    const jstBreakStart = new Date(`${workDate}T12:00:00`);
    const jstBreakEnd = new Date(`${workDate}T13:00:00`);
    
    // UTC時間に変換
    defaultBreakStart = new Date(jstBreakStart.getTime() - jstOffset * 60 * 1000).toISOString();
    defaultBreakEnd = new Date(jstBreakEnd.getTime() - jstOffset * 60 * 1000).toISOString();
  } else {
    // 現在の日付のJST時刻を生成
    const today = new Date();
    const jstBreakStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0);
    const jstBreakEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 13, 0, 0);
    
    // UTC時間に変換
    defaultBreakStart = new Date(jstBreakStart.getTime() - jstOffset * 60 * 1000).toISOString();
    defaultBreakEnd = new Date(jstBreakEnd.getTime() - jstOffset * 60 * 1000).toISOString();
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
