'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Calendar, FileText, TrendingUp, Plus, LogIn, LogOut, Coffee } from 'lucide-react';
import Link from 'next/link';

import { useAuth } from '@/contexts/auth-context';
import { useData } from '@/contexts/data-context';
import { formatDateTime, formatTime } from '@/lib/utils';
import StatsCard from '@/components/ui/stats-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import TimeDisplay from '@/components/ui/time-display';
import { useToast } from '@/hooks/use-toast';
import ClockHistory from '@/components/member/ClockHistory';
import AdminCsvExportDialog from '@/components/admin/CsvExportDialog';
import {
  clockIn,
  clockOut,
  startBreak,
  endBreak,
  getTodayAttendance,
  getUserAttendance,
} from '@/lib/actions/attendance';
import type { Attendance, BreakRecord } from '@/types/attendance';

export default function MemberDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { requests, notifications } = useData();

  // 状態管理
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isClient, setIsClient] = useState(false);
  const [csvExportOpen, setCsvExportOpen] = useState(false);

  // データ取得関数
  const fetchAttendanceData = useCallback(async () => {
    if (!user) return;

    console.log('fetchAttendanceData 開始:', { userId: user.id });

    try {
      const [todayData, recordsData] = await Promise.all([
        getTodayAttendance(user.id),
        getUserAttendance(user.id),
      ]);

      console.log('データ取得結果:', { todayData, recordsDataCount: recordsData?.length });

      // 詳細なデバッグ情報を追加
      if (recordsData && recordsData.length > 0) {
        const todayRecords = recordsData.filter(
          (r) => r.work_date === new Date().toISOString().split('T')[0]
        );
        console.log(
          '今日の記録詳細:',
          todayRecords.map((r) => ({
            id: r.id,
            clock_in_time: r.clock_in_time,
            clock_out_time: r.clock_out_time,
            created_at: r.created_at,
          }))
        );
      }

      setTodayAttendance(todayData);
      setAttendanceRecords(recordsData || []);
    } catch (error) {
      console.error('勤怠データ取得エラー:', error);
      toast({
        title: 'エラー',
        description: '勤怠データの取得に失敗しました',
        variant: 'destructive',
      });
    }
  }, [user, toast]);

  // 初期データ取得
  useEffect(() => {
    if (!user || (user.role !== 'member' && user.role !== 'admin')) {
      router.push('/login');
      return;
    }

    fetchAttendanceData();
  }, [user, router, fetchAttendanceData]);

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

  const workDays = thisMonthRecords.length;
  const totalOvertimeMinutes = thisMonthRecords.reduce(
    (sum, r) => sum + 0, // overtime_minutesは現在のテーブル構造に存在しないため0で固定
    0
  );
  const overtimeHours = Math.round((totalOvertimeMinutes / 60) * 10) / 10;

  const userRequests = requests.filter((a) => a.user_id === user.id);
  const pendingRequests = userRequests.filter((a) => a.status_id === 'pending');
  const userNotifications = notifications.filter((n) => n.user_id === user.id && !n.is_read);

  const stats = [
    {
      title: '出勤日数',
      value: `${workDays}日`,
      change: 2,
      icon: <Calendar className="w-6 h-6" />,
    },
    {
      title: '残業時間',
      value: `${overtimeHours}時間`,
      change: -1.5,
      icon: <Clock className="w-6 h-6" />,
    },
    {
      title: '申請中',
      value: `${pendingRequests.length}件`,
      change: 1,
      icon: <FileText className="w-6 h-6" />,
    },
    {
      title: '勤務時間',
      value: `${workDays * 8}時間`,
      change: 5.2,
      icon: <TrendingUp className="w-6 h-6" />,
    },
  ];

  // 複数回出退勤対応の状態管理
  const today = new Date().toISOString().split('T')[0];
  const todayRecords = attendanceRecords.filter((r) => r.work_date === today);

  // 日付でソートして最新のレコードを正確に取得
  const sortedTodayRecords = todayRecords.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // 退勤していない最新のレコードを取得（出勤中のレコード）
  const activeRecord = sortedTodayRecords.filter((r) => r.clock_in_time && !r.clock_out_time)[0]; // 出勤済みで退勤していないレコードのみ、既にソート済みなので最初の要素が最新

  // 最新のレコード（退勤済みも含む）
  const latestRecord = sortedTodayRecords[0] || null;

  // デバッグログ
  console.log('状態管理デバッグ:', {
    today,
    todayRecordsCount: todayRecords.length,
    activeRecord,
    latestRecord,
    hasClockInTime: !!activeRecord?.clock_in_time,
    hasClockOutTime: !!activeRecord?.clock_out_time,
  });

  // 休憩状態の詳細なデバッグ
  const activeRecordBreaks = activeRecord?.break_records || [];
  const activeBreakExists = activeRecordBreaks.some((br: BreakRecord) => br.start && !br.end);

  console.log('休憩状態デバッグ:', {
    activeRecordBreaks,
    activeBreakExists,
    activeRecordId: activeRecord?.id,
  });

  const isOnBreak = activeBreakExists;
  const hasClockIn = !!activeRecord; // 出勤中のレコードが存在する場合のみtrue
  const hasClockOut = !activeRecord && latestRecord?.clock_out_time; // 出勤中のレコードがなく、最新レコードが退勤済みの場合

  // デバッグ用：最新の退勤時刻を表示
  const latestClockOutTime = latestRecord?.clock_out_time;

  console.log('UI状態:', {
    hasClockIn,
    hasClockOut,
    isOnBreak,
    latestClockOutTime: latestClockOutTime ? new Date(latestClockOutTime).toISOString() : null,
  });

  // 打刻処理関数
  const handleClockIn = async () => {
    console.log('handleClockIn 開始');
    if (!user) {
      console.log('ユーザーが存在しません');
      return;
    }

    console.log('ユーザーID:', user.id);
    setIsLoading(true);

    try {
      const timestamp = new Date().toISOString();
      console.log('打刻時刻:', timestamp);
      console.log('clockIn関数呼び出し開始');

      const result = await clockIn(user.id, timestamp);
      console.log('clockIn結果:', result);

      if (result.success) {
        toast({
          title: '成功',
          description: result.message,
        });
        await fetchAttendanceData(); // データを再取得
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
    }
  };

  const handleClockOut = async () => {
    console.log('handleClockOut 開始');
    if (!user) {
      console.log('ユーザーが存在しません');
      return;
    }

    console.log('ユーザーID:', user.id);
    setIsLoading(true);
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
        await fetchAttendanceData(); // データを再取得
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
    }
  };

  const handleStartBreak = async () => {
    console.log('handleStartBreak 開始');
    if (!user) {
      console.log('ユーザーが存在しません');
      return;
    }
    console.log('ユーザーID:', user.id);
    setIsLoading(true);
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
        console.log('fetchAttendanceData呼び出し開始');
        await fetchAttendanceData(); // データを再取得
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
    }
  };

  const handleEndBreak = async () => {
    console.log('handleEndBreak 開始');
    if (!user) {
      console.log('ユーザーが存在しません');
      return;
    }
    console.log('ユーザーID:', user.id);
    setIsLoading(true);
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
        console.log('fetchAttendanceData呼び出し開始');
        await fetchAttendanceData(); // データを再取得
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
    }
  };

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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatsCard
            key={index}
            title={stat.title}
            value={stat.value}
            change={stat.change}
            icon={stat.icon}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Time Clock */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <span>打刻</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <TimeDisplay />

            {/* 出勤ボタン - 出勤していない場合のみ表示 */}
            {!hasClockIn && (
              <Button
                onClick={() => {
                  console.log('出勤ボタンがクリックされました');
                  handleClockIn();
                }}
                disabled={isLoading}
                className="w-full h-12 bg-green-600 hover:bg-green-700"
              >
                <LogIn className="w-5 h-5 mr-2" />
                {isLoading ? '処理中...' : '出勤'}
              </Button>
            )}

            {/* 退勤・休憩ボタン - 出勤済みで退勤していない場合のみ表示 */}
            {hasClockIn && !hasClockOut && (
              <>
                {!isOnBreak ? (
                  <Button
                    onClick={handleStartBreak}
                    disabled={isLoading}
                    className="w-full h-12 bg-orange-200 hover:bg-orange-300 text-orange-800 border-orange-300"
                  >
                    <Coffee className="w-5 h-5 mr-2" />
                    {isLoading ? '処理中...' : '休憩開始'}
                  </Button>
                ) : (
                  <Button
                    onClick={handleEndBreak}
                    disabled={isLoading}
                    className="w-full h-12 bg-orange-200 hover:bg-orange-300 text-orange-800 border-orange-300"
                  >
                    <Coffee className="w-5 h-5 mr-2" />
                    {isLoading ? '処理中...' : '休憩終了'}
                  </Button>
                )}

                <Button
                  onClick={handleClockOut}
                  disabled={isOnBreak || isLoading}
                  className="w-full h-12 bg-red-600 hover:bg-red-700"
                >
                  <LogOut className="w-5 h-5 mr-2" />
                  {isLoading ? '処理中...' : '退勤'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Clock History */}
        <ClockHistory
          userId={user.id}
          todayAttendance={todayAttendance}
          attendanceRecords={attendanceRecords}
          onRefresh={fetchAttendanceData}
          onCsvExport={() => setCsvExportOpen(true)}
        />
      </div>

      {/* Today's Status */}
      <Card>
        <CardHeader>
          <CardTitle>今日の勤務状況</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-sm text-blue-600 font-medium">出勤時刻</div>
              <div className="text-lg font-bold text-blue-900">
                {formatTime(todayAttendance?.clock_in_time)}
              </div>
            </div>

            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-sm text-red-600 font-medium">退勤時刻</div>
              <div className="text-lg font-bold text-red-900">
                {formatTime(todayAttendance?.clock_out_time)}
              </div>
            </div>

            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-sm text-green-600 font-medium">勤務時間</div>
              <div className="text-lg font-bold text-green-900">
                {todayAttendance?.actual_work_minutes
                  ? `${Math.floor(todayAttendance.actual_work_minutes / 60)}:${(todayAttendance.actual_work_minutes % 60).toString().padStart(2, '0')}`
                  : '--:--'}
              </div>
            </div>

            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-sm text-yellow-600 font-medium">残業時間</div>
              <div className="text-lg font-bold text-yellow-900">--:--</div>
            </div>
          </div>
        </CardContent>
      </Card>

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
        onOpenChange={setCsvExportOpen}
        attendanceRecords={attendanceRecords}
        users={[]}
        groups={[]}
      />
    </div>
  );
}
