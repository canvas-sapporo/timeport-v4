'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Download,
  Info,
  Clock,
  CheckCircle,
  XCircle,
  Settings,
  Edit,
  Eye,
  Plus,
  Trash2,
} from 'lucide-react';

import { useAuth } from '@/contexts/auth-context';
import {
  getAllAttendance,
  getCompanyUsers,
  getCompanyGroups,
  getAttendanceStatuses,
  getDynamicAttendanceStatus,
} from '@/lib/actions/attendance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/combobox';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type {
  Attendance,
  AttendanceStatus,
  AttendanceFilters,
  AttendanceStatusEntity,
} from '@/types/attendance';
import AdminAttendanceFilters from '@/components/admin/AttendanceFilters';
import AdminCsvExportDialog from '@/components/admin/CsvExportDialog';
import AttendancePreviewDialog from '@/components/admin/AttendancePreviewDialog';
import AttendanceEditDialog from '@/components/admin/AttendanceEditDialog';
import AttendanceDeleteDialog from '@/components/admin/AttendanceDeleteDialog';
import { AttendanceTimeEditDialog } from '@/components/admin/AttendanceTimeEditDialog';

export default function AdminAttendancePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedDescription, setSelectedDescription] = useState<string | null>(null);
  const [isDescriptionDialogOpen, setIsDescriptionDialogOpen] = useState(false);
  const [selectedBreakDetails, setSelectedBreakDetails] = useState<Attendance | null>(null);
  const [isBreakDetailsDialogOpen, setIsBreakDetailsDialogOpen] = useState(false);
  const [isColumnSettingsDialogOpen, setIsColumnSettingsDialogOpen] = useState(false);
  const [csvExportOpen, setCsvExportOpen] = useState(false);

  // 操作ダイアログの状態
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [timeEditDialogOpen, setTimeEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAttendanceId, setSelectedAttendanceId] = useState<string | null>(null);

  // フィルター状態
  const [filters, setFilters] = useState<AttendanceFilters>({
    dateRange: { startDate: null, endDate: null },
    status: [],
    hasOvertime: null,
    workTypeId: null,
    approvalStatus: null,
    userId: null,
    groupId: null,
  });

  // ユーザーとグループデータ
  const [users, setUsers] = useState<{ id: string; name: string; code?: string }[]>([]);
  const [groups, setGroups] = useState<{ id: string; name: string; code?: string }[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);

  // ステータスデータ
  const [attendanceStatuses, setAttendanceStatuses] = useState<AttendanceStatusEntity[]>([]);
  const [isLoadingStatuses, setIsLoadingStatuses] = useState(false);

  // 表示項目の設定
  const [visibleColumns, setVisibleColumns] = useState({
    employee: true,
    date: true,
    clockIn: true,
    clockOut: true,
    workTime: true,
    overtime: true,
    status: true,
    notes: true,
    break: false,
    workType: false,
    late: false,
    earlyLeave: false,
    approval: false,
    approver: false,
    updatedAt: false,
  });

  // フィルタリング関数
  const applyFilters = (records: Attendance[]): Attendance[] => {
    return records.filter((record) => {
      // 日付範囲フィルター
      if (filters.dateRange.startDate && record.work_date < filters.dateRange.startDate) {
        return false;
      }
      if (filters.dateRange.endDate && record.work_date > filters.dateRange.endDate) {
        return false;
      }

      // ユーザーフィルター
      if (filters.userId && record.user_id !== filters.userId) {
        return false;
      }

      // グループフィルター（ユーザーが所属するグループでフィルタリング）
      if (filters.groupId) {
        // ここでは簡易的に実装。実際にはuser_groupsテーブルを参照する必要がある
        // TODO: グループフィルターの実装
      }

      // ステータスフィルター
      if (filters.status.length > 0) {
        const recordStatus = record.dynamicStatus || getAttendanceStatus(record);
        if (!filters.status.includes(recordStatus as AttendanceStatus)) {
          return false;
        }
      }

      // 残業フィルター
      if (filters.hasOvertime !== null) {
        const hasOvertime = (record.overtime_minutes || 0) > 0;
        if (filters.hasOvertime !== hasOvertime) {
          return false;
        }
      }

      // 勤務タイプフィルター
      if (filters.workTypeId && record.work_type_id !== filters.workTypeId) {
        return false;
      }

      // 承認状態フィルター
      if (filters.approvalStatus) {
        const recordApprovalStatus = record.approved_by ? 'approved' : 'pending';
        if (filters.approvalStatus !== recordApprovalStatus) {
          return false;
        }
      }

      return true;
    });
  };

  // ユーザーとグループデータ取得
  useEffect(() => {
    console.log('useEffect 開始:', {
      user: user ? { id: user.id, company_id: user.company_id } : null,
    });

    const fetchUsersAndGroups = async () => {
      if (!user) {
        console.log('fetchUsersAndGroups: userがnullのためスキップ');
        return;
      }

      try {
        setIsLoadingUsers(true);
        setIsLoadingGroups(true);

        // ユーザーの会社IDを使用
        if (!user.company_id) {
          console.error('ユーザーの会社IDが設定されていません');
          return;
        }

        console.log('ユーザー・グループデータ取得用会社ID:', user.company_id);

        const [usersData, groupsData] = await Promise.all([
          getCompanyUsers(user.company_id),
          getCompanyGroups(user.company_id),
        ]);

        setUsers(usersData);
        setGroups(groupsData);
      } catch (error) {
        console.error('ユーザー・グループデータ取得エラー:', error);
      } finally {
        setIsLoadingUsers(false);
        setIsLoadingGroups(false);
      }
    };

    const fetchAttendanceStatuses = async () => {
      if (!user?.company_id) {
        console.log('fetchAttendanceStatuses: userまたはcompany_idがnullのためスキップ');
        return;
      }

      console.log('fetchAttendanceStatuses 開始:', { companyId: user.company_id });
      setIsLoadingStatuses(true);
      try {
        const result = await getAttendanceStatuses(user.company_id);
        console.log('fetchAttendanceStatuses 結果:', result);
        if (result.success && result.statuses) {
          console.log('attendanceStatuses 設定:', result.statuses.length, '件');
          setAttendanceStatuses(result.statuses);
        } else {
          console.error('ステータス取得失敗:', result.error);
        }
      } catch (error) {
        console.error('ステータスデータ取得エラー:', error);
      } finally {
        setIsLoadingStatuses(false);
      }
    };

    fetchUsersAndGroups();
    fetchAttendanceStatuses();
  }, [user]);

  // 勤怠データ取得関数
  const fetchAttendanceData = async (currentAttendanceStatuses?: AttendanceStatusEntity[]) => {
    if (!user) {
      console.log('ユーザーが存在しません');
      return;
    }

    console.log('現在のユーザー情報:', {
      id: user.id,
      name: user.full_name,
      role: user.role,
      company_id: user.company_id,
    });

    try {
      setIsLoading(true);
      console.log('勤怠データ取得開始:', { selectedMonth });

      // ユーザーの会社IDを使用
      if (!user.company_id) {
        console.error('ユーザーの会社IDが設定されていません');
        return;
      }

      console.log('使用する会社ID:', user.company_id);
      console.log('会社IDの型:', typeof user.company_id);
      console.log('会社IDが存在するか:', !!user.company_id);

      // 選択された月の日付範囲を計算
      const [year, month] = selectedMonth.split('-').map(Number);
      const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay}`;

      console.log('getAllAttendance呼び出し前:', {
        companyId: user.company_id,
        startDate,
        endDate,
      });

      const records = await getAllAttendance(user.company_id, startDate, endDate);
      console.log('取得された勤怠データ:', records);
      console.log('取得された勤怠データ件数:', records?.length || 0);

      // 動的ステータスを計算してレコードに追加
      const recordsWithDynamicStatus = await Promise.all(
        records.map(async (record) => {
          let dynamicStatus = getAttendanceStatus(record);

          // 動的ステータス判定を使用
          const statusesToUse = currentAttendanceStatuses || attendanceStatuses;
          console.log('動的ステータス判定開始:', {
            recordId: record.id,
            attendanceStatusesLength: statusesToUse.length,
          });

          if (statusesToUse.length > 0) {
            try {
              dynamicStatus = await getDynamicAttendanceStatus(record, statusesToUse);
              console.log('動的ステータス判定結果:', { recordId: record.id, dynamicStatus });
            } catch (error) {
              console.error('動的ステータス判定エラー:', error);
            }
          } else {
            console.log('attendanceStatusesが空のため、デフォルトステータスを使用:', {
              recordId: record.id,
              dynamicStatus,
            });
          }

          return {
            ...record,
            dynamicStatus,
          };
        })
      );

      // デバッグ用：clock_recordsを含むデータを詳細ログ
      if (recordsWithDynamicStatus.length > 0) {
        console.log('clock_recordsを含むデータ詳細:');
        recordsWithDynamicStatus.forEach((record, index) => {
          if (record.clock_records && record.clock_records.length > 0) {
            console.log(`レコード${index + 1} (clock_recordsあり):`, {
              id: record.id,
              user_id: record.user_id,
              work_date: record.work_date,
              clock_records: record.clock_records,
              clock_in_time: record.clock_in_time,
              clock_out_time: record.clock_out_time,
              dynamicStatus: record.dynamicStatus,
            });
          }
        });
      }

      setAttendanceRecords(recordsWithDynamicStatus);
    } catch (error) {
      console.error('勤怠データ取得エラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // データ取得
  useEffect(() => {
    fetchAttendanceData(attendanceStatuses);
  }, [user, selectedMonth, attendanceStatuses]);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/login');
      return;
    }
  }, [user, router]);

  if (!user || user.role !== 'admin') {
    return null;
  }

  // 土日判定関数
  const isWeekend = (date: string): boolean => {
    const dayOfWeek = new Date(date).getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // 0: 日曜日, 6: 土曜日
  };

  const getDayOfWeekColor = (date: string): string => {
    const dayOfWeek = new Date(date).getDay();
    if (dayOfWeek === 0) {
      return 'text-red-600'; // 日曜日は赤
    } else if (dayOfWeek === 6) {
      return 'text-blue-600'; // 土曜日は青
    }
    return 'text-gray-600'; // 平日はグレー
  };

  const getAttendanceStatus = (record?: Attendance): AttendanceStatus | string => {
    if (!record) return 'absent';

    // フォールバック: 従来のロジック
    const clockRecords = record.clock_records || [];
    const hasAnySession = clockRecords.length > 0;
    const hasCompletedSession = clockRecords.some((session) => session.in_time && session.out_time);

    if (!hasAnySession) return 'absent';
    if (!hasCompletedSession) return 'normal'; // 勤務中
    return 'normal';
  };

  const getStatusBadge = (status: AttendanceStatus | string, date?: string) => {
    // 土日で欠勤の場合は「休日」として表示
    if (date && isWeekend(date) && status === 'absent') {
      return <Badge variant="outline">休日</Badge>;
    }

    // 動的ステータス判定を使用
    if (attendanceStatuses.length > 0) {
      const statusConfig = attendanceStatuses.find((s) => s.name === status);
      if (statusConfig) {
        return (
          <Badge
            variant={statusConfig.color as 'default' | 'destructive' | 'secondary' | 'outline'}
            style={{
              color: statusConfig.font_color,
              backgroundColor: statusConfig.background_color,
            }}
          >
            {statusConfig.display_name}
          </Badge>
        );
      }
    }

    // フォールバック: 従来のロジック
    switch (status) {
      case 'normal':
        return <Badge variant="default">正常</Badge>;
      case 'late':
        return <Badge variant="destructive">遅刻</Badge>;
      case 'early_leave':
        return <Badge variant="secondary">早退</Badge>;
      case 'absent':
        return <Badge variant="outline">欠勤</Badge>;
      default:
        return <Badge variant="outline">-</Badge>;
    }
  };

  const formatTime = (time?: string) => {
    if (!time) return '--:--';

    // ISO文字列から時刻部分を抽出
    try {
      const date = new Date(time);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch {
      return '--:--';
    }
  };

  const formatMinutes = (minutes?: number) => {
    if (minutes === undefined || minutes === null || minutes === 0) {
      return '--:--';
    }

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}`;
  };

  const formatDateTime = (dateTime?: string) => {
    if (!dateTime) return '-';

    try {
      const date = new Date(dateTime);
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');

      return `${year}/${month}/${day} ${hours}:${minutes}`;
    } catch {
      return '-';
    }
  };

  const getApprovalStatusBadge = (status?: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            承認済み
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            却下
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            承認待ち
          </Badge>
        );
      default:
        return <Badge variant="outline">-</Badge>;
    }
  };

  const handleDescriptionClick = (description: string) => {
    setSelectedDescription(description);
    setIsDescriptionDialogOpen(true);
  };

  const handleBreakDetailsClick = (record: Attendance) => {
    setSelectedBreakDetails(record);
    setIsBreakDetailsDialogOpen(true);
  };

  const handleColumnToggle = (columnKey: keyof typeof visibleColumns) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [columnKey]: !prev[columnKey],
    }));
  };

  const handleResetColumns = () => {
    setVisibleColumns({
      employee: true,
      date: true,
      clockIn: true,
      clockOut: true,
      workTime: true,
      overtime: true,
      status: true,
      notes: true,
      break: false,
      workType: false,
      late: false,
      earlyLeave: false,
      approval: false,
      approver: false,
      updatedAt: false,
    });
  };

  // 操作ボタンのハンドラー
  const handlePreviewClick = (attendanceId: string) => {
    setSelectedAttendanceId(attendanceId);
    setPreviewDialogOpen(true);
  };

  const handleEditClick = (attendanceId: string) => {
    setSelectedAttendanceId(attendanceId);
    setTimeEditDialogOpen(true);
  };

  const handleDeleteClick = (attendanceId: string) => {
    setSelectedAttendanceId(attendanceId);
    setDeleteDialogOpen(true);
  };

  const handleOperationSuccess = () => {
    // データを再取得
    fetchAttendanceData(attendanceStatuses);
  };

  // 月の全日期間を生成
  const generateMonthDays = (yearMonth: string): string[] => {
    const [year, month] = yearMonth.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    const days: string[] = [];

    for (let day = 1; day <= lastDay; day++) {
      const dateString = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      days.push(dateString);
    }

    return days;
  };

  // 月の全日期間を取得
  const monthDays = generateMonthDays(selectedMonth);

  // 企業内の全ユーザーを取得
  const companyUsers = users;

  // 全ユーザーの全日期間の勤怠データを生成
  const allAttendanceData: Attendance[] = [];

  companyUsers.forEach((user) => {
    monthDays.forEach((date) => {
      // 既存の勤怠データを検索（複数回出勤対応）
      const existingRecords = attendanceRecords.filter(
        (record) => record.user_id === user.id && record.work_date === date
      );

      if (existingRecords.length > 0) {
        // 既存の勤怠データがある場合は全て追加
        existingRecords.forEach((record) => {
          allAttendanceData.push(record);
        });
      } else {
        // 勤怠データがない場合の処理
        const isWeekendDay = isWeekend(date);
        const absentRecord: Attendance = {
          id: `absent-${user.id}-${date}`, // 欠勤データであることを明示
          user_id: user.id,
          work_date: date,
          clock_records: [], // 欠勤時は空のclock_recordsを設定
          break_records: [], // 互換性のため追加
          actual_work_minutes: 0,
          overtime_minutes: 0,
          late_minutes: 0,
          early_leave_minutes: 0,
          status: isWeekendDay ? 'normal' : 'absent', // 土日は正常、平日は欠勤
          auto_calculated: false,
          description: undefined,
          approved_by: undefined,
          approved_at: undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: undefined,
          user_name: user.name,
          user_code: user.code || '-',
          work_type_name: undefined,
          approval_status: 'pending',
          approver_name: undefined,
          total_break_minutes: 0,
          break_count: 0,
        };
        allAttendanceData.push(absentRecord);
      }
    });
  });

  // フィルタリングされたデータを取得
  const filteredRecords = applyFilters(allAttendanceData).sort((a, b) => {
    // 1. 日付順（古い順）
    const dateComparison = new Date(a.work_date).getTime() - new Date(b.work_date).getTime();
    if (dateComparison !== 0) return dateComparison;

    // 2. ユーザー名順
    const userComparison = (a.user_name || '').localeCompare(b.user_name || '');
    if (userComparison !== 0) return userComparison;

    // 3. 出勤時刻順（早い順）
    const aClockRecords = a.clock_records || [];
    const bClockRecords = b.clock_records || [];
    const aFirstInTime = aClockRecords[0]?.in_time;
    const bFirstInTime = bClockRecords[0]?.in_time;

    if (aFirstInTime && bFirstInTime) {
      const timeComparison = new Date(aFirstInTime).getTime() - new Date(bFirstInTime).getTime();
      if (timeComparison !== 0) return timeComparison;
    } else if (aFirstInTime && !bFirstInTime) {
      return -1; // aが先（出勤時刻がある方が先）
    } else if (!aFirstInTime && bFirstInTime) {
      return 1; // bが先（出勤時刻がある方が先）
    }

    // 4. 作成日時順（新しい順）
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // 統計情報を計算
  const totalRecords = filteredRecords.length;

  // 出勤日数を計算（同じ日付の複数回出勤は1日としてカウント）
  const uniqueWorkDays = new Set(
    filteredRecords
      .filter((r) => r.clock_records && r.clock_records.some((session) => session.in_time))
      .map((r) => r.work_date)
  );
  const actualWorkDays = uniqueWorkDays.size;

  const lateRecords = filteredRecords.filter((r) => r.late_minutes > 0).length;
  const totalOvertimeMinutes = filteredRecords.reduce(
    (sum, r) => sum + (r.overtime_minutes || 0),
    0
  );
  const avgOvertimeHours =
    totalRecords > 0 ? Math.round((totalOvertimeMinutes / totalRecords / 60) * 10) / 10 : 0;

  // 出勤率を計算（同じ日付の複数回出勤は1日としてカウント）
  const uniqueTotalDays = new Set(filteredRecords.map((r) => r.work_date));
  const uniqueAbsentDays = new Set(
    filteredRecords
      .filter((r) => (r.dynamicStatus || getAttendanceStatus(r)) === 'absent')
      .map((r) => r.work_date)
  );
  const attendanceRate =
    uniqueTotalDays.size > 0
      ? Math.round(((uniqueTotalDays.size - uniqueAbsentDays.size) / uniqueTotalDays.size) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">勤怠管理</h1>
          <p className="text-gray-600">全メンバーの勤怠記録を管理できます</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => setIsColumnSettingsDialogOpen(true)}>
            <Settings className="w-4 h-4 mr-2" />
            表示項目
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCsvExportOpen(true)}>
            <Download className="w-4 h-4 mr-2" />
            CSV出力
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                勤怠記録作成
              </Button>
            </DialogTrigger>
            <DialogContent className="dialog-scrollbar">
              <DialogHeader>
                <DialogTitle>勤怠記録作成</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="employee">メンバー</Label>
                  <Combobox
                    options={users.map((user) => ({
                      value: user.id,
                      label: user.name,
                      code: user.code,
                    }))}
                    onValueChange={() => {}}
                    placeholder="メンバーを選択"
                    emptyText="該当するメンバーがありません"
                  />
                </div>
                <div>
                  <Label htmlFor="workDate">勤務日</Label>
                  <Input id="workDate" type="date" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="clockIn">出勤時刻</Label>
                    <Input id="clockIn" type="time" />
                  </div>
                  <div>
                    <Label htmlFor="clockOut">退勤時刻</Label>
                    <Input id="clockOut" type="time" />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline">キャンセル</Button>
                  <Button>作成</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">出勤日数</p>
                <p className="text-2xl font-bold text-gray-900">{actualWorkDays}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">遅刻件数</p>
                <p className="text-2xl font-bold text-gray-900">{lateRecords}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">平均残業時間</p>
                <p className="text-2xl font-bold text-gray-900">{avgOvertimeHours}h</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">出勤率</p>
                <p className="text-2xl font-bold text-gray-900">{attendanceRate}%</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span>勤怠記録一覧</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* フィルターコンポーネント */}
          <AdminAttendanceFilters
            filters={filters}
            onFiltersChange={setFilters}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
            users={users}
            groups={groups}
            isLoading={isLoadingUsers || isLoadingGroups}
          />

          <div className="overflow-x-auto max-h-[600px] overflow-y-auto table-scrollbar">
            <table className="w-full caption-bottom text-sm">
              <thead className="sticky top-0 bg-white z-20 border-b shadow-sm">
                <tr>
                  {visibleColumns.date && (
                    <th className="w-[120px] h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      日付
                    </th>
                  )}
                  {visibleColumns.employee && (
                    <th className="w-[150px] h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      メンバー
                    </th>
                  )}
                  {visibleColumns.clockIn && (
                    <th className="w-[80px] h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      出勤
                    </th>
                  )}
                  {visibleColumns.clockOut && (
                    <th className="w-[80px] h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      退勤
                    </th>
                  )}
                  {visibleColumns.workTime && (
                    <th className="w-[90px] h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      勤務時間
                    </th>
                  )}
                  {visibleColumns.overtime && (
                    <th className="w-[80px] h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      残業
                    </th>
                  )}
                  {visibleColumns.break && (
                    <th className="w-[80px] h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      休憩
                    </th>
                  )}
                  {visibleColumns.workType && (
                    <th className="w-[100px] h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      勤務タイプ
                    </th>
                  )}
                  {visibleColumns.late && (
                    <th className="w-[80px] h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      遅刻
                    </th>
                  )}
                  {visibleColumns.earlyLeave && (
                    <th className="w-[80px] h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      早退
                    </th>
                  )}
                  {visibleColumns.status && (
                    <th className="w-[100px] h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      ステータス
                    </th>
                  )}
                  {visibleColumns.approval && (
                    <th className="w-[80px] h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      承認
                    </th>
                  )}
                  {visibleColumns.approver && (
                    <th className="w-[100px] h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      承認者
                    </th>
                  )}
                  {visibleColumns.updatedAt && (
                    <th className="w-[120px] h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      更新日時
                    </th>
                  )}
                  {visibleColumns.notes && (
                    <th className="w-[60px] h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      備考
                    </th>
                  )}
                  <th className="w-[100px] h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={Object.values(visibleColumns).filter(Boolean).length + 1}
                      className="text-center py-8"
                    >
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                        <span className="text-gray-500">データを読み込み中...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map((record) => (
                    <TableRow key={record.id} className="hover:bg-gray-50">
                      {visibleColumns.date && (
                        <TableCell>
                          <div className="font-medium">
                            {new Date(record.work_date).toLocaleDateString('ja-JP')}
                            <span className={`text-sm ml-1 ${getDayOfWeekColor(record.work_date)}`}>
                              (
                              {new Date(record.work_date).toLocaleDateString('ja-JP', {
                                weekday: 'short',
                              })}
                              )
                            </span>
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.employee && (
                        <TableCell>
                          <div className="font-medium">{record.user_name || 'Unknown'}</div>
                          <div className="text-sm text-gray-500">{record.user_code || '-'}</div>
                        </TableCell>
                      )}
                      {visibleColumns.clockIn && (
                        <TableCell className="text-sm">
                          {(() => {
                            const clockRecords = record.clock_records || [];
                            const firstSession = clockRecords[0];
                            return firstSession?.in_time
                              ? formatTime(firstSession.in_time)
                              : '--:--';
                          })()}
                        </TableCell>
                      )}
                      {visibleColumns.clockOut && (
                        <TableCell className="text-sm">
                          {(() => {
                            const clockRecords = record.clock_records || [];
                            const lastSession = clockRecords[clockRecords.length - 1];
                            return lastSession?.out_time
                              ? formatTime(lastSession.out_time)
                              : '--:--';
                          })()}
                        </TableCell>
                      )}
                      {visibleColumns.workTime && (
                        <TableCell className="text-sm">
                          {(() => {
                            const clockRecords = record.clock_records || [];
                            const totalWorkMinutes = clockRecords.reduce((total, session) => {
                              if (session.in_time && session.out_time) {
                                const inTime = new Date(session.in_time);
                                const outTime = new Date(session.out_time);
                                return (
                                  total + Math.floor((outTime.getTime() - inTime.getTime()) / 60000)
                                );
                              }
                              return total;
                            }, 0);
                            return formatMinutes(totalWorkMinutes);
                          })()}
                        </TableCell>
                      )}
                      {visibleColumns.overtime && (
                        <TableCell className="text-sm">
                          {formatMinutes(record.overtime_minutes)}
                        </TableCell>
                      )}
                      {visibleColumns.break && (
                        <TableCell>
                          <div className="flex items-center space-x-1 whitespace-nowrap">
                            <span className="text-xs">
                              {(() => {
                                const clockRecords = record.clock_records || [];
                                const totalBreakMinutes = clockRecords.reduce((total, session) => {
                                  return (
                                    total +
                                    (session.breaks?.reduce((sessionBreakTotal, br) => {
                                      if (br.break_start && br.break_end) {
                                        const breakStart = new Date(br.break_start);
                                        const breakEnd = new Date(br.break_end);
                                        return (
                                          sessionBreakTotal +
                                          Math.floor(
                                            (breakEnd.getTime() - breakStart.getTime()) / 60000
                                          )
                                        );
                                      }
                                      return sessionBreakTotal;
                                    }, 0) || 0)
                                  );
                                }, 0);
                                return formatMinutes(totalBreakMinutes);
                              })()}
                            </span>
                            {(() => {
                              const clockRecords = record.clock_records || [];
                              const totalBreaks = clockRecords.reduce((total, session) => {
                                return total + (session.breaks?.length || 0);
                              }, 0);
                              return totalBreaks > 0 ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleBreakDetailsClick(record);
                                  }}
                                  className="p-1 h-auto text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                >
                                  <Info className="w-3 h-3" />
                                </Button>
                              ) : null;
                            })()}
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.workType && (
                        <TableCell className="text-sm whitespace-nowrap">
                          {record.work_type_name || '-'}
                        </TableCell>
                      )}
                      {visibleColumns.late && (
                        <TableCell className="text-sm whitespace-nowrap">
                          <span
                            className={
                              record.late_minutes && record.late_minutes > 0
                                ? 'text-red-500 font-medium'
                                : ''
                            }
                          >
                            {formatMinutes(record.late_minutes)}
                          </span>
                        </TableCell>
                      )}
                      {visibleColumns.earlyLeave && (
                        <TableCell className="text-sm whitespace-nowrap">
                          <span
                            className={
                              record.early_leave_minutes && record.early_leave_minutes > 0
                                ? 'text-orange-500 font-medium'
                                : ''
                            }
                          >
                            {formatMinutes(record.early_leave_minutes)}
                          </span>
                        </TableCell>
                      )}
                      {visibleColumns.status && (
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {record.id.startsWith('absent-') ? (
                              <span className="text-gray-400">-</span>
                            ) : (
                              getStatusBadge(
                                record.dynamicStatus || getAttendanceStatus(record),
                                record.work_date
                              )
                            )}
                            {/* 編集済みバッジ */}
                            {record.source_id && (
                              <Badge variant="secondary" className="text-xs px-1 py-0">
                                編集済み
                              </Badge>
                            )}
                            {/* 編集済みバッジ */}
                            {record.has_edit_history && (
                              <Badge variant="secondary" className="text-xs px-1 py-0">
                                編集済み
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.approval && (
                        <TableCell>{getApprovalStatusBadge(record.approval_status)}</TableCell>
                      )}
                      {visibleColumns.approver && (
                        <TableCell className="text-sm whitespace-nowrap">
                          {record.approver_name || '-'}
                        </TableCell>
                      )}
                      {visibleColumns.updatedAt && (
                        <TableCell>{formatDateTime(record.updated_at)}</TableCell>
                      )}
                      {visibleColumns.notes && (
                        <TableCell>
                          {record.description ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDescriptionClick(record.description!);
                              }}
                              className="p-1 h-auto text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                            >
                              <Info className="w-4 h-4" />
                            </Button>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                        {record.id.startsWith('absent-') ? (
                          <span className="text-gray-400 text-sm">-</span>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePreviewClick(record.id)}
                              title="プレビュー"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditClick(record.id)}
                              title="編集"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-800"
                              onClick={() => handleDeleteClick(record.id)}
                              title="削除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!isLoading && filteredRecords.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">条件に一致する勤怠記録がありません</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 備考詳細ダイアログ */}
      <Dialog open={isDescriptionDialogOpen} onOpenChange={setIsDescriptionDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Info className="w-5 h-5 text-blue-600" />
              <span>備考詳細</span>
            </DialogTitle>
            <DialogDescription>勤怠記録の備考情報を確認できます</DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-700 whitespace-pre-wrap">{selectedDescription}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 休憩詳細ダイアログ */}
      <Dialog open={isBreakDetailsDialogOpen} onOpenChange={setIsBreakDetailsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <span>休憩詳細</span>
            </DialogTitle>
            <DialogDescription>休憩記録の詳細を確認できます</DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {selectedBreakDetails && (
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">総休憩時間</span>
                    <span className="text-lg font-bold">
                      {(() => {
                        const clockRecords = selectedBreakDetails.clock_records || [];
                        const totalBreakMinutes = clockRecords.reduce((total, session) => {
                          return (
                            total +
                            (session.breaks?.reduce((sessionBreakTotal, br) => {
                              if (br.break_start && br.break_end) {
                                const breakStart = new Date(br.break_start);
                                const breakEnd = new Date(br.break_end);
                                return (
                                  sessionBreakTotal +
                                  Math.floor((breakEnd.getTime() - breakStart.getTime()) / 60000)
                                );
                              }
                              return sessionBreakTotal;
                            }, 0) || 0)
                          );
                        }, 0);
                        return formatMinutes(totalBreakMinutes);
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">休憩回数</span>
                    <span className="text-lg font-bold">
                      {(() => {
                        const clockRecords = selectedBreakDetails.clock_records || [];
                        const totalBreaks = clockRecords.reduce((total, session) => {
                          return total + (session.breaks?.length || 0);
                        }, 0);
                        return totalBreaks;
                      })()}
                      回
                    </span>
                  </div>
                </div>

                {selectedBreakDetails.clock_records &&
                  selectedBreakDetails.clock_records.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">勤務セッション</h4>
                      <div className="space-y-2">
                        {selectedBreakDetails.clock_records.map((session, sessionIndex) => (
                          <div key={sessionIndex} className="p-3 bg-white border rounded">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">
                                セッション {sessionIndex + 1}
                              </span>
                              <span className="text-sm text-gray-500">
                                {session.in_time ? formatTime(session.in_time) : '--:--'} -{' '}
                                {session.out_time ? formatTime(session.out_time) : '--:--'}
                              </span>
                            </div>
                            {session.breaks && session.breaks.length > 0 && (
                              <div className="space-y-1">
                                {session.breaks.map((breakRecord, breakIndex) => (
                                  <div
                                    key={breakIndex}
                                    className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                                  >
                                    <div className="flex items-center space-x-2">
                                      <span className="font-medium">{breakIndex + 1}回目</span>
                                    </div>
                                    <div className="text-sm">
                                      {formatTime(breakRecord.break_start)} -{' '}
                                      {breakRecord.break_end
                                        ? formatTime(breakRecord.break_end)
                                        : '終了未定'}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

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
                { key: 'employee', label: 'メンバー' },
                { key: 'date', label: '日付' },
                { key: 'clockIn', label: '出勤時刻' },
                { key: 'clockOut', label: '退勤時刻' },
                { key: 'workTime', label: '勤務時間' },
                { key: 'overtime', label: '残業時間' },
                { key: 'break', label: '休憩時間' },
                { key: 'workType', label: '勤務タイプ' },
                { key: 'late', label: '遅刻' },
                { key: 'earlyLeave', label: '早退' },
                { key: 'status', label: 'ステータス' },
                { key: 'approval', label: '承認状態' },
                { key: 'approver', label: '承認者' },
                { key: 'updatedAt', label: '更新日時' },
                { key: 'notes', label: '備考' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={key}
                    checked={visibleColumns[key as keyof typeof visibleColumns]}
                    onChange={() => handleColumnToggle(key as keyof typeof visibleColumns)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor={key} className="text-sm font-medium text-gray-700">
                    {label}
                  </label>
                </div>
              ))}
            </div>
            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={handleResetColumns}>
                初期設定に戻す
              </Button>
              <Button onClick={() => setIsColumnSettingsDialogOpen(false)}>適用</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* CSV出力ダイアログ */}
      <AdminCsvExportDialog
        open={csvExportOpen}
        onOpenChange={setCsvExportOpen}
        attendanceRecords={filteredRecords}
        users={users}
        groups={groups}
        attendanceFilters={filters}
        selectedMonth={selectedMonth}
      />

      {/* プレビューダイアログ */}
      <AttendancePreviewDialog
        open={previewDialogOpen}
        onOpenChange={setPreviewDialogOpen}
        attendanceId={selectedAttendanceId}
        companyId={user?.company_id}
      />

      {/* 編集ダイアログ */}
      <AttendanceEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        attendanceId={selectedAttendanceId}
        onSuccess={handleOperationSuccess}
      />

      {/* 時刻編集ダイアログ */}
      <AttendanceTimeEditDialog
        open={timeEditDialogOpen}
        onOpenChange={setTimeEditDialogOpen}
        attendanceId={selectedAttendanceId}
        onSuccess={handleOperationSuccess}
      />

      {/* 削除ダイアログ */}
      <AttendanceDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        attendanceId={selectedAttendanceId}
        onSuccess={handleOperationSuccess}
      />
    </div>
  );
}
