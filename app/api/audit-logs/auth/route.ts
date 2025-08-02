import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const action = searchParams.get('action'); // user_login, user_logout, user_login_failed
    const userId = searchParams.get('user_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    const supabaseAdmin = createAdminClient();

    // クエリを構築
    let query = supabaseAdmin
      .from('audit_logs')
      .select('*')
      .in('action', ['user_login', 'user_logout', 'user_login_failed'])
      .order('created_at', { ascending: false });

    // フィルタリング
    if (action) {
      query = query.eq('action', action);
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    // ページネーション
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: logs, error, count } = await query;

    if (error) {
      console.error('監査ログ取得エラー:', error);
      return NextResponse.json(
        {
          error: '監査ログの取得に失敗しました',
          details: error.message,
        },
        { status: 500 }
      );
    }

    // 統計情報を取得
    const { data: stats } = await supabaseAdmin
      .from('audit_logs')
      .select('action', { count: 'exact' })
      .in('action', ['user_login', 'user_logout', 'user_login_failed']);

    const actionStats = {
      user_login: 0,
      user_logout: 0,
      user_login_failed: 0,
    };

    if (stats) {
      stats.forEach((stat: any) => {
        if (stat.action in actionStats) {
          actionStats[stat.action as keyof typeof actionStats] = stat.count || 0;
        }
      });
    }

    return NextResponse.json({
      logs: logs || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      stats: actionStats,
    });
  } catch (error) {
    console.error('認証監査ログ取得エラー:', error);
    return NextResponse.json(
      {
        error: '認証監査ログの取得に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
