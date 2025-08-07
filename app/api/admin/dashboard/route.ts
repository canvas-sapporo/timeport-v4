import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { withErrorHandling } from '@/lib/utils/error-handling';
import { AppError } from '@/lib/utils/error-handling';

export interface GraphDataPoint {
  date: string;
  workMinutes: number;
  overtimeMinutes: number;
}

export interface DashboardStats {
  todayAttendance: number;
  totalUsers: number;
  monthlyOvertimeMinutes: number;
}

/**
 * 直近30日間の勤務時間と残業時間のグラフデータを取得
 */
async function getDashboardGraphData(
  companyId: string
): Promise<{ success: true; data: GraphDataPoint[] } | { success: false; error: AppError }> {
  return withErrorHandling(async () => {
    console.log('getDashboardGraphData開始, companyId:', companyId);
    
    try {
      const supabase = createServerSupabaseClient();

      // 昨日から31日前までの期間を計算
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      
      const thirtyOneDaysAgo = new Date(today);
      thirtyOneDaysAgo.setDate(today.getDate() - 31);

      const startDate = thirtyOneDaysAgo.toISOString().split('T')[0];
      const endDate = yesterday.toISOString().split('T')[0];

      console.log('グラフデータ取得期間:', { startDate, endDate });

    // 企業内のユーザーIDを取得
    const { data: userGroups, error: userGroupsError } = await supabase
      .from('user_groups')
      .select(
        `
        user_id,
        groups!inner (
          company_id
        )
      `
      )
      .eq('groups.company_id', companyId)
      .is('deleted_at', null);

    if (userGroupsError) {
      throw AppError.fromSupabaseError(userGroupsError, 'ユーザーグループ取得');
    }

    const userIds = userGroups?.map(ug => ug.user_id) || [];
    
    if (userIds.length === 0) {
      return [];
    }

    // 勤怠データを取得
    const { data: attendances, error: attendancesError } = await supabase
      .from('attendances')
      .select('work_date, actual_work_minutes, overtime_minutes')
      .in('user_id', userIds)
      .gte('work_date', startDate)
      .lte('work_date', endDate)
      .is('source_id', null);

    if (attendancesError) {
      throw AppError.fromSupabaseError(attendancesError, '勤怠データ取得');
    }

    // 日付ごとにデータを集計
    const dailyData = new Map<string, { workMinutes: number; overtimeMinutes: number }>();

    // 期間内の全日付を初期化
    for (let d = new Date(startDate); d <= new Date(endDate); d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      dailyData.set(dateStr, { workMinutes: 0, overtimeMinutes: 0 });
    }

    // 勤怠データを集計
    attendances?.forEach(attendance => {
      const dateStr = attendance.work_date;
      const current = dailyData.get(dateStr) || { workMinutes: 0, overtimeMinutes: 0 };
      
      dailyData.set(dateStr, {
        workMinutes: current.workMinutes + (attendance.actual_work_minutes || 0),
        overtimeMinutes: current.overtimeMinutes + (attendance.overtime_minutes || 0)
      });
    });

    // グラフデータ形式に変換
    const graphData: GraphDataPoint[] = Array.from(dailyData.entries())
      .map(([date, data]) => ({
        date,
        workMinutes: data.workMinutes,
        overtimeMinutes: data.overtimeMinutes
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    console.log('グラフデータ生成完了:', graphData.length, '件');

    return graphData;
    } catch (error) {
      console.error('getDashboardGraphData エラー:', error);
      throw error;
    }
  });
}

/**
 * ダッシュボード統計情報を取得
 */
async function getDashboardStats(
  companyId: string
): Promise<{ success: true; data: DashboardStats } | { success: false; error: AppError }> {
  return withErrorHandling(async () => {
    console.log('getDashboardStats開始, companyId:', companyId);
    
    try {
      const supabase = createServerSupabaseClient();

    // 企業内のユーザーIDを取得
    const { data: userGroups, error: userGroupsError } = await supabase
      .from('user_groups')
      .select(
        `
        user_id,
        groups!inner (
          company_id
        )
      `
      )
      .eq('groups.company_id', companyId)
      .is('deleted_at', null);

    if (userGroupsError) {
      throw AppError.fromSupabaseError(userGroupsError, 'ユーザーグループ取得');
    }

    const userIds = userGroups?.map(ug => ug.user_id) || [];
    
    if (userIds.length === 0) {
      return {
        todayAttendance: 0,
        totalUsers: 0,
        monthlyOvertimeMinutes: 0
      };
    }

    const today = new Date().toISOString().split('T')[0];
    const thisMonth = new Date().toISOString().slice(0, 7);

    // 今日の出勤者数を取得
    const { data: todayAttendance, error: todayError } = await supabase
      .from('attendances')
      .select('user_id')
      .in('user_id', userIds)
      .eq('work_date', today)
      .is('source_id', null);

    if (todayError) {
      throw AppError.fromSupabaseError(todayError, '今日の出勤データ取得');
    }

    // 今月の残業時間を取得
    const { data: monthlyOvertime, error: monthlyError } = await supabase
      .from('attendances')
      .select('overtime_minutes')
      .in('user_id', userIds)
      .gte('work_date', `${thisMonth}-01`)
      .lte('work_date', `${thisMonth}-31`)
      .is('source_id', null);

    if (monthlyError) {
      throw AppError.fromSupabaseError(monthlyError, '今月の残業データ取得');
    }

    const stats: DashboardStats = {
      todayAttendance: todayAttendance?.length || 0,
      totalUsers: userIds.length,
      monthlyOvertimeMinutes: monthlyOvertime?.reduce((sum, record) => sum + (record.overtime_minutes || 0), 0) || 0
    };

    console.log('ダッシュボード統計取得完了:', stats);

    return stats;
    } catch (error) {
      console.error('getDashboardStats エラー:', error);
      throw error;
    }
  });
}

export async function GET(request: NextRequest) {
  try {
    console.log('ダッシュボードAPI呼び出し開始');
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    console.log('companyId:', companyId);

    if (!companyId) {
      console.error('companyIdが提供されていません');
      return NextResponse.json(
        { success: false, error: 'companyId is required' },
        { status: 400 }
      );
    }

    console.log('データ取得開始...');
    const [graphDataResult, statsResult] = await Promise.all([
      getDashboardGraphData(companyId),
      getDashboardStats(companyId),
    ]);

    console.log('データ取得完了:', {
      graphDataSuccess: graphDataResult.success,
      statsSuccess: statsResult.success,
      graphDataLength: graphDataResult.success ? graphDataResult.data.length : 'N/A',
    });

    // エラーチェック
    if (!graphDataResult.success) {
      console.error('グラフデータ取得エラー:', graphDataResult.error);
      return NextResponse.json(
        { success: false, error: graphDataResult.error.message },
        { status: 500 }
      );
    }

    if (!statsResult.success) {
      console.error('統計データ取得エラー:', statsResult.error);
      return NextResponse.json(
        { success: false, error: statsResult.error.message },
        { status: 500 }
      );
    }

    const response = {
      success: true,
      data: {
        graphData: graphDataResult.data,
        stats: statsResult.data,
      },
    };

    console.log('レスポンス送信:', {
      success: response.success,
      graphDataLength: response.data.graphData.length,
      stats: response.data.stats,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('ダッシュボードAPI エラー:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 