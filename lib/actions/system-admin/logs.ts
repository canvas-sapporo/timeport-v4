import { revalidatePath } from 'next/cache';

import { createClientAdminClient } from '@/lib/supabase';
import { LogFilter, LogStats, LogSetting, LogSettingKey } from '@/schemas/database/log';

// ================================
// システムログ取得
// ================================

export async function getSystemLogs(filter: LogFilter = {}) {
  try {
    const supabase = createClientAdminClient();

    let query = supabase
      .from('system_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // フィルター適用
    if (filter.start_date) {
      query = query.gte('created_date', filter.start_date);
    }

    if (filter.end_date) {
      query = query.lte('created_date', filter.end_date);
    }

    if (filter.levels && filter.levels.length > 0) {
      query = query.in('level', filter.levels);
    }

    if (filter.user_id) {
      query = query.eq('user_id', filter.user_id);
    }

    if (filter.company_id) {
      query = query.eq('company_id', filter.company_id);
    }

    if (filter.path) {
      query = query.ilike('path', `%${filter.path}%`);
    }

    if (filter.feature_name) {
      query = query.ilike('feature_name', `%${filter.feature_name}%`);
    }

    if (filter.errors_only) {
      query = query.not('error_message', 'is', null);
    }

    if (filter.search) {
      query = query.or(
        `error_message.ilike.%${filter.search}%,metadata->>'message'.ilike.%${filter.search}%`
      );
    }

    // ページネーション
    const page = filter.page || 1;
    const limit = filter.limit || 50;
    const offset = (page - 1) * limit;

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch system logs: ${error.message}`);
    }

    return {
      data: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  } catch (error) {
    console.error('Error fetching system logs:', error);
    throw error;
  }
}

// ================================
// 監査ログ取得
// ================================

export async function getAuditLogs(filter: LogFilter = {}) {
  try {
    const supabase = createClientAdminClient();

    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // フィルター適用
    if (filter.start_date) {
      query = query.gte('created_date', filter.start_date);
    }

    if (filter.end_date) {
      query = query.lte('created_date', filter.end_date);
    }

    if (filter.user_id) {
      query = query.eq('user_id', filter.user_id);
    }

    if (filter.company_id) {
      query = query.eq('company_id', filter.company_id);
    }

    if (filter.search) {
      query = query.or(`action.ilike.%${filter.search}%,target_type.ilike.%${filter.search}%`);
    }

    // ページネーション
    const page = filter.page || 1;
    const limit = filter.limit || 50;
    const offset = (page - 1) * limit;

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch audit logs: ${error.message}`);
    }

    return {
      data: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    throw error;
  }
}

// ================================
// ログ統計取得
// ================================

export async function getLogStats(days: number = 7): Promise<LogStats> {
  try {
    const supabase = createClientAdminClient();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // システムログ統計
    const { data: systemLogs, error: systemError } = await supabase
      .from('system_logs')
      .select('level, created_date, response_time_ms')
      .gte('created_date', startDate.toISOString().split('T')[0]);

    if (systemError) {
      throw new Error(`Failed to fetch system log stats: ${systemError.message}`);
    }

    // 監査ログ統計
    const { data: auditLogs, error: auditError } = await supabase
      .from('audit_logs')
      .select('created_date')
      .gte('created_date', startDate.toISOString().split('T')[0]);

    if (auditError) {
      throw new Error(`Failed to fetch audit log stats: ${auditError.message}`);
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

    return {
      total_count: totalCount,
      level_counts: levelCounts,
      daily_counts: dailyCountsArray,
      error_rate: totalCount > 0 ? (errorCount / totalCount) * 100 : 0,
      avg_response_time: responseTimeCount > 0 ? totalResponseTime / responseTimeCount : undefined,
    };
  } catch (error) {
    console.error('Error fetching log stats:', error);
    throw error;
  }
}

// ================================
// ログ設定管理
// ================================

export async function getLogSettings(): Promise<LogSetting[]> {
  try {
    const supabase = createClientAdminClient();

    const { data, error } = await supabase.from('log_settings').select('*').order('setting_key');

    if (error) {
      throw new Error(`Failed to fetch log settings: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching log settings:', error);
    throw error;
  }
}

export async function updateLogSetting(
  key: LogSettingKey,
  value: any,
  description?: string
): Promise<void> {
  try {
    const supabase = createClientAdminClient();

    const { error } = await supabase.from('log_settings').upsert({
      setting_key: key,
      setting_value: value,
      description,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      throw new Error(`Failed to update log setting: ${error.message}`);
    }

    revalidatePath('/system-admin/logs/settings');
  } catch (error) {
    console.error('Error updating log setting:', error);
    throw error;
  }
}

// ================================
// ログエクスポート
// ================================

export async function exportSystemLogs(filter: LogFilter = {}) {
  try {
    const supabase = createClientAdminClient();

    let query = supabase.from('system_logs').select('*').order('created_at', { ascending: false });

    // フィルター適用（エクスポート用は制限なし）
    if (filter.start_date) {
      query = query.gte('created_date', filter.start_date);
    }

    if (filter.end_date) {
      query = query.lte('created_date', filter.end_date);
    }

    if (filter.levels && filter.levels.length > 0) {
      query = query.in('level', filter.levels);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to export system logs: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error exporting system logs:', error);
    throw error;
  }
}

export async function exportAuditLogs(filter: LogFilter = {}) {
  try {
    const supabase = createClientAdminClient();

    let query = supabase.from('audit_logs').select('*').order('created_at', { ascending: false });

    // フィルター適用（エクスポート用は制限なし）
    if (filter.start_date) {
      query = query.gte('created_date', filter.start_date);
    }

    if (filter.end_date) {
      query = query.lte('created_date', filter.end_date);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to export audit logs: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    throw error;
  }
}
