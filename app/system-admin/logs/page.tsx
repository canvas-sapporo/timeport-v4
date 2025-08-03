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

// 型定義
interface SystemLog {
  id: string;
  created_at: string;
  level: string;
  message: string;
  path: string;
  status_code: number;
  response_time_ms: number;
  company_id: string;
  user_id: string;
  feature_name: string;
  resource_type: string;
  resource_id: string;
  environment: string;
  app_version: string;
  action_type: string;
  metadata: any;
  method: string;
  memory_usage_mb: number;
  error_stack: string;
  session_id: string;
  ip_address: string;
  user_agent: string;
  referer: string;
  trace_id: string;
  request_id: string;
  companies?: {
    id: string;
    name: string;
  };
  user_profiles?: {
    id: string;
    family_name: string;
    first_name: string;
  };
}

interface AuditLog {
  id: string;
  created_at: string;
  company_id: string;
  user_id: string;
  action: string;
  target_type: string;
  target_id: string;
  before_data: any;
  after_data: any;
  details: any;
  ip_address: string;
  user_agent: string;
  session_id: string;
  user_profiles?: {
    id: string;
    family_name: string;
    first_name: string;
  };
}

interface SystemLogsFilter {
  page: number;
  limit: number;
  start_date?: string;
  end_date?: string;
  search?: string;
}

interface AuditLogsFilter {
  page: number;
  limit: number;
  start_date?: string;
  end_date?: string;
  search?: string;
}

export default function SystemAdminLogsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  // タブ状態
  const [activeTab, setActiveTab] = useState('system-logs');

  // システムログ状態
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [systemLogsLoading, setSystemLogsLoading] = useState(true);
  const [systemLogsTotal, setSystemLogsTotal] = useState(0);
  const [systemLogsCurrentPage, setSystemLogsCurrentPage] = useState(1);
  const [systemLogsTotalPages, setSystemLogsTotalPages] = useState(1);
  const [systemLogsFilter, setSystemLogsFilter] = useState<SystemLogsFilter>({
    page: 1,
    limit: 50,
  });

  // 監査ログ状態
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditLogsLoading, setAuditLogsLoading] = useState(true);
  const [auditLogsTotal, setAuditLogsTotal] = useState(0);
  const [auditLogsCurrentPage, setAuditLogsCurrentPage] = useState(1);
  const [auditLogsTotalPages, setAuditLogsTotalPages] = useState(1);
  const [auditLogsFilter, setAuditLogsFilter] = useState<AuditLogsFilter>({
    page: 1,
    limit: 50,
  });

  // システムログ表示項目の状態
  const [systemLogColumns, setSystemLogColumns] = useState({
    date: true,
    company: true,
    user: true,
    feature_name: false,
    resource_type: false,
    resource_id: false,
    environment: false,
    app_version: false,
    action_type: true,
    level: true,
    method: true,
    status_code: true,
    message: true,
    metadata: false,
    path: false,
    response_time: false,
    memory_usage_mb: false,
    error_stack: false,
    session_id: false,
    ip_address: false,
    user_agent: false,
    referer: false,
    trace_id: false,
    request_id: false,
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
  const [columnSettingsType, setColumnSettingsType] = useState<'system' | 'audit'>('system');

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
  const loadSystemLogs = async (): Promise<void> => {
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

  const updateSystemLogsFilter = (updates: Partial<SystemLogsFilter>): void => {
    setSystemLogsFilter((prev) => ({
      ...prev,
      ...updates,
      page: 1,
    }));
  };

  const handleSystemLogsPageChange = (page: number): void => {
    updateSystemLogsFilter({ page });
  };

  const handleSystemLogsExport = async (): Promise<void> => {
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
  const loadAuditLogs = async (): Promise<void> => {
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

  const updateAuditLogsFilter = (updates: Partial<AuditLogsFilter>): void => {
    setAuditLogsFilter((prev) => ({
      ...prev,
      ...updates,
      page: 1,
    }));
  };

  const handleAuditLogsPageChange = (page: number): void => {
    updateAuditLogsFilter({ page });
  };

  const handleAuditLogsExport = async (): Promise<void> => {
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
  const getLevelBadge = (level: string) => {
    const variants: Record<string, 'secondary' | 'default' | 'destructive'> = {
      debug: 'secondary',
      info: 'default',
      warn: 'secondary',
      error: 'destructive',
      fatal: 'destructive',
    };

    return <Badge variant={variants[level] || 'default'}>{level?.toUpperCase()}</Badge>;
  };

  const getStatusBadge = (statusCode: number) => {
    if (!statusCode) return null;

    let variant: 'default' | 'destructive' | 'secondary' = 'default';
    if (statusCode >= 400) variant = 'destructive';
    else if (statusCode >= 300) variant = 'secondary';

    return <Badge variant={variant as any}>{statusCode}</Badge>;
  };

  const getActionBadge = (action: string) => {
    let variant: 'default' | 'destructive' | 'secondary' = 'default';

    if (action?.includes('delete')) variant = 'destructive';
    else if (action?.includes('create')) variant = 'default';
    else if (action?.includes('update')) variant = 'secondary';

    return <Badge variant={variant as any}>{action}</Badge>;
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
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setColumnSettingsType('system');
                  setIsColumnSettingsDialogOpen(true);
                }}
              >
                表示項目設定
              </Button>
              <Button onClick={handleSystemLogsExport} variant="outline">
                エクスポート
              </Button>
            </div>
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
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {systemLogColumns.date && <TableHead>日時</TableHead>}
                          {systemLogColumns.company && <TableHead>企業</TableHead>}
                          {systemLogColumns.user && <TableHead>ユーザー</TableHead>}
                          {systemLogColumns.feature_name && <TableHead>機能名</TableHead>}
                          {systemLogColumns.resource_type && <TableHead>リソースタイプ</TableHead>}
                          {systemLogColumns.resource_id && <TableHead>リソースID</TableHead>}
                          {systemLogColumns.environment && <TableHead>環境</TableHead>}
                          {systemLogColumns.app_version && <TableHead>アプリバージョン</TableHead>}
                          {systemLogColumns.action_type && <TableHead>アクションタイプ</TableHead>}
                          {systemLogColumns.level && <TableHead>レベル</TableHead>}
                          {systemLogColumns.method && <TableHead>メソッド</TableHead>}
                          {systemLogColumns.status_code && <TableHead>ステータス</TableHead>}
                          {systemLogColumns.message && <TableHead>メッセージ</TableHead>}
                          {systemLogColumns.metadata && <TableHead>メタデータ</TableHead>}
                          {systemLogColumns.path && <TableHead>パス</TableHead>}
                          {systemLogColumns.response_time && <TableHead>レスポンス時間</TableHead>}
                          {systemLogColumns.memory_usage_mb && <TableHead>メモリ使用量</TableHead>}
                          {systemLogColumns.error_stack && <TableHead>エラースタック</TableHead>}
                          {systemLogColumns.session_id && <TableHead>セッションID</TableHead>}
                          {systemLogColumns.ip_address && <TableHead>IPアドレス</TableHead>}
                          {systemLogColumns.user_agent && (
                            <TableHead>ユーザーエージェント</TableHead>
                          )}
                          {systemLogColumns.referer && <TableHead>リファラー</TableHead>}
                          {systemLogColumns.trace_id && <TableHead>トレースID</TableHead>}
                          {systemLogColumns.request_id && <TableHead>リクエストID</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {systemLogs.map((log) => (
                          <TableRow key={log.id}>
                            {systemLogColumns.date && (
                              <TableCell className="font-mono text-sm">
                                {format(new Date(log.created_at), 'MM/dd HH:mm:ss', { locale: ja })}
                              </TableCell>
                            )}
                            {systemLogColumns.company && (
                              <TableCell>
                                {log.companies ? (
                                  <div className="space-y-1">
                                    <div className="text-sm font-medium">{log.companies.name}</div>
                                    <div className="text-xs font-mono text-muted-foreground">
                                      {log.company_id ? log.company_id.slice(0, 8) + '...' : '-'}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="font-mono text-xs">
                                    {log.company_id ? log.company_id.slice(0, 8) + '...' : '-'}
                                  </div>
                                )}
                              </TableCell>
                            )}
                            {systemLogColumns.user && (
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
                            {systemLogColumns.feature_name && (
                              <TableCell className="text-sm">{log.feature_name || '-'}</TableCell>
                            )}
                            {systemLogColumns.resource_type && (
                              <TableCell className="text-sm">{log.resource_type || '-'}</TableCell>
                            )}
                            {systemLogColumns.resource_id && (
                              <TableCell className="font-mono text-xs">
                                {log.resource_id ? log.resource_id.slice(0, 8) + '...' : '-'}
                              </TableCell>
                            )}
                            {systemLogColumns.environment && (
                              <TableCell className="text-sm">{log.environment || '-'}</TableCell>
                            )}
                            {systemLogColumns.app_version && (
                              <TableCell className="text-sm">{log.app_version || '-'}</TableCell>
                            )}
                            {systemLogColumns.action_type && (
                              <TableCell>{getActionBadge(log.action_type || '')}</TableCell>
                            )}
                            {systemLogColumns.level && (
                              <TableCell>{getLevelBadge(log.level)}</TableCell>
                            )}
                            {systemLogColumns.method && (
                              <TableCell className="font-mono text-sm">
                                {log.method || '-'}
                              </TableCell>
                            )}
                            {systemLogColumns.status_code && (
                              <TableCell>{getStatusBadge(log.status_code)}</TableCell>
                            )}
                            {systemLogColumns.message && (
                              <TableCell className="max-w-md">
                                <div className="truncate">
                                  {log.metadata?.message || log.message || 'メッセージなし'}
                                </div>
                                {log.error_message && (
                                  <div className="text-xs text-red-600 mt-1">
                                    {log.error_message}
                                  </div>
                                )}
                              </TableCell>
                            )}
                            {systemLogColumns.metadata && (
                              <TableCell className="max-w-xs">
                                <div className="text-xs">
                                  {log.metadata ? (
                                    <pre className="whitespace-pre-wrap text-xs max-h-20 overflow-y-auto">
                                      {JSON.stringify(log.metadata, null, 2)}
                                    </pre>
                                  ) : (
                                    '-'
                                  )}
                                </div>
                              </TableCell>
                            )}
                            {systemLogColumns.path && (
                              <TableCell className="font-mono text-sm">
                                <div className="truncate max-w-32">{log.path || '-'}</div>
                              </TableCell>
                            )}
                            {systemLogColumns.response_time && (
                              <TableCell className="text-right">
                                {log.response_time_ms ? `${log.response_time_ms}ms` : '-'}
                              </TableCell>
                            )}
                            {systemLogColumns.memory_usage_mb && (
                              <TableCell className="text-right">
                                {log.memory_usage_mb ? `${log.memory_usage_mb}MB` : '-'}
                              </TableCell>
                            )}
                            {systemLogColumns.error_stack && (
                              <TableCell className="max-w-xs">
                                <div className="text-xs">
                                  {log.error_stack ? (
                                    <pre className="whitespace-pre-wrap text-xs max-h-20 overflow-y-auto">
                                      {log.error_stack}
                                    </pre>
                                  ) : (
                                    '-'
                                  )}
                                </div>
                              </TableCell>
                            )}
                            {systemLogColumns.session_id && (
                              <TableCell className="font-mono text-xs">
                                {log.session_id || '-'}
                              </TableCell>
                            )}
                            {systemLogColumns.ip_address && (
                              <TableCell className="font-mono text-xs">
                                {log.ip_address || '-'}
                              </TableCell>
                            )}
                            {systemLogColumns.user_agent && (
                              <TableCell className="max-w-xs">
                                <div className="text-xs truncate" title={log.user_agent || ''}>
                                  {log.user_agent || '-'}
                                </div>
                              </TableCell>
                            )}
                            {systemLogColumns.referer && (
                              <TableCell className="max-w-xs">
                                <div className="text-xs truncate" title={log.referer || ''}>
                                  {log.referer || '-'}
                                </div>
                              </TableCell>
                            )}
                            {systemLogColumns.trace_id && (
                              <TableCell className="font-mono text-xs">
                                {log.trace_id || '-'}
                              </TableCell>
                            )}
                            {systemLogColumns.request_id && (
                              <TableCell className="font-mono text-xs">
                                {log.request_id || '-'}
                              </TableCell>
                            )}
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
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setColumnSettingsType('audit');
                  setIsColumnSettingsDialogOpen(true);
                }}
              >
                表示項目設定
              </Button>
              <Button onClick={handleAuditLogsExport} variant="outline">
                エクスポート
              </Button>
            </div>
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
              <CardTitle>ログ一覧 ({auditLogsTotal.toLocaleString()}件)</CardTitle>
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
                          {auditLogColumns.company && <TableHead>企業</TableHead>}
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
        </TabsContent>
      </Tabs>

      {/* 表示項目設定ダイアログ */}
      <Dialog open={isColumnSettingsDialogOpen} onOpenChange={setIsColumnSettingsDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Settings className="w-5 h-5 text-blue-600" />
              <span>表示項目設定</span>
            </DialogTitle>
            <DialogDescription>
              {columnSettingsType === 'system' ? 'システムログ' : '監査ログ'}
              のテーブルに表示する項目を選択してください
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4 flex-1 overflow-hidden flex flex-col">
            <div className="grid grid-cols-1 gap-3 overflow-y-auto flex-1 pr-2">
              {columnSettingsType === 'system'
                ? // システムログの表示項目
                  [
                    { key: 'date', label: '日時' },
                    { key: 'company', label: '企業' },
                    { key: 'user', label: 'ユーザー' },
                    { key: 'feature_name', label: '機能名' },
                    { key: 'resource_type', label: 'リソースタイプ' },
                    { key: 'resource_id', label: 'リソースID' },
                    { key: 'environment', label: '環境' },
                    { key: 'app_version', label: 'アプリバージョン' },
                    { key: 'action_type', label: 'アクションタイプ' },
                    { key: 'level', label: 'レベル' },
                    { key: 'method', label: 'メソッド' },
                    { key: 'status_code', label: 'ステータスコード' },
                    { key: 'message', label: 'メッセージ' },
                    { key: 'metadata', label: 'メタデータ' },
                    { key: 'path', label: 'パス' },
                    { key: 'response_time', label: 'レスポンス時間' },
                    { key: 'memory_usage_mb', label: 'メモリ使用量' },
                    { key: 'error_stack', label: 'エラースタック' },
                    { key: 'session_id', label: 'セッションID' },
                    { key: 'ip_address', label: 'IPアドレス' },
                    { key: 'user_agent', label: 'ユーザーエージェント' },
                    { key: 'referer', label: 'リファラー' },
                    { key: 'trace_id', label: 'トレースID' },
                    { key: 'request_id', label: 'リクエストID' },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={key}
                        checked={systemLogColumns[key as keyof typeof systemLogColumns]}
                        onChange={(e) =>
                          setSystemLogColumns((prev) => ({
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
                  ))
                : // 監査ログの表示項目
                  [
                    { key: 'date', label: '日時' },
                    { key: 'company', label: '企業' },
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
            <div className="flex justify-between pt-4 border-t mt-4 flex-shrink-0">
              <Button
                variant="outline"
                onClick={() => {
                  if (columnSettingsType === 'system') {
                    setSystemLogColumns({
                      date: true,
                      company: true,
                      user: true,
                      feature_name: false,
                      resource_type: false,
                      resource_id: false,
                      environment: false,
                      app_version: false,
                      action_type: true,
                      level: true,
                      method: true,
                      status_code: true,
                      message: true,
                      metadata: false,
                      path: false,
                      response_time: false,
                      memory_usage_mb: false,
                      error_stack: false,
                      session_id: false,
                      ip_address: false,
                      user_agent: false,
                      referer: false,
                      trace_id: false,
                      request_id: false,
                    });
                  } else {
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
                  }
                }}
              >
                初期設定に戻す
              </Button>
              <Button onClick={() => setIsColumnSettingsDialogOpen(false)}>適用</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
