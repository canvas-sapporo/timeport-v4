'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Building, 
  Clock, 
  Bell, 
  Shield, 
  Database,
  Save,
  Plus,
  Edit,
  Trash2,
  FormInput
} from 'lucide-react';

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('system');

  // System Settings State
  const [systemSettings, setSystemSettings] = useState({
    companyName: '株式会社TimePort',
    timezone: 'Asia/Tokyo',
    workingHours: {
      start: '09:00',
      end: '18:00',
      breakDuration: 60
    },
    overtimeThreshold: 480,
    autoClockOut: false,
    requireApproval: true,
    features: {
      attendance: true,
      requests: true,
      userManagement: true,
      organizationManagement: true,
      analytics: false
    }
  });

  // Notification Settings State
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    lateArrivalAlert: true,
    overtimeAlert: true,
    applicationAlert: true,
    systemMaintenance: true
  });

  // Mock Request Types for Form Builder
  const [requestTypes] = useState([
    {
      id: '1',
      name: '休暇申請',
      code: 'vacation',
      description: '年次有給休暇や特別休暇の申請',
      form_fields: [],
      is_active: true,
      created_at: '2024-01-20T00:00:00Z',
      updated_at: '2024-01-20T00:00:00Z'
    },
    {
      id: '2',
      name: '残業申請',
      code: 'overtime',
      description: '時間外労働の事前申請',
      form_fields: [],
      is_active: true,
      created_at: '2024-01-18T00:00:00Z',
      updated_at: '2024-01-18T00:00:00Z'
    },
    {
      id: '3',
      name: '時刻修正申請',
      code: 'time_correction',
      description: '出退勤時刻の修正申請',
      form_fields: [],
      is_active: false,
      created_at: '2024-01-15T00:00:00Z',
      updated_at: '2024-01-15T00:00:00Z'
    }
  ]);

  // Organization Settings State
  const [organizationSettings, setOrganizationSettings] = useState({
    companyName: '株式会社TimePort',
    departments: ['開発部', '営業部', '管理部'],
    workplaces: ['本社', '大阪支社']
  });

  if (!user || user.role !== 'admin') {
    return <div>アクセス権限がありません</div>;
  }

  const handleSaveSettings = async (settingsType: string) => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log(`Saving ${settingsType} settings...`);
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: 'system', label: 'システム', icon: Settings },
    { id: 'notifications', label: '通知', icon: Bell },
    { id: 'features', label: '機能設定', icon: FormInput },
    { id: 'form-builder', label: '申請フォーム', icon: FormInput },
    { id: 'group', label: 'グループ', icon: Building }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">設定</h1>
        <p className="text-gray-600">システム全体の設定を管理できます</p>
      </div>

      {/* タブナビゲーション */}
      <div className="border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <nav className="flex space-x-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-6 font-medium text-sm whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-black text-white rounded-t-lg shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* タブコンテンツ */}
      <div className="mt-6">
        {/* システム設定 */}
        {activeTab === 'system' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Building className="w-5 h-5" />
                    <span>会社情報</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="companyName">会社名</Label>
                    <Input
                      id="companyName"
                      value={systemSettings.companyName}
                      onChange={(e) => setSystemSettings(prev => ({
                        ...prev,
                        companyName: e.target.value
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="timezone">タイムゾーン</Label>
                    <Select
                      value={systemSettings.timezone}
                      onValueChange={(value) => setSystemSettings(prev => ({
                        ...prev,
                        timezone: value
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Asia/Tokyo">Asia/Tokyo (JST)</SelectItem>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    onClick={() => handleSaveSettings('company')}
                    disabled={isLoading}
                    className="w-full"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    保存
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="w-5 h-5" />
                    <span>勤務時間設定</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="startTime">開始時刻</Label>
                      <Input
                        id="startTime"
                        type="time"
                        value={systemSettings.workingHours.start}
                        onChange={(e) => setSystemSettings(prev => ({
                          ...prev,
                          workingHours: {
                            ...prev.workingHours,
                            start: e.target.value
                          }
                        }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="endTime">終了時刻</Label>
                      <Input
                        id="endTime"
                        type="time"
                        value={systemSettings.workingHours.end}
                        onChange={(e) => setSystemSettings(prev => ({
                          ...prev,
                          workingHours: {
                            ...prev.workingHours,
                            end: e.target.value
                          }
                        }))}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="breakDuration">休憩時間（分）</Label>
                    <Input
                      id="breakDuration"
                      type="number"
                      value={systemSettings.workingHours.breakDuration}
                      onChange={(e) => setSystemSettings(prev => ({
                        ...prev,
                        workingHours: {
                          ...prev.workingHours,
                          breakDuration: parseInt(e.target.value)
                        }
                      }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="autoClockOut">自動退勤</Label>
                    <Switch
                      id="autoClockOut"
                      checked={systemSettings.autoClockOut}
                      onCheckedChange={(checked) => setSystemSettings(prev => ({
                        ...prev,
                        autoClockOut: checked
                      }))}
                    />
                  </div>
                  <Button 
                    onClick={() => handleSaveSettings('working-hours')}
                    disabled={isLoading}
                    className="w-full"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    保存
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* 通知設定 */}
        {activeTab === 'notifications' && (
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
                onClick={() => handleSaveSettings('notifications')}
                disabled={isLoading}
                className="w-full"
              >
                <Save className="w-4 h-4 mr-2" />
                保存
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 機能設定 */}
        {activeTab === 'features' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FormInput className="w-5 h-5" />
                <span>機能設定</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>勤怠管理機能</Label>
                    <p className="text-sm text-gray-500">出退勤打刻、勤怠履歴の管理</p>
                  </div>
                  <Switch
                    checked={systemSettings.features.attendance}
                    onCheckedChange={(checked) => setSystemSettings(prev => ({
                      ...prev,
                      features: { ...prev.features, attendance: checked }
                    }))}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>申請機能</Label>
                    <p className="text-sm text-gray-500">各種申請の作成・承認機能</p>
                  </div>
                  <Switch
                    checked={systemSettings.features.requests}
                    onCheckedChange={(checked) => setSystemSettings(prev => ({
                      ...prev,
                      features: { ...prev.features, requests: checked }
                    }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>ユーザー管理</Label>
                    <p className="text-sm text-gray-500">ユーザーアカウントの管理</p>
                  </div>
                  <Switch
                    checked={systemSettings.features.userManagement}
                    onCheckedChange={(checked) => setSystemSettings(prev => ({
                      ...prev,
                      features: { ...prev.features, userManagement: checked }
                    }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>グループ管理</Label>
                    <p className="text-sm text-gray-500">グループの階層管理</p>
                  </div>
                  <Switch
                    checked={systemSettings.features.organizationManagement}
                    onCheckedChange={(checked) => setSystemSettings(prev => ({
                      ...prev,
                      features: { ...prev.features, organizationManagement: checked }
                    }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>分析機能</Label>
                    <p className="text-sm text-gray-500">勤怠データの分析・レポート</p>
                  </div>
                  <Switch
                    checked={systemSettings.features.analytics}
                    onCheckedChange={(checked) => setSystemSettings(prev => ({
                      ...prev,
                      features: { ...prev.features, analytics: checked }
                    }))}
                  />
                </div>
              </div>
              
              <Button 
                onClick={() => handleSaveSettings('features')}
                disabled={isLoading}
                className="w-full"
              >
                <Save className="w-4 h-4 mr-2" />
                保存
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 申請フォーム */}
        {activeTab === 'form-builder' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FormInput className="w-5 h-5" />
                  <span>申請フォーム</span>
                </div>
                <Button onClick={() => window.location.href = '/admin/request-types/new'}>
                  <Plus className="w-4 h-4 mr-2" />
                  新規フォーム作成
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>申請名</TableHead>
                    <TableHead>コード</TableHead>
                    <TableHead>説明</TableHead>
                    <TableHead>項目数</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>更新日</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requestTypes.map((type) => (
                    <TableRow key={type.id}>
                      <TableCell className="font-medium">{type.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{type.code}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {type.description}
                      </TableCell>
                      <TableCell>{type.form_fields.length}項目</TableCell>
                      <TableCell>
                        <Badge variant={type.is_active ? "default" : "secondary"}>
                          {type.is_active ? '有効' : '無効'}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(type.updated_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => window.location.href = `/admin/request-types/${type.id}/edit`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-600"
                            onClick={() => {
                              if (confirm(`申請種別「${type.name}」を削除しますか？`)) {
                                console.log('Delete application type:', type.id);
                                // 実際の削除処理はここに実装
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* 組織設定 */}
        {activeTab === 'group' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building className="w-5 h-5" />
                  <span>グループ設定</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="orgCompanyName">会社名</Label>
                  <Input
                    id="orgCompanyName"
                    value={organizationSettings.companyName}
                    onChange={(e) => setOrganizationSettings(prev => ({
                      ...prev,
                      companyName: e.target.value
                    }))}
                  />
                </div>
                
                <div>
                  <Label>グループ一覧</Label>
                  <div className="mt-2 space-y-2">
                    {organizationSettings.departments.map((group, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span>{group}</span>
                        <Button variant="ghost" size="sm" className="text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" className="w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      グループを追加
                    </Button>
                  </div>
                </div>

                <Button 
                  onClick={() => handleSaveSettings('group')}
                  disabled={isLoading}
                  className="w-full"
                >
                  <Save className="w-4 h-4 mr-2" />
                  保存
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}