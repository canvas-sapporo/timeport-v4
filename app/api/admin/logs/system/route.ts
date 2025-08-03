import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

export async function GET(request: NextRequest) {
  console.log('=== System Logs API Start ===');
  console.log('Request URL:', request.url);

  try {
    // 認証チェック
    const authHeader = request.headers.get('authorization');
    console.log('Auth header exists:', !!authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('=== System Logs API Error: No auth header ===');
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    console.log('Token length:', token.length);

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);
    console.log('Auth result:', { user: user?.id, error: authError?.message });

    if (authError || !user) {
      console.log('=== System Logs API Error: Auth failed ===');
      return NextResponse.json({ error: '認証に失敗しました' }, { status: 401 });
    }

    // ユーザーの権限チェック
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    console.log('User profile result:', { role: userProfile?.role, error: profileError?.message });

    if (profileError || userProfile?.role !== 'admin') {
      console.log('=== System Logs API Error: No admin role ===');
      return NextResponse.json({ error: '権限がありません' }, { status: 403 });
    }

    // ユーザーが所属する企業IDを取得
    const { data: userGroup, error: groupError } = await supabaseAdmin
      .from('user_groups')
      .select('*')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single();

    console.log('Raw user group data:', userGroup);

    if (groupError || !userGroup) {
      console.log('=== System Logs API Error: No user group found ===');
      return NextResponse.json({ error: 'ユーザーグループ情報が見つかりません' }, { status: 404 });
    }

    // グループIDから企業IDを取得
    const { data: group, error: groupDetailError } = await supabaseAdmin
      .from('groups')
      .select('company_id')
      .eq('id', userGroup.group_id)
      .single();

    console.log('Group detail result:', { group, error: groupDetailError });

    if (groupDetailError || !group?.company_id) {
      console.log('=== System Logs API Error: No company found ===');
      return NextResponse.json({ error: '企業情報が見つかりません' }, { status: 404 });
    }

    const companyId = group.company_id;
    console.log('Company ID extracted:', companyId);

    // クエリパラメータを取得
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const level = searchParams.get('level');
    const feature_name = searchParams.get('feature_name');
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');
    const search = searchParams.get('search');

    console.log('Search params:', {
      page,
      limit,
      level,
      feature_name,
      start_date,
      end_date,
      search,
    });

    // オフセット計算
    const offset = (page - 1) * limit;

    // ベースクエリを構築
    let query = supabaseAdmin
      .from('system_logs')
      .select(
        `
        *,
        companies(id, name),
        user_profiles(id, family_name, first_name)
      `
      )
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    // フィルターを適用
    if (level && level !== 'all') {
      query = query.eq('level', level);
    }

    if (feature_name) {
      query = query.ilike('feature_name', `%${feature_name}%`);
    }

    if (start_date) {
      query = query.gte('created_at', `${start_date}T00:00:00`);
    }

    if (end_date) {
      query = query.lte('created_at', `${end_date}T23:59:59`);
    }

    if (search) {
      query = query.or(
        `message.ilike.%${search}%,path.ilike.%${search}%,feature_name.ilike.%${search}%`
      );
    }

    // データを取得
    console.log('Executing system logs query...');
    const { data: logs, error: logsError, count } = await query.range(offset, offset + limit - 1);

    console.log('System logs query result:', {
      dataCount: logs?.length || 0,
      totalCount: count || 0,
      error: logsError?.message,
    });

    if (logsError) {
      console.error('システムログ取得エラー:', logsError);
      return NextResponse.json({ error: 'システムログの取得に失敗しました' }, { status: 500 });
    }

    // 総ページ数を計算
    const totalPages = Math.ceil((count || 0) / limit);

    console.log('=== System Logs API Success ===');
    return NextResponse.json({
      data: logs || [],
      total: count || 0,
      page,
      limit,
      totalPages,
    });
  } catch (error) {
    console.error('システムログAPI エラー:', error);
    console.log('=== System Logs API Error: Exception ===');
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
