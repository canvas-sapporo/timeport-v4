const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('環境変数が設定されていません');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

// 勤務時間計算関数
const calculateWorkTime = async (clockInTime, clockOutTime, breakRecords, workTypeId) => {
  const clockIn = new Date(clockInTime);
  const clockOut = new Date(clockOutTime);

  // 総勤務時間（分）
  const totalMinutes = Math.floor((clockOut.getTime() - clockIn.getTime()) / 60000);

  // 休憩時間（分）
  const breakMinutes = breakRecords.reduce((total, br) => {
    if (br.break_start && br.break_end) {
      const breakStart = new Date(br.break_start);
      const breakEnd = new Date(br.break_end);
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
      const { data: workType, error } = await supabase
        .from('work_types')
        .select('overtime_threshold_minutes')
        .eq('id', workTypeId)
        .single();

      if (!error && workType?.overtime_threshold_minutes) {
        overtimeThresholdMinutes = workType.overtime_threshold_minutes;
      }
    } catch (error) {
      console.warn('work_type取得エラー:', error);
    }
  }

  // 残業時間（分）
  const overtimeMinutes = Math.max(0, actualWorkMinutes - overtimeThresholdMinutes);

  return { actualWorkMinutes, overtimeMinutes };
};

async function recalculateOvertime() {
  console.log('残業時間の再計算を開始します...');

  try {
    // 退勤済みの勤怠記録を取得
    const { data: attendances, error } = await supabase
      .from('attendances')
      .select('*')
      .not('clock_records', 'is', null)
      .is('deleted_at', null);

    if (error) {
      console.error('勤怠記録取得エラー:', error);
      return;
    }

    console.log(`処理対象: ${attendances.length}件の勤怠記録`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const attendance of attendances) {
      try {
        const clockRecords = attendance.clock_records || [];

        // 完了したセッション（出勤・退勤両方がある）を処理
        const completedSessions = clockRecords.filter(
          (session) => session.in_time && session.out_time
        );

        if (completedSessions.length === 0) {
          continue;
        }

        // 最新の完了セッションを使用
        const latestSession = completedSessions[completedSessions.length - 1];

        const { actualWorkMinutes, overtimeMinutes } = await calculateWorkTime(
          latestSession.in_time,
          latestSession.out_time,
          latestSession.breaks || [],
          attendance.work_type_id
        );

        // データベースを更新
        const { error: updateError } = await supabase
          .from('attendances')
          .update({
            actual_work_minutes: actualWorkMinutes,
            overtime_minutes: overtimeMinutes,
          })
          .eq('id', attendance.id);

        if (updateError) {
          console.error(`更新エラー (ID: ${attendance.id}):`, updateError);
          errorCount++;
        } else {
          console.log(
            `更新完了 (ID: ${attendance.id}): 勤務時間=${actualWorkMinutes}分, 残業時間=${overtimeMinutes}分`
          );
          updatedCount++;
        }
      } catch (err) {
        console.error(`処理エラー (ID: ${attendance.id}):`, err);
        errorCount++;
      }
    }

    console.log('\n=== 処理完了 ===');
    console.log(`更新成功: ${updatedCount}件`);
    console.log(`エラー: ${errorCount}件`);
  } catch (error) {
    console.error('全体エラー:', error);
  }
}

// スクリプト実行
recalculateOvertime()
  .then(() => {
    console.log('残業時間再計算が完了しました');
    process.exit(0);
  })
  .catch((error) => {
    console.error('スクリプト実行エラー:', error);
    process.exit(1);
  });
