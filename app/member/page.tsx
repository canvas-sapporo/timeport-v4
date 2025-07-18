"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useData } from "@/contexts/data-context";
import StatsCard from "@/components/ui/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import TimeDisplay from "@/components/ui/time-display";
import {
  Clock,
  Calendar,
  FileText,
  TrendingUp,
  Plus,
  LogIn,
  LogOut,
  Coffee,
} from "lucide-react";
import Link from "next/link";
import type { BreakRecord } from "@/types/attendance";

export default function MemberDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const {
    getUserAttendance,
    getTodayAttendance,
    requests,
    notifications,
    clockIn,
    clockOut,
    startBreak,
    endBreak,
  } = useData();

  useEffect(() => {
    if (!user || user.role !== "member") {
      router.push("/login");
      return;
    }
  }, [user, router]);

  if (!user || user.role !== "member") {
    return null;
  }

  const attendanceRecords = getUserAttendance(user.id);
  const todayAttendance = getTodayAttendance(user.id);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const thisMonthRecords = attendanceRecords.filter((r) =>
    r.work_date?.startsWith(thisMonth),
  );

  const workDays = thisMonthRecords.length;
  const totalOvertimeMinutes = thisMonthRecords.reduce(
    (sum, r) => sum + (r.overtime_minutes || 0),
    0,
  );
  const overtimeHours = Math.round((totalOvertimeMinutes / 60) * 10) / 10;

  const userRequests = requests.filter((a) => a.user_id === user.id);
  const pendingRequests = userRequests.filter((a) => a.status === "pending");
  const userNotifications = notifications.filter(
    (n) => n.user_id === user.id && !n.is_read,
  );

  const stats = [
    {
      title: "出勤日数",
      value: `${workDays}日`,
      change: 2,
      icon: <Calendar className="w-6 h-6" />,
    },
    {
      title: "残業時間",
      value: `${overtimeHours}時間`,
      change: -1.5,
      icon: <Clock className="w-6 h-6" />,
    },
    {
      title: "申請中",
      value: `${pendingRequests.length}件`,
      change: 1,
      icon: <FileText className="w-6 h-6" />,
    },
    {
      title: "勤務時間",
      value: `${workDays * 8}時間`,
      change: 5.2,
      icon: <TrendingUp className="w-6 h-6" />,
    },
  ];

  const currentTime = new Date().toTimeString().slice(0, 5);
  const isOnBreak = todayAttendance?.break_records.some(
    (br: BreakRecord) => br.start && !br.end,
  );
  const hasClockIn = todayAttendance?.clock_in_time;
  const hasClockOut = todayAttendance?.clock_out_time;

  const handleClockIn = () => {
    clockIn(user.id, currentTime);
  };

  const handleClockOut = () => {
    clockOut(user.id, currentTime);
  };

  const handleStartBreak = () => {
    startBreak(user.id, currentTime);
  };

  const handleEndBreak = () => {
    endBreak(user.id, currentTime);
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
            {new Date().toLocaleDateString("ja-JP", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
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

            {!hasClockIn && (
              <Button
                onClick={handleClockIn}
                className="w-full h-12 bg-green-600 hover:bg-green-700"
              >
                <LogIn className="w-5 h-5 mr-2" />
                出勤
              </Button>
            )}

            {hasClockIn && !hasClockOut && (
              <>
                {!isOnBreak ? (
                  <Button
                    onClick={handleStartBreak}
                    variant="outline"
                    className="w-full h-12"
                  >
                    <Coffee className="w-5 h-5 mr-2" />
                    休憩開始
                  </Button>
                ) : (
                  <Button
                    onClick={handleEndBreak}
                    variant="outline"
                    className="w-full h-12"
                  >
                    <Coffee className="w-5 h-5 mr-2" />
                    休憩終了
                  </Button>
                )}

                <Button
                  onClick={handleClockOut}
                  disabled={isOnBreak}
                  className="w-full h-12 bg-red-600 hover:bg-red-700"
                >
                  <LogOut className="w-5 h-5 mr-2" />
                  退勤
                </Button>
              </>
            )}

            {hasClockOut && (
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-600">本日の勤務は終了しました</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Plus className="w-5 h-5" />
              <span>クイックアクション</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/member/attendance">
              <Button className="w-full justify-start" variant="outline">
                <Clock className="w-4 h-4 mr-2" />
                勤怠履歴
              </Button>
            </Link>
            <Link href="/member/requests">
              <Button className="w-full justify-start" variant="outline">
                <FileText className="w-4 h-4 mr-2" />
                申請作成
              </Button>
            </Link>
            <Link href="/member/profile">
              <Button className="w-full justify-start" variant="outline">
                <Calendar className="w-4 h-4 mr-2" />
                プロフィール
              </Button>
            </Link>
          </CardContent>
        </Card>
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
                {todayAttendance?.clock_in_time || "--:--"}
              </div>
            </div>

            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-sm text-red-600 font-medium">退勤時刻</div>
              <div className="text-lg font-bold text-red-900">
                {todayAttendance?.clock_out_time || "--:--"}
              </div>
            </div>

            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-sm text-green-600 font-medium">勤務時間</div>
              <div className="text-lg font-bold text-green-900">
                {todayAttendance?.actual_work_minutes
                  ? `${Math.floor(todayAttendance.actual_work_minutes / 60)}:${(todayAttendance.actual_work_minutes % 60).toString().padStart(2, "0")}`
                  : "--:--"}
              </div>
            </div>

            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-sm text-yellow-600 font-medium">
                残業時間
              </div>
              <div className="text-lg font-bold text-yellow-900">
                {todayAttendance?.overtime_minutes
                  ? `${Math.floor(todayAttendance.overtime_minutes / 60)}:${(todayAttendance.overtime_minutes % 60).toString().padStart(2, "0")}`
                  : "--:--"}
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
                <div
                  key={notification.id}
                  className="p-3 bg-blue-50 rounded-lg"
                >
                  <div className="font-medium text-sm text-blue-900">
                    {notification.title}
                  </div>
                  <div className="text-xs text-blue-700 mt-1">
                    {notification.message}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
