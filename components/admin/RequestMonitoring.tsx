'use client';

import { useEffect, useState } from 'react';
import { Calendar, FileText, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface RequestMonitoringData {
  total_requests: number;
  pending_count: number;
  status_stats: Array<{
    id: string;
    code: string;
    name: string;
    color: string;
  }>;
  form_stats: Array<{
    id: string;
    name: string;
    category: string;
    is_active: boolean;
  }>;
  recent_requests: Array<{
    id: string;
    title: string;
    created_at: string;
    status_id: string;
    user_id: string;
    request_form_id: string;
    statuses: {
      code: string;
      name: string;
      color: string;
    };
    request_forms: {
      name: string;
      category: string;
    };
  }>;
  date_range: {
    start_date: string | null;
    end_date: string | null;
  };
}

interface RequestMonitoringProps {
  companyId?: string;
  startDate?: string;
  endDate?: string;
}

export function RequestMonitoring({ companyId, startDate, endDate }: RequestMonitoringProps) {
  const [data, setData] = useState<RequestMonitoringData | null>(null);
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

        const response = await fetch(`/api/admin/requests/monitoring?${params.toString()}`);

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
        console.error('申請監視データ取得エラー:', err);
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
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!data) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>データが見つかりません</AlertDescription>
      </Alert>
    );
  }

  const getStatusIcon = (code: string) => {
    switch (code) {
      case 'draft':
        return <FileText className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusColor = (code: string) => {
    switch (code) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* 統計カード */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総申請数</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.total_requests}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">承認待ち</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{data.pending_count}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">申請フォーム数</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.form_stats.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">アクティブフォーム</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {data.form_stats.filter((form) => form.is_active).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 最近の申請 */}
      <Card>
        <CardHeader>
          <CardTitle>最近の申請</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.recent_requests.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">申請がありません</p>
            ) : (
              data.recent_requests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{request.title}</h4>
                      <Badge variant="outline" className={getStatusColor(request.statuses.code)}>
                        {getStatusIcon(request.statuses.code)}
                        <span className="ml-1">{request.statuses.name}</span>
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span>{request.request_forms.name}</span>
                      <span className="mx-2">•</span>
                      <span>{request.request_forms.category}</span>
                      <span className="mx-2">•</span>
                      <span>{new Date(request.created_at).toLocaleDateString('ja-JP')}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* 申請フォーム統計 */}
      <Card>
        <CardHeader>
          <CardTitle>申請フォーム統計</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.form_stats.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">申請フォームがありません</p>
            ) : (
              data.form_stats.map((form) => (
                <div
                  key={form.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{form.name}</h4>
                      <Badge variant={form.is_active ? 'default' : 'secondary'}>
                        {form.is_active ? 'アクティブ' : '非アクティブ'}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">カテゴリ: {form.category}</div>
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
