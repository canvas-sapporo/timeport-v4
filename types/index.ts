'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Building, Settings, Save } from 'lucide-react';

export default function SystemAdminFeaturesPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('features');

  const tabs = [
    { id: 'features', label: '機能設定', icon: Settings },
    { id: 'usage', label: '利用状況', icon: Building }
  ];

  const [features, setFeatures] = useState([
    { code: 'attendance', name: '勤怠管理', description: '出退勤打刻、勤怠履歴管理', status: '有効', enabled: true },
    { code: 'requests', name: '申請機能', description: '各種申請の作成・承認機能', status: '有効', enabled: true },
    { code: 'user_management', name: 'ユーザー管理', description: 'ユーザーアカウントの管理', status: '有効', enabled: true },
    { code: 'organization_management', name: '組織管理', description: '部署・勤務地の管理', status: '有効', enabled: true },
    { code: 'analytics', name: '分析機能', description: '勤怠データの分析・レポート', status: '無効', enabled: false },
    { code: 'mobile_app', name: 'モバイルアプリ', description: 'スマートフォンアプリの利用', status: '有効', enabled: true },
    { code: 'api_integration', name: 'API連携', description: '外部システムとのAPI連携', status: '無効', enabled: false }
  ]);

  const [usageStats] = useState([
    { name: '勤怠管理', usage: 100, companies: '1/1 企業で利用中' },
    { name: '申請機能', usage: 100, companies: '1/1 企業で利用中' },
    { name: 'ユーザー管理', usage: 100, companies: '1/1 企業で利用中' },
    { name: '組織管理', usage: 100, companies: '1/1 企業で利用中' },
    { name: '分析機能', usage: 0, companies: '0/1 企業で利用中' },
    { name: 'モバイルアプリ', usage: 100, companies: '1/1 企業で利用中' }
  ]);

  if (!user || user.role !== 'system-admin') {
    return <div>アクセス権限がありません</div>;
  }

  const handleFeatureToggle = (featureCode: string, enabled: boolean) => {
    setFeatures(prev => prev.map(f => 
      f.code === featureCode 
        ? { ...f, enabled, status: enabled ? '有効' : '無効' }
        : f
    ));
  };

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Saving feature settings...');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">機能管理</h1>
          <p className="text-gray-600">各企業の機能利用設定を管理します</p>
        </div>
        <Button onClick={handleSaveSettings} disabled={isLoading} variant="timeport-primary">
          <Save className="w-4 h-4 mr-2" />
          設定保存
        </Button>
      </div>

      {/* タブナビゲーション */}
      <div className="relative bg-gray-100 rounded-lg p-1 shadow-inner">
        <nav className="relative flex space-x-1">
          {/* アクティブタブのスライド背景 */}
          <div 
            className="absolute top-0 bottom-0 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-900 rounded-md shadow-lg transition-all duration-300 ease-in-out"
            style={{
              left: `${tabs.findIndex(tab => tab.id === activeTab) * (100 / tabs.length)}%`,
              width: `${100 / tabs.length}%`
            }}
          />
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative z-10 flex items-center justify-center space-x-2 py-2 px-4 font-medium text-sm whitespace-nowrap transition-all duration-300 flex-1 ${
                  activeTab === tab.id
                    ? 'text-white'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* タブコンテンツ */}
      <div className="space-y-6">
        {activeTab === 'features' && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building className="w-5 h-5" />
            <span>株式会社TimePort</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>機能名</TableHead>
                <TableHead>説明</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>設定</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {features.map((feature) => (
                <TableRow key={feature.code}>
                  <TableCell className="font-medium">{feature.name}</TableCell>
                  <TableCell className="text-sm text-gray-600">{feature.description}</TableCell>
                  <TableCell>
                    <Badge className={feature.enabled ? "bg-blue-600 text-white" : "bg-gray-600 text-white"}>
                      {feature.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={feature.enabled}
                      onCheckedChange={(checked) => handleFeatureToggle(feature.code, checked)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
        )}

        {activeTab === 'usage' && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>機能利用状況</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {usageStats.map((stat, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{stat.name}</span>
                  <span className="text-sm text-gray-600">{stat.usage}%</span>
                </div>
                <Progress value={stat.usage} className="h-2" />
                <p className="text-xs text-gray-500">{stat.companies}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
        )}
      </div>
  );
}