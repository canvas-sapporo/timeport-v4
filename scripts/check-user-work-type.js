const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('環境変数が設定されていません');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkAndSetUserWorkType() {
  try {
    console.log('ユーザーの勤務タイプ確認を開始します...');

    // 1. 勤務タイプ一覧を取得
    const { data: workTypes, error: workTypesError } = await supabase
      .from('work_types')
      .select('id, name, code')
      .is('deleted_at', null)
      .order('display_order', { ascending: true });

    if (workTypesError) {
      console.error('勤務タイプ取得エラー:', workTypesError);
      return;
    }

    console.log('利用可能な勤務タイプ:');
    workTypes.forEach((wt) => {
      console.log(`- ${wt.name} (${wt.code}) - ID: ${wt.id}`);
    });

    // 2. ユーザープロフィール一覧を取得
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select('id, code, family_name, first_name, current_work_type_id')
      .is('deleted_at', null)
      .is('is_active', true);

    if (usersError) {
      console.error('ユーザー取得エラー:', usersError);
      return;
    }

    console.log('\nユーザーの勤務タイプ状況:');
    users.forEach((user) => {
      const workType = workTypes.find((wt) => wt.id === user.current_work_type_id);
      console.log(
        `- ${user.family_name} ${user.first_name} (${user.code}): ${workType ? workType.name : '未設定'}`
      );
    });

    // 3. 勤務タイプが未設定のユーザーを確認
    const usersWithoutWorkType = users.filter((user) => !user.current_work_type_id);

    if (usersWithoutWorkType.length > 0) {
      console.log(`\n勤務タイプが未設定のユーザー: ${usersWithoutWorkType.length}人`);

      // デフォルトの勤務タイプを設定（最初の勤務タイプを使用）
      if (workTypes.length > 0) {
        const defaultWorkType = workTypes[0];
        console.log(`デフォルト勤務タイプとして "${defaultWorkType.name}" を設定します...`);

        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({ current_work_type_id: defaultWorkType.id })
          .in(
            'id',
            usersWithoutWorkType.map((u) => u.id)
          );

        if (updateError) {
          console.error('勤務タイプ設定エラー:', updateError);
        } else {
          console.log('勤務タイプの設定が完了しました');
        }
      }
    } else {
      console.log('\nすべてのユーザーに勤務タイプが設定されています');
    }
  } catch (error) {
    console.error('エラー:', error);
  }
}

checkAndSetUserWorkType();
