const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('環境変数が設定されていません');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAttendanceData() {
  try {
    console.log('=== 最新の勤怠データ確認 ===');

    // 最新の10件のデータを取得
    const { data: recentData, error: recentError } = await supabase
      .from('attendances')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentError) {
      console.error('データ取得エラー:', recentError);
      return;
    }

    console.log(`最新の${recentData.length}件のデータ:`);
    recentData.forEach((record, index) => {
      console.log(`\nレコード${index + 1}:`);
      console.log(`  ID: ${record.id}`);
      console.log(`  user_id: ${record.user_id}`);
      console.log(`  work_date: ${record.work_date}`);
      console.log(`  clock_records: ${JSON.stringify(record.clock_records, null, 2)}`);
      console.log(`  actual_work_minutes: ${record.actual_work_minutes}`);
      console.log(`  created_at: ${record.created_at}`);
    });

    // 特定の日付（2025-07-24）のデータを確認
    console.log('\n=== 2025-07-24のデータ確認 ===');
    const { data: specificDateData, error: specificDateError } = await supabase
      .from('attendances')
      .select('*')
      .eq('work_date', '2025-07-24')
      .is('deleted_at', null);

    if (specificDateError) {
      console.error('特定日付データ取得エラー:', specificDateError);
      return;
    }

    console.log(`2025-07-24のデータ: ${specificDateData.length}件`);
    specificDateData.forEach((record, index) => {
      console.log(`\nレコード${index + 1}:`);
      console.log(`  ID: ${record.id}`);
      console.log(`  user_id: ${record.user_id}`);
      console.log(`  clock_records: ${JSON.stringify(record.clock_records, null, 2)}`);
    });

    // 全データの件数確認
    console.log('\n=== 全データ件数確認 ===');
    const { count: totalCount, error: countError } = await supabase
      .from('attendances')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null);

    if (countError) {
      console.error('件数取得エラー:', countError);
      return;
    }

    console.log(`全勤怠データ件数: ${totalCount}件`);

    // 企業内ユーザーの確認
    console.log('\n=== 企業内ユーザー確認 ===');

    // 全企業を取得
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('*')
      .is('deleted_at', null);

    if (companiesError) {
      console.error('企業取得エラー:', companiesError);
      return;
    }

    console.log('全企業:', companies);

    // 各企業について、企業内ユーザーを確認
    for (const company of companies || []) {
      console.log(`\n--- 企業: ${company.name} (${company.id}) ---`);

      // 企業内のグループを取得
      const { data: companyGroups, error: groupsError } = await supabase
        .from('groups')
        .select('*')
        .eq('company_id', company.id)
        .is('deleted_at', null);

      if (groupsError) {
        console.error('グループ取得エラー:', groupsError);
        continue;
      }

      console.log(`企業内グループ: ${companyGroups?.length || 0}件`);
      companyGroups?.forEach((group) => {
        console.log(`  - ${group.name} (${group.id})`);
      });

      // 企業内のユーザーグループ関連を取得
      const { data: userGroupsData, error: userGroupsError } = await supabase
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
        .eq('groups.company_id', company.id)
        .is('deleted_at', null);

      if (userGroupsError) {
        console.error('ユーザーグループ取得エラー:', userGroupsError);
        continue;
      }

      const companyUserIds = userGroupsData?.map((ug) => ug.user_id) || [];
      console.log(`企業内ユーザーID: ${companyUserIds.length}件`);
      companyUserIds.forEach((userId) => {
        console.log(`  - ${userId}`);
      });

      // 企業内ユーザーの勤怠データを確認
      if (companyUserIds.length > 0) {
        const { data: companyAttendance, error: attendanceError } = await supabase
          .from('attendances')
          .select('*')
          .in('user_id', companyUserIds)
          .eq('work_date', '2025-07-24')
          .is('deleted_at', null);

        if (attendanceError) {
          console.error('企業内勤怠データ取得エラー:', attendanceError);
        } else {
          console.log(`企業内勤怠データ (2025-07-24): ${companyAttendance?.length || 0}件`);
          companyAttendance?.forEach((record) => {
            console.log(
              `  - ユーザー: ${record.user_id}, 勤務時間: ${record.actual_work_minutes}分`
            );
          });
        }
      }
    }

    // 特定のユーザーの詳細確認
    console.log('\n=== 特定ユーザー詳細確認 ===');
    const targetUserId = '49c83f3d-7c28-4cd8-9fbc-1c2a1c57a076';

    // ユーザープロフィール確認
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', targetUserId)
      .is('deleted_at', null)
      .single();

    if (profileError) {
      console.error('ユーザープロフィール取得エラー:', profileError);
    } else {
      console.log('ユーザープロフィール:', userProfile);
    }

    // ユーザーのグループ所属確認
    const { data: userGroups, error: userGroupsError } = await supabase
      .from('user_groups')
      .select(
        `
        group_id,
        groups(
          id,
          name,
          code,
          company_id
        )
      `
      )
      .eq('user_id', targetUserId)
      .is('deleted_at', null);

    if (userGroupsError) {
      console.error('ユーザーグループ取得エラー:', userGroupsError);
    } else {
      console.log('ユーザーグループ所属:', userGroups);
    }

    // adminユーザーの確認
    console.log('\n=== adminユーザー確認 ===');

    // adminロールのユーザーを取得
    const { data: adminUsers, error: adminUsersError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('role', 'admin')
      .is('deleted_at', null);

    if (adminUsersError) {
      console.error('adminユーザー取得エラー:', adminUsersError);
    } else {
      console.log('adminユーザー:', adminUsers);

      // 各adminユーザーの企業IDを確認
      for (const adminUser of adminUsers || []) {
        console.log(
          `\n--- adminユーザー: ${adminUser.family_name} ${adminUser.first_name} (${adminUser.id}) ---`
        );

        // adminユーザーのグループ所属を確認
        const { data: adminUserGroups, error: adminUserGroupsError } = await supabase
          .from('user_groups')
          .select(
            `
            group_id,
            groups(
              id,
              name,
              code,
              company_id
            )
          `
          )
          .eq('user_id', adminUser.id)
          .is('deleted_at', null);

        if (adminUserGroupsError) {
          console.error('adminユーザーグループ取得エラー:', adminUserGroupsError);
        } else {
          console.log('adminユーザーグループ所属:', adminUserGroups);

          // 企業IDを抽出
          const companyIds =
            adminUserGroups?.map((ug) => ug.groups?.company_id).filter(Boolean) || [];
          console.log('adminユーザーの企業ID:', companyIds);
        }
      }
    }
  } catch (error) {
    console.error('エラー:', error);
  }
}

checkAttendanceData();
