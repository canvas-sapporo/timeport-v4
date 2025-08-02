import { NextRequest, NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const userId = searchParams.get('user_id');
    const search = searchParams.get('search');

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
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ユーザープロファイルを取得
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // admin権限チェック
    if (userProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // ユーザーのグループと企業IDを取得
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

    if (userGroupsError || !userGroups || userGroups.length === 0) {
      return NextResponse.json({ error: 'User groups not found' }, { status: 404 });
    }

    // 企業IDを取得（最初のグループの企業IDを使用）
    const companyId = userGroups[0]?.groups?.company_id;
    if (!companyId) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

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
      `
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

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: `Failed to fetch audit logs: ${error.message}` },
        { status: 500 }
      );
    }

    // CSVヘッダー
    const csvHeaders = [
      'ID',
      '日時',
      'ユーザーID',
      'ユーザー名',
      'アクション',
      'ターゲットタイプ',
      'ターゲットID',
      'IPアドレス',
      'ユーザーエージェント',
      '詳細情報',
    ];

    // CSVデータ
    const csvRows = [csvHeaders.join(',')];

    if (data) {
      data.forEach((log) => {
        const userName = log.user_profiles
          ? `${log.user_profiles.family_name} ${log.user_profiles.first_name}`
          : log.user_id;

        const details = log.details ? JSON.stringify(log.details) : '';

        const row = [
          log.id,
          log.created_at,
          log.user_id,
          `"${userName}"`,
          log.action,
          log.target_type,
          log.target_id,
          log.ip_address,
          `"${log.user_agent}"`,
          `"${details}"`,
        ];

        csvRows.push(row.join(','));
      });
    }

    const csvContent = csvRows.join('\n');

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
