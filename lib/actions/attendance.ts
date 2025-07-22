'use server';

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

import type {
  ClockOperation,
  ClockResult,
  Attendance,
  BreakRecord,
  ClockType,
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
  let query = supabaseAdmin
    .from('attendances')
    .select('*')
    .eq('user_id', userId)
    .eq('work_date', today)
    .is('deleted_at', null);

  // clock_outの場合は、退勤していない最新の記録を取得
  if (type === 'clock_out') {
    query = query.is('clock_out_time', null).order('created_at', { ascending: false }).limit(1);
  } else {
    // その他の場合は、最新の記録を取得
    query = query.order('created_at', { ascending: false }).limit(1);
  }

  const { data: existingRecord, error } = await query.single();

  console.log('バリデーション用勤怠記録取得結果:', { existingRecord, error });

  if (error && error.code !== 'PGRST116') {
    console.error('バリデーション用勤怠記録取得エラー:', error);
    throw AppError.fromSupabaseError(error, '勤怠記録取得');
  }

  // 打刻タイプ別のバリデーション
  switch (type) {
    case 'clock_in': {
      // 1日に複数回の出勤を許可するため、既存の出勤記録があっても新しい出勤を許可
      console.log('clock_in バリデーション: 複数回出勤を許可');
      break;
    }

    case 'clock_out': {
      // その日の最後の出勤記録（退勤していない記録）を確認
      console.log('clock_out バリデーション: 最後の出勤記録を確認');

      // 既存の記録が退勤済みの場合は、新しい出勤記録を作成する必要がある
      if (existingRecord?.clock_out_time) {
        console.log('既存の記録は退勤済みです。新しい出勤記録が必要です');
        return { isValid: false, error: '出勤記録が見つかりません。先に出勤してください' };
      }

      if (!existingRecord?.clock_in_time) {
        console.log('出勤記録が見つかりません');
        return { isValid: false, error: '出勤記録が見つかりません' };
      }

      console.log('clock_out バリデーション成功');
      break;
    }

    case 'break_start': {
      if (!existingRecord?.clock_in_time) {
        return { isValid: false, error: '出勤記録が見つかりません' };
      }
      if (existingRecord?.clock_out_time) {
        return { isValid: false, error: '退勤済みのため休憩できません' };
      }
      // 休憩中の場合は新しい休憩を開始
      break;
    }

    case 'break_end': {
      if (!existingRecord?.clock_in_time) {
        return { isValid: false, error: '出勤記録が見つかりません' };
      }
      if (existingRecord?.clock_out_time) {
        return { isValid: false, error: '退勤済みのため休憩終了できません' };
      }
      // 休憩中でない場合はエラー
      const isOnBreak = existingRecord?.break_records?.some(
        (br: BreakRecord) => br.start && !br.end
      );
      if (!isOnBreak) {
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
  breakRecords: BreakRecord[],
  workTypeId?: string
): Promise<{ actualWorkMinutes: number; overtimeMinutes: number }> => {
  const clockIn = new Date(clockInTime);
  const clockOut = new Date(clockOutTime);

  // 総勤務時間（分）
  const totalMinutes = Math.floor((clockOut.getTime() - clockIn.getTime()) / 60000);

  // 休憩時間（分）
  const breakMinutes = breakRecords.reduce((total, br) => {
    if (br.start && br.end) {
      const breakStart = new Date(`${clockIn.toISOString().split('T')[0]}T${br.start}:00`);
      const breakEnd = new Date(`${clockIn.toISOString().split('T')[0]}T${br.end}:00`);
      return total + Math.floor((breakEnd.getTime() - breakStart.getTime()) / 60000);
    }
    return total;
  }, 0);

  // 実勤務時間（分）
  const actualWorkMinutes = totalMinutes - breakMinutes;

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
  console.log('clockIn 開始:', { userId, timestamp, workTypeId });

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

    const validation = await validateClockOperation(userId, 'clock_in', timestamp);
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

    // 勤怠記録を作成または更新
    console.log('Supabase upsert 開始:', {
      user_id: userId,
      work_date: today,
      work_type_id: workTypeId,
      clock_in_time: timestamp,
    });

    const { data, error } = await supabaseAdmin
      .from('attendances')
      .upsert({
        user_id: userId,
        work_date: today,
        work_type_id: workTypeId,
        clock_in_time: timestamp,
        break_records: [],
        actual_work_minutes: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase upsert error:', error);
      return {
        success: false,
        message: '出勤打刻に失敗しました',
        error: error.message,
      };
    }

    console.log('Supabase upsert 成功:', data);

    revalidatePath('/member');

    return {
      success: true,
      message: '出勤しました',
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
 * 退勤打刻
 */
export const clockOut = async (userId: string, timestamp: string): Promise<ClockResult> => {
  console.log('clockOut 開始:', { userId, timestamp });
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

    // 現在の勤怠記録を取得（退勤していない最新の記録）
    console.log('勤怠記録取得開始');
    const { data: existingRecord, error: fetchError } = await supabaseAdmin
      .from('attendances')
      .select('*')
      .eq('user_id', userId)
      .eq('work_date', today)
      .is('deleted_at', null)
      .is('clock_out_time', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    console.log('勤怠記録取得結果:', { existingRecord, fetchError });

    if (fetchError) {
      console.error('勤怠記録取得エラー:', fetchError);
      return {
        success: false,
        message: '勤怠記録の取得に失敗しました',
        error: fetchError.message,
      };
    }

    if (!existingRecord?.clock_in_time) {
      console.log('出勤記録が見つかりません');
      return {
        success: false,
        message: '出勤記録が見つかりません',
        error: 'NOT_FOUND',
      };
    }

    // 勤務時間を計算
    console.log('勤務時間計算開始');
    const { actualWorkMinutes, overtimeMinutes } = await calculateWorkTime(
      existingRecord.clock_in_time,
      timestamp,
      existingRecord.break_records || [],
      existingRecord.work_type_id
    );
    console.log('勤務時間計算結果:', { actualWorkMinutes, overtimeMinutes });

    // 勤怠記録を更新
    console.log('勤怠記録更新開始:', {
      id: existingRecord.id,
      clock_out_time: timestamp,
      actual_work_minutes: actualWorkMinutes,
      overtime_minutes: overtimeMinutes,
    });

    const { data, error } = await supabaseAdmin
      .from('attendances')
      .update({
        clock_out_time: timestamp,
        actual_work_minutes: actualWorkMinutes,
        overtime_minutes: overtimeMinutes,
      })
      .eq('id', existingRecord.id)
      .select()
      .single();

    console.log('勤怠記録更新結果:', { data, error });

    if (error) {
      console.error('勤怠記録更新エラー:', error);
      return {
        success: false,
        message: '退勤打刻に失敗しました',
        error: error.message,
      };
    }

    console.log('退勤処理成功');
    revalidatePath('/member');

    return {
      success: true,
      message: '退勤しました',
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
 * 休憩開始
 */
export const startBreak = async (userId: string, timestamp: string): Promise<ClockResult> => {
  try {
    // バリデーション
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

    // 現在の勤怠記録を取得（最新の出勤中のレコード）
    const { data: existingRecord, error: fetchError } = await supabaseAdmin
      .from('attendances')
      .select('*')
      .eq('user_id', userId)
      .eq('work_date', today)
      .is('deleted_at', null)
      .is('clock_out_time', null) // 退勤していないレコードのみ
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError) {
      return {
        success: false,
        message: '勤怠記録の取得に失敗しました',
        error: fetchError.message,
      };
    }

    if (!existingRecord) {
      return {
        success: false,
        message: '勤怠記録が見つかりません',
        error: 'NOT_FOUND',
      };
    }

    // 新しい休憩記録を追加
    const newBreakRecord: BreakRecord = {
      start: timestamp,
      end: '',
      type: 'break',
    };

    const updatedBreakRecords = [...(existingRecord.break_records || []), newBreakRecord];

    // 勤怠記録を更新
    const { data, error } = await supabaseAdmin
      .from('attendances')
      .update({
        break_records: updatedBreakRecords,
      })
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
    // バリデーション
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

    // 現在の勤怠記録を取得（最新の出勤中のレコード）
    const { data: existingRecord, error: fetchError } = await supabaseAdmin
      .from('attendances')
      .select('*')
      .eq('user_id', userId)
      .eq('work_date', today)
      .is('deleted_at', null)
      .is('clock_out_time', null) // 退勤していないレコードのみ
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError) {
      return {
        success: false,
        message: '勤怠記録の取得に失敗しました',
        error: fetchError.message,
      };
    }

    if (!existingRecord) {
      return {
        success: false,
        message: '勤怠記録が見つかりません',
        error: 'NOT_FOUND',
      };
    }

    // 最後の休憩記録を終了
    const updatedBreakRecords = [...(existingRecord.break_records || [])];
    const lastBreak = updatedBreakRecords[updatedBreakRecords.length - 1];

    if (lastBreak && !lastBreak.end) {
      lastBreak.end = timestamp;
    } else {
      return {
        success: false,
        message: '終了する休憩が見つかりません',
        error: 'NOT_FOUND',
      };
    }

    // 勤務時間を再計算（退勤済みの場合）
    let actualWorkMinutes = existingRecord.actual_work_minutes;
    let overtimeMinutes = existingRecord.overtime_minutes;

    if (existingRecord.clock_out_time) {
      const {
        actualWorkMinutes: recalculatedWorkMinutes,
        overtimeMinutes: recalculatedOvertimeMinutes,
      } = await calculateWorkTime(
        existingRecord.clock_in_time!,
        existingRecord.clock_out_time,
        updatedBreakRecords,
        existingRecord.work_type_id
      );
      actualWorkMinutes = recalculatedWorkMinutes;
      overtimeMinutes = recalculatedOvertimeMinutes;
    }

    // 勤怠記録を更新
    const { data, error } = await supabaseAdmin
      .from('attendances')
      .update({
        break_records: updatedBreakRecords,
        actual_work_minutes: actualWorkMinutes,
        overtime_minutes: overtimeMinutes,
      })
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

    // 今日の最新の勤怠記録を取得
    const { data, error } = await supabaseAdmin
      .from('attendances')
      .select('*')
      .eq('user_id', userId)
      .eq('work_date', today)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('今日の勤怠記録取得エラー:', error);
      return null;
    }

    return data as Attendance | null;
  } catch (error) {
    console.error('今日の勤怠記録取得エラー:', error);
    return null;
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

    // まず基本的なデータを取得
    let basicQuery = supabaseAdmin
      .from('attendances')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('work_date', { ascending: false })
      .order('created_at', { ascending: false }); // 同じ日付内では作成時刻の降順でソート

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

    // work_typesとuser_profilesの情報を個別に取得
    const workTypeIds = Array.from(
      new Set(basicData?.map((r) => r.work_type_id).filter(Boolean) || [])
    );
    const userIds = Array.from(new Set(basicData?.map((r) => r.user_id).filter(Boolean) || []));

    // work_types情報を取得
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

    // user_profiles情報を取得
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

    // データを結合して加工
    const processedData =
      basicData?.map((record) => {
        const workType = workTypesData.find((wt) => wt.id === record.work_type_id);
        const userProfile = userProfilesData.find((up) => up.id === record.user_id);

        // 残業時間を計算（デフォルト480分 = 8時間）
        const overtimeThreshold = workType?.overtime_threshold_minutes || 480;
        const overtimeMinutes = record.actual_work_minutes
          ? Math.max(0, record.actual_work_minutes - overtimeThreshold)
          : 0;

        // 休憩時間を計算
        const breakRecords = record.break_records || [];
        const totalBreakMinutes = breakRecords.reduce((total: number, br: BreakRecord) => {
          if (br.start && br.end) {
            const breakStart = new Date(`${record.work_date}T${br.start}:00`);
            const breakEnd = new Date(`${record.work_date}T${br.end}:00`);
            return total + Math.floor((breakEnd.getTime() - breakStart.getTime()) / 60000);
          }
          return total;
        }, 0);

        return {
          ...record,
          overtime_minutes: overtimeMinutes,
          total_break_minutes: totalBreakMinutes,
          break_count: breakRecords.length,
          work_type_name: workType?.name,
          approver_name: null, // 承認者名は別途取得が必要
          approval_status: record.approved_by ? 'approved' : 'pending',
        };
      }) || [];

    console.log('getUserAttendance 加工後データ:', processedData.length, '件');

    return processedData;
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
 * 管理者用：全社員の勤怠記録一覧を取得
 */
export const getAllAttendance = async (
  companyId: string,
  startDate?: string,
  endDate?: string
): Promise<Attendance[]> => {
  try {
    console.log('getAllAttendance 開始:', { companyId, startDate, endDate });

    // まず基本的なデータを取得
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

    // 企業内のユーザーIDを抽出
    const companyUserIds = userGroupsData?.map((ug) => ug.user_id) || [];
    console.log('企業内ユーザーID:', companyUserIds);

    // 企業内のユーザーの勤怠データのみをフィルタリング
    const filteredData =
      basicData?.filter((record) => companyUserIds.includes(record.user_id)) || [];

    console.log('企業内勤怠データ:', filteredData.length, '件');

    // work_typesとuser_profilesの情報を個別に取得
    const workTypeIds = Array.from(
      new Set(filteredData.map((r) => r.work_type_id).filter(Boolean))
    );
    const userIds = Array.from(new Set(filteredData.map((r) => r.user_id).filter(Boolean)));

    // work_types情報を取得
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

    // user_profiles情報を取得
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

    // データを結合して加工
    const processedData = filteredData.map((record) => {
      const workType = workTypesData.find((wt) => wt.id === record.work_type_id);
      const userProfile = userProfilesData.find((up) => up.id === record.user_id);

      // 残業時間を計算（デフォルト480分 = 8時間）
      const overtimeThreshold = workType?.overtime_threshold_minutes || 480;
      const overtimeMinutes = record.actual_work_minutes
        ? Math.max(0, record.actual_work_minutes - overtimeThreshold)
        : 0;

      // 休憩時間を計算
      const breakRecords = record.break_records || [];
      const totalBreakMinutes = breakRecords.reduce((total: number, br: BreakRecord) => {
        if (br.start && br.end) {
          const breakStart = new Date(`${record.work_date}T${br.start}:00`);
          const breakEnd = new Date(`${record.work_date}T${br.end}:00`);
          return total + Math.floor((breakEnd.getTime() - breakStart.getTime()) / 60000);
        }
        return total;
      }, 0);

      return {
        ...record,
        overtime_minutes: overtimeMinutes,
        total_break_minutes: totalBreakMinutes,
        break_count: breakRecords.length,
        work_type_name: workType?.name,
        approver_name: null, // 承認者名は別途取得が必要
        approval_status: record.approved_by ? 'approved' : 'pending',
        user_name: userProfile ? `${userProfile.family_name} ${userProfile.first_name}` : 'Unknown',
        user_code: userProfile?.code || '-',
      };
    });

    console.log('getAllAttendance 加工後データ:', processedData.length, '件');

    return processedData;
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
 * 管理者用：企業内の全部署一覧を取得
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
      console.error('部署取得エラー:', error);
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
