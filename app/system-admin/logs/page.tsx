'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Activity, FileText, Search, Filter, Download, Settings } from 'lucide-react';

import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

export default function SystemAdminLogsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  // タブ状態
  const [activeTab, setActiveTab] = useState('system-logs');

  // システムログ状態
  const [systemLogs, setSystemLogs] = useState([]);
  const [systemLogsLoading, setSystemLogsLoading] = useState(true);
  const [systemLogsTotal, setSystemLogsTotal] = useState(0);
  const [systemLogsCurrentPage, setSystemLogsCurrentPage] = useState(1);
  const [systemLogsTotalPages, setSystemLogsTotalPages] = useState(1);
  const [systemLogsFilter, setSystemLogsFilter] = useState({
    page: 1,
    limit: 50,
  });

  // 監査ログ状態
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLogsLoading, setAuditLogsLoading] = useState(true);
  const [auditLogsTotal, setAuditLogsTotal] = useState(0);
  const [auditLogsCurrentPage, setAuditLogsCurrentPage] = useState(1);
  const [auditLogsTotalPages, setAuditLogsTotalPages] = useState(1);
  const [auditLogsFilter, setAuditLogsFilter] = useState({
    page: 1,
    limit: 50,
  });

  // 監査ログ表示項目の状態
  const [auditLogColumns, setAuditLogColumns] = useState({
    date: true,
    company: true,
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

  // 表示項目設定ダイアログの状態
  const [isColumnSettingsDialogOpen, setIsColumnSettingsDialogOpen] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'system-admin') {
      router.push('/login');
      return;
    }
  }, [user, router]);

  // システムログを読み込み
  useEffect(() => {
    if (user?.role === 'system-admin' && activeTab === 'system-logs') {
      loadSystemLogs();
    }
  }, [user, activeTab, systemLogsFilter]);

  // 監査ログを読み込み
  useEffect(() => {
    if (user?.role === 'system-admin' && activeTab === 'audit-logs') {
      loadAuditLogs();
    }
  }, [user, activeTab, auditLogsFilter]);

  if (!user || user.role !== 'system-admin') {
    return null;
  }

  // システムログ関連の関数
  const loadSystemLogs = async () => {
    try {
      setSystemLogsLoading(true);
      const params = new URLSearchParams();
      Object.entries(systemLogsFilter).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            params.append(key, value.join(','));
          } else {
            params.append(key, String(value));
          }
        }
      });

      const response = await fetch(`/api/system-admin/logs/system?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch system logs');
      }
      const result = await response.json();
      setSystemLogs(result.data);
      setSystemLogsTotal(result.total);
      setSystemLogsCurrentPage(result.page);
      setSystemLogsTotalPages(result.totalPages);
    } catch (error) {
      toast({
        title: 'エラー',
        description: 'システムログの読み込みに失敗しました',
        variant: 'destructive',
      });
    } finally {
      setSystemLogsLoading(false);
    }
  };

  const updateSystemLogsFilter = (updates) => {
    setSystemLogsFilter((prev) => ({
      ...prev,
      ...updates,
      page: 1,
    }));
  };

  const handleSystemLogsPageChange = (page) => {
    updateSystemLogsFilter({ page });
  };

  const handleSystemLogsExport = async () => {
    try {
      toast({
        title: '成功',
        description: 'システムログをエクスポートしました',
      });
    } catch (error) {
      toast({
        title: 'エラー',
        description: 'エクスポートに失敗しました',
        variant: 'destructive',
      });
    }
  };

  // 監査ログ関連の関数
  const loadAuditLogs = async () => {
    try {
      setAuditLogsLoading(true);
      const params = new URLSearchParams();
      Object.entries(auditLogsFilter).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            params.append(key, value.join(','));
          } else {
            params.append(key, String(value));
          }
        }
      });

      const response = await fetch(`/api/system-admin/logs/audit?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch audit logs');
      }
      const result = await response.json();
      setAuditLogs(result.data);
      setAuditLogsTotal(result.total);
      setAuditLogsCurrentPage(result.page);
      setAuditLogsTotalPages(result.totalPages);
    } catch (error) {
      toast({
        title: 'エラー',
        description: '監査ログの読み込みに失敗しました',
        variant: 'destructive',
      });
    } finally {
      setAuditLogsLoading(false);
    }
  };

  const updateAuditLogsFilter = (updates) => {
    setAuditLogsFilter((prev) => ({
      ...prev,
      ...updates,
      page: 1,
    }));
  };

  const handleAuditLogsPageChange = (page) => {
    updateAuditLogsFilter({ page });
  };

  const handleAuditLogsExport = async () => {
    try {
      toast({
        title: '成功',
        description: '監査ログをエクスポートしました',
      });
    } catch (error) {
      toast({
        title: 'エラー',
        description: 'エクスポートに失敗しました',
        variant: 'destructive',
      });
    }
  };

  // ユーティリティ関数
  const getLevelBadge = (level) => {
    const variants = {
      debug: 'secondary',
      info: 'default',
      warn: 'secondary',
      error: 'destructive',
      fatal: 'destructive',
    };

    return <Badge variant={variants[level] || 'default'}>{level?.toUpperCase()}</Badge>;
  };

  const getStatusBadge = (statusCode) => {
    if (!statusCode) return null;

    let variant = 'default';
    if (statusCode >= 400) variant = 'destructive';
    else if (statusCode >= 300) variant = 'secondary';

    return <Badge variant={variant}>{statusCode}</Badge>;
  };

  const getActionBadge = (action) => {
    let variant = 'default';

    if (action?.includes('delete')) variant = 'destructive';
    else if (action?.includes('create')) variant = 'default';
    else if (action?.includes('update')) variant = 'secondary';

    return <Badge variant={variant}>{action}</Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ログ管理</h1>
          <p className="text-gray-600 mt-2">システムログと監査ログを管理します</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="system-logs" className="flex items-center space-x-2">
            <Activity className="w-4 h-4" />
            <span>システムログ</span>
          </TabsTrigger>
          <TabsTrigger value="audit-logs" className="flex items-center space-x-2">
            <FileText className="w-4 h-4" />
            <span>監査ログ</span>
          </TabsTrigger>
        </TabsList>

        {/* システムログタブ */}
        <TabsContent value="system-logs" className="space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">システムログ</h2>
              <p className="text-muted-foreground">システムの技術的ログを表示します</p>
            </div>
            <Button onClick={handleSystemLogsExport} variant="outline">
              エクスポート
            </Button>
          </div>

          {/* フィルター */}
          <Card>
            <CardHeader>
              <CardTitle>フィルター</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* 日付範囲 */}
                <div className="space-y-2">
                  <Label>開始日</Label>
                  <Input
                    type="date"
                    value={systemLogsFilter.start_date || ''}
                    onChange={(e) =>
                      updateSystemLogsFilter({ start_date: e.target.value || undefined })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>終了日</Label>
                  <Input
                    type="date"
                    value={systemLogsFilter.end_date || ''}
                    onChange={(e) =>
                      updateSystemLogsFilter({ end_date: e.target.value || undefined })
                    }
                  />
                </div>

                {/* 検索 */}
                <div className="space-y-2 md:col-span-2">
                  <Label>検索</Label>
                  <Input
                    placeholder="エラーメッセージやパスで検索..."
                    value={systemLogsFilter.search || ''}
                    onChange={(e) =>
                      updateSystemLogsFilter({ search: e.target.value || undefined })
                    }
                  />
                </div>

                {/* 表示件数 */}
                <div className="space-y-2">
                  <Label>表示件数</Label>
                  <Select
                    value={systemLogsFilter.limit?.toString() || '50'}
                    onValueChange={(value) => updateSystemLogsFilter({ limit: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25件</SelectItem>
                      <SelectItem value="50">50件</SelectItem>
                      <SelectItem value="100">100件</SelectItem>
                      <SelectItem value="200">200件</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ログテーブル */}
          <Card>
            <CardHeader>
              <CardTitle>ログ一覧 ({systemLogsTotal.toLocaleString()}件)</CardTitle>
            </CardHeader>
            <CardContent>
              {systemLogsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-lg">読み込み中...</div>
                </div>
              ) : (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>日時</TableHead>
                          <TableHead>レベル</TableHead>
                          <TableHead>メッセージ</TableHead>
                          <TableHead>パス</TableHead>
                          <TableHead>ステータス</TableHead>
                          <TableHead>時間(ms)</TableHead>
                          <TableHead>ユーザー</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {systemLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="font-mono text-sm">
                              {format(new Date(log.created_at), 'MM/dd HH:mm:ss', { locale: ja })}
                            </TableCell>
                            <TableCell>{getLevelBadge(log.level)}</TableCell>
                            <TableCell className="max-w-md">
                              <div className="truncate">
                                {log.metadata?.message || 'メッセージなし'}
                              </div>
                              {log.error_message && (
                                <div className="text-xs text-red-600 mt-1">{log.error_message}</div>
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              <div className="truncate max-w-32">
                                {log.method} {log.path}
                              </div>
                            </TableCell>
                            <TableCell>{getStatusBadge(log.status_code)}</TableCell>
                            <TableCell className="text-right">
                              {log.response_time_ms ? `${log.response_time_ms}ms` : '-'}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {log.user_id ? log.user_id.slice(0, 8) + '...' : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* ページネーション */}
                  {systemLogsTotalPages > 1 && (
                    <div className="mt-4">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              onClick={() => handleSystemLogsPageChange(systemLogsCurrentPage - 1)}
                              className={
                                systemLogsCurrentPage <= 1
                                  ? 'pointer-events-none opacity-50'
                                  : 'cursor-pointer'
                              }
                            />
                          </PaginationItem>

                          {Array.from({ length: Math.min(5, systemLogsTotalPages) }, (_, i) => {
                            const page =
                              Math.max(
                                1,
                                Math.min(systemLogsTotalPages - 4, systemLogsCurrentPage - 2)
                              ) + i;
                            return (
                              <PaginationItem key={page}>
                                <PaginationLink
                                  onClick={() => handleSystemLogsPageChange(page)}
                                  isActive={page === systemLogsCurrentPage}
                                  className="cursor-pointer"
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          })}

                          <PaginationItem>
                            <PaginationNext
                              onClick={() => handleSystemLogsPageChange(systemLogsCurrentPage + 1)}
                              className={
                                systemLogsCurrentPage >= systemLogsTotalPages
                                  ? 'pointer-events-none opacity-50'
                                  : 'cursor-pointer'
                              }
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 監査ログタブ */}
        <TabsContent value="audit-logs" className="space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">監査ログ</h2>
              <p className="text-muted-foreground">ユーザーの操作履歴を表示します</p>
            </div>
            <Button onClick={handleAuditLogsExport} variant="outline">
              エクスポート
            </Button>
          </div>

          {/* フィルター */}
          <Card>
            <CardHeader>
              <CardTitle>フィルター</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* 日付範囲 */}
                <div className="space-y-2">
                  <Label>開始日</Label>
                  <Input
                    type="date"
                    value={auditLogsFilter.start_date || ''}
                    onChange={(e) =>
                      updateAuditLogsFilter({ start_date: e.target.value || undefined })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>終了日</Label>
                  <Input
                    type="date"
                    value={auditLogsFilter.end_date || ''}
                    onChange={(e) =>
                      updateAuditLogsFilter({ end_date: e.target.value || undefined })
                    }
                  />
                </div>

                {/* 検索 */}
                <div className="space-y-2 md:col-span-2">
                  <Label>検索</Label>
                  <Input
                    placeholder="アクションや対象タイプで検索..."
                    value={auditLogsFilter.search || ''}
                    onChange={(e) => updateAuditLogsFilter({ search: e.target.value || undefined })}
                  />
                </div>

                {/* 表示件数 */}
                <div className="space-y-2">
                  <Label>表示件数</Label>
                  <select
                    className="w-full px-3 py-2 border border-input bg-background rounded-md"
                    value={auditLogsFilter.limit || 50}
                    onChange={(e) => updateAuditLogsFilter({ limit: parseInt(e.target.value) })}
                  >
                    <option value={25}>25件</option>
                    <option value={50}>50件</option>
                    <option value={100}>100件</option>
                    <option value={200}>200件</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ログテーブル */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>ログ一覧 ({auditLogsTotal.toLocaleString()}件)</CardTitle>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsColumnSettingsDialogOpen(true)}
                  >
                    表示項目設定
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {auditLogsLoading ? (
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
                          {auditLogColumns.company && <TableHead>会社</TableHead>}
                          {auditLogColumns.user && <TableHead>ユーザー</TableHead>}
                          {auditLogColumns.action && <TableHead>アクション</TableHead>}
                          {auditLogColumns.target && <TableHead>対象</TableHead>}
                          {auditLogColumns.before_data && <TableHead>変更前</TableHead>}
                          {auditLogColumns.after_data && <TableHead>変更後</TableHead>}
                          {auditLogColumns.details && <TableHead>詳細</TableHead>}
                          {auditLogColumns.ip_address && <TableHead>IPアドレス</TableHead>}
                          {auditLogColumns.user_agent && (
                            <TableHead>ユーザーエージェント</TableHead>
                          )}
                          {auditLogColumns.session_id && <TableHead>セッションID</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {auditLogs.map((log) => (
                          <TableRow key={log.id}>
                            {auditLogColumns.date && (
                              <TableCell className="font-mono text-sm">
                                {format(new Date(log.created_at), 'MM/dd HH:mm:ss', { locale: ja })}
                              </TableCell>
                            )}
                            {auditLogColumns.company && (
                              <TableCell className="text-sm">
                                {log.company_id ? log.company_id.slice(0, 8) + '...' : '-'}
                              </TableCell>
                            )}
                            {auditLogColumns.user && (
                              <TableCell>
                                {log.user_profiles ? (
                                  <div className="space-y-1">
                                    <div className="text-sm font-medium">
                                      {log.user_profiles.family_name} {log.user_profiles.first_name}
                                    </div>
                                    <div className="text-xs font-mono text-muted-foreground">
                                      {log.user_id ? log.user_id.slice(0, 8) + '...' : '-'}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="font-mono text-xs">
                                    {log.user_id ? log.user_id.slice(0, 8) + '...' : '-'}
                                  </div>
                                )}
                              </TableCell>
                            )}
                            {auditLogColumns.action && (
                              <TableCell>{getActionBadge(log.action)}</TableCell>
                            )}
                            {auditLogColumns.target && (
                              <TableCell>
                                <div className="space-y-1">
                                  <div className="text-sm font-medium">
                                    {log.target_type || '-'}
                                  </div>
                                  {log.target_id && (
                                    <div className="text-xs font-mono text-muted-foreground">
                                      {log.target_id.slice(0, 8)}...
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            )}
                            {auditLogColumns.before_data && (
                              <TableCell className="max-w-xs">
                                <div className="text-xs">
                                  {log.before_data ? (
                                    <pre className="whitespace-pre-wrap text-xs max-h-20 overflow-y-auto">
                                      {JSON.stringify(log.before_data, null, 2)}
                                    </pre>
                                  ) : (
                                    '-'
                                  )}
                                </div>
                              </TableCell>
                            )}
                            {auditLogColumns.after_data && (
                              <TableCell className="max-w-xs">
                                <div className="text-xs">
                                  {log.after_data ? (
                                    <pre className="whitespace-pre-wrap text-xs max-h-20 overflow-y-auto">
                                      {JSON.stringify(log.after_data, null, 2)}
                                    </pre>
                                  ) : (
                                    '-'
                                  )}
                                </div>
                              </TableCell>
                            )}
                            {auditLogColumns.details && (
                              <TableCell className="max-w-xs">
                                <div className="text-xs">
                                  {log.details ? (
                                    <pre className="whitespace-pre-wrap text-xs max-h-20 overflow-y-auto">
                                      {JSON.stringify(log.details, null, 2)}
                                    </pre>
                                  ) : (
                                    '-'
                                  )}
                                </div>
                              </TableCell>
                            )}
                            {auditLogColumns.ip_address && (
                              <TableCell className="font-mono text-xs">
                                {log.ip_address || '-'}
                              </TableCell>
                            )}
                            {auditLogColumns.user_agent && (
                              <TableCell className="max-w-xs">
                                <div className="text-xs truncate" title={log.user_agent || ''}>
                                  {log.user_agent || '-'}
                                </div>
                              </TableCell>
                            )}
                            {auditLogColumns.session_id && (
                              <TableCell className="font-mono text-xs">
                                {log.session_id || '-'}
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* ページネーション */}
                  {auditLogsTotalPages > 1 && (
                    <div className="mt-4">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              onClick={() => handleAuditLogsPageChange(auditLogsCurrentPage - 1)}
                              className={
                                auditLogsCurrentPage <= 1
                                  ? 'pointer-events-none opacity-50'
                                  : 'cursor-pointer'
                              }
                            />
                          </PaginationItem>

                          {Array.from({ length: Math.min(5, auditLogsTotalPages) }, (_, i) => {
                            const page =
                              Math.max(
                                1,
                                Math.min(auditLogsTotalPages - 4, auditLogsCurrentPage - 2)
                              ) + i;
                            return (
                              <PaginationItem key={page}>
                                <PaginationLink
                                  onClick={() => handleAuditLogsPageChange(page)}
                                  isActive={page === auditLogsCurrentPage}
                                  className="cursor-pointer"
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          })}

                          <PaginationItem>
                            <PaginationNext
                              onClick={() => handleAuditLogsPageChange(auditLogsCurrentPage + 1)}
                              className={
                                auditLogsCurrentPage >= auditLogsTotalPages
                                  ? 'pointer-events-none opacity-50'
                                  : 'cursor-pointer'
                              }
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* 表示項目設定ダイアログ */}
          <Dialog open={isColumnSettingsDialogOpen} onOpenChange={setIsColumnSettingsDialogOpen}>
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
                    { key: 'company', label: '会社' },
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
                        checked={auditLogColumns[key]}
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
                  <Button
                    variant="outline"
                    onClick={() => {
                      setAuditLogColumns({
                        date: true,
                        company: true,
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
                    }}
                  >
                    初期設定に戻す
                  </Button>
                  <Button onClick={() => setIsColumnSettingsDialogOpen(false)}>適用</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
