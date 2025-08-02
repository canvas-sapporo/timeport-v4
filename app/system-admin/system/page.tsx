'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Settings,
  Save,
  Shield,
  Bell,
  Monitor,
  AlertCircle,
  CheckCircle,
  FileText,
  Activity,
  Database,
} from 'lucide-react';

import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  SystemLog,
  AuditLog,
  LogFilter,
  LogLevel,
  LogSetting,
  LogSettingKey,
} from '@/schemas/database/log';
import {
  getSystemLogs,
  getAuditLogs,
  exportSystemLogs,
  exportAuditLogs,
  getLogSettings,
  updateLogSetting,
} from '@/lib/actions/system-admin/logs';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

export default function SuperAdminSystemPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // タブ状態
  const [activeTab, setActiveTab] = useState('overview');

  // Mock system settings
  const [systemSettings, setSystemSettings] = useState({
    maintenanceMode: false,
    debugMode: false,
    logLevel: 'info',
    maxUsers: 1000,
    sessionTimeout: 30,
    backupEnabled: true,
    backupFrequency: 'daily',
    emailNotifications: true,
    smsNotifications: false,
    systemName: 'TimePort',
    systemVersion: '4.1.00',
    maintenanceMessage: 'システムメンテナンス中です。しばらくお待ちください。',
  });

  // ログ設定状態
  const [logSettings, setLogSettings] = useState<LogSetting[]>([]);
  const [logSettingsLoading, setLogSettingsLoading] = useState(true);
  const [logSettingsSaving, setLogSettingsSaving] = useState(false);

  // システムログ状態
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [systemLogsLoading, setSystemLogsLoading] = useState(true);
  const [systemLogsTotal, setSystemLogsTotal] = useState(0);
  const [systemLogsCurrentPage, setSystemLogsCurrentPage] = useState(1);
  const [systemLogsTotalPages, setSystemLogsTotalPages] = useState(1);
  const [systemLogsFilter, setSystemLogsFilter] = useState<LogFilter>({
    page: 1,
    limit: 50,
  });

  // 監査ログ状態
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditLogsLoading, setAuditLogsLoading] = useState(true);
  const [auditLogsTotal, setAuditLogsTotal] = useState(0);
  const [auditLogsCurrentPage, setAuditLogsCurrentPage] = useState(1);
  const [auditLogsTotalPages, setAuditLogsTotalPages] = useState(1);
  const [auditLogsFilter, setAuditLogsFilter] = useState<LogFilter>({
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

  // Mock system status
  const systemStatus = {
    uptime: '15日 8時間 32分',
    cpuUsage: 45,
    memoryUsage: 62,
    diskUsage: 38,
    activeUsers: 127,
    totalRequests: 15420,
    errorRate: 0.02,
  };

  useEffect(() => {
    if (!user || user.role !== 'system-admin') {
      router.push('/login');
      return;
    }
  }, [user, router]);

  // ログ設定を読み込み
  useEffect(() => {
    if (user?.role === 'system-admin') {
      loadLogSettings();
    }
  }, [user]);

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

  // ログ設定関連の関数
  const loadLogSettings = async () => {
    try {
      setLogSettingsLoading(true);
      const response = await fetch('/api/system-admin/logs/settings');
      if (!response.ok) {
        throw new Error('Failed to fetch log settings');
      }
      const result = await response.json();
      setLogSettings(result.data);
    } catch (error) {
      toast({
        title: 'エラー',
        description: 'ログ設定の読み込みに失敗しました',
        variant: 'destructive',
      });
    } finally {
      setLogSettingsLoading(false);
    }
  };

  const getLogSettingValue = (key: LogSettingKey) => {
    const setting = logSettings.find((s) => s.setting_key === key);
    return setting?.setting_value;
  };

  const updateLogSettingValue = async (key: LogSettingKey, value: unknown) => {
    try {
      setLogSettingsSaving(true);
      const response = await fetch('/api/system-admin/logs/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key, value }),
      });

      if (!response.ok) {
        throw new Error('Failed to update log setting');
      }

      setLogSettings((prev) =>
        prev.map((s) => (s.setting_key === key ? { ...s, setting_value: value } : s))
      );

      toast({
        title: '成功',
        description: 'ログ設定を更新しました',
      });
    } catch (error) {
      toast({
        title: 'エラー',
        description: 'ログ設定の更新に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setLogSettingsSaving(false);
    }
  };

  const handleLogLevelChange = (level: LogLevel, enabled: boolean) => {
    const currentLevels = (getLogSettingValue('system_log_level') as LogLevel[]) || [];
    let newLevels: LogLevel[];

    if (enabled) {
      newLevels = [...currentLevels, level];
    } else {
      newLevels = currentLevels.filter((l) => l !== level);
    }

    updateLogSettingValue('system_log_level', newLevels);
  };

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

  const updateSystemLogsFilter = (updates: Partial<LogFilter>) => {
    setSystemLogsFilter((prev) => ({
      ...prev,
      ...updates,
      page: 1,
    }));
  };

  const handleSystemLogsPageChange = (page: number) => {
    updateSystemLogsFilter({ page });
  };

  const handleSystemLogsExport = async () => {
    try {
      const data = await exportSystemLogs(systemLogsFilter);
      const csv = convertSystemLogsToCSV(data);
      downloadCSV(csv, `system-logs-${format(new Date(), 'yyyy-MM-dd-HH-mm')}.csv`);

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
      systemSettings;
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

  const updateAuditLogsFilter = (updates: Partial<LogFilter>) => {
    setAuditLogsFilter((prev) => ({
      ...prev,
      ...updates,
      page: 1,
    }));
  };

  const handleAuditLogsPageChange = (page: number) => {
    updateAuditLogsFilter({ page });
  };

  const handleAuditLogsExport = async () => {
    try {
      const data = await exportAuditLogs(auditLogsFilter);
      const csv = convertAuditLogsToCSV(data);
      downloadCSV(csv, `audit-logs-${format(new Date(), 'yyyy-MM-dd-HH-mm')}.csv`);

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
  const getLevelBadge = (level: LogLevel) => {
    const variants = {
      debug: 'secondary',
      info: 'default',
      warn: 'secondary',
      error: 'destructive',
      fatal: 'destructive',
    } as const;

    return <Badge variant={variants[level]}>{level.toUpperCase()}</Badge>;
  };

  const getStatusBadge = (statusCode?: number) => {
    if (!statusCode) return null;

    let variant: 'default' | 'secondary' | 'destructive' = 'default';
    if (statusCode >= 400) variant = 'destructive';
    else if (statusCode >= 300) variant = 'secondary';

    return <Badge variant={variant}>{statusCode}</Badge>;
  };

  const getActionBadge = (action: string) => {
    let variant: 'default' | 'secondary' | 'destructive' = 'default';

    if (action.includes('delete')) variant = 'destructive';
    else if (action.includes('create')) variant = 'default';
    else if (action.includes('update')) variant = 'secondary';

    return <Badge variant={variant}>{action}</Badge>;
  };

  const convertSystemLogsToCSV = (data: SystemLog[]) => {
    const headers = [
      '日時',
      'レベル',
      'メッセージ',
      'パス',
      'メソッド',
      'ステータスコード',
      'レスポンス時間(ms)',
      'エラーメッセージ',
      'ユーザーID',
      'IPアドレス',
    ];

    const rows = data.map((log) => [
      format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss', { locale: ja }),
      log.level,
      log.metadata?.message || '',
      log.path || '',
      log.method || '',
      log.status_code || '',
      log.response_time_ms || '',
      log.error_message || '',
      log.user_id || '',
      log.ip_address || '',
    ]);

    return [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
  };

  const convertAuditLogsToCSV = (data: AuditLog[]) => {
    const headers = [
      '日時',
      '会社',
      'ユーザー',
      'アクション',
      '対象',
      '変更前',
      '変更後',
      '詳細',
      'IPアドレス',
      'ユーザーエージェント',
      'セッションID',
    ];

    const rows = data.map((log) => [
      format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss', { locale: ja }),
      log.company_id || '',
      log.user_profiles ? `${log.user_profiles.family_name} ${log.user_profiles.first_name}` : '',
      log.action,
      `${log.target_type || ''}${log.target_id ? ` (${log.target_id})` : ''}`,
      log.before_data ? JSON.stringify(log.before_data) : '',
      log.after_data ? JSON.stringify(log.after_data) : '',
      log.details ? JSON.stringify(log.details) : '',
      log.ip_address || '',
      log.user_agent || '',
      log.session_id || '',
    ]);

    return [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
  };

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  async function handleSaveSettings() {
    setIsLoading(true);
    try {
      // In a real app, this would save to backend
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log('Saving system settings...', systemSettings);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSettingChange(key: string, value: unknown) {
    setSystemSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">システム管理</h1>
          <p className="text-gray-600">システム全体の設定と監視を行います</p>
        </div>
        <Button onClick={handleSaveSettings} disabled={isLoading} variant="timeport-primary">
          <Save className="w-4 h-4 mr-2" />
          設定保存
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <Monitor className="w-4 h-4" />
            <span>概要</span>
          </TabsTrigger>
          <TabsTrigger value="log-settings" className="flex items-center space-x-2">
            <Settings className="w-4 h-4" />
            <span>ログ設定</span>
          </TabsTrigger>
          <TabsTrigger value="system-logs" className="flex items-center space-x-2">
            <Activity className="w-4 h-4" />
            <span>システムログ</span>
          </TabsTrigger>
          <TabsTrigger value="audit-logs" className="flex items-center space-x-2">
            <FileText className="w-4 h-4" />
            <span>監査ログ</span>
          </TabsTrigger>
        </TabsList>

        {/* 概要タブ */}
        <TabsContent value="overview" className="space-y-6">
          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Monitor className="w-5 h-5" />
                <span>システム状態</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <div className="font-medium text-sm text-green-800">システム正常稼働中</div>
                      <div className="text-xs text-green-700">稼働時間: {systemStatus.uptime}</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>CPU使用率</span>
                      <span>{systemStatus.cpuUsage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${systemStatus.cpuUsage}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>メモリ使用率</span>
                      <span>{systemStatus.memoryUsage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-yellow-600 h-2 rounded-full"
                        style={{ width: `${systemStatus.memoryUsage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {systemStatus.activeUsers}
                    </div>
                    <div className="text-sm text-blue-600">アクティブユーザー</div>
                  </div>

                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {systemStatus.totalRequests.toLocaleString()}
                    </div>
                    <div className="text-sm text-purple-600">総リクエスト数</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {(systemStatus.errorRate * 100).toFixed(2)}%
                    </div>
                    <div className="text-sm text-green-600">エラー率</div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>ディスク使用率</span>
                      <span>{systemStatus.diskUsage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${systemStatus.diskUsage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* System Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="w-5 h-5" />
                  <span>システム設定</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="systemName">システム名</Label>
                  <Input
                    id="systemName"
                    value={systemSettings.systemName}
                    onChange={(e) => handleSettingChange('systemName', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="systemVersion">バージョン</Label>
                  <Input id="systemVersion" value={systemSettings.systemVersion} disabled />
                </div>

                <div>
                  <Label htmlFor="maxUsers">最大ユーザー数</Label>
                  <Input
                    id="maxUsers"
                    type="number"
                    value={systemSettings.maxUsers}
                    onChange={(e) => handleSettingChange('maxUsers', parseInt(e.target.value))}
                  />
                </div>

                <div>
                  <Label htmlFor="sessionTimeout">セッションタイムアウト（分）</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    value={systemSettings.sessionTimeout}
                    onChange={(e) =>
                      handleSettingChange('sessionTimeout', parseInt(e.target.value))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>メンテナンスモード</Label>
                    <p className="text-sm text-gray-500">システムを一時的に停止します</p>
                  </div>
                  <Switch
                    checked={systemSettings.maintenanceMode}
                    onCheckedChange={(checked) => handleSettingChange('maintenanceMode', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>デバッグモード</Label>
                    <p className="text-sm text-gray-500">詳細なログを出力します</p>
                  </div>
                  <Switch
                    checked={systemSettings.debugMode}
                    onCheckedChange={(checked) => handleSettingChange('debugMode', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Backup & Security */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="w-5 h-5" />
                  <span>バックアップ・セキュリティ</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>自動バックアップ</Label>
                    <p className="text-sm text-gray-500">定期的にデータをバックアップします</p>
                  </div>
                  <Switch
                    checked={systemSettings.backupEnabled}
                    onCheckedChange={(checked) => handleSettingChange('backupEnabled', checked)}
                  />
                </div>

                <div>
                  <Label>バックアップ頻度</Label>
                  <select
                    className="w-full mt-1 p-2 border rounded-md"
                    value={systemSettings.backupFrequency}
                    onChange={(e) => handleSettingChange('backupFrequency', e.target.value)}
                  >
                    <option value="hourly">毎時</option>
                    <option value="daily">毎日</option>
                    <option value="weekly">毎週</option>
                    <option value="monthly">毎月</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>メール通知</Label>
                    <p className="text-sm text-gray-500">システムイベントをメールで通知</p>
                  </div>
                  <Switch
                    checked={systemSettings.emailNotifications}
                    onCheckedChange={(checked) =>
                      handleSettingChange('emailNotifications', checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>SMS通知</Label>
                    <p className="text-sm text-gray-500">緊急時にSMSで通知</p>
                  </div>
                  <Switch
                    checked={systemSettings.smsNotifications}
                    onCheckedChange={(checked) => handleSettingChange('smsNotifications', checked)}
                  />
                </div>

                <div className="p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-800">最終バックアップ</span>
                  </div>
                  <p className="text-xs text-yellow-700 mt-1">2024年1月20日 03:00 (成功)</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Maintenance Message */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="w-5 h-5" />
                <span>メンテナンス設定</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="maintenanceMessage">メンテナンスメッセージ</Label>
                <Textarea
                  id="maintenanceMessage"
                  value={systemSettings.maintenanceMessage}
                  onChange={(e) => handleSettingChange('maintenanceMessage', e.target.value)}
                  rows={3}
                  placeholder="メンテナンス中に表示するメッセージを入力してください"
                />
              </div>

              {systemSettings.maintenanceMode && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span className="font-medium text-red-800">メンテナンスモード有効</span>
                  </div>
                  <p className="text-sm text-red-700 mt-1">
                    現在システムはメンテナンスモードです。メンバーはアクセスできません。
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ログ設定タブ */}
        <TabsContent value="log-settings" className="space-y-6">
          {logSettingsLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-lg">読み込み中...</div>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {/* システムログ設定 */}
              <Card>
                <CardHeader>
                  <CardTitle>システムログ設定</CardTitle>
                  <CardDescription>システムの技術的ログの設定</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* ログ機能の有効/無効 */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>システムログ機能</Label>
                      <p className="text-sm text-muted-foreground">
                        システムログの記録を有効/無効にします
                      </p>
                    </div>
                    <Switch
                      checked={getLogSettingValue('system_log_enabled') || false}
                      onCheckedChange={(checked) =>
                        updateLogSettingValue('system_log_enabled', checked)
                      }
                      disabled={logSettingsSaving}
                    />
                  </div>

                  <Separator />

                  {/* ログレベル設定 */}
                  <div className="space-y-4">
                    <Label>保存するログレベル</Label>
                    <div className="space-y-3">
                      {(['debug', 'info', 'warn', 'error', 'fatal'] as LogLevel[]).map((level) => {
                        const currentLevels =
                          (getLogSettingValue('system_log_level') as LogLevel[]) || [];
                        const isEnabled = currentLevels.includes(level);

                        return (
                          <div key={level} className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Badge
                                variant={
                                  level === 'error' || level === 'fatal'
                                    ? 'destructive'
                                    : 'secondary'
                                }
                              >
                                {level.toUpperCase()}
                              </Badge>
                              <span className="text-sm">
                                {level === 'debug' && '開発時の詳細情報'}
                                {level === 'info' && '一般的な操作ログ'}
                                {level === 'warn' && '警告（注意が必要）'}
                                {level === 'error' && 'エラー（処理は継続可能）'}
                                {level === 'fatal' && '致命的エラー（処理停止）'}
                              </span>
                            </div>
                            <Switch
                              checked={isEnabled}
                              onCheckedChange={(checked) => handleLogLevelChange(level, checked)}
                              disabled={logSettingsSaving}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <Separator />

                  {/* エラーログの即座書き込み */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>エラーログの即座書き込み</Label>
                      <p className="text-sm text-muted-foreground">
                        エラーログをバッファせずに即座にデータベースに書き込みます
                      </p>
                    </div>
                    <Switch
                      checked={getLogSettingValue('error_log_immediate') || false}
                      onCheckedChange={(checked) =>
                        updateLogSettingValue('error_log_immediate', checked)
                      }
                      disabled={logSettingsSaving}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 監査ログ設定 */}
              <Card>
                <CardHeader>
                  <CardTitle>監査ログ設定</CardTitle>
                  <CardDescription>ユーザー操作の監査ログの設定</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* 監査ログ機能の有効/無効 */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>監査ログ機能</Label>
                      <p className="text-sm text-muted-foreground">
                        ユーザーの操作履歴を記録します
                      </p>
                    </div>
                    <Switch
                      checked={getLogSettingValue('audit_log_enabled') || false}
                      onCheckedChange={(checked) =>
                        updateLogSettingValue('audit_log_enabled', checked)
                      }
                      disabled={logSettingsSaving}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* バッファ設定 */}
              <Card>
                <CardHeader>
                  <CardTitle>バッファ設定</CardTitle>
                  <CardDescription>ログのバッファ処理の設定</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* バッファサイズ */}
                  <div className="space-y-2">
                    <Label htmlFor="buffer-size">バッファサイズ（件数）</Label>
                    <Input
                      id="buffer-size"
                      type="number"
                      min="1"
                      max="10000"
                      value={getLogSettingValue('buffer_size') || 100}
                      onChange={(e) =>
                        updateLogSettingValue('buffer_size', parseInt(e.target.value))
                      }
                      disabled={logSettingsSaving}
                    />
                    <p className="text-sm text-muted-foreground">
                      ログをバッファに蓄積する件数。多いほどパフォーマンスが向上しますが、メモリ使用量が増加します。
                    </p>
                  </div>

                  <Separator />

                  {/* フラッシュ間隔 */}
                  <div className="space-y-2">
                    <Label htmlFor="flush-interval">フラッシュ間隔（秒）</Label>
                    <Input
                      id="flush-interval"
                      type="number"
                      min="1"
                      max="300"
                      value={getLogSettingValue('flush_interval') || 5}
                      onChange={(e) =>
                        updateLogSettingValue('flush_interval', parseInt(e.target.value))
                      }
                      disabled={logSettingsSaving}
                    />
                    <p className="text-sm text-muted-foreground">
                      バッファをデータベースに書き込む間隔。短いほどリアルタイム性が向上しますが、データベース負荷が増加します。
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* 設定情報 */}
              <Card>
                <CardHeader>
                  <CardTitle>設定情報</CardTitle>
                  <CardDescription>現在の設定状況</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>システムログ</Label>
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant={getLogSettingValue('system_log_enabled') ? 'default' : 'secondary'}
                      >
                        {getLogSettingValue('system_log_enabled') ? '有効' : '無効'}
                      </Badge>
                      {getLogSettingValue('system_log_enabled') && (
                        <span className="text-sm text-muted-foreground">
                          {getLogSettingValue('system_log_level')?.length || 0}レベル記録中
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>監査ログ</Label>
                    <Badge
                      variant={getLogSettingValue('audit_log_enabled') ? 'default' : 'secondary'}
                    >
                      {getLogSettingValue('audit_log_enabled') ? '有効' : '無効'}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <Label>バッファ設定</Label>
                    <div className="text-sm text-muted-foreground">
                      <div>サイズ: {getLogSettingValue('buffer_size') || 100}件</div>
                      <div>間隔: {getLogSettingValue('flush_interval') || 5}秒</div>
                    </div>
                  </div>

                  <Separator />

                  <Button
                    onClick={loadLogSettings}
                    disabled={logSettingsSaving}
                    variant="outline"
                    className="w-full"
                  >
                    設定を再読み込み
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

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
              <CardDescription>ログを絞り込みます</CardDescription>
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

                {/* ログレベル */}
                <div className="space-y-2">
                  <Label>ログレベル</Label>
                  <Select
                    value={systemLogsFilter.levels?.[0] || 'all'}
                    onValueChange={(value) =>
                      updateSystemLogsFilter({
                        levels: value === 'all' ? undefined : [value as LogLevel],
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="すべて" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">すべて</SelectItem>
                      <SelectItem value="debug">DEBUG</SelectItem>
                      <SelectItem value="info">INFO</SelectItem>
                      <SelectItem value="warn">WARN</SelectItem>
                      <SelectItem value="error">ERROR</SelectItem>
                      <SelectItem value="fatal">FATAL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* エラーのみ */}
                <div className="space-y-2">
                  <Label>エラーのみ</Label>
                  <Select
                    value={systemLogsFilter.errors_only ? 'true' : 'false'}
                    onValueChange={(value) =>
                      updateSystemLogsFilter({ errors_only: value === 'true' })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="false">すべて</SelectItem>
                      <SelectItem value="true">エラーのみ</SelectItem>
                    </SelectContent>
                  </Select>
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
              <CardDescription>ログを絞り込みます</CardDescription>
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
