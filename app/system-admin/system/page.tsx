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
  Database,
  FileText,
  Activity,
  Eye,
  EyeOff,
} from 'lucide-react';

import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StandardButton } from '@/components/ui/standard-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { getLogSettings, updateLogSetting } from '@/lib/actions/system-admin/logs';
import type { LogSetting } from '@/schemas/database/log';

export default function SuperAdminSystemPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

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
  const [isLogSettingsLoading, setIsLogSettingsLoading] = useState(false);

  // ログ監視状態
  const [logStats, setLogStats] = useState({
    totalLogs: 0,
    errorLogs: 0,
    systemLogs: 0,
    auditLogs: 0,
    avgResponseTime: 0,
    errorRate: 0,
  });

  useEffect(() => {
    if (!user || user.role !== 'system-admin') {
      router.push('/login');
      return;
    }

    // ログ設定を読み込み
    loadLogSettings();
  }, [user, router]);

  // ログ設定を読み込み
  async function loadLogSettings() {
    setIsLogSettingsLoading(true);
    try {
      const settings = await getLogSettings();
      setLogSettings(settings);
    } catch (error) {
      console.error('ログ設定読み込みエラー:', error);
      toast({
        title: 'エラー',
        description: 'ログ設定の読み込みに失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsLogSettingsLoading(false);
    }
  }

  // ログ設定を更新
  async function updateLogSettingValue(key: string, value: boolean | string | number | string[]) {
    try {
      await updateLogSetting(
        key as
          | 'system_log_level'
          | 'system_log_enabled'
          | 'audit_log_enabled'
          | 'buffer_size'
          | 'flush_interval'
          | 'error_log_immediate',
        value
      );
      await loadLogSettings(); // 設定を再読み込み
      toast({
        title: '成功',
        description: 'ログ設定を更新しました',
      });
    } catch (error) {
      console.error('ログ設定更新エラー:', error);
      toast({
        title: 'エラー',
        description: 'ログ設定の更新に失敗しました',
        variant: 'destructive',
      });
    }
  }

  // 設定値を取得
  function getLogSettingValue<T>(key: string, defaultValue: T): T {
    const setting = logSettings.find((s) => s.setting_key === key);
    return setting ? (setting.setting_value as T) : defaultValue;
  }

  async function handleSaveSettings() {
    setIsLoading(true);
    try {
      // 実際のAPI呼び出しをここに実装
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast({
        title: '成功',
        description: 'システム設定を保存しました',
      });
    } catch (error) {
      toast({
        title: 'エラー',
        description: '設定の保存に失敗しました',
        variant: 'destructive',
      });
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

  if (!user || user.role !== 'system-admin') {
    return null;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">システム管理</h1>
          <p className="text-gray-600 mt-2">システム全体の設定と監視を行います</p>
        </div>
        <StandardButton buttonType="save" onClick={handleSaveSettings} disabled={isLoading}>
          <Save className="w-4 h-4 mr-2" />
          設定保存
        </StandardButton>
      </div>

      {/* システム概要 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="w-5 h-5" />
            システム概要
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-600" />
                <span className="font-semibold">データベース</span>
              </div>
              <p className="text-2xl font-bold mt-2">正常</p>
              <p className="text-sm text-gray-600">接続状態良好</p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-600" />
                <span className="font-semibold">セキュリティ</span>
              </div>
              <p className="text-2xl font-bold mt-2">安全</p>
              <p className="text-sm text-gray-600">脅威なし</p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-yellow-600" />
                <span className="font-semibold">通知</span>
              </div>
              <p className="text-2xl font-bold mt-2">有効</p>
              <p className="text-sm text-gray-600">メール通知ON</p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-semibold">バックアップ</span>
              </div>
              <p className="text-2xl font-bold mt-2">有効</p>
              <p className="text-sm text-gray-600">毎日実行</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ログ監視 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            ログ監視
          </CardTitle>
          <CardDescription>システムログと監査ログの監視状況</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <span className="font-semibold">総ログ数</span>
              </div>
              <p className="text-2xl font-bold mt-2">{logStats.totalLogs.toLocaleString()}</p>
              <p className="text-sm text-gray-600">今日の総ログ数</p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="font-semibold">エラーログ</span>
              </div>
              <p className="text-2xl font-bold mt-2 text-red-600">{logStats.errorLogs}</p>
              <p className="text-sm text-gray-600">エラー率: {logStats.errorRate.toFixed(1)}%</p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2">
                <Monitor className="w-5 h-5 text-green-600" />
                <span className="font-semibold">システムログ</span>
              </div>
              <p className="text-2xl font-bold mt-2">{logStats.systemLogs}</p>
              <p className="text-sm text-gray-600">技術ログ</p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-purple-600" />
                <span className="font-semibold">監査ログ</span>
              </div>
              <p className="text-2xl font-bold mt-2">{logStats.auditLogs}</p>
              <p className="text-sm text-gray-600">ユーザー操作</p>
            </div>
          </div>

          <div className="mt-4 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              平均レスポンス時間: {logStats.avgResponseTime}ms
            </div>
            <Button variant="outline" size="sm" onClick={() => router.push('/system-admin/logs')}>
              <FileText className="w-4 h-4 mr-2" />
              詳細ログを表示
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* システム設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            システム設定
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 基本設定 */}
          <div>
            <h3 className="text-lg font-semibold mb-4">基本設定</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="systemName">システム名</Label>
                <Input
                  id="systemName"
                  value={systemSettings.systemName}
                  onChange={(e) => handleSettingChange('systemName', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="systemVersion">バージョン</Label>
                <Input
                  id="systemVersion"
                  value={systemSettings.systemVersion}
                  onChange={(e) => handleSettingChange('systemVersion', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxUsers">最大ユーザー数</Label>
                <Input
                  id="maxUsers"
                  type="number"
                  value={systemSettings.maxUsers}
                  onChange={(e) => handleSettingChange('maxUsers', parseInt(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sessionTimeout">セッションタイムアウト（分）</Label>
                <Input
                  id="sessionTimeout"
                  type="number"
                  value={systemSettings.sessionTimeout}
                  onChange={(e) => handleSettingChange('sessionTimeout', parseInt(e.target.value))}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* メンテナンス設定 */}
          <div>
            <h3 className="text-lg font-semibold mb-4">メンテナンス設定</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="maintenanceMode">メンテナンスモード</Label>
                  <p className="text-sm text-gray-600">
                    システムをメンテナンスモードに切り替えます
                  </p>
                </div>
                <Switch
                  id="maintenanceMode"
                  checked={systemSettings.maintenanceMode}
                  onCheckedChange={(checked) => handleSettingChange('maintenanceMode', checked)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maintenanceMessage">メンテナンスメッセージ</Label>
                <Textarea
                  id="maintenanceMessage"
                  value={systemSettings.maintenanceMessage}
                  onChange={(e) => handleSettingChange('maintenanceMessage', e.target.value)}
                  placeholder="メンテナンス中のメッセージを入力してください"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* 開発設定 */}
          <div>
            <h3 className="text-lg font-semibold mb-4">開発設定</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="debugMode">デバッグモード</Label>
                  <p className="text-sm text-gray-600">詳細なログを出力します</p>
                </div>
                <Switch
                  id="debugMode"
                  checked={systemSettings.debugMode}
                  onCheckedChange={(checked) => handleSettingChange('debugMode', checked)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="logLevel">ログレベル</Label>
                <select
                  id="logLevel"
                  className="w-full px-3 py-2 border border-input bg-background rounded-md"
                  value={systemSettings.logLevel}
                  onChange={(e) => handleSettingChange('logLevel', e.target.value)}
                >
                  <option value="debug">Debug</option>
                  <option value="info">Info</option>
                  <option value="warn">Warning</option>
                  <option value="error">Error</option>
                </select>
              </div>
            </div>
          </div>

          <Separator />

          {/* 通知設定 */}
          <div>
            <h3 className="text-lg font-semibold mb-4">通知設定</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="emailNotifications">メール通知</Label>
                  <p className="text-sm text-gray-600">システム通知をメールで送信します</p>
                </div>
                <Switch
                  id="emailNotifications"
                  checked={systemSettings.emailNotifications}
                  onCheckedChange={(checked) => handleSettingChange('emailNotifications', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="smsNotifications">SMS通知</Label>
                  <p className="text-sm text-gray-600">システム通知をSMSで送信します</p>
                </div>
                <Switch
                  id="smsNotifications"
                  checked={systemSettings.smsNotifications}
                  onCheckedChange={(checked) => handleSettingChange('smsNotifications', checked)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* バックアップ設定 */}
          <div>
            <h3 className="text-lg font-semibold mb-4">バックアップ設定</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="backupEnabled">自動バックアップ</Label>
                  <p className="text-sm text-gray-600">定期的にデータベースをバックアップします</p>
                </div>
                <Switch
                  id="backupEnabled"
                  checked={systemSettings.backupEnabled}
                  onCheckedChange={(checked) => handleSettingChange('backupEnabled', checked)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="backupFrequency">バックアップ頻度</Label>
                <select
                  id="backupFrequency"
                  className="w-full px-3 py-2 border border-input bg-background rounded-md"
                  value={systemSettings.backupFrequency}
                  onChange={(e) => handleSettingChange('backupFrequency', e.target.value)}
                >
                  <option value="hourly">毎時</option>
                  <option value="daily">毎日</option>
                  <option value="weekly">毎週</option>
                  <option value="monthly">毎月</option>
                </select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ログ設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            ログ設定
          </CardTitle>
          <CardDescription>システムログと監査ログの設定を管理します</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLogSettingsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                <span>ログ設定を読み込み中...</span>
              </div>
            </div>
          ) : (
            <>
              {/* システムログ設定 */}
              <div>
                <h3 className="text-lg font-semibold mb-4">システムログ設定</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>システムログ有効化</Label>
                      <p className="text-sm text-gray-600">システム技術ログの記録</p>
                    </div>
                    <Switch
                      checked={getLogSettingValue('system_log_enabled', true)}
                      onCheckedChange={(checked) =>
                        updateLogSettingValue('system_log_enabled', checked)
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>ログレベル</Label>
                    <div className="flex flex-wrap gap-2">
                      {['debug', 'info', 'warn', 'error', 'fatal'].map((level) => (
                        <label key={level} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={getLogSettingValue('system_log_level', [
                              'info',
                              'warn',
                              'error',
                              'fatal',
                            ]).includes(level)}
                            onChange={(e) => {
                              const currentLevels = getLogSettingValue('system_log_level', [
                                'info',
                                'warn',
                                'error',
                                'fatal',
                              ]);
                              const newLevels = e.target.checked
                                ? [...currentLevels, level]
                                : currentLevels.filter((l: string) => l !== level);
                              updateLogSettingValue('system_log_level', newLevels);
                            }}
                            className="rounded"
                          />
                          <span className="text-sm capitalize">{level}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>エラーログ即座書き込み</Label>
                      <p className="text-sm text-gray-600">エラーログを即座にデータベースに保存</p>
                    </div>
                    <Switch
                      checked={getLogSettingValue('error_log_immediate', true)}
                      onCheckedChange={(checked) =>
                        updateLogSettingValue('error_log_immediate', checked)
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* 監査ログ設定 */}
              <div>
                <h3 className="text-lg font-semibold mb-4">監査ログ設定</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>監査ログ有効化</Label>
                      <p className="text-sm text-gray-600">ユーザー操作ログの記録</p>
                    </div>
                    <Switch
                      checked={getLogSettingValue('audit_log_enabled', true)}
                      onCheckedChange={(checked) =>
                        updateLogSettingValue('audit_log_enabled', checked)
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* バッファ設定 */}
              <div>
                <h3 className="text-lg font-semibold mb-4">バッファ設定</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bufferSize">バッファサイズ（件数）</Label>
                    <Input
                      id="bufferSize"
                      type="number"
                      value={getLogSettingValue('buffer_size', 100)}
                      onChange={(e) =>
                        updateLogSettingValue('buffer_size', parseInt(e.target.value))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="flushInterval">フラッシュ間隔（秒）</Label>
                    <Input
                      id="flushInterval"
                      type="number"
                      value={getLogSettingValue('flush_interval', 5)}
                      onChange={(e) =>
                        updateLogSettingValue('flush_interval', parseInt(e.target.value))
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => router.push('/system-admin/logs')}>
                  <FileText className="w-4 h-4 mr-2" />
                  ログ管理画面へ
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
