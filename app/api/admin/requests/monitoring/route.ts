import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase';
import { logSystem } from '@/lib/utils/log-system';

/**
 * 申請管理の監視データを取得
 */
export async function GET(request: NextRequest) {
  try {
    // システムログ: 開始
    await logSystem('info', '申請監視データ取得開始', {
      feature_name: 'request_monitoring',
      action_type: 'get_monitoring_data',
    });

    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // 基本統計データ
    const statsQuery = supabase
      .from('requests')
      .select('status_id, created_at', { count: 'exact' })
      .is('deleted_at', null);

    if (companyId) {
      // 企業IDでフィルタリング（ユーザーグループ経由）
      statsQuery.in(
        'user_id',
        supabase
          .from('user_groups')
          .select('user_id')
          .eq('groups.company_id', companyId)
          .is('deleted_at', null)
      );
    }

    if (startDate) {
      statsQuery.gte('created_at', startDate);
    }

    if (endDate) {
      statsQuery.lte('created_at', endDate);
    }

    const { data: requests, error: statsError } = await statsQuery;

    if (statsError) {
      // システムログ: エラー
      await logSystem('error', '申請監視データ取得エラー', {
        feature_name: 'request_monitoring',
        action_type: 'get_monitoring_data',
        error_message: statsError.message,
      });

      return NextResponse.json({ error: '統計データの取得に失敗しました' }, { status: 500 });
    }

    // ステータス別統計
    const statusStats = await supabase
      .from('statuses')
      .select('id, code, name, color')
      .eq('category', 'request');

    // 申請フォーム別統計
    const formStatsQuery = supabase
      .from('request_forms')
      .select('id, name, category, is_active')
      .is('deleted_at', null);

    const { data: forms, error: formsError } = await formStatsQuery;

    if (formsError) {
      // システムログ: エラー
      await logSystem('error', '申請フォーム統計取得エラー', {
        feature_name: 'request_monitoring',
        action_type: 'get_monitoring_data',
        error_message: formsError.message,
      });
    }

    // 最近の申請（最新10件）
    const recentRequestsQuery = supabase
      .from('requests')
      .select(
        `
        id,
        title,
        created_at,
        status_id,
        user_id,
        request_form_id,
        statuses!requests_status_id_fkey(code, name, color),
        request_forms!requests_request_form_id_fkey(name, category)
      `
      )
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(10);

    if (companyId) {
      recentRequestsQuery.in(
        'user_id',
        supabase
          .from('user_groups')
          .select('user_id')
          .eq('groups.company_id', companyId)
          .is('deleted_at', null)
      );
    }

    const { data: recentRequests, error: recentError } = await recentRequestsQuery;

    if (recentError) {
      // システムログ: エラー
      await logSystem('error', '最近の申請取得エラー', {
        feature_name: 'request_monitoring',
        action_type: 'get_monitoring_data',
        error_message: recentError.message,
      });
    }

    // 承認待ち申請数
    const pendingQuery = supabase
      .from('requests')
      .select('id', { count: 'exact' })
      .eq('statuses.code', 'pending')
      .is('deleted_at', null);

    if (companyId) {
      pendingQuery.in(
        'user_id',
        supabase
          .from('user_groups')
          .select('user_id')
          .eq('groups.company_id', companyId)
          .is('deleted_at', null)
      );
    }

    const { count: pendingCount, error: pendingError } = await pendingQuery;

    if (pendingError) {
      // システムログ: エラー
      await logSystem('error', '承認待ち申請数取得エラー', {
        feature_name: 'request_monitoring',
        action_type: 'get_monitoring_data',
        error_message: pendingError.message,
      });
    }

    // システムログ: 成功
    await logSystem('info', '申請監視データ取得成功', {
      feature_name: 'request_monitoring',
      action_type: 'get_monitoring_data',
      metadata: {
        total_requests: requests?.length || 0,
        pending_count: pendingCount || 0,
        recent_requests_count: recentRequests?.length || 0,
        forms_count: forms?.length || 0,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        total_requests: requests?.length || 0,
        pending_count: pendingCount || 0,
        status_stats: statusStats.data || [],
        form_stats: forms || [],
        recent_requests: recentRequests || [],
        date_range: {
          start_date: startDate,
          end_date: endDate,
        },
      },
    });
  } catch (error) {
    // システムログ: 予期しないエラー
    await logSystem('error', '申請監視データ取得時の予期しないエラー', {
      feature_name: 'request_monitoring',
      action_type: 'get_monitoring_data',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      error_stack: error instanceof Error ? error.stack : undefined,
    });

    console.error('申請監視データ取得エラー:', error);
    return NextResponse.json({ error: '監視データの取得に失敗しました' }, { status: 500 });
  }
}
