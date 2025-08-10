'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Calendar, Clock } from 'lucide-react';

import { useAuth } from '@/contexts/auth-context';
import { getUserAttendance, getUserWorkTypes } from '@/lib/actions/attendance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { AttendanceData, AttendanceFilters } from '@/schemas/attendance';
import AttendanceHeader from '@/components/member/attendance/AttendanceHeader';
import AttendanceFiltersPanel from '@/components/member/attendance/AttendanceFiltersPanel';
import AttendanceTable from '@/components/member/attendance/AttendanceTable';

const AdminCsvExportDialog = dynamic(() => import('@/components/admin/CsvExportDialog'), {
  loading: () => <div className="p-4 text-sm text-gray-500">CSVダイアログを読み込み中...</div>,
  ssr: false,
});
const WorkTypeDetailDialog = dynamic(
  () => import('@/components/admin/work-types/WorkTypeDetailDialog'),
  {
    loading: () => <div className="p-4 text-sm text-gray-500">勤務形態詳細を読み込み中...</div>,
    ssr: false,
  }
);

// 事前プリロードフラグ
let __csvPrefetchStarted = false;
let __workTypeDialogPrefetchStarted = false;

export default function MemberAttendancePage() {
  const { user } = useAuth();
  const router = useRouter();

  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  const [selectedBreakDetails, setSelectedBreakDetails] = useState<AttendanceData | null>(null);
  const [isBreakDetailsDialogOpen, setIsBreakDetailsDialogOpen] = useState(false);
  const [isColumnSettingsDialogOpen, setIsColumnSettingsDialogOpen] = useState(false);
  const [csvExportOpen, setCsvExportOpen] = useState(false);

  const [workTypeDetailDialogOpen, setWorkTypeDetailDialogOpen] = useState(false);
  const [selectedWorkTypeId, setSelectedWorkTypeId] = useState<string | null>(null);

  const [filters, setFilters] = useState<AttendanceFilters>({
    dateRange: { startDate: null, endDate: null },
    status: [],
    hasOvertime: null,
    workTypeId: null,
    approvalStatus: null,
    userId: null,
    groupId: null,
  });

  const [workTypes, setWorkTypes] = useState<{ id: string; name: string }[]>([]);
  const [isLoadingWorkTypes, setIsLoadingWorkTypes] = useState(false);

  // SSRガード
  useEffect(() => {
    if (!user || (user.role !== 'member' && user.role !== 'admin')) {
      router.push('/login');
    }
  }, [user, router]);

  // 勤務タイプ取得
  useEffect(() => {
    async function fetchWorkTypes() {
      if (!user) return;
      try {
        setIsLoadingWorkTypes(true);
        const types = await getUserWorkTypes(user.id);
        setWorkTypes(types);
      } finally {
        setIsLoadingWorkTypes(false);
      }
    }
    fetchWorkTypes();
  }, [user]);

  // データ取得
  useEffect(() => {
    async function fetchAttendanceData() {
      if (!user) return;
      try {
        setIsLoading(true);
        const [year, month] = selectedMonth.split('-').map(Number);
        const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay}`;
        const records = await getUserAttendance(user.id, startDate, endDate);
        setAttendanceRecords(records);
      } catch (e) {
        console.error('勤怠データ取得エラー:', e);
      } finally {
        setIsLoading(false);
      }
    }
    fetchAttendanceData();
  }, [user, selectedMonth]);

  // ダイアログのプリフェッチ（ボタンにフォーカス/ホバーで）
  const prefetchCsv = () => {
    if (!__csvPrefetchStarted) {
      __csvPrefetchStarted = true;
      import('@/components/admin/CsvExportDialog');
    }
  };
  const prefetchWorkTypeDialog = () => {
    if (!__workTypeDialogPrefetchStarted) {
      __workTypeDialogPrefetchStarted = true;
      import('@/components/admin/work-types/WorkTypeDetailDialog');
    }
  };

  // 可視時プリロード例（将来: テーブルがフォールド下の場合に適用可）
  const tableRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!tableRef.current) return;
    const el = tableRef.current;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          // ここでは重い依存があれば import() でプリロード可能
          io.disconnect();
        }
      });
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const filteredAttendanceData = useMemo(() => {
    const filteredByMonth = attendanceRecords.filter((record) => {
      if (!record.work_date) return false;
      const recordDate = new Date(record.work_date);
      const selectedDate = new Date(selectedMonth + '-01');
      return (
        recordDate.getFullYear() === selectedDate.getFullYear() &&
        recordDate.getMonth() === selectedDate.getMonth()
      );
    });

    // 追加フィルタ
    return filteredByMonth.filter((record) => {
      if (filters.dateRange.startDate && record.work_date < filters.dateRange.startDate)
        return false;
      if (filters.dateRange.endDate && record.work_date > filters.dateRange.endDate) return false;
      if (filters.hasOvertime !== null) {
        const hasOvertime = (record.overtime_minutes || 0) > 0;
        if (filters.hasOvertime !== hasOvertime) return false;
      }
      if (filters.workTypeId && record.work_type_id !== filters.workTypeId) return false;
      if (filters.approvalStatus) {
        const recordApprovalStatus = record.approved_by ? 'approved' : 'pending';
        if (filters.approvalStatus !== recordApprovalStatus) return false;
      }
      return true;
    });
  }, [attendanceRecords, selectedMonth, filters]);

  return (
    <div className="space-y-6">
      <AttendanceHeader
        onOpenColumnSettings={() => setIsColumnSettingsDialogOpen(true)}
        onOpenCsvExport={() => {
          prefetchCsv();
          setCsvExportOpen(true);
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>勤怠記録</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AttendanceFiltersPanel
            filters={filters}
            onFiltersChange={setFilters}
            workTypes={workTypes}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
            isLoadingWorkTypes={isLoadingWorkTypes}
          />

          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-gray-500">
              データを読み込み中...
            </div>
          ) : filteredAttendanceData.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">選択した月の勤怠記録がありません</p>
            </div>
          ) : (
            <div ref={tableRef}>
              <AttendanceTable
                records={filteredAttendanceData}
                visibleColumns={{
                  date: true,
                  clockIn: true,
                  clockOut: true,
                  workTime: true,
                  overtime: true,
                  status: true,
                  break: true,
                  workType: true,
                  late: true,
                  earlyLeave: true,
                  approval: false,
                  approver: true,
                  updatedAt: true,
                }}
                onClickBreakDetails={(record) => {
                  setSelectedBreakDetails(record);
                  setIsBreakDetailsDialogOpen(true);
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>

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
                      {(selectedBreakDetails.total_break_minutes || 0) / 60 > 0
                        ? `${Math.floor((selectedBreakDetails.total_break_minutes || 0) / 60)}:${(
                            (selectedBreakDetails.total_break_minutes || 0) % 60
                          )
                            .toString()
                            .padStart(2, '0')}`
                        : '--:--'}
                    </span>
                  </div>
                </div>
                {selectedBreakDetails.break_records &&
                  selectedBreakDetails.break_records.length > 0 && (
                    <div className="space-y-2">
                      {selectedBreakDetails.break_records.map((br, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 bg-white border rounded"
                        >
                          <div className="text-sm">{idx + 1}回目</div>
                          <div className="text-sm">
                            {br.break_start} - {br.break_end || '終了未定'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* CSV出力ダイアログ */}
      <AdminCsvExportDialog
        open={csvExportOpen}
        onOpenChangeAction={setCsvExportOpen}
        attendanceRecords={attendanceRecords}
        users={[]}
        groups={[]}
      />

      {/* 勤務形態詳細ダイアログ */}
      <WorkTypeDetailDialog
        open={workTypeDetailDialogOpen}
        onOpenChangeAction={setWorkTypeDetailDialogOpen}
        workTypeId={selectedWorkTypeId}
      />
    </div>
  );
}
