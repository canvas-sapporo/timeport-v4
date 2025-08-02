import { NextRequest, NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    console.log('=== Audit Logs API Start ===');
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const userId = searchParams.get('user_id');
    const search = searchParams.get('search');

    console.log('Search params:', { page, limit, startDate, endDate, userId, search });

    const supabase = createServerSupabaseClient();

    // Authorizationヘッダーからトークンを取得
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const token = authHeader.substring(7);

    // トークンからユーザー情報を取得
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);
    console.log('User auth result:', { user: user?.id, error: userError });

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ユーザープロファイルを取得
    console.log('Fetching user profile for user ID:', user.id);

    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    console.log('User profile result:', {
      userProfile: userProfile
        ? {
            role: userProfile.role,
          }
        : null,
      error: profileError,
    });

    if (profileError || !userProfile) {
      console.error('User profile error:', profileError);
      return NextResponse.json(
        {
          error: 'User profile not found',
          details: profileError,
        },
        { status: 404 }
      );
    }

    // admin権限チェック
    if (userProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // ユーザーのグループと企業IDを取得
    console.log('Fetching user groups for user ID:', user.id);

    const { data: userGroups, error: userGroupsError } = await supabase
      .from('user_groups')
      .select(
        `
        groups!user_groups_group_id_fkey(
          company_id
        )
      `
      )
      .eq('user_id', user.id);

    console.log('User groups result:', {
      userGroups: userGroups,
      error: userGroupsError,
    });

    if (userGroupsError || !userGroups || userGroups.length === 0) {
      console.error('User groups error:', userGroupsError);
      return NextResponse.json({ error: 'User groups not found' }, { status: 404 });
    }

    // 企業IDを取得（最初のグループの企業IDを使用）
    const companyId = userGroups[0]?.groups?.company_id;
    console.log('Company ID extracted:', companyId);

    if (!companyId) {
      console.error('Company ID not found in user groups');
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    console.log('Building audit logs query for company ID:', companyId);

    // Service Role Keyを使用しているため、RLSポリシーを手動で適用
    let query = supabase
      .from('audit_logs')
      .select(
        `
        *,
        user_profiles!audit_logs_user_id_fkey(
          id,
          family_name,
          first_name
        )
      `,
        { count: 'exact' }
      )
      .eq('company_id', companyId) // adminユーザーの企業IDでフィルタリング
      .order('created_at', { ascending: false });

    // フィルター適用
    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (search) {
      query = query.or(`action.ilike.%${search}%,target_type.ilike.%${search}%`);
    }

    // actionフィルターの処理（'all'の場合は除外）
    const action = searchParams.get('action');
    if (action && action !== 'all') {
      query = query.eq('action', action);
    }

    // ページネーション
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    console.log('Executing audit logs query...');
    const { data, error, count } = await query;

    console.log('Audit logs query result:', {
      dataCount: data?.length || 0,
      totalCount: count,
      error: error?.message,
    });

    if (error) {
      console.error('Audit logs fetch error:', error);
      return NextResponse.json(
        { error: `Failed to fetch audit logs: ${error.message}`, details: error },
        { status: 500 }
      );
    }

    console.log('=== Audit Logs API Success ===');
    return NextResponse.json({
      data: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('=== Audit Logs API Error ===');
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
