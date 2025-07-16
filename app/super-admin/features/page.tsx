'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Settings, Save, Building } from 'lucide-react';

export default function SuperAdminFeaturesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Mock feature settings for companies
  const [companyFeatures, setCompanyFeatures] = useState([
    {
      companyId: '1',
      companyName: '株式会社TimePort',
      features: {
        attendance: true,
        requests: true,
        userManagement: true,
        organizationManagement: true,
        analytics: false,
        mobileApp: true,
        apiAccess: false
      }
    }
  ]);

  useEffect(() => {
    if (!user || user.role !== 'super_admin') {
      router.push('/login');
      return;
    }
  }, [user, router]);

  if (!user || user.role !== 'super_admin') {
    return null;
  }

  const handleFeatureToggle = (companyId: string, featureKey: string, enabled: boolean) => {
    setCompanyFeatures(prev => 
      prev.map(company => 
        company.companyId === companyId 
          ? {
              ...company,
              features: {
                ...company.features,
                [featureKey]: enabled
              }
            }
          : company
      )
    );
  };

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      // In a real app, this would save to backend
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Saving feature settings...', companyFeatures);
    } finally {
      setIsLoading(false);
    }
  };

  const featureDefinitions = [
    { key: 'attendance', name: '勤怠管理', description: '出退勤打刻、勤怠履歴管理' },
    { key: 'requests', name: '申請機能', description: '各種申請の作成・承認機能' },
    { key: 'userManagement', name: 'ユーザー管理', description: 'ユーザーアカウントの管理' },
    { key: 'organizationManagement', name: '組織管理', description: '部署・勤務地の管理' },
    { key: 'analytics', name: '分析機能', description: '勤怠データの分析・レポート' },
    { key: 'mobileApp', name: 'モバイルアプリ', description: 'スマートフォンアプリの利用' },
    { key: 'apiAccess', name: 'API連携', description: '外部システムとのAPI連携' }
  ];

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

      {companyFeatures.map((company) => (
        <Card key={company.companyId}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building className="w-5 h-5" />
              <span>{company.companyName}</span>
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
                {featureDefinitions.map((feature) => (
                  <TableRow key={feature.key}>
                    <TableCell className="font-medium">{feature.name}</TableCell>
                    <TableCell className="text-sm text-gray-600">{feature.description}</TableCell>
                    <TableCell>
                      <Badge variant={company.features[feature.key as keyof typeof company.features] ? "default" : "secondary"}>
                        {company.features[feature.key as keyof typeof company.features] ? '有効' : '無効'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={company.features[feature.key as keyof typeof company.features]}
                        onCheckedChange={(checked) => handleFeatureToggle(company.companyId, feature.key, checked)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}

      {/* Feature Usage Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>機能利用状況</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {featureDefinitions.map((feature) => {
              const enabledCount = companyFeatures.reduce((count, company) => 
                count + (company.features[feature.key as keyof typeof company.features] ? 1 : 0), 0
              );
              const totalCount = companyFeatures.length;
              const percentage = Math.round((enabledCount / totalCount) * 100);

              return (
                <div key={feature.key} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">{feature.name}</h3>
                    <Badge variant="outline">{percentage}%</Badge>
                  </div>
                  <div className="text-sm text-gray-600">
                    {enabledCount}/{totalCount} 企業で利用中
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}