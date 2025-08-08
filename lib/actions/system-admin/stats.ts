'use server';

import { createClient } from '@supabase/supabase-js';
import {
  getJSTDate,
  getJSTDateString,
  getCurrentJST,
  convertUTCToJST,
} from '@/lib/utils';

// 日本時間の本日の開始と終了を取得（date-fns-tz使用）
function getJSTTodayRange() {
  const now = getCurrentJST();
  
  // 本日の開始（日本時間 00:00:00）
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  // 本日の終了（日本時間 23:59:59）
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  return { todayStart, todayEnd };
}

// 日本時間の前日の開始と終了を取得（date-fns-tz使用）
function getJSTYesterdayRange() {
  const now = getCurrentJST();
  
  // 前日の開始（日本時間 00:00:00）
  const yesterdayStart = new Date(now);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  yesterdayStart.setHours(0, 0, 0, 0);

  // 前日の終了（日本時間 23:59:59）
  const yesterdayEnd = new Date(now);
  yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
  yesterdayEnd.setHours(23, 59, 59, 999);

  return { yesterdayStart, yesterdayEnd };
}

// 期間に応じた日付範囲を取得（date-fns-tz使用）
function getDateRangeForPeriod(period: string) {
  const now = getCurrentJST();

  let startDate: Date;

  switch (period) {
    case '1month':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '3months':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case '6months':
      startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      break;
    case '1year':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    case '3years':
      startDate = new Date(now.getTime() - 3 * 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  return { startDate, endDate: now };
}



// システムエラーログ数を取得するサーバーアクション
export async function getSystemErrorLogsCount(period: string = '1month') {
  try {
    console.log('getSystemErrorLogsCount 開始:', { period });
    
    // グラフデータから最新日と前日のデータを取得
    const graphData = await getLogsDataForPeriod(period);
    
    console.log('getSystemErrorLogsCount グラフデータ取得完了:', {
      graphDataLength: graphData?.length || 0,
      graphData: graphData
    });
    
    if (!graphData || graphData.length === 0) {
      console.log('getSystemErrorLogsCount: グラフデータが空です');
      return { todayCount: 0, yesterdayCount: 0, change: 0 };
    }

    // 最新日のデータ
    const latestDayData = graphData[graphData.length - 1];
    const latestDayErrorCount = latestDayData?.errorLogs || 0;

    // 前日のデータ（2番目に新しい日）
    const previousDayData = graphData.length > 1 ? graphData[graphData.length - 2] : null;
    const previousDayErrorCount = previousDayData?.errorLogs || 0;

    console.log('getSystemErrorLogsCount データ処理:', {
      latestDayData,
      latestDayErrorCount,
      previousDayData,
      previousDayErrorCount
    });

    // エラーログの変化率を計算
    let errorChange = 0;
    if (previousDayErrorCount > 0) {
      errorChange = Math.round(
        ((latestDayErrorCount - previousDayErrorCount) / previousDayErrorCount) * 100
      );
    } else if (latestDayErrorCount > 0) {
      errorChange = 100;
    }

    const result = {
      todayCount: latestDayErrorCount,
      yesterdayCount: previousDayErrorCount,
      change: errorChange,
    };
    
    console.log('getSystemErrorLogsCount 結果:', result);
    return result;
  } catch (error) {
    console.error('Error fetching error logs count:', error);
    return { todayCount: 0, yesterdayCount: 0, change: 0 };
  }
}

// 監査ログ数を取得するサーバーアクション
export async function getAuditLogsCount(period: string = '1month') {
  try {
    console.log('getAuditLogsCount 開始:', { period });
    
    // グラフデータから最新日と前日のデータを取得
    const graphData = await getLogsDataForPeriod(period);
    
    console.log('getAuditLogsCount グラフデータ取得完了:', {
      graphDataLength: graphData?.length || 0,
      graphData: graphData
    });
    
    if (!graphData || graphData.length === 0) {
      console.log('getAuditLogsCount: グラフデータが空です');
      return { todayCount: 0, yesterdayCount: 0, change: 0 };
    }

    // 最新日のデータ
    const latestDayData = graphData[graphData.length - 1];
    const latestDayAuditCount = latestDayData?.auditLogs || 0;

    // 前日のデータ（2番目に新しい日）
    const previousDayData = graphData.length > 1 ? graphData[graphData.length - 2] : null;
    const previousDayAuditCount = previousDayData?.auditLogs || 0;

    console.log('getAuditLogsCount データ処理:', {
      latestDayData,
      latestDayAuditCount,
      previousDayData,
      previousDayAuditCount
    });

    // 監査ログの変化率を計算
    let auditChange = 0;
    if (previousDayAuditCount > 0) {
      auditChange = Math.round(
        ((latestDayAuditCount - previousDayAuditCount) / previousDayAuditCount) * 100
      );
    } else if (latestDayAuditCount > 0) {
      auditChange = 100;
    }

    const result = {
      todayCount: latestDayAuditCount,
      yesterdayCount: previousDayAuditCount,
      change: auditChange,
    };
    
    console.log('getAuditLogsCount 結果:', result);
    return result;
  } catch (error) {
    console.error('Error fetching audit logs count:', error);
    return { todayCount: 0, yesterdayCount: 0, change: 0 };
  }
}

// 期間別のログデータを取得するサーバーアクション
export async function getLogsDataForPeriod(period: string) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1週間分のデータを取得するための時間範囲
    const now = getCurrentJST();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // 現在時刻をクエリの終了時刻として使用
    const queryEndDate = now;
    
    console.log('クエリ時間範囲:', {
      oneWeekAgo: oneWeekAgo.toISOString(),
      now: now.toISOString(),
      queryEndDate: queryEndDate.toISOString(),
      nowDate: now.toDateString()
    });
    
    // 1週間分のデータを取得（レベルフィルタリングなしで全データを取得）
    const { data: errorLogs, error: errorLogsError } = await supabaseAdmin
      .from('system_logs')
      .select('created_at, level')
      .gte('created_at', oneWeekAgo.toISOString())
      .lte('created_at', queryEndDate.toISOString())
      .in('level', ['error', 'fatal'])
      .order('created_at', { ascending: false })
      .limit(50000); // 制限を大幅に増やしてデータを確実に取得


    if (errorLogsError) {
      console.error('Error fetching error logs:', errorLogsError);
      throw new Error('Failed to fetch error logs');
    }
    
    console.log('取得したエラーログサンプル:', errorLogs?.slice(0, 5));
    console.log('取得したエラーログ総数:', errorLogs?.length || 0, '件');
    
    // 実際のデータから最新日を特定
    const allDates = new Set<string>();
    errorLogs?.forEach(log => {
      const jstDate = convertUTCToJST(log.created_at);
      const dateKey = getJSTDateString(jstDate);
      allDates.add(dateKey);
    });
    
    const sortedDates = Array.from(allDates).sort();
    const actualLatestDayKey = sortedDates[sortedDates.length - 1];
    
    console.log('データに含まれる日付:', Array.from(allDates).sort());
    console.log('実際の最新日:', actualLatestDayKey);
    
    // 実際の最新日のエラーログを検索
    const latestDayLogs = errorLogs?.filter(log => {
      const jstDate = convertUTCToJST(log.created_at);
      const dateKey = getJSTDateString(jstDate);
      return dateKey === actualLatestDayKey;
    });
    console.log('実際の最新日のエラーログ（直接検索）:', latestDayLogs?.length || 0, '件');
    if (latestDayLogs && latestDayLogs.length > 0) {
      console.log('実際の最新日のエラーログ詳細:', latestDayLogs.slice(0, 3));
    }
    
    // 実際の最新日のデータを直接クエリで確認
    const actualLatestDayDate = new Date(actualLatestDayKey + 'T00:00:00.000Z');
    const latestDayStart = new Date(actualLatestDayDate);
    latestDayStart.setHours(0, 0, 0, 0);
    const latestDayEnd = new Date(actualLatestDayDate);
    latestDayEnd.setHours(23, 59, 59, 999);
    
    const { data: latestDayDirectLogs, error: latestDayError } = await supabaseAdmin
      .from('system_logs')
      .select('created_at, level')
      .gte('created_at', latestDayStart.toISOString())
      .lte('created_at', latestDayEnd.toISOString())
      .order('created_at', { ascending: false })
      .in('level', ['error', 'fatal']);
    
    console.log('実際の最新日直接クエリ結果:', {
      count: latestDayDirectLogs?.length || 0,
      error: latestDayError,
      sample: latestDayDirectLogs?.slice(0, 3)
    });
    
    // タイムゾーン変換のテスト
    const testDates = errorLogs?.slice(0, 10).map(log => ({
      original: log.created_at,
      jst: convertUTCToJST(log.created_at),
      dateKey: getJSTDateString(convertUTCToJST(log.created_at))
    }));
    console.log('タイムゾーン変換テスト:', testDates);

    const { data: auditLogs, error: auditLogsError } = await supabaseAdmin
      .from('audit_logs')
      .select('created_at, action')
      .gte('created_at', oneWeekAgo.toISOString())
      .lte('created_at', queryEndDate.toISOString())
      .order('created_at', { ascending: true })
      .limit(50000); // 制限を大幅に増やしてデータを確実に取得

    if (auditLogsError) {
      console.error('Error fetching audit logs:', auditLogsError);
      throw new Error('Failed to fetch audit logs');
    }



    // 日付ごとにデータを集計
    const logsByDate = new Map<string, { errorCount: number; auditCount: number }>();

    // エラーログを集計（エラーレベルのみをカウント）
    console.log('エラーログ処理開始:', errorLogs?.length || 0, '件');
    let errorLogsProcessed = 0;
    let errorLogsWithErrorLevel = 0;
    
    errorLogs?.forEach((log) => {
      errorLogsProcessed++;
      
      // エラーレベルのログのみをカウント
      if (log.level === 'error') {
        errorLogsWithErrorLevel++;
        const jstDate = convertUTCToJST(log.created_at);
        const dateKey = getJSTDateString(jstDate);
        
        // デバッグ用ログ（実際の最新日のデータを確認）
        if (dateKey === actualLatestDayKey) {
          console.log('実際の最新日のエラーログ発見:', {
            originalUTC: log.created_at,
            jstDate: jstDate,
            dateKey: dateKey,
            level: log.level
          });
        }

        const current = logsByDate.get(dateKey) || { errorCount: 0, auditCount: 0 };
        current.errorCount += 1;
        logsByDate.set(dateKey, current);
      }
    });
    
    console.log('エラーログ処理結果:', {
      totalProcessed: errorLogsProcessed,
      errorLevelCount: errorLogsWithErrorLevel,
      logsByDate: Array.from(logsByDate.entries()).map(([date, counts]) => ({
        date,
        errorCount: counts.errorCount,
        auditCount: counts.auditCount
      }))
    });

    // 監査ログを集計
    auditLogs?.forEach((log) => {
      const jstDate = convertUTCToJST(log.created_at);
      const dateKey = getJSTDateString(jstDate);

      const current = logsByDate.get(dateKey) || { errorCount: 0, auditCount: 0 };
      current.auditCount += 1;
      logsByDate.set(dateKey, current);
    });

    // 期間に応じてデータをフィルタリング
    const { startDate, endDate } = getDateRangeForPeriod(period);
    const startDateKey = getJSTDateString(startDate);
    const endDateKey = getJSTDateString(endDate);

    // 選択された期間のデータのみを抽出
    const filteredGraphData = Array.from(logsByDate.entries())
      .filter(([date]) => date >= startDateKey && date <= endDateKey)
      .map(([date, counts]) => ({
        date,
        errorLogs: counts.errorCount,
        auditLogs: counts.auditCount,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // デバッグ用ログ
    console.log('グラフデータ:', {
      startDateKey,
      endDateKey,
      totalLogsByDate: Array.from(logsByDate.entries()).map(([date, counts]) => ({
        date,
        errorCount: counts.errorCount,
        auditCount: counts.auditCount
      })),
      filteredGraphData: filteredGraphData
    });

    return filteredGraphData;
  } catch (error) {
    console.error('Error fetching logs data:', error);
    return [];
  }
}
