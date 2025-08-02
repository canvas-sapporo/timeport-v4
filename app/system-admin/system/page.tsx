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
import { useToast } from '@/hooks/use-toast';

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

  useEffect(() => {
    if (!user || user.role !== 'system-admin') {
      router.push('/login');
      return;
    }
  }, [user, router]);

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
        <Button onClick={handleSaveSettings} disabled={isLoading}>
          <Save className="w-4 h-4 mr-2" />
          設定保存
        </Button>
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
    </div>
  );
}
