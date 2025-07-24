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
  getMemberAttendance,
} from '@/lib/actions/attendance';
import type { Attendance, ClockBreakRecord, ClockRecord } from '@/types/attendance';
import { refreshSchemaCache } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';

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
  const fetchAttendanceData = async (userId: string, forceRefresh = false) => {
    const startTime = performance.now();
    console.log('fetchAttendanceData 開始:', { userId, forceRefresh });

    try {
      // スキーマキャッシュリフレッシュをスキップして直接データ取得
      console.log('スキーマキャッシュリフレッシュをスキップして直接データ取得を実行');

      // 今日の日付を取得
      const today = new Date().toISOString().split('T')[0];

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
  };

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
  const getPreviousMonth = () => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().slice(0, 7);
  };
  const previousMonth = isClient ? getPreviousMonth() : '';
  const previousMonthRecords = isClient
    ? attendanceRecords.filter((r) => r.work_date?.startsWith(previousMonth))
    : [];

  // 変化率計算関数
  const calculateChangeRate = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100 * 10) / 10;
  };

  // 出勤日数：1日2回以上出勤している場合は1日としてカウント
  const uniqueWorkDays = new Set(thisMonthRecords.map((r) => r.work_date)).size;
  const previousUniqueWorkDays = new Set(previousMonthRecords.map((r) => r.work_date)).size;
  const workDaysChange = calculateChangeRate(uniqueWorkDays, previousUniqueWorkDays);

  // 残業時間：attendancesテーブルから取得
  const totalOvertimeMinutes = thisMonthRecords.reduce(
    (sum, r) => sum + (r.overtime_minutes || 0),
    0
  );
  // 残業時間を分単位で表示（1時間未満でも表示）
  const overtimeHoursValue = totalOvertimeMinutes > 0 ? totalOvertimeMinutes / 60 : 0;
  const overtimeHours = overtimeHoursValue.toFixed(1);

  // デバッグ用：残業時間の詳細ログ
  console.log('残業時間計算デバッグ:', {
    thisMonthRecordsCount: thisMonthRecords.length,
    thisMonthRecords: thisMonthRecords.map((r) => ({
      id: r.id,
      work_date: r.work_date,
      overtime_minutes: r.overtime_minutes,
      actual_work_minutes: r.actual_work_minutes,
    })),
    totalOvertimeMinutes,
    overtimeHoursValue,
    overtimeHours,
  });

  const previousTotalOvertimeMinutes = previousMonthRecords.reduce(
    (sum, r) => sum + (r.overtime_minutes || 0),
    0
  );
  const previousOvertimeHours = Math.round((previousTotalOvertimeMinutes / 60) * 10) / 10;
  const overtimeChange = calculateChangeRate(overtimeHoursValue, previousOvertimeHours);

  // 勤務時間：attendancesテーブルから取得・算出
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

  const stats = [
    {
      title: '出勤日数',
      value: `${uniqueWorkDays}日`,
      change: workDaysChange,
      icon: <Calendar className="w-6 h-6" />,
    },
    {
      title: '残業時間',
      value: totalOvertimeMinutes > 0 ? `${totalOvertimeMinutes}分` : '0分',
      change: overtimeChange,
      icon: <Clock className="w-6 h-6" />,
    },
    {
      title: '申請中',
      value: `${pendingRequests.length}件`,
      change: 0, // 申請中は前月比較が困難なため0で固定
      icon: <FileText className="w-6 h-6" />,
    },
    {
      title: '勤務時間',
      value: `${workHours}時間`,
      change: workHoursChange,
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
  const handleClockIn = async () => {
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

    try {
      const timestamp = new Date().toISOString();
      console.log('打刻時刻:', timestamp);
      console.log('clockIn関数呼び出し開始');

      // user_profilesからwork_type_idを取得して渡す
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('current_work_type_id')
        .eq('id', user.id)
        .single();

      const workTypeId = userProfile?.current_work_type_id;
      console.log('取得したwork_type_id:', workTypeId);

      console.log('clockIn関数呼び出し直前');
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
            const today = new Date().toISOString().slice(0, 10);
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
    }
  };

  const handleClockOut = async () => {
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
    }
  };

  const handleStartBreak = async () => {
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
    }
  };

  const handleEndBreak = async () => {
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
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">今月の統計</h2>
        </div>
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

            {/* 出勤ボタン - 新しいセッションを開始できる場合のみ表示 */}
            {/* canStartNewSession: 出勤していない OR 退勤済み */}
            {canStartNewSession && (
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

            {/* 退勤・休憩ボタン - 現在勤務中の場合のみ表示 */}
            {/* isCurrentlyWorking: 出勤済み AND 退勤していない */}
            {isCurrentlyWorking && (
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

                {/* 退勤ボタン - 休憩中でも退勤可能 */}
                <Button
                  onClick={handleClockOut}
                  disabled={isLoading}
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
          onRefresh={() => fetchAttendanceData(user.id)}
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
                {latestSession?.in_time ? formatTime(latestSession.in_time) : '--:--'}
              </div>
            </div>

            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-sm text-red-600 font-medium">退勤時刻</div>
              <div className="text-lg font-bold text-red-900">
                {latestSession?.out_time ? formatTime(latestSession.out_time) : '--:--'}
              </div>
            </div>

            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-sm text-green-600 font-medium">勤務時間</div>
              <div className="text-lg font-bold text-green-900">
                {(() => {
                  // clock_recordsから総勤務時間を計算
                  const totalWorkMinutes = latestClockRecords.reduce((total, session) => {
                    if (session.in_time && session.out_time) {
                      const inTime = new Date(session.in_time);
                      const outTime = new Date(session.out_time);
                      const sessionMinutes = Math.floor(
                        (outTime.getTime() - inTime.getTime()) / 60000
                      );

                      // 休憩時間を差し引く
                      const breakMinutes =
                        session.breaks?.reduce((breakTotal, br) => {
                          if (br.break_start && br.break_end) {
                            const breakStart = new Date(br.break_start);
                            const breakEnd = new Date(br.break_end);
                            return (
                              breakTotal +
                              Math.floor((breakEnd.getTime() - breakStart.getTime()) / 60000)
                            );
                          }
                          return breakTotal;
                        }, 0) || 0;

                      return total + (sessionMinutes - breakMinutes);
                    }
                    return total;
                  }, 0);

                  if (totalWorkMinutes > 0) {
                    const hours = Math.floor(totalWorkMinutes / 60);
                    const minutes = totalWorkMinutes % 60;
                    return `${hours}:${minutes.toString().padStart(2, '0')}`;
                  }
                  return '--:--';
                })()}
              </div>
            </div>

            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-sm text-yellow-600 font-medium">残業時間</div>
              <div className="text-lg font-bold text-yellow-900">
                {(() => {
                  // データベースの残業時間を使用
                  const overtimeMinutes = latestRecord?.overtime_minutes || 0;

                  if (overtimeMinutes > 0) {
                    const hours = Math.floor(overtimeMinutes / 60);
                    const minutes = overtimeMinutes % 60;
                    return `${hours}:${minutes.toString().padStart(2, '0')}`;
                  }
                  return '--:--';
                })()}
              </div>
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
