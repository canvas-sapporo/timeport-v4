'use server';

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

import type {
  ClockOperation,
  ClockResult,
  Attendance,
  ClockBreakRecord,
  ClockType,
  ClockRecord,
} from '@/types/attendance';
import {
  AppError,
  withErrorHandling,
  createSuccessResponse,
  createFailureResponse,
} from '@/lib/utils/error-handling';

// 環境変数の確認
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Server Actions - 環境変数確認:');
console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '設定済み' : '未設定');
console.log('SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? '設定済み' : '未設定');

if (!supabaseUrl) {
  console.error('NEXT_PUBLIC_SUPABASE_URL is not set');
}

if (!serviceRoleKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is not set');
}

const supabaseAdmin = createClient(supabaseUrl || '', serviceRoleKey || '');

// ================================
// バリデーション関数
// ================================

/**
 * 打刻時刻のバリデーション
 */
const validateClockTime = (timestamp: string): boolean => {
  const clockTime = new Date(timestamp);
  const now = new Date();
  const timeDiff = Math.abs(now.getTime() - clockTime.getTime());

  // 24時間以内の打刻のみ許可
  return timeDiff <= 24 * 60 * 60 * 1000;
};

/**
 * 打刻操作のバリデーション
 */
const validateClockOperation = async (
  userId: string,
  type: ClockType,
  timestamp: string
): Promise<{ isValid: boolean; error?: string }> => {
  console.log('validateClockOperation 開始:', { userId, type, timestamp });
  const today = new Date().toISOString().split('T')[0];
  console.log('今日の日付:', today);

  // 今日の勤怠記録を取得（複数回出退勤対応）
  console.log('バリデーション用勤怠記録取得開始');
  const { data: existingRecord, error } = await supabaseAdmin
    .from('attendances')
    .select('*')
    .eq('user_id', userId)
    .eq('work_date', today)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  console.log('バリデーション用勤怠記録取得結果:', { existingRecord, error });

  if (error && error.code !== 'PGRST116') {
    console.error('バリデーション用勤怠記録取得エラー:', error);
    throw AppError.fromSupabaseError(error, '勤怠記録取得');
  }

  console.log('validateClockOperation: エラーチェック完了');

  // clock_recordsから最新のセッション情報を取得
  const latestSession = existingRecord?.clock_records?.[existingRecord.clock_records.length - 1];
  const hasActiveSession = latestSession && latestSession.in_time && !latestSession.out_time;

  console.log('validateClockOperation: セッション情報:', { latestSession, hasActiveSession });

  // 打刻タイプ別のバリデーション
  switch (type) {
    case 'clock_in': {
      // 1日に複数回の出勤を許可するため、既存の出勤記録があっても新しい出勤を許可
      console.log('clock_in バリデーション: 複数回出勤を許可');
      break;
    }

    case 'clock_out': {
      // アクティブなセッションがあるかチェック
      if (!hasActiveSession) {
        console.log('アクティブな出勤セッションが見つかりません');
        return { isValid: false, error: '出勤記録が見つかりません。先に出勤してください' };
      }

      console.log('clock_out バリデーション成功');
      break;
    }

    case 'break_start': {
      if (!hasActiveSession) {
        return { isValid: false, error: '出勤記録が見つかりません' };
      }
      // 休憩中の場合は新しい休憩を開始
      break;
    }

    case 'break_end': {
      if (!hasActiveSession) {
        return { isValid: false, error: '出勤記録が見つかりません' };
      }
      // 休憩中でない場合はエラー
      const hasActiveBreak = latestSession?.breaks?.some(
        (br: ClockBreakRecord) => br.break_start && !br.break_end
      );
      if (!hasActiveBreak) {
        return { isValid: false, error: '休憩中ではありません' };
      }
      break;
    }
  }

  console.log('validateClockOperation 完了: 有効');
  return { isValid: true };
};

// ================================
// 勤務時間計算関数
// ================================

/**
 * 勤務時間を計算
 */
const calculateWorkTime = async (
  clockInTime: string,
  clockOutTime: string,
  breakRecords: ClockBreakRecord[],
  workTypeId?: string
): Promise<{ actualWorkMinutes: number; overtimeMinutes: number }> => {
  const clockIn = new Date(clockInTime);
  const clockOut = new Date(clockOutTime);

  // 総勤務時間（分）
  const totalMinutes = Math.floor((clockOut.getTime() - clockIn.getTime()) / 60000);

  // 休憩時間（分）の計算を修正
  const breakMinutes = breakRecords.reduce((total, br) => {
    if (br.break_start && br.break_end) {
      try {
        // 日付を正しく処理
        const workDate = clockIn.toISOString().split('T')[0];
        const breakStart = new Date(`${workDate}T${br.break_start}`);
        const breakEnd = new Date(`${workDate}T${br.break_end}`);

        // 有効な日付かチェック
        if (isNaN(breakStart.getTime()) || isNaN(breakEnd.getTime())) {
          console.warn('無効な休憩時間:', { break_start: br.break_start, break_end: br.break_end });
          return total;
        }

        const breakDuration = Math.floor((breakEnd.getTime() - breakStart.getTime()) / 60000);
        return total + Math.max(0, breakDuration); // 負の値を防ぐ
      } catch (error) {
        console.warn('休憩時間計算エラー:', error);
        return total;
      }
    }
    return total;
  }, 0);

  // 実勤務時間（分）
  const actualWorkMinutes = Math.max(0, totalMinutes - breakMinutes);

  // work_typeから残業閾値を取得
  let overtimeThresholdMinutes = 480; // デフォルト8時間

  if (workTypeId) {
    try {
      const { data: workType, error } = await supabaseAdmin
        .from('work_types')
        .select('overtime_threshold_minutes')
        .eq('id', workTypeId)
        .single();

      if (!error && workType?.overtime_threshold_minutes) {
        overtimeThresholdMinutes = workType.overtime_threshold_minutes;
      }
    } catch (error) {
      console.warn('work_type取得エラー:', error);
      // エラーの場合はデフォルト値を使用
    }
  }

  // 残業時間（分）- work_typeの閾値を超えた分
  const overtimeMinutes = Math.max(0, actualWorkMinutes - overtimeThresholdMinutes);

  console.log('calculateWorkTime 詳細:', {
    clockInTime,
    clockOutTime,
    totalMinutes,
    breakMinutes,
    actualWorkMinutes,
    overtimeThresholdMinutes,
    overtimeMinutes,
    breakRecords,
  });

  return { actualWorkMinutes, overtimeMinutes };
};

// ================================
// Server Actions
// ================================

/**
 * 出勤打刻
 */
export const clockIn = async (
  userId: string,
  timestamp: string,
  workTypeId?: string
): Promise<ClockResult> => {
  console.log('=== clockIn Server Action 開始 ===');
  console.log('clockIn 開始:', { userId, timestamp, workTypeId });

  // 環境変数の確認
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('clockIn: 環境変数が設定されていません');
    return {
      success: false,
      message: 'システム設定エラー: 環境変数が正しく設定されていません',
      error: 'ENV_ERROR',
    };
  }

  try {
    console.log('clockIn: 環境変数確認完了');

    // 簡略化されたバージョンでテスト
    const today = new Date().toISOString().split('T')[0];
    console.log('clockIn: 今日の日付:', today);

    // 基本的なupsert操作のみ実行
    const upsertData = {
      user_id: userId,
      work_date: today,
      work_type_id: workTypeId,
      clock_records: [
        {
          in_time: timestamp,
          out_time: '',
          breaks: [],
        },
      ],
      actual_work_minutes: 0,
    };

    console.log('clockIn: upsert実行開始');
    const { data, error } = await supabaseAdmin
      .from('attendances')
      .upsert(upsertData)
      .select()
      .single();
    console.log('clockIn: upsert実行結果:', { data, error });

    if (error) {
      console.error('Supabase upsert error:', error);
      return {
        success: false,
        message: `出勤打刻に失敗しました: ${error.message}`,
        error: error.message,
      };
    }

    console.log('Supabase upsert 成功:', data);
    console.log('=== clockIn Server Action 完了 ===');

    revalidatePath('/member');

    return {
      success: true,
      message: '出勤しました',
      attendance: data as Attendance,
    };
  } catch (error) {
    console.error('clockIn 予期しないエラー:', error);
    return {
      success: false,
      message: `予期しないエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * 退勤打刻
 */
export const clockOut = async (userId: string, timestamp: string): Promise<ClockResult> => {
  console.log('clockOut 開始:', { userId, timestamp });

  // 環境変数の確認
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('clockOut: 環境変数が設定されていません');
    return {
      success: false,
      message: 'システム設定エラー: 環境変数が正しく設定されていません',
      error: 'ENV_ERROR',
    };
  }

  try {
    // バリデーション
    if (!validateClockTime(timestamp)) {
      console.log('打刻時刻バリデーション失敗');
      return {
        success: false,
        message: '打刻時刻が無効です',
        error: 'INVALID_TIME',
      };
    }

    const validation = await validateClockOperation(userId, 'clock_out', timestamp);
    console.log('打刻操作バリデーション結果:', validation);
    if (!validation.isValid) {
      console.log('打刻操作バリデーション失敗:', validation.error);
      return {
        success: false,
        message: validation.error || '打刻操作が無効です',
        error: 'VALIDATION_ERROR',
      };
    }

    const today = new Date().toISOString().split('T')[0];
    console.log('今日の日付:', today);

    // 勤怠レコード取得（複数レコードがある場合は最新のものを取得）
    const { data: existingRecords, error: fetchError } = await supabaseAdmin
      .from('attendances')
      .select('*')
      .eq('user_id', userId)
      .eq('work_date', today)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('勤怠レコード取得エラー:', fetchError);
      return {
        success: false,
        message: '勤怠記録の取得に失敗しました',
        error: fetchError.message,
      };
    }

    if (!existingRecords || existingRecords.length === 0) {
      return {
        success: false,
        message: '出勤記録が見つかりません',
        error: 'NOT_FOUND',
      };
    }

    const existingRecord = existingRecords[0]; // 最新のレコードを使用

    if (!existingRecord.clock_records || existingRecord.clock_records.length === 0) {
      return {
        success: false,
        message: '出勤記録が見つかりません',
        error: 'NOT_FOUND',
      };
    }
    // 最後の勤務セッションに退勤時刻をセット
    const newClockRecords: ClockRecord[] = [...existingRecord.clock_records];
    const lastIdx = newClockRecords.length - 1;
    if (!newClockRecords[lastIdx].in_time || newClockRecords[lastIdx].out_time) {
      return {
        success: false,
        message: '退勤可能な勤務セッションがありません',
        error: 'NO_ACTIVE_SESSION',
      };
    }
    newClockRecords[lastIdx].out_time = timestamp;

    // 休憩が開始されているが終了していない場合、退勤時刻をbreak_endに設定
    if (newClockRecords[lastIdx].breaks && newClockRecords[lastIdx].breaks.length > 0) {
      const lastBreak = newClockRecords[lastIdx].breaks[newClockRecords[lastIdx].breaks.length - 1];
      if (lastBreak.break_start && !lastBreak.break_end) {
        console.log('休憩が終了していないため、退勤時刻をbreak_endに設定:', timestamp);
        lastBreak.break_end = timestamp;
      }
    }

    // 勤務時間と残業時間を計算
    const latest = newClockRecords[lastIdx];
    if (latest.in_time && latest.out_time) {
      const { actualWorkMinutes, overtimeMinutes } = await calculateWorkTime(
        latest.in_time,
        latest.out_time,
        latest.breaks || [],
        existingRecord.work_type_id
      );

      console.log('勤務時間計算結果:', {
        actualWorkMinutes,
        overtimeMinutes,
        inTime: latest.in_time,
        outTime: latest.out_time,
      });

      const upsertData = {
        clock_records: newClockRecords,
        actual_work_minutes: actualWorkMinutes,
        overtime_minutes: overtimeMinutes,
      };

      const { data, error } = await supabaseAdmin
        .from('attendances')
        .update(upsertData)
        .eq('id', existingRecord.id)
        .select()
        .single();

      if (error) {
        console.error('勤怠記録更新エラー:', error);
        return {
          success: false,
          message: '退勤打刻に失敗しました',
          error: error.message,
        };
      }

      console.log('退勤処理成功:', {
        attendanceId: data?.id,
        actualWorkMinutes: data?.actual_work_minutes,
        overtimeMinutes: data?.overtime_minutes,
      });
      revalidatePath('/member');

      return {
        success: true,
        message: '退勤しました',
        attendance: data as Attendance,
      };
    } else {
      // 出勤・退勤時刻が不完全な場合
      const upsertData = {
        clock_records: newClockRecords,
      };

      const { data, error } = await supabaseAdmin
        .from('attendances')
        .update(upsertData)
        .eq('id', existingRecord.id)
        .select()
        .single();

      if (error) {
        console.error('勤怠記録更新エラー:', error);
        return {
          success: false,
          message: '退勤打刻に失敗しました',
          error: error.message,
        };
      }

      console.log('退勤処理成功（時刻不完全）:', {
        attendanceId: data?.id,
      });
      revalidatePath('/member');

      return {
        success: true,
        message: '退勤しました',
        attendance: data as Attendance,
      };
    }
  } catch (error) {
    return {
      success: false,
      message: '予期しないエラーが発生しました',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * 休憩開始
 */
export const startBreak = async (userId: string, timestamp: string): Promise<ClockResult> => {
  try {
    if (!validateClockTime(timestamp)) {
      return {
        success: false,
        message: '打刻時刻が無効です',
        error: 'INVALID_TIME',
      };
    }
    const validation = await validateClockOperation(userId, 'break_start', timestamp);
    if (!validation.isValid) {
      return {
        success: false,
        message: validation.error || '打刻操作が無効です',
        error: 'VALIDATION_ERROR',
      };
    }
    const today = new Date().toISOString().split('T')[0];
    // 勤怠レコード取得（複数レコードがある場合は最新のものを取得）
    const { data: existingRecords, error: fetchError } = await supabaseAdmin
      .from('attendances')
      .select('*')
      .eq('user_id', userId)
      .eq('work_date', today)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('勤怠レコード取得エラー:', fetchError);
      return {
        success: false,
        message: '勤怠記録の取得に失敗しました',
        error: fetchError.message,
      };
    }

    if (!existingRecords || existingRecords.length === 0) {
      return {
        success: false,
        message: '出勤記録が見つかりません',
        error: 'NOT_FOUND',
      };
    }

    const existingRecord = existingRecords[0]; // 最新のレコードを使用
    // 退勤前の最新セッションを取得
    const newClockRecords: ClockRecord[] = [...existingRecord.clock_records];
    const lastIdx = newClockRecords.length - 1;
    if (!newClockRecords[lastIdx].in_time || newClockRecords[lastIdx].out_time) {
      return {
        success: false,
        message: '休憩開始可能な勤務セッションがありません',
        error: 'NO_ACTIVE_SESSION',
      };
    }
    // 新しい休憩を追加
    newClockRecords[lastIdx].breaks = [
      ...(newClockRecords[lastIdx].breaks || []),
      { break_start: timestamp, break_end: '' },
    ];
    // 互換用: clock_recordsのみ使用
    const latest = newClockRecords[lastIdx];
    const upsertData = {
      clock_records: newClockRecords,
    };
    const { data, error } = await supabaseAdmin
      .from('attendances')
      .update(upsertData)
      .eq('id', existingRecord.id)
      .select()
      .single();
    if (error) {
      return {
        success: false,
        message: '休憩開始に失敗しました',
        error: error.message,
      };
    }
    revalidatePath('/member');
    return {
      success: true,
      message: '休憩を開始しました',
      attendance: data as Attendance,
    };
  } catch (error) {
    return {
      success: false,
      message: '予期しないエラーが発生しました',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * 休憩終了
 */
export const endBreak = async (userId: string, timestamp: string): Promise<ClockResult> => {
  try {
    if (!validateClockTime(timestamp)) {
      return {
        success: false,
        message: '打刻時刻が無効です',
        error: 'INVALID_TIME',
      };
    }
    const validation = await validateClockOperation(userId, 'break_end', timestamp);
    if (!validation.isValid) {
      return {
        success: false,
        message: validation.error || '打刻操作が無効です',
        error: 'VALIDATION_ERROR',
      };
    }
    const today = new Date().toISOString().split('T')[0];
    // 勤怠レコード取得（複数レコードがある場合は最新のものを取得）
    const { data: existingRecords, error: fetchError } = await supabaseAdmin
      .from('attendances')
      .select('*')
      .eq('user_id', userId)
      .eq('work_date', today)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('勤怠レコード取得エラー:', fetchError);
      return {
        success: false,
        message: '勤怠記録の取得に失敗しました',
        error: fetchError.message,
      };
    }

    if (!existingRecords || existingRecords.length === 0) {
      return {
        success: false,
        message: '出勤記録が見つかりません',
        error: 'NOT_FOUND',
      };
    }

    const existingRecord = existingRecords[0]; // 最新のレコードを使用
    // 退勤前の最新セッションを取得
    const newClockRecords: ClockRecord[] = [...existingRecord.clock_records];
    const lastIdx = newClockRecords.length - 1;
    if (!newClockRecords[lastIdx].in_time || newClockRecords[lastIdx].out_time) {
      return {
        success: false,
        message: '休憩終了可能な勤務セッションがありません',
        error: 'NO_ACTIVE_SESSION',
      };
    }
    // 最後の休憩のbreak_endをセット
    const breaks = [...(newClockRecords[lastIdx].breaks || [])];
    if (breaks.length === 0 || breaks[breaks.length - 1].break_end) {
      return {
        success: false,
        message: '終了する休憩が見つかりません',
        error: 'NOT_FOUND',
      };
    }
    breaks[breaks.length - 1].break_end = timestamp;
    newClockRecords[lastIdx].breaks = breaks;
    // 互換用: clock_recordsのみ使用
    const latest = newClockRecords[lastIdx];
    const upsertData = {
      clock_records: newClockRecords,
    };
    const { data, error } = await supabaseAdmin
      .from('attendances')
      .update(upsertData)
      .eq('id', existingRecord.id)
      .select()
      .single();
    if (error) {
      return {
        success: false,
        message: '休憩終了に失敗しました',
        error: error.message,
      };
    }
    revalidatePath('/member');
    return {
      success: true,
      message: '休憩を終了しました',
      attendance: data as Attendance,
    };
  } catch (error) {
    return {
      success: false,
      message: '予期しないエラーが発生しました',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * 今日の勤怠記録を取得（複数回出退勤対応）
 */
export const getTodayAttendance = async (userId: string): Promise<Attendance | null> => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // 今日の勤怠記録を取得（複数レコードがある場合は最新のものを取得）
    const { data: records, error } = await supabaseAdmin
      .from('attendances')
      .select('*')
      .eq('user_id', userId)
      .eq('work_date', today)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('今日の勤怠記録取得エラー:', error);
      return null;
    }

    if (!records || records.length === 0) {
      return null;
    }

    // 最新のレコードを使用
    const data = records[0];

    // clock_recordsから旧カラムを自動生成
    const attendance = data as Attendance;
    if (attendance.clock_records && attendance.clock_records.length > 0) {
      const latestSession = attendance.clock_records[attendance.clock_records.length - 1];

      // 旧カラムを最新セッションで同期（互換性のため）
      attendance.clock_in_time = latestSession.in_time;
      attendance.clock_out_time = latestSession.out_time || undefined;
    }

    return attendance;
  } catch (error) {
    console.error('今日の勤怠記録取得エラー:', error);
    return null;
  }
};

/**
 * メンバーページ用の軽量な勤怠記録取得（今月と前月のみ）
 */
export const getMemberAttendance = async (userId: string): Promise<Attendance[]> => {
  try {
    console.log('getMemberAttendance 開始:', { userId });

    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthStr = lastMonth.toISOString().slice(0, 10);

    console.log('日付フィルター:', { lastMonthStr });

    const { data: basicData, error: basicError } = await supabaseAdmin
      .from('attendances')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .gte('work_date', lastMonthStr)
      .order('work_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(60);

    if (basicError) {
      console.error('メンバー勤怠データ取得エラー:', basicError);
      throw basicError;
    }

    console.log('メンバー勤怠データ取得成功:', basicData?.length, '件');

    // clock_recordsから旧カラムを自動生成
    const processedData = (basicData || []).map((record) => {
      const attendance = record as Attendance;
      if (attendance.clock_records && attendance.clock_records.length > 0) {
        const latestSession = attendance.clock_records[attendance.clock_records.length - 1];
        // 旧カラムを最新セッションで同期（互換性のため）
        attendance.clock_in_time = latestSession.in_time;
        attendance.clock_out_time = latestSession.out_time || undefined;
      }
      return attendance;
    });

    // 一日に複数出勤した場合のソート処理
    // 1. 日付で降順ソート（最新の日付が上）
    // 2. 同じ日付内では出勤時刻で昇順ソート（早い出勤が上）
    const sortedData = processedData.sort((a, b) => {
      // まず日付で比較（降順）
      const dateComparison = b.work_date.localeCompare(a.work_date);
      if (dateComparison !== 0) {
        return dateComparison;
      }
      
      // 同じ日付の場合、出勤時刻で比較（昇順）
      const aClockIn = a.clock_in_time || '';
      const bClockIn = b.clock_in_time || '';
      return aClockIn.localeCompare(bClockIn);
    });

    console.log('getMemberAttendance ソート後のデータ件数:', sortedData.length, '件');

    return sortedData;
  } catch (error) {
    console.error('getMemberAttendance エラー:', error);
    return [];
  }
};

/**
 * ユーザーの勤怠記録一覧を取得（拡張版）
 */
export const getUserAttendance = async (
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<Attendance[]> => {
  try {
    console.log('getUserAttendance 開始:', { userId, startDate, endDate });

    let basicQuery = supabaseAdmin
      .from('attendances')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('work_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(30);

    if (startDate) {
      basicQuery = basicQuery.gte('work_date', startDate);
    }
    if (endDate) {
      basicQuery = basicQuery.lte('work_date', endDate);
    }

    if (!startDate && !endDate) {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthStr = lastMonth.toISOString().slice(0, 10);
      basicQuery = basicQuery.gte('work_date', lastMonthStr);
      console.log('日付フィルター適用:', { lastMonthStr });
    }

    const { data: basicData, error: basicError } = await basicQuery;

    if (basicError) {
      console.error('基本的な勤怠データ取得エラー:', basicError);
      throw basicError;
    }

    console.log('基本的な勤怠データ取得成功:', basicData?.length, '件');

    // work_typesとuser_profilesの情報を個別に取得
    const workTypeIds = Array.from(
      new Set(basicData?.map((r) => r.work_type_id).filter(Boolean) || [])
    );
    const userIds = Array.from(new Set(basicData?.map((r) => r.user_id).filter(Boolean) || []));

    let workTypesData: { id: string; name: string; overtime_threshold_minutes: number }[] = [];
    if (workTypeIds.length > 0) {
      const { data: wtData, error: wtError } = await supabaseAdmin
        .from('work_types')
        .select('id, name, overtime_threshold_minutes')
        .in('id', workTypeIds)
        .is('deleted_at', null);

      if (!wtError && wtData) {
        workTypesData = wtData;
      }
    }

    let userProfilesData: { id: string; family_name: string; first_name: string }[] = [];
    if (userIds.length > 0) {
      const { data: upData, error: upError } = await supabaseAdmin
        .from('user_profiles')
        .select('id, family_name, first_name')
        .in('id', userIds)
        .is('deleted_at', null);

      if (!upError && upData) {
        userProfilesData = upData;
      }
    }

    // データを結合して加工（clock_recordsベース）
    const processedData =
      basicData?.map((record) => {
        const workType = workTypesData.find((wt) => wt.id === record.work_type_id);
        const userProfile = userProfilesData.find((up) => up.id === record.user_id);

        // clock_recordsから旧カラムを自動生成
        const attendance = record as Attendance;
        if (attendance.clock_records && attendance.clock_records.length > 0) {
          const latestSession = attendance.clock_records[attendance.clock_records.length - 1];
          // 旧カラムを最新セッションで同期（互換性のため）
          attendance.clock_in_time = latestSession.in_time;
          attendance.clock_out_time = latestSession.out_time || undefined;
        }

        // clock_recordsから総勤務時間を計算
        const totalWorkMinutes =
          attendance.clock_records?.reduce((total, session) => {
            if (session.in_time && session.out_time) {
              const inTime = new Date(session.in_time);
              const outTime = new Date(session.out_time);
              const sessionMinutes = Math.floor((outTime.getTime() - inTime.getTime()) / 60000);

              // 休憩時間を差し引く
              const breakMinutes =
                session.breaks?.reduce((breakTotal, br) => {
                  if (br.break_start && br.break_end) {
                    const breakStart = new Date(br.break_start);
                    const breakEnd = new Date(br.break_end);
                    return (
                      breakTotal + Math.floor((breakEnd.getTime() - breakStart.getTime()) / 60000)
                    );
                  }
                  return breakTotal;
                }, 0) || 0;

              return total + (sessionMinutes - breakMinutes);
            }
            return total;
          }, 0) || 0;

        // 残業時間を計算（デフォルト480分 = 8時間）
        const overtimeThreshold = workType?.overtime_threshold_minutes || 480;
        const overtimeMinutes = Math.max(0, totalWorkMinutes - overtimeThreshold);

        // 休憩時間を計算
        const totalBreakMinutes =
          attendance.clock_records?.reduce((total, session) => {
            return (
              total +
              (session.breaks?.reduce((sessionBreakTotal, br) => {
                if (br.break_start && br.break_end) {
                  const breakStart = new Date(br.break_start);
                  const breakEnd = new Date(br.break_end);
                  return (
                    sessionBreakTotal +
                    Math.floor((breakEnd.getTime() - breakStart.getTime()) / 60000)
                  );
                }
                return sessionBreakTotal;
              }, 0) || 0)
            );
          }, 0) || 0;

        const breakCount =
          attendance.clock_records?.reduce((total, session) => {
            return total + (session.breaks?.length || 0);
          }, 0) || 0;

        return {
          ...attendance,
          actual_work_minutes: totalWorkMinutes,
          overtime_minutes: overtimeMinutes,
          total_break_minutes: totalBreakMinutes,
          break_count: breakCount,
          work_type_name: workType?.name,
          approver_name: undefined,
          approval_status: (attendance.approved_by ? 'approved' : 'pending') as
            | 'approved'
            | 'pending',
        };
      }) || [];

    console.log('getUserAttendance 加工後データ:', processedData.length, '件');

    // 一日に複数出勤した場合のソート処理
    // 1. 日付で降順ソート（最新の日付が上）
    // 2. 同じ日付内では出勤時刻で昇順ソート（早い出勤が上）
    const sortedData = processedData.sort((a, b) => {
      // まず日付で比較（降順）
      const dateComparison = b.work_date.localeCompare(a.work_date);
      if (dateComparison !== 0) {
        return dateComparison;
      }
      
      // 同じ日付の場合、出勤時刻で比較（昇順）
      const aClockIn = a.clock_in_time || '';
      const bClockIn = b.clock_in_time || '';
      return aClockIn.localeCompare(bClockIn);
    });

    console.log('getUserAttendance ソート後のデータ件数:', sortedData.length, '件');

    return sortedData;
  } catch (error) {
    console.error('getUserAttendance エラー:', error);
    throw error;
  }
};

/**
 * ユーザーが利用可能な勤務タイプ一覧を取得
 */
export const getUserWorkTypes = async (userId: string): Promise<{ id: string; name: string }[]> => {
  try {
    console.log('getUserWorkTypes 開始:', { userId });

    // ユーザーのプロフィールから現在の勤務タイプを取得
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('current_work_type_id')
      .eq('id', userId)
      .is('deleted_at', null)
      .single();

    if (profileError) {
      console.error('ユーザープロフィール取得エラー:', profileError);
      return [];
    }

    // ユーザーが所属する会社の勤務タイプを取得
    const { data: workTypes, error: workTypesError } = await supabaseAdmin
      .from('work_types')
      .select('id, name')
      .is('deleted_at', null)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });

    if (workTypesError) {
      console.error('勤務タイプ取得エラー:', workTypesError);
      return [];
    }

    // 現在の勤務タイプを最初に配置
    const sortedWorkTypes = workTypes || [];
    if (userProfile?.current_work_type_id) {
      const currentIndex = sortedWorkTypes.findIndex(
        (wt) => wt.id === userProfile.current_work_type_id
      );
      if (currentIndex > 0) {
        const current = sortedWorkTypes.splice(currentIndex, 1)[0];
        sortedWorkTypes.unshift(current);
      }
    }

    console.log('getUserWorkTypes 取得成功:', sortedWorkTypes.length, '件');
    return sortedWorkTypes;
  } catch (error) {
    console.error('getUserWorkTypes エラー:', error);
    return [];
  }
};

/**
 * ユーザーの勤務タイプを取得
 */
export const getUserWorkType = async (userId: string): Promise<string | undefined> => {
  try {
    console.log('getUserWorkType 開始:', { userId });

    // ユーザーのプロフィールから現在の勤務タイプを取得
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('current_work_type_id')
      .eq('id', userId)
      .is('deleted_at', null)
      .single();

    if (profileError) {
      console.error('ユーザープロフィール取得エラー:', profileError);
      return undefined;
    }

    console.log('getUserWorkType 取得成功:', userProfile?.current_work_type_id);
    return userProfile?.current_work_type_id || undefined;
  } catch (error) {
    console.error('getUserWorkType エラー:', error);
    return undefined;
  }
};

/**
 * 管理者用：全メンバーの勤怠記録一覧を取得
 */
export const getAllAttendance = async (
  companyId: string,
  startDate?: string,
  endDate?: string
): Promise<Attendance[]> => {
  try {
    console.log('getAllAttendance 開始:', { companyId, startDate, endDate });

    let basicQuery = supabaseAdmin
      .from('attendances')
      .select('*')
      .is('deleted_at', null)
      .order('work_date', { ascending: false });

    if (startDate) {
      basicQuery = basicQuery.gte('work_date', startDate);
    }
    if (endDate) {
      basicQuery = basicQuery.lte('work_date', endDate);
    }

    const { data: basicData, error: basicError } = await basicQuery;

    if (basicError) {
      console.error('基本的な勤怠データ取得エラー:', basicError);
      throw basicError;
    }

    console.log('基本的な勤怠データ取得成功:', basicData?.length, '件');

    // 企業内のユーザーのみをフィルタリング
    const { data: userGroupsData, error: userGroupsError } = await supabaseAdmin
      .from('user_groups')
      .select(
        `
        user_id,
        groups!inner(
          id,
          name,
          code,
          company_id
        )
      `
      )
      .eq('groups.company_id', companyId);

    if (userGroupsError) {
      console.error('ユーザーグループ取得エラー:', userGroupsError);
      throw userGroupsError;
    }

    const companyUserIds = userGroupsData?.map((ug) => ug.user_id) || [];
    console.log('企業内ユーザーID:', companyUserIds);

    const filteredData =
      basicData?.filter((record) => companyUserIds.includes(record.user_id)) || [];

    console.log('企業内勤怠データ:', filteredData.length, '件');

    // work_typesとuser_profilesの情報を個別に取得
    const workTypeIds = Array.from(
      new Set(filteredData.map((r) => r.work_type_id).filter(Boolean))
    );
    const userIds = Array.from(new Set(filteredData.map((r) => r.user_id).filter(Boolean)));

    let workTypesData: { id: string; name: string; overtime_threshold_minutes: number }[] = [];
    if (workTypeIds.length > 0) {
      const { data: wtData, error: wtError } = await supabaseAdmin
        .from('work_types')
        .select('id, name, overtime_threshold_minutes')
        .in('id', workTypeIds)
        .is('deleted_at', null);

      if (!wtError && wtData) {
        workTypesData = wtData;
      }
    }

    let userProfilesData: { id: string; family_name: string; first_name: string; code?: string }[] =
      [];
    if (userIds.length > 0) {
      const { data: upData, error: upError } = await supabaseAdmin
        .from('user_profiles')
        .select('id, family_name, first_name, code')
        .in('id', userIds)
        .is('deleted_at', null);

      if (!upError && upData) {
        userProfilesData = upData;
      }
    }

    // データを結合して加工（clock_recordsベース）
    const processedData = filteredData.map((record) => {
      const workType = workTypesData.find((wt) => wt.id === record.work_type_id);
      const userProfile = userProfilesData.find((up) => up.id === record.user_id);

      // clock_recordsから旧カラムを自動生成
      const attendance = record as Attendance;
      if (attendance.clock_records && attendance.clock_records.length > 0) {
        const latestSession = attendance.clock_records[attendance.clock_records.length - 1];
        // 旧カラムを最新セッションで同期（互換性のため）
        attendance.clock_in_time = latestSession.in_time;
        attendance.clock_out_time = latestSession.out_time || undefined;
      }

      // clock_recordsから総勤務時間を計算
      const totalWorkMinutes =
        attendance.clock_records?.reduce((total, session) => {
          if (session.in_time && session.out_time) {
            const inTime = new Date(session.in_time);
            const outTime = new Date(session.out_time);
            const sessionMinutes = Math.floor((outTime.getTime() - inTime.getTime()) / 60000);

            // 休憩時間を差し引く
            const breakMinutes =
              session.breaks?.reduce((breakTotal, br) => {
                if (br.break_start && br.break_end) {
                  const breakStart = new Date(br.break_start);
                  const breakEnd = new Date(br.break_end);
                  return (
                    breakTotal + Math.floor((breakEnd.getTime() - breakStart.getTime()) / 60000)
                  );
                }
                return breakTotal;
              }, 0) || 0;

            return total + (sessionMinutes - breakMinutes);
          }
          return total;
        }, 0) || 0;

      // 残業時間を計算（デフォルト480分 = 8時間）
      const overtimeThreshold = workType?.overtime_threshold_minutes || 480;
      const overtimeMinutes = Math.max(0, totalWorkMinutes - overtimeThreshold);

      // 休憩時間を計算
      const totalBreakMinutes =
        attendance.clock_records?.reduce((total, session) => {
          return (
            total +
            (session.breaks?.reduce((sessionBreakTotal, br) => {
              if (br.break_start && br.break_end) {
                const breakStart = new Date(br.break_start);
                const breakEnd = new Date(br.break_end);
                return (
                  sessionBreakTotal +
                  Math.floor((breakEnd.getTime() - breakStart.getTime()) / 60000)
                );
              }
              return sessionBreakTotal;
            }, 0) || 0)
          );
        }, 0) || 0;

      const breakCount =
        attendance.clock_records?.reduce((total, session) => {
          return total + (session.breaks?.length || 0);
        }, 0) || 0;

      return {
        ...attendance,
        actual_work_minutes: totalWorkMinutes,
        overtime_minutes: overtimeMinutes,
        total_break_minutes: totalBreakMinutes,
        break_count: breakCount,
        work_type_name: workType?.name,
        approver_name: undefined,
        approval_status: (attendance.approved_by ? 'approved' : 'pending') as
          | 'approved'
          | 'pending',
        user_name: userProfile ? `${userProfile.family_name} ${userProfile.first_name}` : 'Unknown',
        user_code: userProfile?.code || '-',
      };
    });

    console.log('getAllAttendance 加工後データ:', processedData.length, '件');
    
    // デバッグ用：最初の数件のデータを詳細ログ
    if (processedData.length > 0) {
      console.log('最初の3件のデータ詳細:');
      processedData.slice(0, 3).forEach((record, index) => {
        console.log(`レコード${index + 1}:`, {
          id: record.id,
          user_id: record.user_id,
          work_date: record.work_date,
          clock_records: record.clock_records,
          clock_in_time: record.clock_in_time,
          clock_out_time: record.clock_out_time,
          actual_work_minutes: record.actual_work_minutes,
          user_name: record.user_name
        });
      });
    }

    // 一日に複数出勤した場合のソート処理
    // 1. 日付で降順ソート（最新の日付が上）
    // 2. 同じ日付内では出勤時刻で昇順ソート（早い出勤が上）
    const sortedData = processedData.sort((a, b) => {
      // まず日付で比較（降順）
      const dateComparison = b.work_date.localeCompare(a.work_date);
      if (dateComparison !== 0) {
        return dateComparison;
      }
      
      // 同じ日付の場合、出勤時刻で比較（昇順）
      const aClockIn = a.clock_in_time || '';
      const bClockIn = b.clock_in_time || '';
      return aClockIn.localeCompare(bClockIn);
    });

    console.log('ソート後のデータ件数:', sortedData.length, '件');

    return sortedData;
  } catch (error) {
    console.error('getAllAttendance エラー:', error);
    throw error;
  }
};

/**
 * 管理者用：企業内の全ユーザー一覧を取得
 */
export const getCompanyUsers = async (
  companyId: string
): Promise<{ id: string; name: string; code?: string }[]> => {
  try {
    console.log('getCompanyUsers 開始:', { companyId });

    const { data: userGroupsData, error: userGroupsError } = await supabaseAdmin
      .from('user_groups')
      .select(
        `
        user_id,
        groups!inner(
          id,
          name,
          code,
          company_id
        )
      `
      )
      .eq('groups.company_id', companyId);

    if (userGroupsError) {
      console.error('ユーザーグループ取得エラー:', userGroupsError);
      throw userGroupsError;
    }

    const userIds = userGroupsData?.map((ug) => ug.user_id) || [];

    if (userIds.length === 0) {
      return [];
    }

    const { data: userProfiles, error: userProfilesError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, family_name, first_name, code')
      .in('id', userIds)
      .is('deleted_at', null);

    if (userProfilesError) {
      console.error('ユーザープロフィール取得エラー:', userProfilesError);
      throw userProfilesError;
    }

    const users =
      userProfiles?.map((user) => ({
        id: user.id,
        name: `${user.family_name} ${user.first_name}`,
        code: user.code,
      })) || [];

    console.log('getCompanyUsers 取得成功:', users.length, '件');
    return users;
  } catch (error) {
    console.error('getCompanyUsers エラー:', error);
    throw error;
  }
};

/**
 * 管理者用：企業内の全グループ一覧を取得
 */
export const getCompanyGroups = async (
  companyId: string
): Promise<{ id: string; name: string; code?: string }[]> => {
  try {
    console.log('getCompanyGroups 開始:', { companyId });

    const { data: groups, error } = await supabaseAdmin
      .from('groups')
      .select('id, name, code')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('name', { ascending: true });

    if (error) {
      console.error('グループ取得エラー:', error);
      throw error;
    }

    const result =
      groups?.map((group) => ({
        id: group.id,
        name: group.name,
        code: group.code,
      })) || [];

    console.log('getCompanyGroups 取得成功:', result.length, '件');
    return result;
  } catch (error) {
    console.error('getCompanyGroups エラー:', error);
    throw error;
  }
};
