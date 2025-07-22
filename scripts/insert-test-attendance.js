const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('環境変数が設定されていません');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function insertTestAttendance() {
  try {
    console.log('テスト用勤怠データの挿入を開始します...');

    // テスト用ユーザーID（ペコリーヌのID）
    const userId = '05fb54d7-f18c-460b-8642-52ff224988f6';

    // 勤務タイプIDを取得
    const { data: workTypes, error: workTypesError } = await supabase
      .from('work_types')
      .select('id')
      .is('deleted_at', null)
      .limit(1);

    if (workTypesError || !workTypes || workTypes.length === 0) {
      console.error('勤務タイプの取得に失敗しました');
      return;
    }

    const workTypeId = workTypes[0].id;
    console.log('使用する勤務タイプID:', workTypeId);

    // 2025年7月のテストデータを作成
    const testData = [];
    const year = 2025;
    const month = 7;

    for (let day = 1; day <= 31; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();

      // 土日はスキップ
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        continue;
      }

      // 平日のみ勤怠データを作成
      const workDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

      // 朝の勤務（9:00-17:00）
      testData.push({
        user_id: userId,
        work_date: workDate,
        work_type_id: workTypeId,
        clock_in_time: `${workDate}T09:00:00.000Z`,
        clock_out_time: `${workDate}T17:00:00.000Z`,
        break_records: [{ start: '12:00', end: '13:00', type: 'lunch' }],
        actual_work_minutes: 420, // 7時間
        overtime_minutes: 0,
        late_minutes: 0,
        early_leave_minutes: 0,
        status: 'normal',
        auto_calculated: false,
        description: 'テストデータ',
        approved_by: null,
        approved_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      });

      // 夜の勤務（18:00-22:00）- 一部の日のみ
      if (day % 3 === 0) {
        // 3日おきに夜勤
        testData.push({
          user_id: userId,
          work_date: workDate,
          work_type_id: workTypeId,
          clock_in_time: `${workDate}T18:00:00.000Z`,
          clock_out_time: `${workDate}T22:00:00.000Z`,
          break_records: [],
          actual_work_minutes: 240, // 4時間
          overtime_minutes: 240, // 残業4時間
          late_minutes: 0,
          early_leave_minutes: 0,
          status: 'normal',
          auto_calculated: false,
          description: '夜勤テストデータ',
          approved_by: null,
          approved_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null,
        });
      }
    }

    console.log(`作成するテストデータ数: ${testData.length}件`);

    // データを挿入
    const { data, error } = await supabase.from('attendances').insert(testData).select();

    if (error) {
      console.error('データ挿入エラー:', error);
    } else {
      console.log('テストデータの挿入が完了しました');
      console.log('挿入されたデータ数:', data?.length || 0);
    }
  } catch (error) {
    console.error('エラー:', error);
  }
}

insertTestAttendance();
