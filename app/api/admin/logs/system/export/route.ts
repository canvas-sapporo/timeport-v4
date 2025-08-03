import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { format } from 'date-fns';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: '認証に失敗しました' }, { status: 401 });
    }

    // ユーザーの権限チェック
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || userProfile?.role !== 'admin') {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 });
    }

    // ユーザーが所属する企業IDを取得
    const { data: userGroup, error: groupError } = await supabaseAdmin
      .from('user_groups')
      .select('groups(company_id)')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single();

    if (groupError || !userGroup?.groups?.[0]?.company_id) {
      return NextResponse.json({ error: '企業情報が見つかりません' }, { status: 404 });
    }

    const companyId = userGroup.groups[0].company_id;

    // クエリパラメータを取得
    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level');
    const feature_name = searchParams.get('feature_name');
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');
    const search = searchParams.get('search');

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

    // データを取得（最大10000件）
    const { data: logs, error: logsError } = await query.limit(10000);

    if (logsError) {
      console.error('システムログエクスポートエラー:', logsError);
      return NextResponse.json(
        { error: 'システムログのエクスポートに失敗しました' },
        { status: 500 }
      );
    }

    // CSVヘッダー
    const headers = [
      '日時',
      'レベル',
      '機能名',
      'アクションタイプ',
      'メソッド',
      'ステータスコード',
      'メッセージ',
      'ユーザー',
      'パス',
      'レスポンス時間(ms)',
      'IPアドレス',
      'ユーザーエージェント',
    ];

    // CSVデータを生成
    const csvData =
      logs?.map((log) => [
        format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
        log.level,
        log.feature_name || '',
        log.action_type || '',
        log.method || '',
        log.status_code || '',
        (log.metadata?.message || log.message || '').replace(/"/g, '""'),
        log.user_profiles ? `${log.user_profiles.family_name} ${log.user_profiles.first_name}` : '',
        log.path || '',
        log.response_time_ms || '',
        log.ip_address || '',
        (log.user_agent || '').replace(/"/g, '""'),
      ]) || [];

    // CSVコンテンツを生成
    const csvContent = [
      headers.join(','),
      ...csvData.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    // レスポンスを返す
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="system-logs-${format(new Date(), 'yyyy-MM-dd-HH-mm')}.csv"`,
      },
    });
  } catch (error) {
    console.error('システムログエクスポートAPI エラー:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
