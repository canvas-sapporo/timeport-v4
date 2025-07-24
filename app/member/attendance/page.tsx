'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Download,
  Filter,
  Info,
  Clock,
  User,
  CheckCircle,
  XCircle,
  Settings,
} from 'lucide-react';

import { useAuth } from '@/contexts/auth-context';
import { formatDate, formatTime } from '@/lib/utils';
import { getUserAttendance, getUserWorkTypes } from '@/lib/actions/attendance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Attendance, AttendanceStatus, AttendanceFilters } from '@/types/attendance';
import AdminCsvExportDialog from '@/components/admin/CsvExportDialog';
import AttendanceFiltersComponent from '@/components/member/AttendanceFilters';

// カレンダー用の日付データ型
interface CalendarDay {
  date: string;
  weekday: string;
  weekdayColor: string;
  attendance?: Attendance;
  isWeekend: boolean;
}

export default function MemberAttendancePage() {
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

  // フィルター状態
  const [filters, setFilters] = useState<AttendanceFilters>({
    dateRange: { startDate: null, endDate: null },
    status: [],
    hasOvertime: null,
    workTypeId: null,
    approvalStatus: null,
  });

  // 勤務タイプ
  const [workTypes, setWorkTypes] = useState<{ id: string; name: string }[]>([]);
  const [isLoadingWorkTypes, setIsLoadingWorkTypes] = useState(false);

  // 表示項目の設定
  const [visibleColumns, setVisibleColumns] = useState({
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

  // 選択された月の全ての日付を生成する関数
  const generateCalendarDays = (yearMonth: string): CalendarDay[] => {
    const [year, month] = yearMonth.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const days: CalendarDay[] = [];

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month - 1, day);
      const dateString = date.toISOString().split('T')[0];
      const weekday = date.toLocaleDateString('ja-JP', { weekday: 'short' });
      const dayOfWeek = date.getDay();

      let weekdayColor = 'text-gray-600'; // 平日はグレー
      let isWeekend = false;

      if (dayOfWeek === 0) {
        // 日曜日
        weekdayColor = 'text-red-600';
        isWeekend = true;
      } else if (dayOfWeek === 6) {
        // 土曜日
        weekdayColor = 'text-blue-600';
        isWeekend = true;
      }

      days.push({
        date: dateString,
        weekday,
        weekdayColor,
        isWeekend,
      });
    }

    return days;
  };

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

      // ステータスフィルター
      if (filters.status.length > 0) {
        const recordStatus = getAttendanceStatus(record);
        if (!filters.status.includes(recordStatus)) {
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

  // フィルタリングされた勤怠データを取得する関数
  const getFilteredAttendanceData = (): Attendance[] => {
    // 選択された月の勤怠データのみをフィルタリング
    const filteredRecords = attendanceRecords.filter((record) => {
      if (!record.work_date) return false;

      const recordDate = new Date(record.work_date);
      const selectedDate = new Date(selectedMonth + '-01');

      return (
        recordDate.getFullYear() === selectedDate.getFullYear() &&
        recordDate.getMonth() === selectedDate.getMonth()
      );
    });

    // 追加フィルターを適用
    const finalFilteredRecords = applyFilters(filteredRecords);

    // 日付で昇順にソート
    return finalFilteredRecords.sort((a, b) => {
      if (!a.work_date || !b.work_date) return 0;
      return new Date(a.work_date).getTime() - new Date(b.work_date).getTime();
    });
  };

  // 勤務タイプ取得
  useEffect(() => {
    const fetchWorkTypes = async () => {
      if (!user) return;

      try {
        setIsLoadingWorkTypes(true);
        const types = await getUserWorkTypes(user.id);
        setWorkTypes(types);
      } catch (error) {
        console.error('勤務タイプ取得エラー:', error);
      } finally {
        setIsLoadingWorkTypes(false);
      }
    };

    fetchWorkTypes();
  }, [user]);

  // データ取得
  useEffect(() => {
    const fetchAttendanceData = async () => {
      if (!user) {
        console.log('ユーザーが存在しません');
        return;
      }

      console.log('現在のユーザー情報:', {
        id: user.id,
        name: user.full_name,
        role: user.role,
      });

      try {
        setIsLoading(true);
        console.log('勤怠データ取得開始:', { userId: user.id, selectedMonth });

        // 選択された月の日付範囲を計算
        const [year, month] = selectedMonth.split('-').map(Number);
        const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay}`;

        console.log('日付範囲:', { startDate, endDate });

        const records = await getUserAttendance(user.id, startDate, endDate);
        console.log('取得された勤怠データ:', records);
        setAttendanceRecords(records);
      } catch (error) {
        console.error('勤怠データ取得エラー:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttendanceData();
  }, [user, selectedMonth]);

  useEffect(() => {
    if (!user || (user.role !== 'member' && user.role !== 'admin')) {
      router.push('/login');
      return;
    }
  }, [user, router]);

  if (!user || (user.role !== 'member' && user.role !== 'admin')) {
    return null;
  }

  const formatDateWithWeekday = (date: string, weekday: string, weekdayColor: string) => {
    try {
      const dateObj = new Date(date);
      const year = dateObj.getFullYear();
      const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
      const day = dateObj.getDate().toString().padStart(2, '0');

      return (
        <span className="text-sm font-medium whitespace-nowrap">
          {year}/{month}/{day} <span className={`text-xs ${weekdayColor}`}>({weekday})</span>
        </span>
      );
    } catch {
      return '-';
    }
  };

  const getAttendanceStatus = (record?: Attendance): AttendanceStatus => {
    if (!record || !record.clock_in_time) return 'absent';
    return 'normal';
  };

  const getStatusBadge = (status: AttendanceStatus, isWeekend: boolean) => {
    if (isWeekend && status === 'absent') {
      return <Badge variant="outline">休日</Badge>;
    }

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

  // フィルタリングされた勤怠データを取得
  const filteredAttendanceData = getFilteredAttendanceData();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">勤怠履歴</h1>
          <p className="text-gray-600">過去の勤怠記録を確認できます</p>
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
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>勤怠記録</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* フィルターコンポーネント */}
          <AttendanceFiltersComponent
            filters={filters}
            onFiltersChange={setFilters}
            workTypes={workTypes}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
            isLoading={isLoadingWorkTypes}
          />

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {visibleColumns.date && <TableHead className="w-[120px]">日付</TableHead>}
                  {visibleColumns.clockIn && <TableHead className="w-[80px]">出勤</TableHead>}
                  {visibleColumns.clockOut && <TableHead className="w-[80px]">退勤</TableHead>}
                  {visibleColumns.workTime && <TableHead className="w-[90px]">勤務時間</TableHead>}
                  {visibleColumns.overtime && <TableHead className="w-[80px]">残業</TableHead>}
                  {visibleColumns.break && <TableHead className="w-[80px]">休憩</TableHead>}
                  {visibleColumns.workType && (
                    <TableHead className="w-[100px]">勤務タイプ</TableHead>
                  )}
                  {visibleColumns.late && <TableHead className="w-[80px]">遅刻</TableHead>}
                  {visibleColumns.earlyLeave && <TableHead className="w-[80px]">早退</TableHead>}
                  {visibleColumns.status && <TableHead className="w-[100px]">ステータス</TableHead>}
                  {visibleColumns.approval && <TableHead className="w-[80px]">承認</TableHead>}
                  {visibleColumns.approver && <TableHead className="w-[100px]">承認者</TableHead>}
                  {visibleColumns.updatedAt && (
                    <TableHead className="w-[120px]">更新日時</TableHead>
                  )}
                  {visibleColumns.notes && <TableHead className="w-[60px]">備考</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={Object.values(visibleColumns).filter(Boolean).length}
                      className="text-center py-8"
                    >
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                        <span className="text-gray-500">データを読み込み中...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAttendanceData.map((record) => {
                    const date = new Date(record.work_date);
                    const weekday = date.toLocaleDateString('ja-JP', { weekday: 'short' });
                    const dayOfWeek = date.getDay();
                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                    const weekdayColor = isWeekend ? 'text-red-600' : 'text-gray-600';

                    return (
                      <TableRow key={record.id} className="hover:bg-gray-50">
                        {visibleColumns.date && (
                          <TableCell>
                            {formatDateWithWeekday(record.work_date, weekday, weekdayColor)}
                          </TableCell>
                        )}
                        {visibleColumns.clockIn && (
                          <TableCell className="text-sm">
                            {formatTime(record.clock_in_time)}
                          </TableCell>
                        )}
                        {visibleColumns.clockOut && (
                          <TableCell className="text-sm">
                            {formatTime(record.clock_out_time)}
                          </TableCell>
                        )}
                        {visibleColumns.workTime && (
                          <TableCell className="text-sm">
                            {formatMinutes(record.actual_work_minutes)}
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
                                {formatMinutes(record.total_break_minutes)}
                              </span>
                              {record.break_count && record.break_count > 0 && (
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
                              )}
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
                            {getStatusBadge(getAttendanceStatus(record), isWeekend)}
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
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {!isLoading && filteredAttendanceData.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">選択した月の勤怠記録がありません</p>
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
                      {formatMinutes(selectedBreakDetails.total_break_minutes)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">休憩回数</span>
                    <span className="text-lg font-bold">{selectedBreakDetails.break_count}回</span>
                  </div>
                </div>

                {selectedBreakDetails.break_records &&
                  selectedBreakDetails.break_records.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">休憩記録</h4>
                      <div className="space-y-2">
                        {selectedBreakDetails.break_records.map((breakRecord, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 bg-white border rounded"
                          >
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium">{index + 1}回目</span>
                            </div>
                            <div className="text-sm">
                              {breakRecord.break_start} - {breakRecord.break_end || '終了未定'}
                            </div>
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
        attendanceRecords={attendanceRecords}
        users={[]}
        groups={[]}
      />
    </div>
  );
}
