'use client';

import { useEffect, useState } from 'react';
import {
  LogIn,
  LogOut,
  XCircle,
  Users,
  Shield,
  AlertTriangle,
  Clock,
  MapPin,
  Monitor,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AuthMonitoringData {
  total_auth_logs: number;
  login_success_count: number;
  login_failed_count: number;
  logout_count: number;
  active_users_count: number;
  recent_auth_logs: Array<{
    id: string;
    action: string;
    created_at: string;
    user_id: string;
    details: Record<string, unknown>;
    ip_address: string | null;
    user_agent: string | null;
  }>;
  failed_logins: Array<{
    id: string;
    created_at: string;
    user_id: string;
    details: Record<string, unknown>;
    ip_address: string | null;
    user_agent: string | null;
  }>;
  date_range: {
    start_date: string | null;
    end_date: string | null;
  };
}

interface AuthMonitoringProps {
  companyId?: string;
  startDate?: string;
  endDate?: string;
}

export function AuthMonitoring({ companyId, startDate, endDate }: AuthMonitoringProps) {
  const [data, setData] = useState<AuthMonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMonitoringData = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (companyId) params.append('company_id', companyId);
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);

        const response = await fetch(`/api/admin/auth/monitoring?${params.toString()}`);

        if (!response.ok) {
          throw new Error('監視データの取得に失敗しました');
        }

        const result = await response.json();

        if (result.success) {
          setData(result.data);
        } else {
          throw new Error(result.error || 'データの取得に失敗しました');
        }
      } catch (err) {
        console.error('認証監視データ取得エラー:', err);
        setError(err instanceof Error ? err.message : '予期しないエラーが発生しました');
      } finally {
        setLoading(false);
      }
    };

    fetchMonitoringData();
  }, [companyId, startDate, endDate]);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                <Skeleton className="h-4 w-24" />
              </CardTitle>
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!data) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>データが見つかりません</AlertDescription>
      </Alert>
    );
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'user_login':
        return <LogIn className="h-4 w-4" />;
      case 'user_logout':
        return <LogOut className="h-4 w-4" />;
      case 'user_login_failed':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'user_login':
        return 'bg-green-100 text-green-800';
      case 'user_logout':
        return 'bg-blue-100 text-blue-800';
      case 'user_login_failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'user_login':
        return 'ログイン成功';
      case 'user_logout':
        return 'ログアウト';
      case 'user_login_failed':
        return 'ログイン失敗';
      default:
        return action;
    }
  };

  const successRate =
    data.login_success_count + data.login_failed_count > 0
      ? Math.round(
          (data.login_success_count / (data.login_success_count + data.login_failed_count)) * 100
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* 統計カード */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総認証ログ</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.total_auth_logs}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ログイン成功</CardTitle>
            <LogIn className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{data.login_success_count}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ログイン失敗</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{data.login_failed_count}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">アクティブユーザー</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{data.active_users_count}</div>
          </CardContent>
        </Card>
      </div>

      {/* 成功率とログアウト数 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ログイン成功率</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successRate}%</div>
            <p className="text-xs text-muted-foreground">
              成功: {data.login_success_count} / 失敗: {data.login_failed_count}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ログアウト数</CardTitle>
            <LogOut className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.logout_count}</div>
          </CardContent>
        </Card>
      </div>

      {/* 最近の認証ログ */}
      <Card>
        <CardHeader>
          <CardTitle>最近の認証ログ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.recent_auth_logs.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">認証ログがありません</p>
            ) : (
              data.recent_auth_logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className={getActionColor(log.action)}>
                        {getActionIcon(log.action)}
                        <span className="ml-1">{getActionLabel(log.action)}</span>
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(log.created_at).toLocaleString('ja-JP')}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {log.ip_address && (
                        <>
                          <MapPin className="inline h-3 w-3 mr-1" />
                          <span>{log.ip_address}</span>
                        </>
                      )}
                      {log.details?.email && (
                        <>
                          <span className="mx-2">•</span>
                          <span>{log.details.email as string}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* 失敗したログイン試行 */}
      <Card>
        <CardHeader>
          <CardTitle>失敗したログイン試行</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.failed_logins.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                失敗したログイン試行はありません
              </p>
            ) : (
              data.failed_logins.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-4 border rounded-lg border-red-200 bg-red-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="bg-red-100 text-red-800">
                        <XCircle className="h-4 w-4" />
                        <span className="ml-1">ログイン失敗</span>
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(log.created_at).toLocaleString('ja-JP')}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {log.ip_address && (
                        <>
                          <MapPin className="inline h-3 w-3 mr-1" />
                          <span>{log.ip_address}</span>
                        </>
                      )}
                      {log.details?.email && (
                        <>
                          <span className="mx-2">•</span>
                          <span>{log.details.email as string}</span>
                        </>
                      )}
                      {log.details?.failure_reason && (
                        <>
                          <span className="mx-2">•</span>
                          <span>理由: {log.details.failure_reason as string}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
