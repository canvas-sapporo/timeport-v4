'use server';

import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

import type {
  AttendanceStatusData,
  ClockType,
  StatusLogic,
  ClockResult,
  AttendanceData as Attendance,
  ClockBreakRecord,
  ClockRecord,
} from '@/schemas/attendance';
import { AppError } from '@/lib/utils/error-handling';
import { logAudit } from '@/lib/utils/log-system';
import { getJSTDate } from '@/lib/utils';

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

/**
 * クライアント情報を取得
 */
async function getClientInfo() {
  try {
    const headersList = await headers();
    const forwarded = headersList.get('x-forwarded-for');
    const realIp = headersList.get('x-real-ip');
    const userAgent = headersList.get('user-agent');

    // IPアドレスの取得（優先順位: x-forwarded-for > x-real-ip）
    let ipAddress = forwarded || realIp;
    if (ipAddress && ipAddress.includes(',')) {
      // 複数のIPが含まれている場合は最初のものを使用
      ipAddress = ipAddress.split(',')[0].trim();
    }

    return {
      ip_address: ipAddress || undefined,
      user_agent: userAgent || undefined,
      session_id: undefined, // セッションIDは別途取得が必要
    };
  } catch (error) {
    console.error('クライアント情報取得エラー:', error);
    return {
      ip_address: undefined,
      user_agent: undefined,
      session_id: undefined,
    };
  }
}

// ================================
// バリデーション関数
// ================================

/**
 * 打刻時刻のバリデーション
 */
function validateClockTime(timestamp: string): boolean {
  const clockTime = new Date(timestamp);
  const now = new Date();
  const timeDiff = Math.abs(now.getTime() - clockTime.getTime());

  // 24時間以内の打刻のみ許可
  return timeDiff <= 24 * 60 * 60 * 1000;
}

/**
 * 打刻操作のバリデーション
 */
async function validateClockOperation(
  userId: string,
  type: ClockType,
  timestamp: string
): Promise<{ isValid: boolean; error?: string }> {
  console.log('validateClockOperation 開始:', { userId, type, timestamp });
  const today = getJSTDate();
  console.log('今日の日付（JST）:', today);

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
}

// ================================
// 勤務時間計算関数
// ================================

/**
 * 勤務時間を計算
 */
async function calculateWorkTime(
  clockInTime: string,
  clockOutTime: string,
  breakRecords: ClockBreakRecord[],
  workTypeId?: string
): Promise<{ actualWorkMinutes: number; overtimeMinutes: number }> {
  const clockIn = new Date(clockInTime);
  const clockOut = new Date(clockOutTime);

  // 総勤務時間（分）
  const totalMinutes = Math.floor((clockOut.getTime() - clockIn.getTime()) / 60000);

  // 休憩時間（分）の計算を修正
  const breakMinutes = breakRecords.reduce((total, br) => {
    if (br.break_start && br.break_end) {
      try {
        // ISO形式の文字列を直接Dateオブジェクトに変換
        const breakStart = new Date(br.break_start);
        const breakEnd = new Date(br.break_end);

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
        .is('deleted_at', null)
        .single();

      if (!error && workType?.overtime_threshold_minutes) {
        overtimeThresholdMinutes = workType.overtime_threshold_minutes;
        console.log('work_type取得成功:', { workTypeId, overtimeThresholdMinutes });
      } else {
        console.warn('work_type取得エラーまたはデータなし:', { workTypeId, error });
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
}

// ================================
// Server Actions
// ================================

/**
 * 出勤打刻
 */
export async function clockIn(
  userId: string,
  timestamp: string,
  workTypeId?: string,
  currentUserId?: string
): Promise<ClockResult> {
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

    // 日本時間での今日の日付を取得
    const today = getJSTDate();
    console.log('clockIn: 今日の日付（JST）:', today);

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

    // 監査ログを記録
    if (currentUserId) {
      const clientInfo = await getClientInfo();
      try {
        // ユーザーの企業IDを取得
        const { data: userProfile } = await supabaseAdmin
          .from('user_profiles')
          .select('id')
          .eq('id', userId)
          .single();

        let companyId: string | undefined;
        if (userProfile) {
          const { data: userGroup } = await supabaseAdmin
            .from('user_groups')
            .select('groups(company_id)')
            .eq('user_id', userId)
            .is('deleted_at', null)
            .single();
          companyId = userGroup?.groups?.company_id;
        }

        await logAudit('attendance_created', {
          user_id: currentUserId,
          company_id: companyId,
          target_type: 'attendances',
          target_id: data.id,
          before_data: undefined,
          after_data: {
            id: data.id,
            user_id: userId,
            work_date: today,
            work_type_id: workTypeId,
            clock_records: data.clock_records,
            actual_work_minutes: 0,
          },
          details: {
            action_type: 'clock_in',
            timestamp,
            work_type_id: workTypeId,
          },
          ip_address: clientInfo.ip_address,
          user_agent: clientInfo.user_agent,
          session_id: clientInfo.session_id,
        });
        console.log('監査ログ記録完了: attendance_created (clock_in)');
      } catch (error) {
        console.error('監査ログ記録エラー:', error);
      }
    } else {
      console.log('現在のユーザーIDが提供されていないため、監査ログを記録しません');
    }

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
}

/**
 * 退勤打刻
 */
export async function clockOut(
  userId: string,
  timestamp: string,
  currentUserId?: string
): Promise<ClockResult> {
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

    const today = getJSTDate();
    console.log('今日の日付（JST）:', today);

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

      // 監査ログを記録
      if (currentUserId) {
        const clientInfo = await getClientInfo();
        try {
          // ユーザーの企業IDを取得
          const { data: userProfile } = await supabaseAdmin
            .from('user_profiles')
            .select('id')
            .eq('id', userId)
            .single();

          let companyId: string | undefined;
          if (userProfile) {
            const { data: userGroup } = await supabaseAdmin
              .from('user_groups')
              .select('groups(company_id)')
              .eq('user_id', userId)
              .is('deleted_at', null)
              .single();
            companyId = userGroup?.groups?.company_id;
          }

          await logAudit('attendance_updated', {
            user_id: currentUserId,
            company_id: companyId,
            target_type: 'attendances',
            target_id: data.id,
            before_data: existingRecord,
            after_data: data,
            details: {
              action_type: 'clock_out',
              timestamp,
              actual_work_minutes: data.actual_work_minutes,
              overtime_minutes: data.overtime_minutes,
            },
            ip_address: clientInfo.ip_address,
            user_agent: clientInfo.user_agent,
            session_id: clientInfo.session_id,
          });
          console.log('監査ログ記録完了: attendance_updated (clock_out)');
        } catch (error) {
          console.error('監査ログ記録エラー:', error);
        }
      } else {
        console.log('現在のユーザーIDが提供されていないため、監査ログを記録しません');
      }

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
}

/**
 * 休憩開始
 */
export async function startBreak(
  userId: string,
  timestamp: string,
  currentUserId?: string
): Promise<ClockResult> {
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
    const today = getJSTDate();
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

    // 監査ログを記録
    if (currentUserId) {
      const clientInfo = await getClientInfo();
      try {
        // ユーザーの企業IDを取得
        const { data: userProfile } = await supabaseAdmin
          .from('user_profiles')
          .select('id')
          .eq('id', userId)
          .single();

        let companyId: string | undefined;
        if (userProfile) {
          const { data: userGroup } = await supabaseAdmin
            .from('user_groups')
            .select('groups(company_id)')
            .eq('user_id', userId)
            .is('deleted_at', null)
            .single();
          companyId = userGroup?.groups?.company_id;
        }

        await logAudit('attendance_break_started', {
          user_id: currentUserId,
          company_id: companyId,
          target_type: 'attendances',
          target_id: data.id,
          before_data: existingRecord,
          after_data: data,
          details: {
            action_type: 'break_start',
            timestamp,
            break_count: newClockRecords[lastIdx].breaks?.length || 0,
          },
          ip_address: clientInfo.ip_address,
          user_agent: clientInfo.user_agent,
          session_id: clientInfo.session_id,
        });
        console.log('監査ログ記録完了: attendance_break_started');
      } catch (error) {
        console.error('監査ログ記録エラー:', error);
      }
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
}

/**
 * 休憩終了
 */
export async function endBreak(
  userId: string,
  timestamp: string,
  currentUserId?: string
): Promise<ClockResult> {
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
    const today = getJSTDate();
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

    // 監査ログを記録
    if (currentUserId) {
      const clientInfo = await getClientInfo();
      try {
        // ユーザーの企業IDを取得
        const { data: userProfile } = await supabaseAdmin
          .from('user_profiles')
          .select('id')
          .eq('id', userId)
          .single();

        let companyId: string | undefined;
        if (userProfile) {
          const { data: userGroup } = await supabaseAdmin
            .from('user_groups')
            .select('groups(company_id)')
            .eq('user_id', userId)
            .is('deleted_at', null)
            .single();
          companyId = userGroup?.groups?.company_id;
        }

        await logAudit('attendance_break_ended', {
          user_id: currentUserId,
          company_id: companyId,
          target_type: 'attendances',
          target_id: data.id,
          before_data: existingRecord,
          after_data: data,
          details: {
            action_type: 'break_end',
            timestamp,
            break_duration:
              breaks[breaks.length - 1].break_start && breaks[breaks.length - 1].break_end
                ? new Date(breaks[breaks.length - 1].break_end).getTime() -
                  new Date(breaks[breaks.length - 1].break_start).getTime()
                : 0,
          },
          ip_address: clientInfo.ip_address,
          user_agent: clientInfo.user_agent,
          session_id: clientInfo.session_id,
        });
        console.log('監査ログ記録完了: attendance_break_ended');
      } catch (error) {
        console.error('監査ログ記録エラー:', error);
      }
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
}

/**
 * 今日の勤怠記録を取得（複数回出退勤対応）
 */
export async function getTodayAttendance(userId: string): Promise<Attendance | null> {
  try {
    const today = getJSTDate();

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
}

/**
 * メンバーページ用の軽量な勤怠記録取得（今月と前月のみ）
 */
export async function getMemberAttendance(userId: string): Promise<Attendance[]> {
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
}

/**
 * ユーザーの勤怠記録一覧を取得（拡張版）
 */
export async function getUserAttendance(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<Attendance[]> {
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
}

/**
 * ユーザーが利用可能な勤務タイプ一覧を取得
 */
export async function getUserWorkTypes(userId: string): Promise<{ id: string; name: string }[]> {
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
}

/**
 * ユーザーの勤務タイプを取得
 */
export async function getUserWorkType(userId: string): Promise<string | undefined> {
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
}

/**
 * 管理者用：全メンバーの勤怠記録一覧を取得
 */
export async function getAllAttendance(
  companyId: string,
  startDate?: string,
  endDate?: string
): Promise<Attendance[]> {
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

    // source_idで参照されていないデータのみを取得（編集履歴は除外）
    const originalRecords = filteredData.filter((record) => {
      // source_idがnullまたはundefinedのレコードのみを取得
      return !record.source_id;
    });

    // 編集履歴の存在をチェック
    const recordsWithEditHistory = originalRecords.map((record) => {
      const hasEditHistory = filteredData.some((editRecord) => editRecord.source_id === record.id);
      return {
        ...record,
        has_edit_history: hasEditHistory,
      };
    });

    const latestData = recordsWithEditHistory;

    // データを結合して加工（clock_recordsベース）
    const processedData = latestData.map((record) => {
      const workType = workTypesData.find((wt) => wt.id === record.work_type_id);
      const userProfile = userProfilesData.find((up) => up.id === record.user_id);

      // clock_recordsから旧カラムを自動生成
      const attendance = record as Attendance;
      if (attendance.clock_records && attendance.clock_records.length > 0) {
        const latestSession = attendance.clock_records[attendance.clock_records.length - 1];
        // 旧カラムを最新セッションで同期（互換性のため）
        attendance.clock_in_time = latestSession.in_time;
        // out_timeが空文字列の場合はundefinedにしない
        attendance.clock_out_time =
          latestSession.out_time === '' ? undefined : latestSession.out_time;
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
          user_name: record.user_name,
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
}

/**
 * 管理者用：企業内の全ユーザー一覧を取得
 */
export async function getCompanyUsers(
  companyId: string
): Promise<{ id: string; name: string; code?: string }[]> {
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
}

/**
 * 管理者用：企業内の全グループ一覧を取得
 */
export async function getCompanyGroups(
  companyId: string
): Promise<{ id: string; name: string; code?: string }[]> {
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
}

/**
 * 勤怠記録の更新
 */
export async function updateAttendance(
  attendanceId: string,
  updateData: {
    work_type_id?: string;
    clock_records?: ClockRecord[];
    actual_work_minutes?: number;
    overtime_minutes?: number;
    late_minutes?: number;
    early_leave_minutes?: number;
    status?: 'normal' | 'late' | 'early_leave' | 'absent';
    auto_calculated?: boolean;
    description?: string;
    approved_by?: string;
    approved_at?: string;
  },
  currentUserId?: string
): Promise<{ success: boolean; message: string; attendance?: Attendance; error?: string }> {
  try {
    console.log('updateAttendance 開始:', { attendanceId, updateData });

    // UUID形式チェック
    if (attendanceId.startsWith('absent-')) {
      return {
        success: false,
        message: '該当する勤怠記録が見つかりません',
        error: 'NOT_FOUND',
      };
    }

    // 既存の勤怠記録を取得
    const { data: existingRecord, error: fetchError } = await supabaseAdmin
      .from('attendances')
      .select('*')
      .eq('id', attendanceId)
      .is('deleted_at', null)
      .single();

    if (fetchError) {
      console.error('勤怠記録取得エラー:', fetchError);
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

    // 更新データを準備
    const updatePayload: Record<string, unknown> = { ...updateData };

    // clock_recordsが更新された場合、旧カラムも同期
    if (updateData.clock_records && updateData.clock_records.length > 0) {
      const latestSession = updateData.clock_records[updateData.clock_records.length - 1];
      updatePayload.clock_in_time = latestSession.in_time;
      updatePayload.clock_out_time = latestSession.out_time || null;
    }

    // 勤務時間の自動計算
    if (updateData.clock_records && updateData.clock_records.length > 0) {
      const latestSession = updateData.clock_records[updateData.clock_records.length - 1];
      if (latestSession.in_time && latestSession.out_time) {
        const { actualWorkMinutes, overtimeMinutes } = await calculateWorkTime(
          latestSession.in_time,
          latestSession.out_time,
          latestSession.breaks || [],
          updateData.work_type_id || existingRecord.work_type_id
        );
        updatePayload.actual_work_minutes = actualWorkMinutes;
        updatePayload.overtime_minutes = overtimeMinutes;
      }
    }

    // 更新を実行
    const { data: updatedRecord, error: updateError } = await supabaseAdmin
      .from('attendances')
      .update(updatePayload)
      .eq('id', attendanceId)
      .select()
      .single();

    if (updateError) {
      console.error('勤怠記録更新エラー:', updateError);
      return {
        success: false,
        message: '勤怠記録の更新に失敗しました',
        error: updateError.message,
      };
    }

    console.log('勤怠記録更新成功:', updatedRecord);

    // 監査ログを記録
    if (currentUserId) {
      const clientInfo = await getClientInfo();
      try {
        // ユーザーの企業IDを取得
        const { data: userProfile } = await supabaseAdmin
          .from('user_profiles')
          .select('id')
          .eq('id', existingRecord.user_id)
          .single();

        let companyId: string | undefined;
        if (userProfile) {
          const { data: userGroup } = await supabaseAdmin
            .from('user_groups')
            .select('groups(company_id)')
            .eq('user_id', existingRecord.user_id)
            .is('deleted_at', null)
            .single();
          companyId = userGroup?.groups?.company_id;
        }

        await logAudit('attendance_updated', {
          user_id: currentUserId,
          company_id: companyId,
          target_type: 'attendances',
          target_id: attendanceId,
          before_data: existingRecord,
          after_data: updatedRecord,
          details: {
            action_type: 'manual_update',
            updated_fields: Object.keys(updateData),
            approved_by: updateData.approved_by,
            approved_at: updateData.approved_at,
          },
          ip_address: clientInfo.ip_address,
          user_agent: clientInfo.user_agent,
          session_id: clientInfo.session_id,
        });
        console.log('監査ログ記録完了: attendance_updated (manual_update)');
      } catch (error) {
        console.error('監査ログ記録エラー:', error);
      }
    } else {
      console.log('現在のユーザーIDが提供されていないため、監査ログを記録しません');
    }

    revalidatePath('/admin/attendance');

    return {
      success: true,
      message: '勤怠記録を更新しました',
      attendance: updatedRecord as Attendance,
    };
  } catch (error) {
    console.error('updateAttendance エラー:', error);
    return {
      success: false,
      message: '予期しないエラーが発生しました',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 勤怠記録の論理削除
 */
export async function deleteAttendance(
  attendanceId: string,
  currentUserId?: string
): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    console.log('deleteAttendance 開始:', { attendanceId });

    // UUID形式チェック
    if (attendanceId.startsWith('absent-')) {
      return {
        success: false,
        message: '該当する勤怠記録が見つかりません',
        error: 'NOT_FOUND',
      };
    }

    // 既存の勤怠記録を取得
    const { data: existingRecord, error: fetchError } = await supabaseAdmin
      .from('attendances')
      .select('*')
      .eq('id', attendanceId)
      .is('deleted_at', null)
      .single();

    if (fetchError) {
      console.error('勤怠記録取得エラー:', fetchError);
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

    // 論理削除を実行
    const { error: deleteError } = await supabaseAdmin
      .from('attendances')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', attendanceId);

    if (deleteError) {
      console.error('勤怠記録削除エラー:', deleteError);
      return {
        success: false,
        message: '勤怠記録の削除に失敗しました',
        error: deleteError.message,
      };
    }

    console.log('勤怠記録削除成功:', attendanceId);

    // 監査ログを記録
    if (currentUserId) {
      const clientInfo = await getClientInfo();
      try {
        // ユーザーの企業IDを取得
        const { data: userProfile } = await supabaseAdmin
          .from('user_profiles')
          .select('id')
          .eq('id', existingRecord.user_id)
          .single();

        let companyId: string | undefined;
        if (userProfile) {
          const { data: userGroup } = await supabaseAdmin
            .from('user_groups')
            .select('groups(company_id)')
            .eq('user_id', existingRecord.user_id)
            .is('deleted_at', null)
            .single();
          companyId = userGroup?.groups?.company_id;
        }

        await logAudit('attendance_deleted', {
          user_id: currentUserId,
          company_id: companyId,
          target_type: 'attendances',
          target_id: attendanceId,
          before_data: existingRecord,
          after_data: undefined,
          details: {
            action_type: 'logical_delete',
            deleted_at: new Date().toISOString(),
            user_id: existingRecord.user_id,
            work_date: existingRecord.work_date,
          },
          ip_address: clientInfo.ip_address,
          user_agent: clientInfo.user_agent,
          session_id: clientInfo.session_id,
        });
        console.log('監査ログ記録完了: attendance_deleted');
      } catch (error) {
        console.error('監査ログ記録エラー:', error);
      }
    } else {
      console.log('現在のユーザーIDが提供されていないため、監査ログを記録しません');
    }

    revalidatePath('/admin/attendance');

    return {
      success: true,
      message: '勤怠記録を削除しました',
    };
  } catch (error) {
    console.error('deleteAttendance エラー:', error);
    return {
      success: false,
      message: '予期しないエラーが発生しました',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 勤怠記録の詳細取得（プレビュー用）
 */
export async function getAttendanceDetail(
  attendanceId: string
): Promise<{ success: boolean; attendance?: Attendance; error?: string }> {
  try {
    console.log('getAttendanceDetail 開始:', { attendanceId });

    // UUID形式チェック
    if (attendanceId.startsWith('absent-')) {
      return {
        success: false,
        error: '該当する勤怠記録が見つかりません',
      };
    }

    const { data: record, error } = await supabaseAdmin
      .from('attendances')
      .select('*')
      .eq('id', attendanceId)
      .is('deleted_at', null)
      .single();

    if (error) {
      console.error('勤怠記録取得エラー:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    if (!record) {
      return {
        success: false,
        error: 'NOT_FOUND',
      };
    }

    // 関連データを取得
    const workTypeId = record.work_type_id;
    const userId = record.user_id;

    let workTypeName = '';
    if (workTypeId) {
      const { data: workType } = await supabaseAdmin
        .from('work_types')
        .select('name')
        .eq('id', workTypeId)
        .is('deleted_at', null)
        .single();
      workTypeName = workType?.name || '';
    }

    let userName = '';
    if (userId) {
      const { data: userProfile } = await supabaseAdmin
        .from('user_profiles')
        .select('family_name, first_name')
        .eq('id', userId)
        .is('deleted_at', null)
        .single();
      userName = userProfile ? `${userProfile.family_name} ${userProfile.first_name}` : '';
    }

    // clock_recordsから旧カラムを自動生成
    const attendance = record as Attendance;
    if (attendance.clock_records && attendance.clock_records.length > 0) {
      const latestSession = attendance.clock_records[attendance.clock_records.length - 1];
      attendance.clock_in_time = latestSession.in_time;
      // out_timeが空文字列の場合はundefinedにしない
      attendance.clock_out_time =
        latestSession.out_time === '' ? undefined : latestSession.out_time;
    }

    // 計算フィールドを追加
    attendance.work_type_name = workTypeName;
    attendance.user_name = userName;

    console.log('getAttendanceDetail 取得成功');
    return {
      success: true,
      attendance,
    };
  } catch (error) {
    console.error('getAttendanceDetail エラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 勤務タイプ一覧を取得
 */
export async function getWorkTypes(): Promise<{ id: string; name: string }[]> {
  try {
    console.log('getWorkTypes 開始');

    const { data: workTypes, error } = await supabaseAdmin
      .from('work_types')
      .select('id, name')
      .is('deleted_at', null)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('勤務タイプ取得エラー:', error);
      throw error;
    }

    const result = workTypes || [];
    console.log('getWorkTypes 取得成功:', result.length, '件');
    return result;
  } catch (error) {
    console.error('getWorkTypes エラー:', error);
    return [];
  }
}

export async function getWorkTypeDetail(workTypeId: string): Promise<{
  id: string;
  name: string;
  code?: string;
  work_start_time: string;
  work_end_time: string;
  break_duration_minutes: number;
  is_flexible: boolean;
  flex_start_time?: string;
  flex_end_time?: string;
  core_start_time?: string;
  core_end_time?: string;
  overtime_threshold_minutes: number;
  late_threshold_minutes: number;
  description?: string;
}> {
  try {
    console.log('getWorkTypeDetail 開始:', workTypeId);

    const { data: workType, error } = await supabaseAdmin
      .from('work_types')
      .select(
        `
        id,
        name,
        code,
        work_start_time,
        work_end_time,
        break_duration_minutes,
        is_flexible,
        flex_start_time,
        flex_end_time,
        core_start_time,
        core_end_time,
        overtime_threshold_minutes,
        late_threshold_minutes,
        description
      `
      )
      .eq('id', workTypeId)
      .is('deleted_at', null)
      .single();

    if (error) {
      console.error('勤務形態詳細取得エラー:', error);
      throw error;
    }

    if (!workType) {
      throw new Error('勤務形態が見つかりません');
    }

    console.log('getWorkTypeDetail 取得成功:', workType.name);
    return workType;
  } catch (error) {
    console.error('getWorkTypeDetail エラー:', error);
    throw error;
  }
}

/**
 * 勤怠記録の時刻を編集（データ複製による履歴管理）
 */
export async function editAttendanceTime(
  attendanceId: string,
  clockRecords: ClockRecord[],
  editReason: string,
  editedBy: string,
  currentUserId?: string
): Promise<{ success: boolean; message: string; attendance?: Attendance; error?: string }> {
  try {
    console.log('editAttendanceTime 開始:', { attendanceId, editReason, editedBy });

    // UUID形式チェック
    if (attendanceId.startsWith('absent-')) {
      return {
        success: false,
        message: '該当する勤怠記録が見つかりません',
        error: 'NOT_FOUND',
      };
    }

    // 元の勤怠記録を取得
    const { data: originalRecord, error: fetchError } = await supabaseAdmin
      .from('attendances')
      .select('*')
      .eq('id', attendanceId)
      .is('deleted_at', null)
      .single();

    if (fetchError || !originalRecord) {
      console.error('元の勤怠記録取得エラー:', fetchError);
      return {
        success: false,
        message: '元の勤怠記録が見つかりません',
        error: fetchError?.message || 'NOT_FOUND',
      };
    }

    // バリデーション
    const validationResult = validateClockRecords(clockRecords);
    if (!validationResult.isValid) {
      return {
        success: false,
        message: validationResult.error || '時刻データが無効です',
        error: 'VALIDATION_ERROR',
      };
    }

    // 勤務時間の計算
    let actualWorkMinutes = 0;
    let overtimeMinutes = 0;

    if (clockRecords.length > 0) {
      const latestSession = clockRecords[clockRecords.length - 1];
      if (latestSession.in_time && latestSession.out_time) {
        const { actualWorkMinutes: calculatedWork, overtimeMinutes: calculatedOvertime } =
          await calculateWorkTime(
            latestSession.in_time,
            latestSession.out_time,
            latestSession.breaks || [],
            originalRecord.work_type_id
          );
        actualWorkMinutes = calculatedWork;
        overtimeMinutes = calculatedOvertime;
      }
    }

    // 新しい勤怠記録を作成（データ複製）
    const newAttendanceData = {
      user_id: originalRecord.user_id,
      work_date: originalRecord.work_date,
      work_type_id: originalRecord.work_type_id,
      clock_records: clockRecords,
      actual_work_minutes: actualWorkMinutes,
      overtime_minutes: overtimeMinutes,
      description: originalRecord.description,
      approved_by: originalRecord.approved_by,
      approved_at: originalRecord.approved_at,
      source_id: originalRecord.id, // 元のレコードを参照
      edit_reason: editReason,
      edited_by: editedBy,
    };

    const { data: newRecord, error: createError } = await supabaseAdmin
      .from('attendances')
      .insert(newAttendanceData)
      .select()
      .single();

    if (createError) {
      console.error('新しい勤怠記録作成エラー:', createError);
      return {
        success: false,
        message: '勤怠記録の編集に失敗しました',
        error: createError.message,
      };
    }

    console.log('勤怠記録編集成功:', newRecord);

    // 監査ログを記録
    if (currentUserId) {
      const clientInfo = await getClientInfo();
      try {
        // ユーザーの企業IDを取得
        const { data: userProfile } = await supabaseAdmin
          .from('user_profiles')
          .select('id')
          .eq('id', originalRecord.user_id)
          .single();

        let companyId: string | undefined;
        if (userProfile) {
          const { data: userGroup } = await supabaseAdmin
            .from('user_groups')
            .select('groups(company_id)')
            .eq('user_id', originalRecord.user_id)
            .is('deleted_at', null)
            .single();
          companyId = userGroup?.groups?.company_id;
        }

        await logAudit('attendance_updated', {
          user_id: currentUserId,
          company_id: companyId,
          target_type: 'attendances',
          target_id: newRecord.id,
          before_data: originalRecord,
          after_data: newRecord,
          details: {
            action_type: 'time_edit',
            edit_reason: editReason,
            edited_by: editedBy,
            original_attendance_id: originalRecord.id,
            clock_records_changed: true,
          },
          ip_address: clientInfo.ip_address,
          user_agent: clientInfo.user_agent,
          session_id: clientInfo.session_id,
        });
        console.log('監査ログ記録完了: attendance_updated (time_edit)');
      } catch (error) {
        console.error('監査ログ記録エラー:', error);
      }
    } else {
      console.log('現在のユーザーIDが提供されていないため、監査ログを記録しません');
    }

    revalidatePath('/admin/attendance');

    return {
      success: true,
      message: '勤怠記録を編集しました',
      attendance: newRecord,
    };
  } catch (error) {
    console.error('editAttendanceTime エラー:', error);
    return {
      success: false,
      message: '予期しないエラーが発生しました',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * clock_recordsのバリデーション
 */
function validateClockRecords(clockRecords: ClockRecord[]): { isValid: boolean; error?: string } {
  if (!clockRecords || clockRecords.length === 0) {
    return { isValid: false, error: '勤務記録が入力されていません' };
  }

  for (let i = 0; i < clockRecords.length; i++) {
    const session = clockRecords[i];

    // 出勤時刻のチェック
    if (!session.in_time) {
      return { isValid: false, error: `${i + 1}番目のセッションに出勤時刻が設定されていません` };
    }

    // 退勤時刻のチェック（最後のセッション以外は必須）
    if (i === clockRecords.length - 1 && !session.out_time) {
      return { isValid: false, error: '最後のセッションに退勤時刻が設定されていません' };
    }

    // 出勤時刻と退勤時刻の整合性チェック
    if (session.out_time && new Date(session.in_time) >= new Date(session.out_time)) {
      return {
        isValid: false,
        error: `${i + 1}番目のセッションで退勤時刻が出勤時刻より前になっています`,
      };
    }

    // セッション間の整合性チェック
    if (i > 0) {
      const prevSession = clockRecords[i - 1];
      if (prevSession.out_time && new Date(session.in_time) <= new Date(prevSession.out_time)) {
        return {
          isValid: false,
          error: `${i + 1}番目のセッションの出勤時刻が前のセッションの退勤時刻より前になっています`,
        };
      }
    }

    // 休憩時間のチェック
    if (session.breaks && session.breaks.length > 0) {
      for (let j = 0; j < session.breaks.length; j++) {
        const breakRecord = session.breaks[j];

        if (!breakRecord.break_start || !breakRecord.break_end) {
          return {
            isValid: false,
            error: `${i + 1}番目のセッションの${j + 1}番目の休憩に開始時刻または終了時刻が設定されていません`,
          };
        }

        if (new Date(breakRecord.break_start) >= new Date(breakRecord.break_end)) {
          return {
            isValid: false,
            error: `${i + 1}番目のセッションの${j + 1}番目の休憩で終了時刻が開始時刻より前になっています`,
          };
        }

        // 休憩時間が勤務時間内かチェック
        if (
          new Date(breakRecord.break_start) < new Date(session.in_time) ||
          (session.out_time && new Date(breakRecord.break_end) > new Date(session.out_time))
        ) {
          return {
            isValid: false,
            error: `${i + 1}番目のセッションの${j + 1}番目の休憩が勤務時間外になっています`,
          };
        }
      }
    }
  }

  return { isValid: true };
}

/**
 * 最新の勤怠記録を取得（編集履歴を考慮）
 */
export async function getLatestAttendance(
  userId: string,
  workDate: string
): Promise<Attendance | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('attendances')
      .select('*')
      .eq('user_id', userId)
      .eq('work_date', workDate)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('最新勤怠記録取得エラー:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('getLatestAttendance エラー:', error);
    return null;
  }
}

/**
 * 会社の勤怠ステータス一覧を取得
 */
export async function getAttendanceStatuses(
  companyId: string
): Promise<{ success: boolean; statuses?: AttendanceStatusData[]; error?: string }> {
  try {
    console.log('getAttendanceStatuses 開始:', { companyId });

    const { data: statuses, error } = await supabaseAdmin
      .from('attendance_statuses')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('勤怠ステータス取得エラー:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    console.log('getAttendanceStatuses 取得成功:', statuses?.length || 0, '件');
    console.log(
      '取得されたステータス詳細:',
      statuses?.map((s) => ({
        name: s.name,
        display_name: s.display_name,
        sort_order: s.sort_order,
        logic: s.logic,
      }))
    );
    return {
      success: true,
      statuses: statuses || [],
    };
  } catch (error) {
    console.error('getAttendanceStatuses エラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * ステータス判定ロジックを実行する関数
 */
export async function evaluateStatusLogic(logic: string, attendance: Attendance): Promise<boolean> {
  try {
    const statusLogic: StatusLogic = JSON.parse(logic);
    console.log('evaluateStatusLogic 開始:', { logic, attendanceId: attendance.id });

    // 条件を評価
    const result = statusLogic.conditions.every((condition) => {
      const fieldValue = getFieldValue(attendance, condition.field);
      console.log('条件評価:', {
        field: condition.field,
        operator: condition.operator,
        value: condition.value,
        fieldValue,
      });

      let conditionResult = false;
      switch (condition.operator) {
        case 'has_sessions':
          conditionResult =
            condition.value === (Array.isArray(fieldValue) && fieldValue.length > 0);
          console.log('has_sessions 結果:', {
            fieldValue,
            length: Array.isArray(fieldValue) ? fieldValue.length : 0,
            expected: condition.value,
            result: conditionResult,
          });
          return conditionResult;
        case 'has_complete_sessions':
          conditionResult =
            condition.value ===
            (Array.isArray(fieldValue) &&
              fieldValue.some(
                (session: { in_time: string; out_time: string }) =>
                  session.in_time && session.out_time && session.out_time !== ''
              ));
          console.log('has_complete_sessions 結果:', {
            fieldValue,
            expected: condition.value,
            result: conditionResult,
          });
          return conditionResult;
        case 'empty':
          conditionResult =
            condition.value ===
            (!fieldValue || (Array.isArray(fieldValue) && fieldValue.length === 0));
          console.log('empty 結果:', {
            fieldValue,
            expected: condition.value,
            result: conditionResult,
          });
          return conditionResult;
        case 'greater_than':
          conditionResult =
            typeof fieldValue === 'number' && fieldValue > (condition.value as number);
          console.log('greater_than 結果:', {
            fieldValue,
            expected: condition.value,
            result: conditionResult,
          });
          return conditionResult;
        case 'less_than':
          conditionResult =
            typeof fieldValue === 'number' && fieldValue < (condition.value as number);
          console.log('less_than 結果:', {
            fieldValue,
            expected: condition.value,
            result: conditionResult,
          });
          return conditionResult;
        case 'equals':
          conditionResult = fieldValue === condition.value;
          console.log('equals 結果:', {
            fieldValue,
            expected: condition.value,
            result: conditionResult,
          });
          return conditionResult;
        case 'not_equals':
          conditionResult = fieldValue !== condition.value;
          console.log('not_equals 結果:', {
            fieldValue,
            expected: condition.value,
            result: conditionResult,
          });
          return conditionResult;
        default:
          console.log('未知のオペレーター:', condition.operator);
          return false;
      }
    });

    console.log('evaluateStatusLogic 最終結果:', result);
    return result;
  } catch (error) {
    console.error('ステータス判定ロジック実行エラー:', error);
    return false;
  }
}

/**
 * オブジェクトからフィールド値を取得する関数
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getFieldValue(obj: Record<string, unknown>, field: string): unknown {
  const fields = field.split('.');
  let value: unknown = obj;

  for (const f of fields) {
    if (value && typeof value === 'object' && !Array.isArray(value) && f in value) {
      const objValue = value as Record<string, unknown>;
      value = objValue[f];
    } else {
      return undefined;
    }
  }

  return value;
}

/**
 * 勤怠記録のステータスを動的に判定する関数
 */
export async function getDynamicAttendanceStatus(
  attendance: Attendance,
  statuses: AttendanceStatusData[]
): Promise<string> {
  console.log('getDynamicAttendanceStatus 開始:', {
    attendanceId: attendance.id,
    clockRecords: attendance.clock_records,
    statusesCount: statuses.length,
  });

  // ロジックを持つステータスを優先的に評価
  const statusesWithLogic = statuses.filter((s) => s.logic && s.is_active);
  console.log(
    'ロジックを持つステータス:',
    statusesWithLogic.map((s) => ({ name: s.name, sort_order: s.sort_order }))
  );

  for (const status of statusesWithLogic) {
    console.log(`ステータス "${status.name}" のロジック評価開始:`, status.logic);
    const result = await evaluateStatusLogic(status.logic!, attendance);
    console.log(`ステータス "${status.name}" の評価結果:`, result);

    if (result) {
      console.log(`ステータス "${status.name}" が適用されます`);
      return status.name;
    }
  }

  console.log('ロジックによる判定が失敗、デフォルトロジックを使用');
  // デフォルトの判定ロジック
  const clockRecords = attendance.clock_records || [];
  const hasAnySession = clockRecords.length > 0;
  const hasCompletedSession = clockRecords.some((session) => session.in_time && session.out_time);

  console.log('デフォルト判定:', { hasAnySession, hasCompletedSession });

  if (!hasAnySession) return 'absent';
  if (!hasCompletedSession) return 'normal';
  return 'normal';
}

/**
 * 勤怠ステータスを作成
 */
export async function createAttendanceStatus(
  companyId: string,
  statusData: {
    name: string;
    display_name: string;
    color: string;
    font_color: string;
    background_color: string;
    sort_order: number;
    logic?: string;
    description?: string;
  }
): Promise<{ success: boolean; status?: AttendanceStatusData; error?: string }> {
  try {
    console.log('createAttendanceStatus 開始:', { companyId, statusData });

    const { data: status, error } = await supabaseAdmin
      .from('attendance_statuses')
      .insert({
        company_id: companyId,
        ...statusData,
        is_active: true,
        is_required: false,
      })
      .select()
      .single();

    if (error) {
      console.error('勤怠ステータス作成エラー:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    console.log('createAttendanceStatus 成功:', status);
    return {
      success: true,
      status,
    };
  } catch (error) {
    console.error('createAttendanceStatus エラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 勤怠ステータスを更新
 */
export async function updateAttendanceStatus(
  statusId: string,
  updateData: {
    display_name?: string;
    color?: string;
    font_color?: string;
    background_color?: string;
    sort_order?: number;
    is_active?: boolean;
    logic?: string;
    description?: string;
  }
): Promise<{ success: boolean; status?: AttendanceStatusData; error?: string }> {
  try {
    console.log('updateAttendanceStatus 開始:', { statusId, updateData });

    const { data: status, error } = await supabaseAdmin
      .from('attendance_statuses')
      .update(updateData)
      .eq('id', statusId)
      .select()
      .single();

    if (error) {
      console.error('勤怠ステータス更新エラー:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    console.log('updateAttendanceStatus 成功:', status);
    return {
      success: true,
      status,
    };
  } catch (error) {
    console.error('updateAttendanceStatus エラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 勤怠ステータスを削除（論理削除）
 */
export async function deleteAttendanceStatus(
  statusId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('deleteAttendanceStatus 開始:', { statusId });

    const { error } = await supabaseAdmin
      .from('attendance_statuses')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', statusId);

    if (error) {
      console.error('勤怠ステータス削除エラー:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    console.log('deleteAttendanceStatus 成功');
    return {
      success: true,
    };
  } catch (error) {
    console.error('deleteAttendanceStatus エラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
