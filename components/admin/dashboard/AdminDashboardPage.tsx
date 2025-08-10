'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/contexts/auth-context';
import { useData } from '@/contexts/data-context';
import { getJSTDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { getWorkTypes } from '@/lib/actions/admin/work-types';
import ChartPanel from '@/components/admin/dashboard/ChartPanel';
import StatsColumn from '@/components/admin/dashboard/StatsColumn';
import RecentRequestsTable from '@/components/admin/dashboard/RecentRequestsTable';
import SystemAlertsCard from '@/components/admin/dashboard/SystemAlertsCard';
import MonthlySummary from '@/components/admin/dashboard/MonthlySummary';

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { users, requests, attendanceRecords } = useData();
  const { toast } = useToast();
  const [hasCheckedWorkTypes, setHasCheckedWorkTypes] = useState(false);

  const unauthorized = !user || user.role !== 'admin';

  const checkWorkTypes = useCallback(async () => {
    if (!user?.company_id) return;
    try {
      const result = await getWorkTypes(user.company_id, { page: 1, limit: 1 });
      if (result.success && result.data.work_types.length === 0) {
        toast({
          title: '勤務形態が未設定です',
          description: '勤務形態を設定してください。設定画面から勤務形態を追加できます。',
          variant: 'destructive',
        });
      }
      setHasCheckedWorkTypes(true);
    } catch (error) {
      console.error('勤務形態確認エラー:', error);
      setHasCheckedWorkTypes(true);
    }
  }, [user?.company_id, toast]);

  useEffect(() => {
    if (unauthorized) {
      router.push('/login');
      return;
    }
    if (user?.company_id && !hasCheckedWorkTypes) {
      void checkWorkTypes();
    }
  }, [unauthorized, user?.company_id, hasCheckedWorkTypes, router, checkWorkTypes]);

  const activeUsers = useMemo(() => users.filter((u) => u.is_active).length, [users]);
  const pendingRequests = useMemo(
    () => requests.filter((a) => a.status_id === 'pending').length,
    [requests]
  );
  const todayAttendance = useMemo(
    () => attendanceRecords.filter((r) => r.work_date === getJSTDate()).length,
    [attendanceRecords]
  );
  const thisMonth = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const monthlyAttendance = useMemo(
    () => attendanceRecords.filter((r) => r.work_date.startsWith(thisMonth)),
    [attendanceRecords, thisMonth]
  );
  const monthlyAttendanceMinutes = useMemo(
    () => monthlyAttendance.reduce((sum, r) => sum + (r.actual_work_minutes || 0), 0),
    [monthlyAttendance]
  );
  const totalOvertimeHours = useMemo(
    () =>
      Math.round((monthlyAttendance.reduce((sum, r) => sum + r.overtime_minutes, 0) / 60) * 10) /
      10,
    [monthlyAttendance]
  );

  type MinimalRequest = {
    id: string;
    user_id: string;
    title: string;
    status_id: 'pending' | 'approved' | 'rejected';
  };
  type MinimalUser = { id: string; family_name: string; first_name: string };

  const simplifiedRequests = useMemo<MinimalRequest[]>(
    () => requests as unknown as MinimalRequest[],
    [requests]
  );

  const simplifiedUsers = useMemo<MinimalUser[]>(() => users as unknown as MinimalUser[], [users]);

  if (unauthorized) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">管理者ダッシュボード</h1>
        <p className="text-gray-600">全社の勤怠状況を確認できます</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <ChartPanel />
        </div>
        <StatsColumn
          activeUsers={activeUsers}
          todayAttendance={todayAttendance}
          totalOvertimeHours={totalOvertimeHours}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentRequestsTable requests={simplifiedRequests} users={simplifiedUsers} />
        <SystemAlertsCard pendingRequests={pendingRequests} />
      </div>

      <MonthlySummary
        monthlyAttendanceCount={monthlyAttendance.length}
        monthlyAttendanceMinutes={monthlyAttendanceMinutes}
        totalOvertimeHours={totalOvertimeHours}
        totalRequests={requests.length}
      />
    </div>
  );
}
