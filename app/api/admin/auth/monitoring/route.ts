import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase';
import { logSystem } from '@/lib/utils/log-system';

/**
 * 認証監視データを取得
 */
export async function GET(request: NextRequest) {
  try {
    // システムログ: 開始
    await logSystem('info', '認証監視データ取得開始', {
      feature_name: 'auth_monitoring',
      action_type: 'get_monitoring_data',
    });

    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // 認証ログの基本統計
    const authLogsQuery = supabase
      .from('audit_logs')
      .select('action, created_at, user_id', { count: 'exact' })
      .in('action', ['user_login', 'user_login_failed', 'user_logout']);

    if (companyId) {
      // 企業IDでフィルタリング（ユーザー経由）
      const { data: userGroupUsers } = await supabase
        .from('user_groups')
        .select('user_id')
        .eq('groups.company_id', companyId)
        .is('deleted_at', null);

      if (userGroupUsers && userGroupUsers.length > 0) {
        const userIds = userGroupUsers.map((ug) => ug.user_id);
        authLogsQuery.in('user_id', userIds);
      }
    }

    if (startDate) {
      authLogsQuery.gte('created_at', startDate);
    }

    if (endDate) {
      authLogsQuery.lte('created_at', endDate);
    }

    const { data: authLogs, error: authLogsError } = await authLogsQuery;

    if (authLogsError) {
      // システムログ: エラー
      await logSystem('error', '認証ログ取得エラー', {
        feature_name: 'auth_monitoring',
        action_type: 'get_monitoring_data',
        error_message: authLogsError.message,
      });

      return NextResponse.json({ error: '認証ログの取得に失敗しました' }, { status: 500 });
    }

    // ログイン成功・失敗・ログアウトの統計
    const loginSuccess = authLogs?.filter((log) => log.action === 'user_login').length || 0;
    const loginFailed = authLogs?.filter((log) => log.action === 'user_login_failed').length || 0;
    const logoutCount = authLogs?.filter((log) => log.action === 'user_logout').length || 0;

    // 最近の認証ログ（最新20件）
    const recentAuthLogsQuery = supabase
      .from('audit_logs')
      .select(
        `
        id,
        action,
        created_at,
        user_id,
        details,
        ip_address,
        user_agent
      `
      )
      .in('action', ['user_login', 'user_login_failed', 'user_logout'])
      .order('created_at', { ascending: false })
      .limit(20);

    if (companyId) {
      const { data: userGroupUsers } = await supabase
        .from('user_groups')
        .select('user_id')
        .eq('groups.company_id', companyId)
        .is('deleted_at', null);

      if (userGroupUsers && userGroupUsers.length > 0) {
        const userIds = userGroupUsers.map((ug) => ug.user_id);
        recentAuthLogsQuery.in('user_id', userIds);
      }
    }

    const { data: recentAuthLogs, error: recentError } = await recentAuthLogsQuery;

    if (recentError) {
      // システムログ: エラー
      await logSystem('error', '最近の認証ログ取得エラー', {
        feature_name: 'auth_monitoring',
        action_type: 'get_monitoring_data',
        error_message: recentError.message,
      });
    }

    // アクティブユーザー数（過去24時間でログインしたユーザー）
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const activeUsersQuery = supabase
      .from('audit_logs')
      .select('user_id', { count: 'exact' })
      .eq('action', 'user_login')
      .gte('created_at', yesterday.toISOString());

    if (companyId) {
      const { data: userGroupUsers } = await supabase
        .from('user_groups')
        .select('user_id')
        .eq('groups.company_id', companyId)
        .is('deleted_at', null);

      if (userGroupUsers && userGroupUsers.length > 0) {
        const userIds = userGroupUsers.map((ug) => ug.user_id);
        activeUsersQuery.in('user_id', userIds);
      }
    }

    const { count: activeUsersCount, error: activeUsersError } = await activeUsersQuery;

    if (activeUsersError) {
      // システムログ: エラー
      await logSystem('error', 'アクティブユーザー数取得エラー', {
        feature_name: 'auth_monitoring',
        action_type: 'get_monitoring_data',
        error_message: activeUsersError.message,
      });
    }

    // 失敗したログイン試行の詳細（最新10件）
    const failedLoginsQuery = supabase
      .from('audit_logs')
      .select(
        `
        id,
        created_at,
        user_id,
        details,
        ip_address,
        user_agent
      `
      )
      .eq('action', 'user_login_failed')
      .order('created_at', { ascending: false })
      .limit(10);

    if (companyId) {
      const { data: userGroupUsers } = await supabase
        .from('user_groups')
        .select('user_id')
        .eq('groups.company_id', companyId)
        .is('deleted_at', null);

      if (userGroupUsers && userGroupUsers.length > 0) {
        const userIds = userGroupUsers.map((ug) => ug.user_id);
        failedLoginsQuery.in('user_id', userIds);
      }
    }

    const { data: failedLogins, error: failedLoginsError } = await failedLoginsQuery;

    if (failedLoginsError) {
      // システムログ: エラー
      await logSystem('error', '失敗ログイン詳細取得エラー', {
        feature_name: 'auth_monitoring',
        action_type: 'get_monitoring_data',
        error_message: failedLoginsError.message,
      });
    }

    // システムログ: 成功
    await logSystem('info', '認証監視データ取得成功', {
      feature_name: 'auth_monitoring',
      action_type: 'get_monitoring_data',
      metadata: {
        total_auth_logs: authLogs?.length || 0,
        login_success_count: loginSuccess,
        login_failed_count: loginFailed,
        logout_count: logoutCount,
        active_users_count: activeUsersCount || 0,
        recent_logs_count: recentAuthLogs?.length || 0,
        failed_logins_count: failedLogins?.length || 0,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        total_auth_logs: authLogs?.length || 0,
        login_success_count: loginSuccess,
        login_failed_count: loginFailed,
        logout_count: logoutCount,
        active_users_count: activeUsersCount || 0,
        recent_auth_logs: recentAuthLogs || [],
        failed_logins: failedLogins || [],
        date_range: {
          start_date: startDate,
          end_date: endDate,
        },
      },
    });
  } catch (error) {
    // システムログ: 予期しないエラー
    await logSystem('error', '認証監視データ取得時の予期しないエラー', {
      feature_name: 'auth_monitoring',
      action_type: 'get_monitoring_data',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      error_stack: error instanceof Error ? error.stack : undefined,
    });

    console.error('認証監視データ取得エラー:', error);
    return NextResponse.json({ error: '監視データの取得に失敗しました' }, { status: 500 });
  }
}
