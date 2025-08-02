'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  Search,
  Filter,
  Download,
  Calendar,
  User,
  FileText,
  Clock,
  Eye,
  Settings,
} from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ColumnSettingsDialog, ColumnOption } from '@/components/admin/ColumnSettingsDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface AuditLog {
  id: string;
  user_id: string;
  company_id: string;
  action: string;
  target_type: string;
  target_id: string;
  details: Record<string, unknown> | null;
  ip_address: string;
  user_agent: string;
  created_at: string;
  user_profiles: {
    id: string;
    family_name: string;
    first_name: string;
  };
}

interface AuditLogsResponse {
  data: AuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function AdminLogsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState({
    action: 'all',
    userId: '',
    startDate: '',
    endDate: '',
    search: '',
  });
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isColumnSettingsOpen, setIsColumnSettingsOpen] = useState(false);
  const { toast } = useToast();

  // 表示項目設定
  const [auditLogColumns, setAuditLogColumns] = useState({
    date: true,
    user: true,
    action: true,
    target: true,
    before_data: false,
    after_data: false,
    details: false,
    ip_address: true,
    user_agent: false,
    session_id: false,
  });

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/login');
      return;
    }

    fetchLogs();
  }, [user, router, pagination.page, filters]);

  async function fetchLogs() {
    setIsLoading(true);
    try {
      // 認証トークンを取得
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No access token available');
      }

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.action && filters.action !== 'all' && { action: filters.action }),
        ...(filters.userId && { user_id: filters.userId }),
        ...(filters.startDate && { start_date: filters.startDate }),
        ...(filters.endDate && { end_date: filters.endDate }),
        ...(filters.search && { search: filters.search }),
      });

      const response = await fetch(`/api/admin/logs/audit?${params}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data: AuditLogsResponse = await response.json();

      if (response.ok) {
        setLogs(data.data);
        setPagination({
          ...pagination,
          total: data.total,
          totalPages: data.totalPages,
        });
      } else {
        toast({
          title: 'エラー',
          description: 'ログの取得に失敗しました',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('ログ取得エラー:', error);
      toast({
        title: 'エラー',
        description: 'ログの取得に失敗しました',
        variant: 'destructive',
      });
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

  async function handleExport() {
    try {
      // 認証トークンを取得
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No access token available');
      }

      const params = new URLSearchParams({
        ...(filters.action && filters.action !== 'all' && { action: filters.action }),
        ...(filters.userId && { user_id: filters.userId }),
        ...(filters.startDate && { start_date: filters.startDate }),
        ...(filters.endDate && { end_date: filters.endDate }),
        ...(filters.search && { search: filters.search }),
      });

      const response = await fetch(`/api/admin/logs/audit/export?${params}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd-HH-mm')}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: '成功',
          description: 'ログをエクスポートしました',
        });
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      toast({
        title: 'エラー',
        description: 'エクスポートに失敗しました',
        variant: 'destructive',
      });
    }
  }

  function getActionBadge(action: string) {
    const actionColors: { [key: string]: string } = {
      user_login: 'bg-green-100 text-green-800',
      user_logout: 'bg-blue-100 text-blue-800',
      user_login_failed: 'bg-red-100 text-red-800',
      create: 'bg-green-100 text-green-800',
      update: 'bg-yellow-100 text-yellow-800',
      delete: 'bg-red-100 text-red-800',
      view: 'bg-gray-100 text-gray-800',
    };

    return <Badge className={actionColors[action] || 'bg-gray-100 text-gray-800'}>{action}</Badge>;
  }

  function getTargetTypeBadge(targetType: string) {
    return (
      <Badge variant="outline" className="text-xs">
        {targetType}
      </Badge>
    );
  }

  function openDetailDialog(log: AuditLog) {
    setSelectedLog(log);
    setIsDetailDialogOpen(true);
  }

  function handleColumnSettingsApply() {
    toast({
      title: '設定を適用しました',
      description: '表示項目の設定が更新されました',
    });
  }

  function handleColumnSettingsReset() {
    setAuditLogColumns({
      date: true,
      user: true,
      action: true,
      target: true,
      before_data: false,
      after_data: false,
      details: false,
      ip_address: false,
      user_agent: false,
      session_id: false,
    });
    toast({
      title: '初期設定に戻しました',
      description: '表示項目を初期設定に戻しました',
    });
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">監査ログ</h1>
          <p className="text-gray-600 mt-2">システム内のユーザーアクティビティを監視・記録します</p>
        </div>
        <Button onClick={handleExport} disabled={isLoading}>
          <Download className="w-4 h-4 mr-2" />
          エクスポート
        </Button>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">検索</label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="アクションやターゲットを検索..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">アクション</label>
              <Select
                value={filters.action}
                onValueChange={(value) => handleFilterChange('action', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="全てのアクション" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全てのアクション</SelectItem>
                  <SelectItem value="user_login">ログイン</SelectItem>
                  <SelectItem value="user_logout">ログアウト</SelectItem>
                  <SelectItem value="user_login_failed">ログイン失敗</SelectItem>
                  <SelectItem value="create">作成</SelectItem>
                  <SelectItem value="update">更新</SelectItem>
                  <SelectItem value="delete">削除</SelectItem>
                  <SelectItem value="view">閲覧</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">ユーザーID</label>
              <Input
                placeholder="ユーザーID"
                value={filters.userId}
                onChange={(e) => handleFilterChange('userId', e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">開始日</label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">終了日</label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ログテーブル */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              <CardTitle>ログ一覧 ({pagination.total}件)</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsColumnSettingsOpen(true)}>
              表示項目設定
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-lg">読み込み中...</div>
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {auditLogColumns.date && <TableHead>日時</TableHead>}
                      {auditLogColumns.user && <TableHead>ユーザー</TableHead>}
                      {auditLogColumns.action && <TableHead>アクション</TableHead>}
                      {auditLogColumns.target && <TableHead>対象</TableHead>}
                      {auditLogColumns.before_data && <TableHead>変更前</TableHead>}
                      {auditLogColumns.after_data && <TableHead>変更後</TableHead>}
                      {auditLogColumns.details && <TableHead>詳細</TableHead>}
                      {auditLogColumns.ip_address && <TableHead>IPアドレス</TableHead>}
                      {auditLogColumns.user_agent && <TableHead>ユーザーエージェント</TableHead>}
                      {auditLogColumns.session_id && <TableHead>セッションID</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        {auditLogColumns.date && (
                          <TableCell className="font-mono text-sm">
                            {format(new Date(log.created_at), 'MM/dd HH:mm:ss', { locale: ja })}
                          </TableCell>
                        )}
                        {auditLogColumns.user && (
                          <TableCell>
                            <div className="space-y-1">
                              <div className="text-sm font-medium">
                                {log.user_profiles
                                  ? `${log.user_profiles.family_name} ${log.user_profiles.first_name}`
                                  : log.user_id}
                              </div>
                              <div className="text-xs font-mono text-muted-foreground">
                                {log.user_id ? log.user_id.slice(0, 8) + '...' : '-'}
                              </div>
                            </div>
                          </TableCell>
                        )}
                        {auditLogColumns.action && (
                          <TableCell>{getActionBadge(log.action)}</TableCell>
                        )}
                        {auditLogColumns.target && (
                          <TableCell>
                            <div className="space-y-1">
                              <div className="text-sm font-medium">{log.target_type || '-'}</div>
                              {log.target_id && (
                                <div className="text-xs font-mono text-muted-foreground">
                                  {log.target_id.slice(0, 8)}...
                                </div>
                              )}
                            </div>
                          </TableCell>
                        )}
                        {auditLogColumns.before_data && (
                          <TableCell className="text-sm text-gray-600">
                            {log.details?.before ? JSON.stringify(log.details.before) : '-'}
                          </TableCell>
                        )}
                        {auditLogColumns.after_data && (
                          <TableCell className="text-sm text-gray-600">
                            {log.details?.after ? JSON.stringify(log.details.after) : '-'}
                          </TableCell>
                        )}
                        {auditLogColumns.details && (
                          <TableCell className="text-sm text-gray-600">
                            {log.details && Object.keys(log.details).length > 0
                              ? JSON.stringify(log.details)
                              : '-'}
                          </TableCell>
                        )}
                        {auditLogColumns.ip_address && (
                          <TableCell className="font-mono text-sm">{log.ip_address}</TableCell>
                        )}
                        {auditLogColumns.user_agent && (
                          <TableCell className="text-sm text-gray-600 max-w-xs truncate">
                            {log.user_agent || '-'}
                          </TableCell>
                        )}
                        {auditLogColumns.session_id && (
                          <TableCell className="text-sm text-gray-600 font-mono">
                            {((log.details as Record<string, unknown>)?.session_id as string) ||
                              '-'}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {logs.length === 0 && (
                <div className="text-center py-8 text-gray-500">ログが見つかりませんでした</div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ページネーション */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => handlePageChange(pagination.page - 1)}
                  className={
                    pagination.page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'
                  }
                />
              </PaginationItem>
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                <PaginationItem key={page}>
                  <PaginationLink
                    onClick={() => handlePageChange(page)}
                    isActive={page === pagination.page}
                    className="cursor-pointer"
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  onClick={() => handlePageChange(pagination.page + 1)}
                  className={
                    pagination.page >= pagination.totalPages
                      ? 'pointer-events-none opacity-50'
                      : 'cursor-pointer'
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* 詳細ダイアログ */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>ログ詳細</DialogTitle>
            <DialogDescription>監査ログの詳細情報を表示します</DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">ID</label>
                  <p className="text-sm text-gray-900">{selectedLog.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">日時</label>
                  <p className="text-sm text-gray-900">
                    {format(new Date(selectedLog.created_at), 'yyyy/MM/dd HH:mm:ss', {
                      locale: ja,
                    })}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">ユーザー</label>
                  <p className="text-sm text-gray-900">
                    {selectedLog.user_profiles
                      ? `${selectedLog.user_profiles.family_name} ${selectedLog.user_profiles.first_name}`
                      : selectedLog.user_id}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">アクション</label>
                  <div className="mt-1">{getActionBadge(selectedLog.action)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">ターゲットタイプ</label>
                  <p className="text-sm text-gray-900">{selectedLog.target_type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">ターゲットID</label>
                  <p className="text-sm text-gray-900">{selectedLog.target_id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">IPアドレス</label>
                  <p className="text-sm text-gray-900 font-mono">{selectedLog.ip_address}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">ユーザーエージェント</label>
                  <p className="text-sm text-gray-900 text-xs break-all">
                    {selectedLog.user_agent}
                  </p>
                </div>
              </div>

              {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                <>
                  <Separator />
                  <div>
                    <label className="text-sm font-medium text-gray-700">詳細情報</label>
                    <pre className="mt-2 p-3 bg-gray-50 rounded-md text-xs overflow-auto max-h-40">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 表示項目設定ダイアログ */}
      <Dialog open={isColumnSettingsOpen} onOpenChange={setIsColumnSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Settings className="w-5 h-5 text-blue-600" />
              <span>表示項目設定</span>
            </DialogTitle>
            <DialogDescription>テーブルに表示する項目を選択してください</DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-3">
              {[
                { key: 'date', label: '日時' },
                { key: 'user', label: 'ユーザー' },
                { key: 'action', label: 'アクション' },
                { key: 'target', label: '対象' },
                { key: 'before_data', label: '変更前' },
                { key: 'after_data', label: '変更後' },
                { key: 'details', label: '詳細' },
                { key: 'ip_address', label: 'IPアドレス' },
                { key: 'user_agent', label: 'ユーザーエージェント' },
                { key: 'session_id', label: 'セッションID' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={key}
                    checked={auditLogColumns[key as keyof typeof auditLogColumns]}
                    onChange={(e) =>
                      setAuditLogColumns((prev) => ({
                        ...prev,
                        [key]: e.target.checked,
                      }))
                    }
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor={key} className="text-sm font-medium text-gray-700">
                    {label}
                  </label>
                </div>
              ))}
            </div>
            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={handleColumnSettingsReset}>
                初期設定に戻す
              </Button>
              <Button
                onClick={() => {
                  handleColumnSettingsApply();
                  setIsColumnSettingsOpen(false);
                }}
              >
                適用
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
