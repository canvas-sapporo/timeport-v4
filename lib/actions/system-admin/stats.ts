// クライアントサイドでAPIを呼び出す関数

export async function getSystemErrorLogsCount() {
  try {
    const response = await fetch('/api/system-admin/stats?type=counts');
    if (!response.ok) {
      throw new Error('Failed to fetch error logs count');
    }
    const data = await response.json();
    return {
      todayCount: data.errorLogs.todayCount,
      yesterdayCount: data.errorLogs.yesterdayCount,
      change: data.errorLogs.change,
    };
  } catch (error) {
    console.error('Error fetching error logs count:', error);
    return { todayCount: 0, yesterdayCount: 0, change: 0 };
  }
}

export async function getAuditLogsCount() {
  try {
    const response = await fetch('/api/system-admin/stats?type=counts');
    if (!response.ok) {
      throw new Error('Failed to fetch audit logs count');
    }
    const data = await response.json();
    return {
      todayCount: data.auditLogs.todayCount,
      yesterdayCount: data.auditLogs.yesterdayCount,
      change: data.auditLogs.change,
    };
  } catch (error) {
    console.error('Error fetching audit logs count:', error);
    return { todayCount: 0, yesterdayCount: 0, change: 0 };
  }
}

export async function getLogsDataForPeriod(period: string) {
  try {
    const response = await fetch(`/api/system-admin/stats?type=graph&period=${period}`);
    if (!response.ok) {
      throw new Error('Failed to fetch logs data');
    }
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching logs data:', error);
    return [];
  }
}
