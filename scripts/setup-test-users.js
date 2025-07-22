require('dotenv').config({ path: '.env.development' });
const { createClient } = require('@supabase/supabase-js');

// 環境変数から設定を取得
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('環境変数チェック:');
console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '設定済み' : '未設定');
console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '設定済み' : '未設定');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('環境変数が設定されていません:');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '設定済み' : '未設定');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '設定済み' : '未設定');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// テストユーザーデータ
const testUsers = [
  {
    email: 'system@timeport.com',
    password: 'Passw0rd!',
    profile: {
      code: 'SA001',
      family_name: 'システム',
      first_name: '管理者',
      family_name_kana: 'システム',
      first_name_kana: 'カンリシャ',
      email: 'system@timeport.com',
      role: 'system-admin',
      is_active: true,
    },
  },
  {
    email: 'admin@timeport.com',
    password: 'Passw0rd!',
    profile: {
      code: 'A001',
      family_name: '管理者',
      first_name: '太郎',
      family_name_kana: 'カンリシャ',
      first_name_kana: 'タロウ',
      email: 'admin@timeport.com',
      role: 'admin',
      is_active: true,
    },
  },
  {
    email: 'member.kyaru@timeport.com',
    password: 'Passw0rd!',
    profile: {
      code: 'B001',
      family_name: '田中',
      first_name: '花子',
      family_name_kana: 'タナカ',
      first_name_kana: 'ハナコ',
      email: 'member.kyaru@timeport.com',
      role: 'member',
      is_active: true,
    },
  },
];

// テスト用勤怠データ
const testAttendanceData = [
  {
    work_date: '2025-01-15',
    clock_in_time: '2025-01-15T09:00:00Z',
    clock_out_time: '2025-01-15T18:00:00Z',
    break_records: [
      { start: '12:00', end: '13:00', type: 'lunch' },
      { start: '15:00', end: '15:15', type: 'break' },
    ],
    actual_work_minutes: 465,
    overtime_minutes: 45,
    late_minutes: 0,
    early_leave_minutes: 0,
    status: 'normal',
    auto_calculated: true,
    description: '通常勤務日',
  },
  {
    work_date: '2025-01-16',
    clock_in_time: '2025-01-16T09:30:00Z',
    clock_out_time: '2025-01-16T18:00:00Z',
    break_records: [{ start: '12:00', end: '13:00', type: 'lunch' }],
    actual_work_minutes: 450,
    overtime_minutes: 30,
    late_minutes: 30,
    early_leave_minutes: 0,
    status: 'late',
    auto_calculated: true,
    description: '遅刻しました',
  },
  {
    work_date: '2025-01-17',
    clock_in_time: '2025-01-17T09:00:00Z',
    clock_out_time: '2025-01-17T17:00:00Z',
    break_records: [{ start: '12:00', end: '13:00', type: 'lunch' }],
    actual_work_minutes: 420,
    overtime_minutes: 0,
    late_minutes: 0,
    early_leave_minutes: 60,
    status: 'early_leave',
    auto_calculated: true,
    description: '早退しました',
  },
];

async function setupTestUsers() {
  console.log('テストユーザーの作成を開始します...');

  for (const userData of testUsers) {
    try {
      console.log(`ユーザー作成中: ${userData.email}`);

      // 1. Supabase Authでユーザーを作成
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          console.log(`ユーザーは既に存在します: ${userData.email}`);
          continue;
        }
        throw authError;
      }

      if (!authData.user) {
        throw new Error('ユーザー作成に失敗しました');
      }

      // 2. ユーザープロフィールを作成
      const { error: profileError } = await supabase.from('user_profiles').insert({
        id: authData.user.id,
        ...userData.profile,
      });

      if (profileError) {
        console.error(`プロフィール作成エラー (${userData.email}):`, profileError);
        // 認証ユーザーを削除
        await supabase.auth.admin.deleteUser(authData.user.id);
        continue;
      }

      console.log(`✅ ユーザー作成完了: ${userData.email}`);
    } catch (error) {
      console.error(`❌ ユーザー作成エラー (${userData.email}):`, error);
    }
  }

  console.log('テストユーザーの作成が完了しました。');
}

async function setupTestAttendanceData() {
  console.log('テスト勤怠データの作成を開始します...');

  try {
    // メンバーユーザーを取得
    const { data: users, error: userError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('role', 'member')
      .limit(1);

    if (userError) {
      console.error('ユーザー取得エラー:', userError);
      return;
    }

    if (!users || users.length === 0) {
      console.log('メンバーユーザーが見つかりません。先にユーザーを作成してください。');
      return;
    }

    const userId = users[0].id;
    console.log(`勤怠データを作成するユーザーID: ${userId}`);

    // 勤怠データを作成
    for (const attendanceData of testAttendanceData) {
      try {
        const { data, error } = await supabase.from('attendances').insert({
          user_id: userId,
          ...attendanceData,
        });

        if (error) {
          if (error.message.includes('duplicate key')) {
            console.log(`勤怠データは既に存在します: ${attendanceData.work_date}`);
            continue;
          }
          console.error(`勤怠データ作成エラー (${attendanceData.work_date}):`, error);
        } else {
          console.log(`✅ 勤怠データ作成完了: ${attendanceData.work_date}`);
        }
      } catch (error) {
        console.error(`❌ 勤怠データ作成エラー (${attendanceData.work_date}):`, error);
      }
    }

    console.log('テスト勤怠データの作成が完了しました。');
  } catch (error) {
    console.error('テスト勤怠データ作成エラー:', error);
  }
}

// スクリプト実行
async function main() {
  await setupTestUsers();
  await setupTestAttendanceData();
}

main().catch(console.error);
