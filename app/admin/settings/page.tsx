'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Settings,
  Building,
  Clock,
  Bell,
  Shield,
  Save,
  Plus,
  Edit,
  Trash2,
  FormInput,
  Users,
  Briefcase,
  Loader2,
  FileText,
  Activity,
} from 'lucide-react';

import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ActionButton } from '@/components/ui/action-button';
import { StandardButton } from '@/components/ui/standard-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from '@/components/ui/select';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getEmploymentTypes, getEmploymentTypeStats } from '@/lib/actions/admin/employment-types';
import { getWorkTypes, getWorkTypeStats } from '@/lib/actions/admin/work-types';
import { getAttendanceStatuses } from '@/lib/actions/attendance';
import { getCompanyInfo, updateCompanyInfo } from '@/lib/actions/user-settings';
import { saveAttendanceSetting, getAttendanceSettingValue } from '@/lib/actions/settings';
import type { EmploymentType, WorkType } from '@/schemas/employment-type';
import type { AttendanceStatusData } from '@/schemas/attendance';
import type { Company } from '@/schemas/company';
import type { CompanyInfo } from '@/schemas/user_profile';
import { formatDateTimeForDisplay } from '@/lib/utils';

// 時刻フォーマット関数を追加
function formatTime(time: string) {
  if (!time) return '--:--';
  return time.substring(0, 5); // HH:MM形式で表示
}

// 雇用形態管理用ダイアログコンポーネントをインポート
import EmploymentTypeCreateDialog from '@/components/admin/employment-types/EmploymentTypeCreateDialog';
import EmploymentTypeEditDialog from '@/components/admin/employment-types/EmploymentTypeEditDialog';
import EmploymentTypeDeleteDialog from '@/components/admin/employment-types/EmploymentTypeDeleteDialog';

// 勤務形態管理用ダイアログコンポーネントをインポート
import WorkTypeCreateDialog from '@/components/admin/work-types/WorkTypeCreateDialog';
import WorkTypeEditDialog from '@/components/admin/work-types/WorkTypeEditDialog';
import WorkTypeDeleteDialog from '@/components/admin/work-types/WorkTypeDeleteDialog';

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('system');

  // Company State
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [isCompanyLoading, setIsCompanyLoading] = useState(false);

  // Attendance Statuses State
  const [attendanceStatuses, setAttendanceStatuses] = useState<AttendanceStatusData[]>([]);
  const [isAttendanceStatusesLoading, setIsAttendanceStatusesLoading] = useState(false);

  // Employment Types State
  const [employmentTypes, setEmploymentTypes] = useState<EmploymentType[]>([]);
  const [employmentTypeStats, setEmploymentTypeStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
  });
  const [isEmploymentTypesLoading, setIsEmploymentTypesLoading] = useState(false);

  // 雇用形態ダイアログの状態管理
  const [createEmploymentTypeDialogOpen, setCreateEmploymentTypeDialogOpen] = useState(false);
  const [editEmploymentTypeDialogOpen, setEditEmploymentTypeDialogOpen] = useState(false);
  const [editEmploymentTypeTarget, setEditEmploymentTypeTarget] = useState<EmploymentType | null>(
    null
  );
  const [deleteEmploymentTypeDialogOpen, setDeleteEmploymentTypeDialogOpen] = useState(false);
  const [deleteEmploymentTypeTarget, setDeleteEmploymentTypeTarget] =
    useState<EmploymentType | null>(null);

  // Work Types State
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [workTypeStats, setWorkTypeStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
  });
  const [isWorkTypesLoading, setIsWorkTypesLoading] = useState(false);

  // 勤務形態ダイアログの状態管理
  const [createWorkTypeDialogOpen, setCreateWorkTypeDialogOpen] = useState(false);
  const [editWorkTypeDialogOpen, setEditWorkTypeDialogOpen] = useState(false);
  const [editWorkTypeTarget, setEditWorkTypeTarget] = useState<WorkType | null>(null);
  const [deleteWorkTypeDialogOpen, setDeleteWorkTypeDialogOpen] = useState(false);
  const [deleteWorkTypeTarget, setDeleteWorkTypeTarget] = useState<WorkType | null>(null);

  // System Settings State
  const [systemSettings, setSystemSettings] = useState({
    debugMode: false,
    maintenanceMode: false,
    logLevel: 'info',
    features: {
      attendance: true,
      requests: true,
      userManagement: true,
      organizationManagement: true,
      analytics: false,
    },
  });

  // Notification Settings State
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    lateArrivalAlert: true,
    overtimeAlert: true,
    applicationAlert: true,
    systemMaintenance: true,
    securityAlert: false,
    backupNotification: false,
    timeEditPermission: false, // 打刻編集許可
  });

  // 企業情報取得
  async function fetchCompanyInfo() {
    if (!user?.company_id) return;

    setIsCompanyLoading(true);
    try {
      const companyInfo = await getCompanyInfo(user.company_id);
      if (companyInfo) {
        setCompany(companyInfo);
      } else {
        console.error('企業情報取得失敗');
      }
    } catch (error) {
      console.error('企業情報取得エラー:', error);
    } finally {
      setIsCompanyLoading(false);
    }
  }

  // 勤怠ステータス取得
  async function fetchAttendanceStatuses() {
    if (!user?.company_id) return;

    setIsAttendanceStatusesLoading(true);
    try {
      const [statusesResult, lateAlertResult, overtimeAlertResult, clockEditResult] =
        await Promise.all([
          getAttendanceStatuses(user.company_id),
          getAttendanceSettingValue(user.company_id, 'late_alert'),
          getAttendanceSettingValue(user.company_id, 'overtime_alert'),
          getAttendanceSettingValue(user.company_id, 'clock_record_edit'),
        ]);

      if (statusesResult.success && statusesResult.statuses) {
        setAttendanceStatuses(statusesResult.statuses);
      } else {
        console.error('勤怠ステータス取得失敗:', statusesResult.error);
      }

      // 設定値を更新
      setNotificationSettings((prev) => ({
        ...prev,
        lateArrivalAlert: (lateAlertResult as { enabled: boolean })?.enabled || false,
        overtimeAlert: (overtimeAlertResult as { enabled: boolean })?.enabled || false,
        timeEditPermission: (clockEditResult as { enabled: boolean })?.enabled || false,
      }));
    } catch (error) {
      console.error('勤怠ステータス取得エラー:', error);
    } finally {
      setIsAttendanceStatusesLoading(false);
    }
  }

  // 雇用形態データ取得
  async function fetchEmploymentTypes() {
    if (!user?.company_id) return;

    setIsEmploymentTypesLoading(true);
    try {
      const [typesResult, statsResult] = await Promise.all([
        getEmploymentTypes(user.company_id),
        getEmploymentTypeStats(user.company_id),
      ]);

      if (typesResult.success) {
        setEmploymentTypes(typesResult.data.employment_types);
      } else {
        console.error('雇用形態取得失敗:', typesResult.error);
      }

      if (statsResult.success) {
        setEmploymentTypeStats(statsResult.data);
      } else {
        console.error('雇用形態統計取得失敗:', statsResult.error);
      }
    } catch (error) {
      console.error('雇用形態データ取得エラー:', error);
    } finally {
      setIsEmploymentTypesLoading(false);
    }
  }

  // 勤務形態データ取得
  async function fetchWorkTypes() {
    if (!user?.company_id) return;

    setIsWorkTypesLoading(true);
    try {
      const [typesResult, statsResult] = await Promise.all([
        getWorkTypes(user.company_id, { page: 1, limit: 100 }),
        getWorkTypeStats(user.company_id),
      ]);

      if (typesResult.success) {
        setWorkTypes(typesResult.data.work_types);
      } else {
        console.error('勤務形態取得失敗:', typesResult.error);
      }

      if (statsResult.success) {
        setWorkTypeStats(statsResult.data);
      } else {
        console.error('勤務形態統計取得失敗:', statsResult.error);
      }
    } catch (error) {
      console.error('勤務形態データ取得エラー:', error);
    } finally {
      setIsWorkTypesLoading(false);
    }
  }

  async function handleSaveSettings(settingsType: string) {
    setIsLoading(true);
    try {
      if (settingsType === 'company' && company && user?.company_id) {
        const result = await updateCompanyInfo(
          user.company_id,
          {
            name: company.name,
            code: company.code,
            address: company.address,
            phone: company.phone,
          },
          user.id
        );

        if (result.success) {
          toast({
            title: '成功',
            description: result.message,
          });
        } else {
          toast({
            title: 'エラー',
            description: result.error || '企業情報の更新に失敗しました',
            variant: 'destructive',
          });
        }
      } else if (settingsType === 'attendance' && user?.company_id) {
        // 勤怠設定の保存
        const results = await Promise.all([
          saveAttendanceSetting(
            user.company_id,
            'late_alert',
            { enabled: notificationSettings.lateArrivalAlert },
            user.id
          ),
          saveAttendanceSetting(
            user.company_id,
            'overtime_alert',
            { enabled: notificationSettings.overtimeAlert },
            user.id
          ),
          saveAttendanceSetting(
            user.company_id,
            'clock_record_edit',
            { enabled: notificationSettings.timeEditPermission },
            user.id
          ),
        ]);

        const hasError = results.some((result) => !result.success);
        if (hasError) {
          toast({
            title: 'エラー',
            description: '勤怠設定の保存に失敗しました',
            variant: 'destructive',
          });
        } else {
          toast({
            title: '成功',
            description: '勤怠設定を保存しました',
          });
        }
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        console.log(`Saving ${settingsType} settings...`);
      }
    } catch (error) {
      console.error('設定保存エラー:', error);
      toast({
        title: 'エラー',
        description: '設定の保存に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  // 雇用形態編集ボタン押下時
  function handleEditEmploymentType(employmentType: EmploymentType) {
    setEditEmploymentTypeTarget(employmentType);
    setEditEmploymentTypeDialogOpen(true);
  }

  // 雇用形態削除ボタン押下時
  function handleDeleteEmploymentType(employmentType: EmploymentType) {
    setDeleteEmploymentTypeTarget(employmentType);
    setDeleteEmploymentTypeDialogOpen(true);
  }

  // 勤務形態編集ボタン押下時
  function handleEditWorkType(workType: WorkType) {
    setEditWorkTypeTarget(workType);
    setEditWorkTypeDialogOpen(true);
  }

  // 勤務形態削除ボタン押下時
  function handleDeleteWorkType(workType: WorkType) {
    setDeleteWorkTypeTarget(workType);
    setDeleteWorkTypeDialogOpen(true);
  }

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/login');
      return;
    }

    // システムタブがアクティブになったときに企業情報を取得
    if (activeTab === 'system') {
      fetchCompanyInfo();
    }

    // 勤怠管理タブがアクティブになったときに勤怠ステータスを取得
    if (activeTab === 'attendance') {
      fetchAttendanceStatuses();
    }

    // 雇用形態タブがアクティブになったときにデータを取得
    if (activeTab === 'employment-types') {
      fetchEmploymentTypes();
    }

    // 勤務形態タブがアクティブになったときにデータを取得
    if (activeTab === 'work-types') {
      fetchWorkTypes();
    }
  }, [user, router, activeTab]);

  if (!user || user.role !== 'admin') {
    return null;
  }

  const tabs = [
    { id: 'system', label: 'システム', icon: Settings },
    { id: 'notifications', label: '通知', icon: Bell },
    { id: 'features', label: '機能設定', icon: FormInput },
    { id: 'employment-types', label: '雇用形態', icon: Users },
    { id: 'work-types', label: '勤務形態', icon: Briefcase },
    { id: 'attendance', label: '勤怠管理', icon: Clock },
    { id: 'logs', label: 'ログ設定', icon: FileText },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">設定</h1>
        <p className="text-gray-600">システム全体の設定を管理できます</p>
      </div>

      {/* タブナビゲーション */}
      <div className="border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <nav className="flex space-x-0 bg-gray-50 rounded-t-lg px-2 py-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-2 px-4 font-semibold text-sm whitespace-nowrap transition-all duration-200 rounded-md mx-1
                  ${
                    activeTab === tab.id
                      ? 'bg-black text-white shadow-md scale-105'
                      : 'text-gray-500 hover:text-black hover:bg-gray-100'
                  }
                `}
                style={{ minHeight: 32 }}
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
            <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Building className="w-5 h-5" />
                    <span>企業情報</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isCompanyLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="flex items-center space-x-2">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span>企業情報を読み込み中...</span>
                      </div>
                    </div>
                  ) : company ? (
                    <>
                      <div>
                        <Label htmlFor="companyName">企業名</Label>
                        <Input
                          id="companyName"
                          value={company.name}
                          onChange={(e) =>
                            setCompany((prev) => (prev ? { ...prev, name: e.target.value } : null))
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="companyCode">企業コード</Label>
                        <Input
                          id="companyCode"
                          value={company.code}
                          onChange={(e) =>
                            setCompany((prev) => (prev ? { ...prev, code: e.target.value } : null))
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="companyAddress">住所</Label>
                        <Textarea
                          id="companyAddress"
                          value={company.address || ''}
                          onChange={(e) =>
                            setCompany((prev) =>
                              prev ? { ...prev, address: e.target.value } : null
                            )
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="companyPhone">電話番号</Label>
                        <Input
                          id="companyPhone"
                          value={company.phone || ''}
                          onChange={(e) =>
                            setCompany((prev) => (prev ? { ...prev, phone: e.target.value } : null))
                          }
                        />
                      </div>
                      <Button
                        onClick={() => handleSaveSettings('company')}
                        disabled={isLoading}
                        className="w-full"
                        variant="timeport-primary"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        保存
                      </Button>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500">企業情報を取得できませんでした</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="w-5 h-5" />
                  <span>システム設定</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>デバッグモード</Label>
                    <p className="text-sm text-gray-500">開発・デバッグ用の詳細ログ出力</p>
                  </div>
                  <Switch
                    checked={systemSettings.debugMode || false}
                    onCheckedChange={(checked) =>
                      setSystemSettings((prev) => ({ ...prev, debugMode: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>メンテナンスモード</Label>
                    <p className="text-sm text-gray-500">システムメンテナンス時の一時停止</p>
                  </div>
                  <Switch
                    checked={systemSettings.maintenanceMode || false}
                    onCheckedChange={(checked) =>
                      setSystemSettings((prev) => ({ ...prev, maintenanceMode: checked }))
                    }
                  />
                </div>

                <Button
                  onClick={() => handleSaveSettings('system')}
                  disabled={isLoading}
                  className="w-full"
                  variant="timeport-primary"
                >
                  <Save className="w-4 h-4 mr-2" />
                  保存
                </Button>
              </CardContent>
            </Card>
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
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>メール通知</Label>
                  <p className="text-sm text-gray-500">システムからのメール通知</p>
                </div>
                <Switch
                  checked={notificationSettings.emailNotifications}
                  onCheckedChange={(checked) =>
                    setNotificationSettings((prev) => ({ ...prev, emailNotifications: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>セキュリティアラート</Label>
                  <p className="text-sm text-gray-500">セキュリティ関連の通知</p>
                </div>
                <Switch
                  checked={notificationSettings.securityAlert || false}
                  onCheckedChange={(checked) =>
                    setNotificationSettings((prev) => ({ ...prev, securityAlert: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>バックアップ通知</Label>
                  <p className="text-sm text-gray-500">データバックアップの通知</p>
                </div>
                <Switch
                  checked={notificationSettings.backupNotification || false}
                  onCheckedChange={(checked) =>
                    setNotificationSettings((prev) => ({ ...prev, backupNotification: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>申請アラート</Label>
                  <p className="text-sm text-gray-500">申請・承認の通知</p>
                </div>
                <Switch
                  checked={notificationSettings.applicationAlert}
                  onCheckedChange={(checked) =>
                    setNotificationSettings((prev) => ({ ...prev, applicationAlert: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>システムメンテナンス</Label>
                  <p className="text-sm text-gray-500">メンテナンス情報の通知</p>
                </div>
                <Switch
                  checked={notificationSettings.systemMaintenance}
                  onCheckedChange={(checked) =>
                    setNotificationSettings((prev) => ({ ...prev, systemMaintenance: checked }))
                  }
                />
              </div>

              <Button
                onClick={() => handleSaveSettings('notifications')}
                disabled={isLoading}
                className="w-full"
                variant="timeport-primary"
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
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>勤怠管理</Label>
                  <p className="text-sm text-gray-500">出退勤記録・勤怠管理機能</p>
                </div>
                <Switch
                  checked={systemSettings.features.attendance}
                  onCheckedChange={(checked) =>
                    setSystemSettings((prev) => ({
                      ...prev,
                      features: { ...prev.features, attendance: checked },
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>申請・承認</Label>
                  <p className="text-sm text-gray-500">各種申請・承認機能</p>
                </div>
                <Switch
                  checked={systemSettings.features.requests}
                  onCheckedChange={(checked) =>
                    setSystemSettings((prev) => ({
                      ...prev,
                      features: { ...prev.features, requests: checked },
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>ユーザー管理</Label>
                  <p className="text-sm text-gray-500">ユーザーの追加・編集・削除</p>
                </div>
                <Switch
                  checked={systemSettings.features.userManagement}
                  onCheckedChange={(checked) =>
                    setSystemSettings((prev) => ({
                      ...prev,
                      features: { ...prev.features, userManagement: checked },
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>組織管理</Label>
                  <p className="text-sm text-gray-500">グループ・グループの管理</p>
                </div>
                <Switch
                  checked={systemSettings.features.organizationManagement}
                  onCheckedChange={(checked) =>
                    setSystemSettings((prev) => ({
                      ...prev,
                      features: { ...prev.features, organizationManagement: checked },
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>分析機能</Label>
                  <p className="text-sm text-gray-500">勤怠データの分析・レポート</p>
                </div>
                <Switch
                  checked={systemSettings.features.analytics}
                  onCheckedChange={(checked) =>
                    setSystemSettings((prev) => ({
                      ...prev,
                      features: { ...prev.features, analytics: checked },
                    }))
                  }
                />
              </div>

              <Button
                onClick={() => handleSaveSettings('features')}
                disabled={isLoading}
                className="w-full"
                variant="timeport-primary"
              >
                <Save className="w-4 h-4 mr-2" />
                保存
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 勤怠管理設定 */}
        {activeTab === 'attendance' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="w-5 h-5" />
                  <span>勤怠管理設定</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* ステータス管理セクション */}
                <div className="border rounded-lg p-6 bg-gray-50">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">ステータス管理</h3>
                      <p className="text-sm text-gray-600">
                        勤怠ステータスの種類を管理できます。正常、遅刻、早退、欠勤などのステータスをカスタマイズできます。
                      </p>
                    </div>
                    <Button
                      onClick={() => router.push('/admin/attendance-statuses')}
                      variant="timeport-primary"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      ステータス管理
                    </Button>
                  </div>

                  {isAttendanceStatusesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="flex items-center space-x-2">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span>ステータスを読み込み中...</span>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {attendanceStatuses.map((status) => (
                        <div key={status.id} className="bg-white p-4 rounded-lg border">
                          <div className="flex items-center space-x-2 mb-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: status.background_color }}
                            ></div>
                            <span className="font-medium">{status.display_name}</span>
                            {status.is_required && (
                              <Badge variant="outline" className="text-xs">
                                必須
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{status.description}</p>
                        </div>
                      ))}
                      {attendanceStatuses.length === 0 && (
                        <div className="col-span-full text-center py-8">
                          <p className="text-gray-500">勤怠ステータスが登録されていません</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 勤怠設定セクション */}
                <div className="border rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">勤怠設定</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>遅刻アラート</Label>
                        <p className="text-sm text-gray-500">遅刻時の通知</p>
                      </div>
                      <Switch
                        checked={notificationSettings.lateArrivalAlert}
                        onCheckedChange={(checked) =>
                          setNotificationSettings((prev) => ({
                            ...prev,
                            lateArrivalAlert: checked,
                          }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>残業アラート</Label>
                        <p className="text-sm text-gray-500">残業時間の通知</p>
                      </div>
                      <Switch
                        checked={notificationSettings.overtimeAlert}
                        onCheckedChange={(checked) =>
                          setNotificationSettings((prev) => ({ ...prev, overtimeAlert: checked }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>打刻編集</Label>
                        <p className="text-sm text-gray-500">管理者による打刻の編集許可</p>
                      </div>
                      <Switch
                        checked={notificationSettings.timeEditPermission}
                        onCheckedChange={(checked) =>
                          setNotificationSettings((prev) => ({
                            ...prev,
                            timeEditPermission: checked,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <Button
                    onClick={() => handleSaveSettings('attendance')}
                    disabled={isLoading}
                    className="w-full mt-6"
                    variant="timeport-primary"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    保存
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 雇用形態設定 */}
        {activeTab === 'employment-types' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>雇用形態設定</span>
                </div>
                <Button
                  onClick={() => setCreateEmploymentTypeDialogOpen(true)}
                  variant="timeport-primary"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  新規雇用形態
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEmploymentTypesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>データを読み込み中...</span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold">{employmentTypeStats.total}</div>
                      <div className="text-sm text-gray-600">総雇用形態数</div>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {employmentTypeStats.active}
                      </div>
                      <div className="text-sm text-gray-600">有効</div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-400">
                        {employmentTypeStats.inactive}
                      </div>
                      <div className="text-sm text-gray-600">無効</div>
                    </div>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>雇用形態名</TableHead>
                        <TableHead>コード</TableHead>
                        <TableHead>説明</TableHead>
                        <TableHead>表示順序</TableHead>
                        <TableHead>ステータス</TableHead>
                        <TableHead>編集日</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employmentTypes.map((type) => (
                        <TableRow key={type.id}>
                          <TableCell className="font-medium">{type.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{type.code}</Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{type.description}</TableCell>
                          <TableCell>{type.display_order}</TableCell>
                          <TableCell>
                            <Badge variant={type.is_active ? 'default' : 'secondary'}>
                              {type.is_active ? '有効' : '無効'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {type.updated_at ? new Date(type.updated_at).toLocaleDateString() : '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <ActionButton
                                action="edit"
                                onClick={() => handleEditEmploymentType(type)}
                              />
                              <ActionButton
                                action="delete"
                                onClick={() => handleDeleteEmploymentType(type)}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {employmentTypes.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-gray-500">雇用形態が登録されていません</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* 勤務形態設定 */}
        {activeTab === 'work-types' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Briefcase className="w-5 h-5" />
                  <span>勤務形態設定</span>
                </div>
                <Button
                  onClick={() => setCreateWorkTypeDialogOpen(true)}
                  variant="timeport-primary"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  新規勤務形態
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isWorkTypesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>データを読み込み中...</span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold">{workTypeStats.total}</div>
                      <div className="text-sm text-gray-600">総勤務形態数</div>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {workTypeStats.active}
                      </div>
                      <div className="text-sm text-gray-600">有効</div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-400">
                        {workTypeStats.inactive}
                      </div>
                      <div className="text-sm text-gray-600">無効</div>
                    </div>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>勤務形態名</TableHead>
                        <TableHead>コード</TableHead>
                        <TableHead>勤務時間</TableHead>
                        <TableHead>休憩時間</TableHead>
                        <TableHead>フレックス</TableHead>
                        <TableHead>ステータス</TableHead>
                        <TableHead>編集日</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {workTypes.map((type) => (
                        <TableRow key={type.id}>
                          <TableCell className="font-medium">{type.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{type.code}</Badge>
                          </TableCell>
                          <TableCell>
                            {formatTime(type.work_start_time)} - {formatTime(type.work_end_time)}
                          </TableCell>
                          <TableCell>{type.break_duration_minutes}分</TableCell>
                          <TableCell>
                            <Badge variant={type.is_flexible ? 'default' : 'secondary'}>
                              {type.is_flexible ? 'フレックス' : '固定'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={type.is_active ? 'default' : 'secondary'}>
                              {type.is_active ? '有効' : '無効'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {type.updated_at ? new Date(type.updated_at).toLocaleDateString() : '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <ActionButton
                                action="edit"
                                onClick={() => handleEditWorkType(type)}
                              />
                              <ActionButton
                                action="delete"
                                onClick={() => handleDeleteWorkType(type)}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {workTypes.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-gray-500">勤務形態が登録されていません</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* ログ設定 */}
        {activeTab === 'logs' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>ログ設定</span>
                </CardTitle>
                <CardDescription>
                  システムログと監査ログの設定を管理します。ログの記録レベルや保存期間を設定できます。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* システムログ設定 */}
                <div className="border rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">システムログ設定</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>システムログ記録</Label>
                        <p className="text-sm text-gray-500">
                          システム技術ログの記録を有効にします
                        </p>
                      </div>
                      <Switch
                        checked={systemSettings.debugMode}
                        onCheckedChange={(checked) =>
                          setSystemSettings((prev) => ({ ...prev, debugMode: checked }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>ログレベル</Label>
                      <p className="text-sm text-gray-500">
                        記録するログの重要度レベルを選択します
                      </p>
                      <select
                        className="w-full px-3 py-2 border border-input bg-background rounded-md"
                        defaultValue="info"
                      >
                        <option value="debug">Debug - デバッグ情報</option>
                        <option value="info">Info - 一般情報</option>
                        <option value="warn">Warning - 警告</option>
                        <option value="error">Error - エラー</option>
                        <option value="fatal">Fatal - 致命的エラー</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>エラーログ即座保存</Label>
                        <p className="text-sm text-gray-500">
                          エラーログを即座にデータベースに保存します
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.securityAlert || false}
                        onCheckedChange={(checked) =>
                          setNotificationSettings((prev) => ({ ...prev, securityAlert: checked }))
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* 監査ログ設定 */}
                <div className="border rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">監査ログ設定</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>監査ログ記録</Label>
                        <p className="text-sm text-gray-500">
                          ユーザー操作ログの記録を有効にします
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.applicationAlert}
                        onCheckedChange={(checked) =>
                          setNotificationSettings((prev) => ({
                            ...prev,
                            applicationAlert: checked,
                          }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>データ変更記録</Label>
                        <p className="text-sm text-gray-500">データの変更前後の状態を記録します</p>
                      </div>
                      <Switch
                        checked={notificationSettings.systemMaintenance}
                        onCheckedChange={(checked) =>
                          setNotificationSettings((prev) => ({
                            ...prev,
                            systemMaintenance: checked,
                          }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>セッション情報記録</Label>
                        <p className="text-sm text-gray-500">ユーザーセッション情報を記録します</p>
                      </div>
                      <Switch
                        checked={notificationSettings.backupNotification || false}
                        onCheckedChange={(checked) =>
                          setNotificationSettings((prev) => ({
                            ...prev,
                            backupNotification: checked,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* ログ保持設定 */}
                <div className="border rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">ログ保持設定</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="systemLogRetention">システムログ保持期間（日）</Label>
                      <Input
                        id="systemLogRetention"
                        type="number"
                        placeholder="30"
                        className="w-full"
                      />
                      <p className="text-sm text-gray-500">システムログの自動削除期間</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="auditLogRetention">監査ログ保持期間（日）</Label>
                      <Input
                        id="auditLogRetention"
                        type="number"
                        placeholder="90"
                        className="w-full"
                      />
                      <p className="text-sm text-gray-500">監査ログの自動削除期間</p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => handleSaveSettings('logs')}
                  disabled={isLoading}
                  className="w-full"
                  variant="timeport-primary"
                >
                  <Save className="w-4 h-4 mr-2" />
                  ログ設定を保存
                </Button>
              </CardContent>
            </Card>

            {/* ログ監視 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="w-5 h-5" />
                  <span>ログ監視</span>
                </CardTitle>
                <CardDescription>企業内のログ状況を監視します</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">1,234</div>
                    <div className="text-sm text-gray-600">今日のログ数</div>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">5</div>
                    <div className="text-sm text-gray-600">エラーログ数</div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">98.5%</div>
                    <div className="text-sm text-gray-600">システム稼働率</div>
                  </div>
                </div>

                <div className="mt-4 flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    最終更新: {formatDateTimeForDisplay(new Date())}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => router.push('/admin/logs')}>
                    <FileText className="w-4 h-4 mr-2" />
                    ログ詳細を表示
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* 雇用形態管理ダイアログ */}
      <EmploymentTypeCreateDialog
        open={createEmploymentTypeDialogOpen}
        onOpenChangeAction={setCreateEmploymentTypeDialogOpen}
        onSuccess={fetchEmploymentTypes}
      />
      <EmploymentTypeEditDialog
        open={editEmploymentTypeDialogOpen}
        onOpenChangeAction={setEditEmploymentTypeDialogOpen}
        employmentType={editEmploymentTypeTarget}
        onSuccess={fetchEmploymentTypes}
      />
      <EmploymentTypeDeleteDialog
        open={deleteEmploymentTypeDialogOpen}
        onOpenChangeAction={setDeleteEmploymentTypeDialogOpen}
        employmentType={deleteEmploymentTypeTarget}
        onSuccess={fetchEmploymentTypes}
      />

      {/* 勤務形態管理ダイアログ */}
      <WorkTypeCreateDialog
        open={createWorkTypeDialogOpen}
        onOpenChangeAction={setCreateWorkTypeDialogOpen}
        companyId={user?.company_id || ''}
        onSuccessAction={fetchWorkTypes}
      />
      <WorkTypeEditDialog
        open={editWorkTypeDialogOpen}
        onOpenChangeAction={setEditWorkTypeDialogOpen}
        workType={editWorkTypeTarget}
        companyId={user?.company_id || ''}
        onSuccessAction={fetchWorkTypes}
      />
      <WorkTypeDeleteDialog
        open={deleteWorkTypeDialogOpen}
        onOpenChangeAction={setDeleteWorkTypeDialogOpen}
        workType={deleteWorkTypeTarget}
        companyId={user?.company_id || ''}
        onSuccessAction={fetchWorkTypes}
      />
    </div>
  );
}
