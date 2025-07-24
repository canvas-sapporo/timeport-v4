const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('環境変数が設定されていません');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function resetTodayAttendance() {
  console.log('今日の勤怠データをリセットします...');

  try {
    const today = new Date().toISOString().split('T')[0];
    console.log('対象日付:', today);

    // 今日の勤怠記録を取得
    const { data: attendances, error } = await supabase
      .from('attendances')
      .select('*')
      .eq('work_date', today)
      .is('deleted_at', null);

    if (error) {
      console.error('勤怠記録取得エラー:', error);
      return;
    }

    console.log(`対象レコード数: ${attendances.length}件`);

    if (attendances.length === 0) {
      console.log('今日の勤怠記録はありません');
      return;
    }

    // 今日の勤怠記録を削除
    for (const attendance of attendances) {
      const { error: deleteError } = await supabase
        .from('attendances')
        .delete()
        .eq('id', attendance.id);

      if (deleteError) {
        console.error(`削除エラー (ID: ${attendance.id}):`, deleteError);
      } else {
        console.log(`削除完了 (ID: ${attendance.id})`);
      }
    }

    console.log('今日の勤怠データのリセットが完了しました');
  } catch (error) {
    console.error('全体エラー:', error);
  }
}

// スクリプト実行
resetTodayAttendance()
  .then(() => {
    console.log('リセット処理が完了しました');
    process.exit(0);
  })
  .catch((error) => {
    console.error('スクリプト実行エラー:', error);
    process.exit(1);
  });
