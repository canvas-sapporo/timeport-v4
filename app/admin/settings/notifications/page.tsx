'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Bell, Save } from 'lucide-react';

export default function NotificationsSettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Notification Settings State
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    lateArrivalAlert: true,
    overtimeAlert: true,
    applicationAlert: true,
    systemMaintenance: true
  });

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/login');
      return;
    }
  }, [user, router]);

  if (!user || user.role !== 'admin') {
    return null;
  }

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      // In a real app, this would save to backend
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Saving notification settings...');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">通知設定</h1>
        <p className="text-gray-600">システム通知の設定を管理できます</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="w-5 h-5" />
            <span>通知設定</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>メール通知</Label>
                <p className="text-sm text-gray-500">システムからのメール通知を有効にする</p>
              </div>
              <Switch
                checked={notificationSettings.emailNotifications}
                onCheckedChange={(checked) => setNotificationSettings(prev => ({
                  ...prev,
                  emailNotifications: checked
                }))}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div>
                <Label>遅刻アラート</Label>
                <p className="text-sm text-gray-500">遅刻時にアラートを送信</p>
              </div>
              <Switch
                checked={notificationSettings.lateArrivalAlert}
                onCheckedChange={(checked) => setNotificationSettings(prev => ({
                  ...prev,
                  lateArrivalAlert: checked
                }))}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>残業アラート</Label>
                <p className="text-sm text-gray-500">残業時間超過時にアラートを送信</p>
              </div>
              <Switch
                checked={notificationSettings.overtimeAlert}
                onCheckedChange={(checked) => setNotificationSettings(prev => ({
                  ...prev,
                  overtimeAlert: checked
                }))}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>申請アラート</Label>
                <p className="text-sm text-gray-500">新規申請時にアラートを送信</p>
              </div>
              <Switch
                checked={notificationSettings.applicationAlert}
                onCheckedChange={(checked) => setNotificationSettings(prev => ({
                  ...prev,
                  applicationAlert: checked
                }))}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>メンテナンス通知</Label>
                <p className="text-sm text-gray-500">システムメンテナンス時に通知</p>
              </div>
              <Switch
                checked={notificationSettings.systemMaintenance}
                onCheckedChange={(checked) => setNotificationSettings(prev => ({
                  ...prev,
                  systemMaintenance: checked
                }))}
              />
            </div>
          </div>
          
          <Button 
            onClick={handleSaveSettings}
            disabled={isLoading}
            className="w-full"
          >
            <Save className="w-4 h-4 mr-2" />
            保存
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}