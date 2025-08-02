import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');

    const supabase = createAdminClient();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // システムログ統計
    const { data: systemLogs, error: systemError } = await supabase
      .from('system_logs')
      .select('level, created_date, response_time_ms')
      .gte('created_date', startDate.toISOString().split('T')[0]);

    if (systemError) {
      return NextResponse.json(
        { error: `Failed to fetch system log stats: ${systemError.message}` },
        { status: 500 }
      );
    }

    // 監査ログ統計
    const { data: auditLogs, error: auditError } = await supabase
      .from('audit_logs')
      .select('created_date')
      .gte('created_date', startDate.toISOString().split('T')[0]);

    if (auditError) {
      return NextResponse.json(
        { error: `Failed to fetch audit log stats: ${auditError.message}` },
        { status: 500 }
      );
    }

    // 統計計算
    const totalCount = (systemLogs?.length || 0) + (auditLogs?.length || 0);

    const levelCounts: Record<string, number> = {};
    const dailyCounts: Record<string, number> = {};
    let errorCount = 0;
    let totalResponseTime = 0;
    let responseTimeCount = 0;

    // システムログ統計
    systemLogs?.forEach((log) => {
      // レベル別カウント
      levelCounts[log.level] = (levelCounts[log.level] || 0) + 1;

      // エラーカウント
      if (log.level === 'error' || log.level === 'fatal') {
        errorCount++;
      }

      // レスポンス時間
      if (log.response_time_ms) {
        totalResponseTime += log.response_time_ms;
        responseTimeCount++;
      }

      // 日別カウント
      const date = log.created_date;
      dailyCounts[date] = (dailyCounts[date] || 0) + 1;
    });

    // 監査ログ統計
    auditLogs?.forEach((log) => {
      const date = log.created_date;
      dailyCounts[date] = (dailyCounts[date] || 0) + 1;
    });

    // 日別カウントを配列に変換
    const dailyCountsArray = Object.entries(dailyCounts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      total_count: totalCount,
      level_counts: levelCounts,
      daily_counts: dailyCountsArray,
      error_rate: totalCount > 0 ? (errorCount / totalCount) * 100 : 0,
      avg_response_time: responseTimeCount > 0 ? totalResponseTime / responseTimeCount : undefined,
    });
  } catch (error) {
    console.error('Error fetching log stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
