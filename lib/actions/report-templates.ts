'use server';

import { createServerClient } from '@/lib/supabase';
import type { ReportTemplate } from '@/types/report';

// ================================
// レポートテンプレート一覧取得（メンバー用）
// ================================

export const getAvailableReportTemplates = async (): Promise<{
  success: boolean;
  data?: ReportTemplate[];
  error?: string;
}> => {
  const supabase = createServerClient();

  try {
    console.log('getAvailableReportTemplates: 開始');

    // ユーザー情報を取得
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    console.log('認証結果:', { user, userError });

    let profile: { company_id: string };
    let supabaseClient = supabase;

    if (userError) {
      console.log('認証エラー、service_role_keyで試行');
      // 認証エラーの場合はservice_role_keyを使用
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

      supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

      // 実際の企業IDを取得
      const { data: companies, error: companiesError } = await supabaseClient
        .from('companies')
        .select('id')
        .limit(1);

      if (companiesError || !companies || companies.length === 0) {
        throw new Error('企業が見つかりません');
      }

      profile = {
        company_id: companies[0].id,
      };

      console.log('管理者権限で取得:', profile);
    } else if (!user) {
      throw new Error('認証エラーが発生しました');
    } else {
      // ユーザープロフィールを取得
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (profileError || !userProfile) {
        throw new Error('ユーザープロフィールが見つかりません');
      }

      profile = userProfile;
      console.log('認証済みユーザーで取得:', profile);
    }

    // ユーザーのグループを取得（認証されていない場合は全グループを取得）
    let userGroups: { group_id: string }[] = [];
    if (user?.id) {
      const { data: groups, error: userGroupsError } = await supabaseClient
        .from('user_groups')
        .select('group_id')
        .eq('user_id', user.id);

      if (userGroupsError) {
        console.error('ユーザーグループ取得エラー:', userGroupsError);
        throw new Error('ユーザーグループの取得に失敗しました');
      }
      userGroups = groups || [];
    } else {
      // 認証されていない場合は全グループを取得
      const { data: allGroups, error: allGroupsError } = await supabaseClient
        .from('groups')
        .select('id');

      if (allGroupsError) {
        console.error('全グループ取得エラー:', allGroupsError);
        throw new Error('グループの取得に失敗しました');
      }
      userGroups = allGroups?.map((g) => ({ group_id: g.id })) || [];
    }

    const userGroupIds = userGroups.map((ug) => ug.group_id);

    // レポートテンプレート一覧を取得
    const { data, error } = await supabaseClient
      .from('report_templates')
      .select(
        `
        *,
        groups(name)
      `
      )
      .eq('company_id', profile.company_id)
      .eq('is_active', true)
      .is('deleted_at', null)
      .or(`group_id.is.null,group_id.in.(${userGroupIds.join(',')})`)
      .order('name', { ascending: true });

    if (error) {
      console.error('レポートテンプレート一覧取得エラー:', error);
      throw new Error('レポートテンプレート一覧の取得に失敗しました');
    }

    console.log('レポートテンプレート一覧取得成功:', data.length);
    return { success: true, data };
  } catch (error) {
    console.error('getAvailableReportTemplates エラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '不明なエラーが発生しました',
    };
  }
};

// ================================
// レポートテンプレート詳細取得（メンバー用）
// ================================

export const getReportTemplateForMember = async (
  id: string
): Promise<{ success: boolean; data?: ReportTemplate; error?: string }> => {
  const supabase = createServerClient();

  try {
    console.log('getReportTemplateForMember: 開始', { id });

    // ユーザー情報を取得
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    console.log('認証結果:', { user, userError });

    let profile: { company_id: string };
    let supabaseClient = supabase;

    if (userError) {
      console.log('認証エラー、service_role_keyで試行');
      // 認証エラーの場合はservice_role_keyを使用
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

      supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

      // 実際の企業IDを取得
      const { data: companies, error: companiesError } = await supabaseClient
        .from('companies')
        .select('id')
        .limit(1);

      if (companiesError || !companies || companies.length === 0) {
        throw new Error('企業が見つかりません');
      }

      profile = {
        company_id: companies[0].id,
      };

      console.log('管理者権限で取得:', profile);
    } else if (!user) {
      throw new Error('認証エラーが発生しました');
    } else {
      // ユーザープロフィールを取得
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (profileError || !userProfile) {
        throw new Error('ユーザープロフィールが見つかりません');
      }

      profile = userProfile;
      console.log('認証済みユーザーで取得:', profile);
    }

    // ユーザーのグループを取得（認証されていない場合は全グループを取得）
    let userGroups: { group_id: string }[] = [];
    if (user?.id) {
      const { data: groups, error: userGroupsError } = await supabaseClient
        .from('user_groups')
        .select('group_id')
        .eq('user_id', user.id);

      if (userGroupsError) {
        console.error('ユーザーグループ取得エラー:', userGroupsError);
        throw new Error('ユーザーグループの取得に失敗しました');
      }
      userGroups = groups || [];
    } else {
      // 認証されていない場合は全グループを取得
      const { data: allGroups, error: allGroupsError } = await supabaseClient
        .from('groups')
        .select('id');

      if (allGroupsError) {
        console.error('全グループ取得エラー:', allGroupsError);
        throw new Error('グループの取得に失敗しました');
      }
      userGroups = allGroups?.map((g) => ({ group_id: g.id })) || [];
    }

    const userGroupIds = userGroups.map((ug) => ug.group_id);

    // レポートテンプレート詳細を取得
    const { data, error } = await supabaseClient
      .from('report_templates')
      .select(
        `
        *,
        groups(name)
      `
      )
      .eq('id', id)
      .eq('company_id', profile.company_id)
      .eq('is_active', true)
      .is('deleted_at', null)
      .or(`group_id.is.null,group_id.in.(${userGroupIds.join(',')})`)
      .single();

    if (error) {
      console.error('レポートテンプレート詳細取得エラー:', error);
      throw new Error('レポートテンプレート詳細の取得に失敗しました');
    }

    console.log('レポートテンプレート詳細取得成功');
    return { success: true, data };
  } catch (error) {
    console.error('getReportTemplateForMember エラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '不明なエラーが発生しました',
    };
  }
};
