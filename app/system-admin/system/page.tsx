'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, Save, Shield, Bell, Monitor, AlertCircle, CheckCircle } from 'lucide-react';

import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

export default function SuperAdminSystemPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

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
    systemVersion: '1.0.0',
    maintenanceMessage: 'システムメンテナンス中です。しばらくお待ちください。',
  });

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

  if (!user || user.role !== 'system-admin') {
    return null;
  }

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

  function handleSettingChange(key: string, value: any) {
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
                <div className="text-2xl font-bold text-blue-600">{systemStatus.activeUsers}</div>
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
                onChange={(e) => handleSettingChange('sessionTimeout', parseInt(e.target.value))}
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
                onCheckedChange={(checked) => handleSettingChange('emailNotifications', checked)}
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
    </div>
  );
}
