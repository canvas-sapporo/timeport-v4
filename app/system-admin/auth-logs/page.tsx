'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Search, Filter, Download } from 'lucide-react';

import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDateTimeForDisplay } from '@/lib/utils';

// ログデータの型定義
interface LogData {
  id: string;
  action: string;
  user_id: string;
  target_type: string;
  target_id: string;
  before_data: Record<string, unknown>;
  after_data: Record<string, unknown>;
  details: {
    login_method?: string;
    failure_reason?: string;
    email?: string;
    [key: string]: unknown;
  } | null;
  ip_address: string;
  user_agent: string;
  created_at: string;
  [key: string]: unknown;
}

interface AuthLogsResponse {
  logs: LogData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats: {
    user_login: number;
    user_logout: number;
    user_login_failed: number;
  };
}

export default function AuthLogsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [logs, setLogs] = useState<LogData[]>([]);
  const [stats, setStats] = useState({ user_login: 0, user_logout: 0, user_login_failed: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState({
    action: '',
    userId: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    if (!user || user.role !== 'system-admin') {
      router.push('/login');
      return;
    }

    fetchLogs();
  }, [user, router, pagination.page, filters]);

  async function fetchLogs() {
    try {
      setIsLoading(true);
      const response = await fetch('/api/system-admin/logs/auth');
      if (!response.ok) throw new Error('Failed to fetch logs');
      const data = await response.json();
      setLogs(data.logs || []);
      setStats(data.stats || { user_login: 0, user_logout: 0, user_login_failed: 0 });
      setPagination(data.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 });
    } catch (err) {
      console.error('ログの取得に失敗しました:', err);
    } finally {
      setIsLoading(false);
    }
  }

  function handleFilterChange(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  }

  function handlePageChange(page: number) {
    setPagination((prev) => ({ ...prev, page }));
  }

  function handleLimitChange(limit: number) {
    setPagination((prev) => ({ ...prev, limit, page: 1 }));
  }

  async function handleExport() {
    try {
      const response = await fetch('/api/system-admin/logs/auth/export');
      if (!response.ok) throw new Error('Failed to export logs');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `auth-logs-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('エクスポートに失敗しました:', err);
    }
  }

  function getActionBadge(action: string) {
    switch (action) {
      case 'user_login':
        return <Badge variant="default">ログイン</Badge>;
      case 'user_logout':
        return <Badge variant="secondary">ログアウト</Badge>;
      case 'user_login_failed':
        return <Badge variant="destructive">ログイン失敗</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  }

  function formatDate(dateString: string) {
    return formatDateTimeForDisplay(dateString);
  }

  if (!user || user.role !== 'system-admin') {
    return null;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">認証監査ログ</h1>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">ログイン成功</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.user_login}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">ログアウト</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.user_logout}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">ログイン失敗</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.user_login_failed}</div>
          </CardContent>
        </Card>
      </div>

      {/* フィルター */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            フィルター
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="action">アクション</Label>
              <Select
                value={filters.action}
                onValueChange={(value) => handleFilterChange('action', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="すべて" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">すべて</SelectItem>
                  <SelectItem value="user_login">ログイン</SelectItem>
                  <SelectItem value="user_logout">ログアウト</SelectItem>
                  <SelectItem value="user_login_failed">ログイン失敗</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="userId">ユーザーID</Label>
              <Input
                id="userId"
                value={filters.userId}
                onChange={(e) => handleFilterChange('userId', e.target.value)}
                placeholder="ユーザーID"
              />
            </div>
            <div>
              <Label htmlFor="startDate">開始日</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">終了日</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ログテーブル */}
      <Card>
        <CardHeader>
          <CardTitle>認証ログ一覧</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="ml-2">読み込み中...</span>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>日時</TableHead>
                    <TableHead>アクション</TableHead>
                    <TableHead>ユーザーID</TableHead>
                    <TableHead>IPアドレス</TableHead>
                    <TableHead>詳細</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{formatDate(log.created_at)}</TableCell>
                      <TableCell>{getActionBadge(log.action)}</TableCell>
                      <TableCell className="font-mono text-sm">{log.user_id || '-'}</TableCell>
                      <TableCell className="font-mono text-sm">{log.ip_address || '-'}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {log.details?.login_method && (
                            <div>ログイン方法: {log.details.login_method}</div>
                          )}
                          {log.details?.failure_reason && (
                            <div>失敗理由: {log.details.failure_reason}</div>
                          )}
                          {log.details?.email && <div>メール: {log.details.email}</div>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* ページネーション */}
              {pagination.totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                  >
                    前へ
                  </Button>
                  <span className="text-sm">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                  >
                    次へ
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
