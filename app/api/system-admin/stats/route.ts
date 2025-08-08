import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 日本時間の本日の開始と終了を取得
function getJSTTodayRange() {
  const now = new Date();
  // 日本時間に変換（UTC+9）
  const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  
  // 本日の開始（日本時間 00:00:00）
  const todayStart = new Date(jstNow);
  todayStart.setHours(0, 0, 0, 0);
  
  // 本日の終了（日本時間 23:59:59）
  const todayEnd = new Date(jstNow);
  todayEnd.setHours(23, 59, 59, 999);
  
  // UTCに変換
  const todayStartUTC = new Date(todayStart.getTime() - 9 * 60 * 60 * 1000);
  const todayEndUTC = new Date(todayEnd.getTime() - 9 * 60 * 60 * 1000);
  
  return { todayStart: todayStartUTC, todayEnd: todayEndUTC };
}

// 日本時間の前日の開始と終了を取得
function getJSTYesterdayRange() {
  const now = new Date();
  // 日本時間に変換（UTC+9）
  const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  
  // 前日の開始（日本時間 00:00:00）
  const yesterdayStart = new Date(jstNow);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  yesterdayStart.setHours(0, 0, 0, 0);
  
  // 前日の終了（日本時間 23:59:59）
  const yesterdayEnd = new Date(jstNow);
  yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
  yesterdayEnd.setHours(23, 59, 59, 999);
  
  // UTCに変換
  const yesterdayStartUTC = new Date(yesterdayStart.getTime() - 9 * 60 * 60 * 1000);
  const yesterdayEndUTC = new Date(yesterdayEnd.getTime() - 9 * 60 * 60 * 1000);
  
  return { yesterdayStart: yesterdayStartUTC, yesterdayEnd: yesterdayEndUTC };
}

// 期間に応じた日付範囲を取得
function getDateRangeForPeriod(period: string) {
  const now = new Date();
  const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  
  let startDate: Date;
  
  switch (period) {
    case '1month':
      startDate = new Date(jstNow.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '3months':
      startDate = new Date(jstNow.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case '6months':
      startDate = new Date(jstNow.getTime() - 180 * 24 * 60 * 60 * 1000);
      break;
    case '1year':
      startDate = new Date(jstNow.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    case '3years':
      startDate = new Date(jstNow.getTime() - 3 * 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(jstNow.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  
  // UTCに変換
  const startDateUTC = new Date(startDate.getTime() - 9 * 60 * 60 * 1000);
  const endDateUTC = new Date(now.getTime() - 9 * 60 * 60 * 1000);
  
  return { startDate: startDateUTC, endDate: endDateUTC };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const period = searchParams.get('period');

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    if (type === 'counts') {
      // ログ数を取得
      const { todayStart, todayEnd } = getJSTTodayRange();
      const { yesterdayStart, yesterdayEnd } = getJSTYesterdayRange();

      // システムエラーログ数を取得
      const { count: todayErrorCount, error: todayErrorError } = await supabaseAdmin
        .from('system_logs')
        .select('*', { count: 'exact', head: true })
        .in('level', ['error', 'fatal'])
        .gte('created_at', todayStart.toISOString())
        .lte('created_at', todayEnd.toISOString());

      const { count: yesterdayErrorCount, error: yesterdayErrorError } = await supabaseAdmin
        .from('system_logs')
        .select('*', { count: 'exact', head: true })
        .in('level', ['error', 'fatal'])
        .gte('created_at', yesterdayStart.toISOString())
        .lte('created_at', yesterdayEnd.toISOString());

      // 監査ログ数を取得
      const { count: todayAuditCount, error: todayAuditError } = await supabaseAdmin
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart.toISOString())
        .lte('created_at', todayEnd.toISOString());

      const { count: yesterdayAuditCount, error: yesterdayAuditError } = await supabaseAdmin
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', yesterdayStart.toISOString())
        .lte('created_at', yesterdayEnd.toISOString());

      // エラーログの変化率を計算
      let errorChange = 0;
      if (yesterdayErrorCount && yesterdayErrorCount > 0) {
        errorChange = Math.round(((todayErrorCount || 0) - yesterdayErrorCount) / yesterdayErrorCount * 100);
      } else if (todayErrorCount && todayErrorCount > 0) {
        errorChange = 100;
      }

      // 監査ログの変化率を計算
      let auditChange = 0;
      if (yesterdayAuditCount && yesterdayAuditCount > 0) {
        auditChange = Math.round(((todayAuditCount || 0) - yesterdayAuditCount) / yesterdayAuditCount * 100);
      } else if (todayAuditCount && todayAuditCount > 0) {
        auditChange = 100;
      }

      return NextResponse.json({
        errorLogs: {
          todayCount: todayErrorCount || 0,
          yesterdayCount: yesterdayErrorCount || 0,
          change: errorChange
        },
        auditLogs: {
          todayCount: todayAuditCount || 0,
          yesterdayCount: yesterdayAuditCount || 0,
          change: auditChange
        }
      });
    } else if (type === 'graph' && period) {
      // グラフデータを取得
      const { startDate, endDate } = getDateRangeForPeriod(period);

      // システムエラーログを取得
      const { data: errorLogs, error: errorLogsError } = await supabaseAdmin
        .from('system_logs')
        .select('created_at, level')
        .in('level', ['error', 'fatal'])
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });

      if (errorLogsError) {
        console.error('Error fetching error logs:', errorLogsError);
        return NextResponse.json({ error: 'Failed to fetch error logs' }, { status: 500 });
      }

      // 監査ログを取得
      const { data: auditLogs, error: auditLogsError } = await supabaseAdmin
        .from('audit_logs')
        .select('created_at, action')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });

      if (auditLogsError) {
        console.error('Error fetching audit logs:', auditLogsError);
        return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
      }

      // 日付ごとにデータを集計
      const logsByDate = new Map<string, { errorCount: number; auditCount: number }>();

      // エラーログを集計
      errorLogs?.forEach(log => {
        const date = new Date(log.created_at);
        const jstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
        const dateKey = jstDate.toISOString().split('T')[0];
        
        const current = logsByDate.get(dateKey) || { errorCount: 0, auditCount: 0 };
        current.errorCount += 1;
        logsByDate.set(dateKey, current);
      });

      // 監査ログを集計
      auditLogs?.forEach(log => {
        const date = new Date(log.created_at);
        const jstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
        const dateKey = jstDate.toISOString().split('T')[0];
        
        const current = logsByDate.get(dateKey) || { errorCount: 0, auditCount: 0 };
        current.auditCount += 1;
        logsByDate.set(dateKey, current);
      });

      // グラフ用のデータ形式に変換
      const graphData = Array.from(logsByDate.entries())
        .map(([date, counts]) => ({
          date,
          errorLogs: counts.errorCount,
          auditLogs: counts.auditCount,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return NextResponse.json({ data: graphData });
    }

    return NextResponse.json({ error: 'Invalid request type' }, { status: 400 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
