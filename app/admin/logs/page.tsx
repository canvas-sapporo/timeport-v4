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

// システムログの型定義
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
  metadata: Record<string, unknown> | null;
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

interface SystemLogsResponse {
  data: SystemLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
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
  const { toast } = useToast();

  // タブ状態
  const [activeTab, setActiveTab] = useState('system-logs');

  // システムログ状態
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [systemLogsLoading, setSystemLogsLoading] = useState(false);
  const [systemLogsPagination, setSystemLogsPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [systemLogsFilters, setSystemLogsFilters] = useState({
    level: 'all',
    feature_name: '',
    startDate: '',
    endDate: '',
    search: '',
  });

  // 監査ログ状態
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditLogsLoading, setAuditLogsLoading] = useState(false);
  const [auditLogsPagination, setAuditLogsPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [auditLogsFilters, setAuditLogsFilters] = useState({
    action: 'all',
    userId: '',
    startDate: '',
    endDate: '',
    search: '',
  });

  // 共通状態
  const [selectedLog, setSelectedLog] = useState<SystemLog | AuditLog | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isColumnSettingsOpen, setIsColumnSettingsOpen] = useState(false);
  const [columnSettingsType, setColumnSettingsType] = useState<'system' | 'audit'>('audit');
  const [isExporting, setIsExporting] = useState(false);

  // システムログ表示項目設定
  const [systemLogColumns, setSystemLogColumns] = useState({
    date: true,
    level: true,
    feature_name: true,
    action_type: true,
    method: true,
    status_code: true,
    message: true,
    user: false,
    path: false,
    response_time: false,
    metadata: false,
    ip_address: false,
    user_agent: false,
  });

  // 監査ログ表示項目設定
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

    // アクティブなタブに応じてデータを読み込み
    if (activeTab === 'audit-logs') {
      fetchAuditLogs();
    } else if (activeTab === 'system-logs') {
      fetchSystemLogs();
    }
  }, [
    user,
    router,
    activeTab,
    auditLogsPagination.page,
    auditLogsFilters,
    systemLogsPagination.page,
    systemLogsFilters,
  ]);

  // システムログ取得関数
  async function fetchSystemLogs() {
    setSystemLogsLoading(true);
    try {
      // 認証トークンを取得
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No access token available');
      }

      const params = new URLSearchParams({
        page: systemLogsPagination.page.toString(),
        limit: systemLogsPagination.limit.toString(),
        ...(systemLogsFilters.level &&
          systemLogsFilters.level !== 'all' && { level: systemLogsFilters.level }),
        ...(systemLogsFilters.feature_name && { feature_name: systemLogsFilters.feature_name }),
        ...(systemLogsFilters.startDate && { start_date: systemLogsFilters.startDate }),
        ...(systemLogsFilters.endDate && { end_date: systemLogsFilters.endDate }),
        ...(systemLogsFilters.search && { search: systemLogsFilters.search }),
      });

      const response = await fetch(`/api/admin/logs/system?${params}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data: SystemLogsResponse = await response.json();

      if (response.ok) {
        setSystemLogs(data.data);
        setSystemLogsPagination({
          ...systemLogsPagination,
          total: data.total,
          totalPages: data.totalPages,
        });
      } else {
        toast({
          title: 'エラー',
          description: 'システムログの取得に失敗しました',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('システムログ取得エラー:', error);
      toast({
        title: 'エラー',
        description: 'システムログの取得に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setSystemLogsLoading(false);
    }
  }

  // 監査ログ取得関数（既存の実装を維持）
  async function fetchAuditLogs() {
    setAuditLogsLoading(true);
    try {
      // 認証トークンを取得
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No access token available');
      }

      const params = new URLSearchParams({
        page: auditLogsPagination.page.toString(),
        limit: auditLogsPagination.limit.toString(),
        ...(auditLogsFilters.action &&
          auditLogsFilters.action !== 'all' && { action: auditLogsFilters.action }),
        ...(auditLogsFilters.userId && { user_id: auditLogsFilters.userId }),
        ...(auditLogsFilters.startDate && { start_date: auditLogsFilters.startDate }),
        ...(auditLogsFilters.endDate && { end_date: auditLogsFilters.endDate }),
        ...(auditLogsFilters.search && { search: auditLogsFilters.search }),
      });

      const response = await fetch(`/api/admin/logs/audit?${params}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data: AuditLogsResponse = await response.json();

      if (response.ok) {
        setAuditLogs(data.data);
        setAuditLogsPagination({
          ...auditLogsPagination,
          total: data.total,
          totalPages: data.totalPages,
        });
      } else {
        toast({
          title: 'エラー',
          description: '監査ログの取得に失敗しました',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('監査ログ取得エラー:', error);
      toast({
        title: 'エラー',
        description: '監査ログの取得に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setAuditLogsLoading(false);
    }
  }

  // フィルター変更ハンドラー
  function handleSystemLogsFilterChange(key: string, value: string) {
    setSystemLogsFilters((prev) => ({ ...prev, [key]: value }));
    setSystemLogsPagination((prev) => ({ ...prev, page: 1 }));
  }

  function handleAuditLogsFilterChange(key: string, value: string) {
    setAuditLogsFilters((prev) => ({ ...prev, [key]: value }));
    setAuditLogsPagination((prev) => ({ ...prev, page: 1 }));
  }

  // ページ変更ハンドラー
  function handleSystemLogsPageChange(page: number) {
    setSystemLogsPagination((prev) => ({ ...prev, page }));
  }

  function handleAuditLogsPageChange(page: number) {
    setAuditLogsPagination((prev) => ({ ...prev, page }));
  }

  // システムログエクスポートハンドラー
  async function handleSystemLogsExport() {
    setIsExporting(true);
    try {
      // 認証トークンを取得
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No access token available');
      }

      const params = new URLSearchParams({
        ...(systemLogsFilters.level &&
          systemLogsFilters.level !== 'all' && { level: systemLogsFilters.level }),
        ...(systemLogsFilters.feature_name && { feature_name: systemLogsFilters.feature_name }),
        ...(systemLogsFilters.startDate && { start_date: systemLogsFilters.startDate }),
        ...(systemLogsFilters.endDate && { end_date: systemLogsFilters.endDate }),
        ...(systemLogsFilters.search && { search: systemLogsFilters.search }),
      });

      const response = await fetch(`/api/admin/logs/system/export?${params}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `system-logs-${format(new Date(), 'yyyy-MM-dd-HH-mm')}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: '成功',
          description: 'システムログをエクスポートしました',
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
    } finally {
      setIsExporting(false);
    }
  }

  async function handleAuditLogsExport() {
    setIsExporting(true);
    try {
      // 認証トークンを取得
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No access token available');
      }

      const params = new URLSearchParams({
        ...(auditLogsFilters.action &&
          auditLogsFilters.action !== 'all' && { action: auditLogsFilters.action }),
        ...(auditLogsFilters.userId && { user_id: auditLogsFilters.userId }),
        ...(auditLogsFilters.startDate && { start_date: auditLogsFilters.startDate }),
        ...(auditLogsFilters.endDate && { end_date: auditLogsFilters.endDate }),
        ...(auditLogsFilters.search && { search: auditLogsFilters.search }),
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
          description: '監査ログをエクスポートしました',
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
    } finally {
      setIsExporting(false);
    }
  }

  // ユーティリティ関数
  function getLevelBadge(level: string) {
    const levelColors: { [key: string]: string } = {
      debug: 'bg-gray-100 text-gray-800',
      info: 'bg-blue-100 text-blue-800',
      warn: 'bg-yellow-100 text-yellow-800',
      error: 'bg-red-100 text-red-800',
      fatal: 'bg-red-200 text-red-900',
    };

    return (
      <Badge className={levelColors[level] || 'bg-gray-100 text-gray-800'}>
        {level?.toUpperCase()}
      </Badge>
    );
  }

  function getStatusBadge(statusCode: number): JSX.Element | null {
    if (!statusCode) return null;

    let colorClass = 'bg-gray-100 text-gray-800';
    if (statusCode >= 400) colorClass = 'bg-red-100 text-red-800';
    else if (statusCode >= 300) colorClass = 'bg-yellow-100 text-yellow-800';
    else if (statusCode >= 200) colorClass = 'bg-green-100 text-green-800';

    return <Badge className={colorClass}>{statusCode}</Badge>;
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

  function openDetailDialog(log: SystemLog | AuditLog) {
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
    if (columnSettingsType === 'system') {
      setSystemLogColumns({
        date: true,
        level: true,
        feature_name: true,
        action_type: true,
        method: true,
        status_code: true,
        message: true,
        user: false,
        path: false,
        response_time: false,
        metadata: false,
        ip_address: false,
        user_agent: false,
      });
    } else {
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
    }
    toast({
      title: '初期設定に戻しました',
      description: '表示項目を初期設定に戻しました',
    });
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  // 詳細表示コンポーネント
  function SystemLogDetail({ log }: { log: SystemLog }) {
    return (
      <div className="space-y-6">
        {/* 基本情報 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">ID</label>
            <p className="text-sm text-gray-900 font-mono">{log.id}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">日時</label>
            <p className="text-sm text-gray-900">
              {format(new Date(log.created_at), 'yyyy/MM/dd HH:mm:ss', { locale: ja })}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">レベル</label>
            <div className="mt-1">{getLevelBadge(log.level)}</div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">機能名</label>
            <p className="text-sm text-gray-900">{log.feature_name || '-'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">アクションタイプ</label>
            <div className="mt-1">{getActionBadge(log.action_type || '')}</div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">メソッド</label>
            <p className="text-sm text-gray-900 font-mono">{log.method || '-'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">ステータスコード</label>
            <div className="mt-1">{getStatusBadge(log.status_code) || '-'}</div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">レスポンス時間</label>
            <p className="text-sm text-gray-900">
              {log.response_time_ms ? `${log.response_time_ms}ms` : '-'}
            </p>
          </div>
        </div>

        {/* メッセージ */}
        <div>
          <label className="text-sm font-medium text-gray-700">メッセージ</label>
          <div className="mt-2 p-3 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-900 whitespace-pre-wrap">
              {(log.metadata?.message as string) || log.message || 'メッセージなし'}
            </p>
          </div>
        </div>

        {/* ユーザー情報 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">ユーザー</label>
            <p className="text-sm text-gray-900">
              {log.user_profiles
                ? `${log.user_profiles.family_name} ${log.user_profiles.first_name}`
                : log.user_id
                  ? log.user_id.slice(0, 8) + '...'
                  : '-'}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">パス</label>
            <p className="text-sm text-gray-900 font-mono break-all">{log.path || '-'}</p>
          </div>
        </div>

        {/* ネットワーク情報 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">IPアドレス</label>
            <p className="text-sm text-gray-900 font-mono">{log.ip_address || '-'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">ユーザーエージェント</label>
            <p className="text-sm text-gray-900 text-xs break-all">{log.user_agent || '-'}</p>
          </div>
        </div>

        {/* メタデータ */}
        {log.metadata && Object.keys(log.metadata).length > 0 && (
          <div>
            <label className="text-sm font-medium text-gray-700">メタデータ</label>
            <pre className="mt-2 p-3 bg-gray-50 rounded-md text-xs overflow-auto max-h-40">
              {JSON.stringify(log.metadata, null, 2)}
            </pre>
          </div>
        )}

        {/* エラースタック */}
        {log.error_stack && (
          <div>
            <label className="text-sm font-medium text-gray-700">エラースタック</label>
            <pre className="mt-2 p-3 bg-red-50 rounded-md text-xs overflow-auto max-h-40 text-red-800">
              {log.error_stack}
            </pre>
          </div>
        )}
      </div>
    );
  }

  function AuditLogDetail({ log }: { log: AuditLog }) {
    return (
      <div className="space-y-6">
        {/* 基本情報 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">ID</label>
            <p className="text-sm text-gray-900">{log.id}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">日時</label>
            <p className="text-sm text-gray-900">
              {format(new Date(log.created_at), 'yyyy/MM/dd HH:mm:ss', { locale: ja })}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">ユーザー</label>
            <p className="text-sm text-gray-900">
              {log.user_profiles
                ? `${log.user_profiles.family_name} ${log.user_profiles.first_name}`
                : log.user_id}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">アクション</label>
            <div className="mt-1">{getActionBadge(log.action)}</div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">ターゲットタイプ</label>
            <p className="text-sm text-gray-900">{log.target_type}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">ターゲットID</label>
            <p className="text-sm text-gray-900 font-mono">{log.target_id}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">IPアドレス</label>
            <p className="text-sm text-gray-900 font-mono">{log.ip_address}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">ユーザーエージェント</label>
            <p className="text-sm text-gray-900 text-xs break-all">{log.user_agent}</p>
          </div>
        </div>

        {/* 詳細情報 */}
        {log.details && Object.keys(log.details).length > 0 && (
          <div>
            <label className="text-sm font-medium text-gray-700">詳細情報</label>
            <pre className="mt-2 p-3 bg-gray-50 rounded-md text-xs overflow-auto max-h-40">
              {JSON.stringify(log.details, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ログ管理</h1>
          <p className="text-gray-600 mt-2">システムログと監査ログを管理します</p>
        </div>
      </div>

      {/* タブ */}
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
                  setIsColumnSettingsOpen(true);
                }}
              >
                表示項目設定
              </Button>
              <Button onClick={handleSystemLogsExport} disabled={systemLogsLoading}>
                <Download className="w-4 h-4 mr-2" />
                エクスポート
              </Button>
            </div>
          </div>

          {/* システムログフィルター */}
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
                      placeholder="メッセージやパスで検索..."
                      value={systemLogsFilters.search}
                      onChange={(e) => handleSystemLogsFilterChange('search', e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">レベル</label>
                  <Select
                    value={systemLogsFilters.level}
                    onValueChange={(value) => handleSystemLogsFilterChange('level', value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="全てのレベル" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全てのレベル</SelectItem>
                      <SelectItem value="debug">Debug</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warn">Warning</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                      <SelectItem value="fatal">Fatal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">機能名</label>
                  <Input
                    placeholder="機能名"
                    value={systemLogsFilters.feature_name}
                    onChange={(e) => handleSystemLogsFilterChange('feature_name', e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">開始日</label>
                  <Input
                    type="date"
                    value={systemLogsFilters.startDate}
                    onChange={(e) => handleSystemLogsFilterChange('startDate', e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">終了日</label>
                  <Input
                    type="date"
                    value={systemLogsFilters.endDate}
                    onChange={(e) => handleSystemLogsFilterChange('endDate', e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* システムログテーブル */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  <CardTitle>システムログ一覧 ({systemLogsPagination.total}件)</CardTitle>
                </div>
              </div>
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
                          {systemLogColumns.level && <TableHead>レベル</TableHead>}
                          {systemLogColumns.feature_name && <TableHead>機能名</TableHead>}
                          {systemLogColumns.action_type && <TableHead>アクション</TableHead>}
                          {systemLogColumns.method && <TableHead>メソッド</TableHead>}
                          {systemLogColumns.status_code && <TableHead>ステータス</TableHead>}
                          {systemLogColumns.message && <TableHead>メッセージ</TableHead>}
                          {systemLogColumns.user && <TableHead>ユーザー</TableHead>}
                          {systemLogColumns.path && <TableHead>パス</TableHead>}
                          {systemLogColumns.response_time && <TableHead>レスポンス時間</TableHead>}
                          {systemLogColumns.metadata && <TableHead>メタデータ</TableHead>}
                          {systemLogColumns.ip_address && <TableHead>IPアドレス</TableHead>}
                          {systemLogColumns.user_agent && (
                            <TableHead>ユーザーエージェント</TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {systemLogs.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={13} className="text-center py-8 text-gray-500">
                              システムログが見つかりませんでした
                            </TableCell>
                          </TableRow>
                        ) : (
                          systemLogs.map((log) => (
                            <TableRow key={log.id}>
                              {systemLogColumns.date && (
                                <TableCell className="font-mono text-sm">
                                  {format(new Date(log.created_at), 'MM/dd HH:mm:ss', {
                                    locale: ja,
                                  })}
                                </TableCell>
                              )}
                              {systemLogColumns.level && (
                                <TableCell>{getLevelBadge(log.level)}</TableCell>
                              )}
                              {systemLogColumns.feature_name && (
                                <TableCell className="text-sm">{log.feature_name || '-'}</TableCell>
                              )}
                              {systemLogColumns.action_type && (
                                <TableCell>{getActionBadge(log.action_type || '')}</TableCell>
                              )}
                              {systemLogColumns.method && (
                                <TableCell className="font-mono text-sm">
                                  {log.method || '-'}
                                </TableCell>
                              )}
                              {systemLogColumns.status_code && (
                                <TableCell>{getStatusBadge(log.status_code) || '-'}</TableCell>
                              )}
                              {systemLogColumns.message && (
                                <TableCell className="max-w-md">
                                  <div className="truncate">
                                    {(log.metadata?.message as string) ||
                                      log.message ||
                                      'メッセージなし'}
                                  </div>
                                </TableCell>
                              )}
                              {systemLogColumns.user && (
                                <TableCell>
                                  {log.user_profiles ? (
                                    <div className="space-y-1">
                                      <div className="text-sm font-medium">
                                        {log.user_profiles.family_name}{' '}
                                        {log.user_profiles.first_name}
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
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* システムログページネーション */}
          {systemLogsPagination.totalPages > 1 && (
            <div className="flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => handleSystemLogsPageChange(systemLogsPagination.page - 1)}
                      className={
                        systemLogsPagination.page <= 1
                          ? 'pointer-events-none opacity-50'
                          : 'cursor-pointer'
                      }
                    />
                  </PaginationItem>
                  {Array.from({ length: systemLogsPagination.totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => handleSystemLogsPageChange(page)}
                          isActive={page === systemLogsPagination.page}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  )}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => handleSystemLogsPageChange(systemLogsPagination.page + 1)}
                      className={
                        systemLogsPagination.page >= systemLogsPagination.totalPages
                          ? 'pointer-events-none opacity-50'
                          : 'cursor-pointer'
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
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
                  setIsColumnSettingsOpen(true);
                }}
              >
                表示項目設定
              </Button>
              <Button onClick={handleAuditLogsExport} disabled={auditLogsLoading}>
                <Download className="w-4 h-4 mr-2" />
                エクスポート
              </Button>
            </div>
          </div>

          {/* 監査ログフィルター */}
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
                      value={auditLogsFilters.search}
                      onChange={(e) => handleAuditLogsFilterChange('search', e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">アクション</label>
                  <Select
                    value={auditLogsFilters.action}
                    onValueChange={(value) => handleAuditLogsFilterChange('action', value)}
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
                    value={auditLogsFilters.userId}
                    onChange={(e) => handleAuditLogsFilterChange('userId', e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">開始日</label>
                  <Input
                    type="date"
                    value={auditLogsFilters.startDate}
                    onChange={(e) => handleAuditLogsFilterChange('startDate', e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">終了日</label>
                  <Input
                    type="date"
                    value={auditLogsFilters.endDate}
                    onChange={(e) => handleAuditLogsFilterChange('endDate', e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 監査ログテーブル */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  <CardTitle>監査ログ一覧 ({auditLogsPagination.total}件)</CardTitle>
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

                  {auditLogs.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      監査ログが見つかりませんでした
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* 監査ログページネーション */}
          {auditLogsPagination.totalPages > 1 && (
            <div className="flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => handleAuditLogsPageChange(auditLogsPagination.page - 1)}
                      className={
                        auditLogsPagination.page <= 1
                          ? 'pointer-events-none opacity-50'
                          : 'cursor-pointer'
                      }
                    />
                  </PaginationItem>
                  {Array.from({ length: auditLogsPagination.totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => handleAuditLogsPageChange(page)}
                          isActive={page === auditLogsPagination.page}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  )}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => handleAuditLogsPageChange(auditLogsPagination.page + 1)}
                      className={
                        auditLogsPagination.page >= auditLogsPagination.totalPages
                          ? 'pointer-events-none opacity-50'
                          : 'cursor-pointer'
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* 詳細ダイアログ */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>ログ詳細</DialogTitle>
            <DialogDescription>
              {activeTab === 'system-logs' ? 'システムログ' : '監査ログ'}の詳細情報を表示します
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4 flex-1 overflow-y-auto">
              {activeTab === 'system-logs' ? (
                // システムログ詳細
                <SystemLogDetail log={selectedLog as SystemLog} />
              ) : (
                // 監査ログ詳細
                <AuditLogDetail log={selectedLog as AuditLog} />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 表示項目設定ダイアログ */}
      <Dialog open={isColumnSettingsOpen} onOpenChange={setIsColumnSettingsOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
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
            <div className="grid grid-cols-2 gap-3 overflow-y-auto flex-1 pr-2">
              {columnSettingsType === 'system'
                ? // システムログの表示項目
                  [
                    { key: 'date', label: '日時', description: 'ログの作成日時' },
                    { key: 'level', label: 'レベル', description: 'ログレベル（INFO、ERROR等）' },
                    { key: 'feature_name', label: '機能名', description: '機能名' },
                    { key: 'action_type', label: 'アクション', description: 'アクションの種類' },
                    { key: 'method', label: 'メソッド', description: 'HTTPメソッド' },
                    {
                      key: 'status_code',
                      label: 'ステータスコード',
                      description: 'HTTPステータスコード',
                    },
                    { key: 'message', label: 'メッセージ', description: 'ログメッセージ' },
                    { key: 'user', label: 'ユーザー', description: '実行ユーザー' },
                    { key: 'path', label: 'パス', description: 'リクエストパス' },
                    { key: 'response_time', label: 'レスポンス時間', description: '処理時間' },
                    { key: 'metadata', label: 'メタデータ', description: '追加情報' },
                    { key: 'ip_address', label: 'IPアドレス', description: 'クライアントIP' },
                    {
                      key: 'user_agent',
                      label: 'ユーザーエージェント',
                      description: 'ブラウザ情報',
                    },
                  ].map(({ key, label, description }) => (
                    <div key={key} className="flex items-start space-x-2 p-2 rounded border">
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
                        className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <label htmlFor={key} className="text-sm font-medium text-gray-700">
                          {label}
                        </label>
                        <p className="text-xs text-gray-500">{description}</p>
                      </div>
                    </div>
                  ))
                : // 監査ログの表示項目
                  [
                    { key: 'date', label: '日時', description: 'アクション実行日時' },
                    { key: 'user', label: 'ユーザー', description: '実行ユーザー' },
                    { key: 'action', label: 'アクション', description: '実行アクション' },
                    { key: 'target', label: '対象', description: '操作対象' },
                    { key: 'before_data', label: '変更前', description: '変更前のデータ' },
                    { key: 'after_data', label: '変更後', description: '変更後のデータ' },
                    { key: 'details', label: '詳細', description: '詳細情報' },
                    { key: 'ip_address', label: 'IPアドレス', description: 'クライアントIP' },
                    {
                      key: 'user_agent',
                      label: 'ユーザーエージェント',
                      description: 'ブラウザ情報',
                    },
                    { key: 'session_id', label: 'セッションID', description: 'セッション識別子' },
                  ].map(({ key, label, description }) => (
                    <div key={key} className="flex items-start space-x-2 p-2 rounded border">
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
                        className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <label htmlFor={key} className="text-sm font-medium text-gray-700">
                          {label}
                        </label>
                        <p className="text-xs text-gray-500">{description}</p>
                      </div>
                    </div>
                  ))}
            </div>
            <div className="flex justify-between pt-4 border-t mt-4 flex-shrink-0">
              <Button variant="outline" onClick={handleColumnSettingsReset}>
                初期設定に戻す
              </Button>
              <div className="space-x-2">
                <Button variant="outline" onClick={() => setIsColumnSettingsOpen(false)}>
                  キャンセル
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
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
