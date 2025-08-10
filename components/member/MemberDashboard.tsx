'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Clock,
  Calendar,
  FileText,
  TrendingUp,
  LogIn,
  LogOut,
  Coffee,
  Loader2,
  MessageSquare,
} from 'lucide-react';

import { useAuth } from '@/contexts/auth-context';
import { useData } from '@/contexts/data-context';
import { useCompanyFeatures } from '@/hooks/use-company-features';
import { formatTime, getJSTDate } from '@/lib/utils';
import StatsCard from '@/components/ui/stats-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import TimeDisplay from '@/components/ui/time-display';
import { useToast } from '@/hooks/use-toast';
import dynamic from 'next/dynamic';
import ClockPanel from '@/components/member/dashboard/ClockPanel';
import StatsPanel from '@/components/member/dashboard/StatsPanel';
import TodayStatusPanel from '@/components/member/dashboard/TodayStatusPanel';
const HistoryPanel = dynamic(() => import('@/components/member/dashboard/HistoryPanel'), {
  loading: () => <div className="p-4 text-sm text-gray-500">履歴を読み込み中...</div>,
  ssr: false,
});
const AdminCsvExportDialog = dynamic(() => import('@/components/admin/CsvExportDialog'), {
  loading: () => <div className="p-4 text-sm text-gray-500">CSVダイアログを読み込み中...</div>,
  ssr: false,
});

// 事前プリロード用のフラグ（モジュールスコープで一度だけ）
let __historyPrefetchStarted = false;
let __csvPrefetchStarted = false;
import {
  clockIn,
  clockOut,
  startBreak,
  endBreak,
  getTodayAttendance,
  getMemberAttendance,
  getUserWorkType,
} from '@/lib/actions/attendance';
import type { AttendanceData } from '@/schemas/attendance';

export default function MemberDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { requests, notifications } = useData();

  // 機能チェック
  const { features } = useCompanyFeatures(user?.company_id);

  // 状態管理
  const [todayAttendance, setTodayAttendance] = useState<AttendanceData | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [isClient, setIsClient] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [csvExportOpen, setCsvExportOpen] = useState(false);
  const [loadingAction, setLoadingAction] = useState<
    'clockIn' | 'clockOut' | 'startBreak' | 'endBreak' | null
  >(null);

  // 可視時プリロード: 履歴コンポーネント
  const historyRef = useRef<HTMLDivElement | null>(null);
  const handleHistoryVisible = useCallback(() => {
    if (!__historyPrefetchStarted) {
      __historyPrefetchStarted = true;
      import('@/components/member/dashboard/HistoryPanel');
    }
  }, []);

  useEffect(() => {
    if (!historyRef.current) return;
    const el = historyRef.current;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          handleHistoryVisible();
          io.disconnect();
        }
      });
    });
    io.observe(el);
    return () => io.disconnect();
  }, [handleHistoryVisible]);

  // データ取得関数
  async function fetchAttendanceData(userId: string, forceRefresh = false) {
    const startTime = performance.now();
    console.log('fetchAttendanceData 開始:', { userId, forceRefresh });

    try {
      // スキーマキャッシュリフレッシュをスキップして直接データ取得
      console.log('スキーマキャッシュリフレッシュをスキップして直接データ取得を実行');

      // 今日の勤怠データを取得
      const todayResult = await getTodayAttendance(userId);
      const recordsResult = await getMemberAttendance(userId);

      console.log('データ取得結果:', {
        todayData: todayResult ? 'success' : 'null',
        recordsDataCount: recordsResult?.length || 0,
        todayDataId: todayResult?.id,
        recordsDataIds: recordsResult?.map((r) => r.id) || [],
      });

      if (todayResult) {
        console.log('今日の記録詳細:', todayResult);
        setTodayAttendance(todayResult);
      } else {
        setTodayAttendance(null);
      }

      if (recordsResult) {
        setAttendanceRecords(recordsResult);
        console.log('データ取得完了:', `${performance.now() - startTime}ms`, {
          recordsCount: recordsResult.length,
        });
      } else {
        setAttendanceRecords([]);
      }
    } catch (error) {
      console.error('データ取得エラー:', error);
      setTodayAttendance(null);
      setAttendanceRecords([]);
    }
  }

  // 初期データ取得
  useEffect(() => {
    if (!user || (user.role !== 'member' && user.role !== 'admin')) {
      router.push('/login');
      return;
    }

    fetchAttendanceData(user.id);
  }, [user, router]);

  // クライアントサイドでのみ実行
  useEffect(() => {
    setIsClient(true);
    setCurrentTime(new Date().toTimeString().slice(0, 5));
  }, []);

  // リアルタイム時刻更新
  useEffect(() => {
    if (!isClient) return;

    const timer = setInterval(() => {
      setCurrentTime(new Date().toTimeString().slice(0, 5));
    }, 1000);

    return () => clearInterval(timer);
  }, [isClient]);

  if (!user || (user.role !== 'member' && user.role !== 'admin')) {
    return null;
  }

  // 統計計算
  const thisMonth = isClient ? new Date().toISOString().slice(0, 7) : '';
  const thisMonthRecords = isClient
    ? attendanceRecords.filter((r) => r.work_date?.startsWith(thisMonth))
    : [];

  // 前月のデータを取得
  function getPreviousMonth() {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().slice(0, 7);
  }
  const previousMonth = isClient ? getPreviousMonth() : '';
  const previousMonthRecords = isClient
    ? attendanceRecords.filter((r) => r.work_date?.startsWith(previousMonth))
    : [];

  // 変化率計算関数
  function calculateChangeRate(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100 * 10) / 10;
  }

  // 出勤日数
  const uniqueWorkDays = new Set(thisMonthRecords.map((r) => r.work_date)).size;
  const previousUniqueWorkDays = new Set(previousMonthRecords.map((r) => r.work_date)).size;
  const workDaysChange = calculateChangeRate(uniqueWorkDays, previousUniqueWorkDays);

  // 残業時間
  const totalOvertimeMinutes = thisMonthRecords.reduce(
    (sum, r) => sum + (r.overtime_minutes || 0),
    0
  );
  const overtimeHoursValue = totalOvertimeMinutes > 0 ? totalOvertimeMinutes / 60 : 0;
  const overtimeHours = overtimeHoursValue.toFixed(1);
  const previousTotalOvertimeMinutes = previousMonthRecords.reduce(
    (sum, r) => sum + (r.overtime_minutes || 0),
    0
  );
  const previousOvertimeHours = Math.round((previousTotalOvertimeMinutes / 60) * 10) / 10;
  const overtimeChange = calculateChangeRate(overtimeHoursValue, previousOvertimeHours);

  // 勤務時間
  const totalWorkMinutes = thisMonthRecords.reduce(
    (sum, r) => sum + (r.actual_work_minutes || 0),
    0
  );
  const workHours = Math.round((totalWorkMinutes / 60) * 10) / 10;
  const previousTotalWorkMinutes = previousMonthRecords.reduce(
    (sum, r) => sum + (r.actual_work_minutes || 0),
    0
  );
  const previousWorkHours = Math.round((previousTotalWorkMinutes / 60) * 10) / 10;
  const workHoursChange = calculateChangeRate(workHours, previousWorkHours);

  const userRequests = requests.filter((a) => a.user_id === user.id);
  const pendingRequests = userRequests.filter((a) => a.status_id === 'pending');
  const userNotifications = notifications.filter((n) => n.user_id === user.id && !n.is_read);

  // 複数回出退勤対応の状態管理
  const today = getJSTDate();
  const todayRecords = attendanceRecords.filter((r) => r.work_date === today);

  // 日付でソートして最新のレコードを正確に取得
  const sortedTodayRecords = todayRecords.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // clock_recordsベースの状態管理
  const latestRecord = sortedTodayRecords[0] || null;
  const latestClockRecords = latestRecord?.clock_records || [];
  const latestSession =
    latestClockRecords.length > 0 ? latestClockRecords[latestClockRecords.length - 1] : null;

  // 出勤・退勤・休憩状態の判定
  const hasClockIn = !!latestSession?.in_time;
  const hasClockOut = !!latestSession?.out_time;

  // 休憩状態の詳細な判定
  const activeBreaks = latestSession?.breaks || [];
  const isOnBreak = activeBreaks.some((br) => {
    const hasBreakStart = !!br.break_start;
    const hasBreakEnd = !!br.break_end;
    return hasBreakStart && !hasBreakEnd;
  });

  // 現在の勤務状態を判定
  const isCurrentlyWorking = hasClockIn && !hasClockOut;
  const canStartNewSession = !hasClockIn || hasClockOut;

  // デバッグログ
  console.log('clock_records状態管理デバッグ:', {
    today,
    todayRecordsCount: todayRecords.length,
    latestRecord,
    latestClockRecords,
    latestClockRecordsLength: latestClockRecords.length,
    latestSession,
    hasClockIn,
    hasClockOut,
    isOnBreak,
    isCurrentlyWorking,
    canStartNewSession,
  });

  console.log('休憩状態デバッグ:', {
    activeBreaks,
    isOnBreak,
    latestRecordId: latestRecord?.id,
    breakDetails: activeBreaks.map((br) => ({
      break_start: br.break_start,
      break_end: br.break_end,
      hasStart: !!br.break_start,
      hasEnd: !!br.break_end,
      isActive: !!br.break_start && !br.break_end,
    })),
  });

  console.log('UI状態:', {
    hasClockIn,
    hasClockOut,
    isOnBreak,
    isCurrentlyWorking,
    canStartNewSession,
    isLoading,
    latestSessionInTime: latestSession?.in_time,
    latestSessionOutTime: latestSession?.out_time,
    latestRecordId: latestRecord?.id,
  });

  // 打刻処理関数
  async function handleClockIn() {
    const startTime = performance.now();
    console.log('handleClockIn 開始');
    if (isLoading) {
      console.log('既に処理中です');
      return;
    }
    if (!user) {
      console.log('ユーザーが存在しません');
      return;
    }

    console.log('ユーザーID:', user.id);
    setIsLoading(true);
    setLoadingAction('clockIn');

    try {
      const timestamp = new Date().toISOString();
      console.log('打刻時刻:', timestamp);
      console.log('clockIn関数呼び出し開始');

      // ユーザーの勤務タイプを取得
      console.log('ユーザーの勤務タイプを取得中...');
      const workTypeId = await getUserWorkType(user.id);
      console.log('取得した勤務タイプID:', workTypeId);

      console.log('clockIn関数呼び出し直前');
      console.log('clockIn関数の引数:', { userId: user.id, timestamp, workTypeId });

      const result = await clockIn(user.id, timestamp, workTypeId);
      console.log('clockIn関数呼び出し完了');
      console.log('clockIn結果:', result);

      if (result.success) {
        toast({
          title: '成功',
          description: result.message,
        });
        // 即座にデータを更新
        if (result.attendance) {
          setTodayAttendance(result.attendance);
          // 既存の記録を更新
          setAttendanceRecords((prev) => {
            const today = getJSTDate();
            const filtered = prev.filter(
              (r) => r.work_date !== today || r.id !== result.attendance!.id
            );
            return [result.attendance!, ...filtered];
          });
        }
        // 即座にデータを再取得
        await fetchAttendanceData(user.id, true);

        const endTime = performance.now();
        console.log(`出勤処理完了: ${(endTime - startTime).toFixed(2)}ms`);
      } else {
        toast({
          title: 'エラー',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('打刻処理エラー:', error);
      toast({
        title: 'エラー',
        description: '打刻に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setLoadingAction(null);
    }
  }

  async function handleClockOut() {
    console.log('handleClockOut 開始');
    if (isLoading) {
      console.log('既に処理中です');
      return;
    }
    if (!user) {
      console.log('ユーザーが存在しません');
      return;
    }

    console.log('ユーザーID:', user.id);
    setIsLoading(true);
    setLoadingAction('clockOut');
    try {
      const timestamp = new Date().toISOString();
      console.log('退勤時刻:', timestamp);
      console.log('clockOut関数呼び出し開始');

      const result = await clockOut(user.id, timestamp);
      console.log('clockOut結果:', result);

      if (result.success) {
        toast({
          title: '成功',
          description: result.message,
        });
        // 即座にデータを更新
        if (result.attendance) {
          setTodayAttendance(result.attendance);
          // 既存の記録を更新
          setAttendanceRecords((prev) => {
            const today = new Date().toISOString().split('T')[0];
            const filtered = prev.filter(
              (r) => r.work_date !== today || r.id !== result.attendance!.id
            );
            return [result.attendance!, ...filtered];
          });
        }
        // 即座にデータを再取得
        await fetchAttendanceData(user.id, true);
      } else {
        toast({
          title: 'エラー',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('退勤処理エラー:', error);
      toast({
        title: 'エラー',
        description: '打刻に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setLoadingAction(null);
    }
  }

  async function handleStartBreak() {
    console.log('handleStartBreak 開始');
    if (isLoading) {
      console.log('既に処理中です');
      return;
    }
    if (!user) {
      console.log('ユーザーが存在しません');
      return;
    }
    console.log('ユーザーID:', user.id);
    setIsLoading(true);
    setLoadingAction('startBreak');
    try {
      const timestamp = new Date().toISOString();
      console.log('休憩開始時刻:', timestamp);
      console.log('startBreak関数呼び出し開始');
      const result = await startBreak(user.id, timestamp);
      console.log('startBreak結果:', result);
      if (result.success) {
        toast({
          title: '成功',
          description: result.message,
        });
        // 即座にデータを更新
        if (result.attendance) {
          setTodayAttendance(result.attendance);
          // 既存の記録を更新
          setAttendanceRecords((prev) => {
            const today = new Date().toISOString().split('T')[0];
            const filtered = prev.filter(
              (r) => r.work_date !== today || r.id !== result.attendance!.id
            );
            return [result.attendance!, ...filtered];
          });
        }
        // 即座にデータを再取得
        await fetchAttendanceData(user.id, true);
      } else {
        toast({
          title: 'エラー',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('休憩開始処理エラー:', error);
      toast({
        title: 'エラー',
        description: '休憩開始に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setLoadingAction(null);
    }
  }

  async function handleEndBreak() {
    console.log('handleEndBreak 開始');
    if (isLoading) {
      console.log('既に処理中です');
      return;
    }
    if (!user) {
      console.log('ユーザーが存在しません');
      return;
    }
    console.log('ユーザーID:', user.id);
    setIsLoading(true);
    setLoadingAction('endBreak');
    try {
      const timestamp = new Date().toISOString();
      console.log('休憩終了時刻:', timestamp);
      console.log('endBreak関数呼び出し開始');
      const result = await endBreak(user.id, timestamp);
      console.log('endBreak結果:', result);
      if (result.success) {
        toast({
          title: '成功',
          description: result.message,
        });
        // 即座にデータを更新
        if (result.attendance) {
          setTodayAttendance(result.attendance);
          // 既存の記録を更新
          setAttendanceRecords((prev) => {
            const today = new Date().toISOString().slice(0, 10);
            const filtered = prev.filter(
              (r) => r.work_date !== today || r.id !== result.attendance!.id
            );
            return [result.attendance!, ...filtered];
          });
        }
        // 即座にデータを再取得
        await fetchAttendanceData(user.id, true);
      } else {
        toast({
          title: 'エラー',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('休憩終了処理エラー:', error);
      toast({
        title: 'エラー',
        description: '休憩終了に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setLoadingAction(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
          <p className="text-gray-600">こんにちは、{user.full_name}さん</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">今日の日付</p>
          <p className="text-lg font-semibold text-gray-900">
            {isClient
              ? new Date().toLocaleDateString('ja-JP', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })
              : '読み込み中...'}
          </p>
        </div>
      </div>

      {/* 統計カード - デスクトップのみ */}
      <div className="hidden lg:grid lg:grid-cols-3 gap-4 mb-6">
        <StatsCard
          title="出勤日数"
          value={`${uniqueWorkDays}日`}
          change={workDaysChange}
          icon={<Calendar className="w-6 h-6" />}
        />
        <StatsCard
          title="残業時間"
          value={overtimeHours}
          change={overtimeChange}
          icon={<Clock className="w-6 h-6" />}
        />
        <StatsCard
          title="申請中"
          value={`${pendingRequests.length}件`}
          icon={<FileText className="w-6 h-6" />}
        />
      </div>

      {/* モバイル用レイアウト: 打刻、打刻履歴（遅延）、統計の順 */}
      <div className="block lg:hidden space-y-6">
        <ClockPanel
          isCurrentlyWorking={isCurrentlyWorking}
          isOnBreak={isOnBreak}
          canStartNewSession={canStartNewSession}
          isLoading={isLoading}
          loadingAction={loadingAction}
          onClockIn={handleClockIn}
          onClockOut={handleClockOut}
          onStartBreak={handleStartBreak}
          onEndBreak={handleEndBreak}
        />

        {/* Clock History */}
        <div ref={historyRef}>
          <HistoryPanel
            todayAttendance={todayAttendance}
            attendanceRecords={attendanceRecords}
            onRefresh={() => fetchAttendanceData(user.id)}
            onCsvExport={() => setCsvExportOpen(true)}
          />
        </div>

        {/* 統計カード - モバイル用 */}
        <StatsPanel
          uniqueWorkDays={uniqueWorkDays}
          workDaysChange={workDaysChange}
          overtimeHours={overtimeHours}
          overtimeChange={overtimeChange}
          pendingRequestsCount={pendingRequests.length}
        />
      </div>

      {/* デスクトップ用レイアウト: 従来通りの2カラム */}
      <div className="hidden lg:grid lg:grid-cols-2 gap-6">
        <ClockPanel
          isCurrentlyWorking={isCurrentlyWorking}
          isOnBreak={isOnBreak}
          canStartNewSession={canStartNewSession}
          isLoading={isLoading}
          loadingAction={loadingAction}
          onClockIn={handleClockIn}
          onClockOut={handleClockOut}
          onStartBreak={handleStartBreak}
          onEndBreak={handleEndBreak}
        />

        {/* Clock History */}
        <HistoryPanel
          todayAttendance={todayAttendance}
          attendanceRecords={attendanceRecords}
          onRefresh={() => fetchAttendanceData(user.id)}
          onCsvExport={() => setCsvExportOpen(true)}
        />
      </div>

      <TodayStatusPanel
        latestClockRecords={latestClockRecords}
        latestSession={latestSession}
        overtimeMinutes={latestRecord?.overtime_minutes || 0}
      />

      {/* Notifications */}
      {userNotifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>お知らせ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {userNotifications.slice(0, 3).map((notification) => (
                <div key={notification.id} className="p-3 bg-blue-50 rounded-lg">
                  <div className="font-medium text-sm text-blue-900">{notification.title}</div>
                  <div className="text-xs text-blue-700 mt-1">{notification.message}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* CSV出力ダイアログ */}
      <AdminCsvExportDialog
        open={csvExportOpen}
        onOpenChangeAction={setCsvExportOpen}
        attendanceRecords={attendanceRecords}
        users={[]}
        groups={[]}
      />

      {/* 機能無効化メッセージ */}
      {features && !features.chat && (
        <Card>
          <CardContent className="p-4">
            <div className="text-center text-gray-500">
              <MessageSquare className="w-8 h-8 mx-auto mb-2" />
              <p>チャット機能は現在無効化されています</p>
            </div>
          </CardContent>
        </Card>
      )}

      {features && !features.report && (
        <Card>
          <CardContent className="p-4">
            <div className="text-center text-gray-500">
              <FileText className="w-8 h-8 mx-auto mb-2" />
              <p>レポート機能は現在無効化されています</p>
            </div>
          </CardContent>
        </Card>
      )}

      {features && !features.schedule && (
        <Card>
          <CardContent className="p-4">
            <div className="text-center text-gray-500">
              <Calendar className="w-8 h-8 mx-auto mb-2" />
              <p>スケジュール機能は現在無効化されています</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
