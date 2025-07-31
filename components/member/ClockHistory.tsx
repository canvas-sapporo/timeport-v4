'use client';

import React, { useState } from 'react';
import {
  Clock,
  Calendar,
  LogIn,
  LogOut,
  Coffee,
  ChevronDown,
  ChevronUp,
  Download,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AttendanceData, ClockType } from '@/schemas/attendance';
import { formatDateTime, formatTime } from '@/lib/utils';

interface ClockHistoryProps {
  todayAttendance: AttendanceData | null;
  attendanceRecords: AttendanceData[];
  onRefreshAction: () => void;
  onCsvExport?: () => void;
}

export default function ClockHistory({
  todayAttendance,
  attendanceRecords,
  onRefreshAction,
  onCsvExport,
}: ClockHistoryProps) {
  const [activeTab, setActiveTab] = useState('today');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showDetails, setShowDetails] = useState(false);

  // 今日の打刻記録を時系列で整理（clock_recordsベース）
  const getTodayClockEvents = () => {
    const events: Array<{
      id: string;
      type: ClockType;
      time: string;
      icon: React.ReactNode;
      label: string;
      color: string;
    }> = [];

    // clock_recordsから全ての打刻イベントを取得
    const clockRecords = todayAttendance?.clock_records || [];

    clockRecords.forEach((session, sessionIndex) => {
      // 出勤
      if (session.in_time) {
        events.push({
          id: `clock-in-${sessionIndex}`,
          type: 'clock_in',
          time: session.in_time,
          icon: <LogIn className="w-4 h-4" />,
          label: '出勤',
          color: 'text-green-600',
        });
      }

      // 休憩記録
      session.breaks?.forEach((breakRecord, breakIndex) => {
        if (breakRecord.break_start) {
          events.push({
            id: `break-start-${sessionIndex}-${breakIndex}`,
            type: 'break_start',
            time: breakRecord.break_start,
            icon: <Coffee className="w-4 h-4" />,
            label: '休憩開始',
            color: 'text-orange-600',
          });
        }
        if (breakRecord.break_end) {
          events.push({
            id: `break-end-${sessionIndex}-${breakIndex}`,
            type: 'break_end',
            time: breakRecord.break_end,
            icon: <Coffee className="w-4 h-4" />,
            label: '休憩終了',
            color: 'text-orange-600',
          });
        }
      });

      // 退勤
      if (session.out_time) {
        events.push({
          id: `clock-out-${sessionIndex}`,
          type: 'clock_out',
          time: session.out_time,
          icon: <LogOut className="w-4 h-4" />,
          label: '退勤',
          color: 'text-red-600',
        });
      }
    });

    return events.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  };

  // 過去の勤怠記録をフィルタリング
  const getFilteredRecords = () => {
    return attendanceRecords
      .filter((record) => record.work_date?.startsWith(selectedMonth))
      .sort((a, b) => (b.work_date || '').localeCompare(a.work_date || ''))
      .slice(0, 10); // 最新10件まで表示
  };

  // 勤務時間を計算（clock_recordsベース）
  const calculateWorkTime = (attendance: AttendanceData) => {
    const clockRecords = attendance.clock_records || [];

    // 全てのセッションの勤務時間を合計
    const totalWorkMinutes = clockRecords.reduce((total, session) => {
      if (session.in_time && session.out_time) {
        const inTime = new Date(session.in_time);
        const outTime = new Date(session.out_time);
        const sessionMinutes = Math.floor((outTime.getTime() - inTime.getTime()) / 60000);

        // 休憩時間を差し引く
        const breakMinutes =
          session.breaks?.reduce((breakTotal, br) => {
            if (br.break_start && br.break_end) {
              const breakStart = new Date(br.break_start);
              const breakEnd = new Date(br.break_end);
              return breakTotal + Math.floor((breakEnd.getTime() - breakStart.getTime()) / 60000);
            }
            return breakTotal;
          }, 0) || 0;

        return total + (sessionMinutes - breakMinutes);
      }
      return total;
    }, 0);

    const hours = Math.floor(totalWorkMinutes / 60);
    const minutes = totalWorkMinutes % 60;

    return { hours, minutes };
  };

  // 勤怠ステータスを取得（clock_recordsベース）
  const getAttendanceStatus = (attendance: AttendanceData) => {
    const clockRecords = attendance.clock_records || [];
    const hasAnySession = clockRecords.length > 0;
    const hasCompletedSession = clockRecords.some((session) => session.in_time && session.out_time);

    if (!hasAnySession) {
      return { status: 'absent', label: '欠勤', color: 'bg-gray-100 text-gray-800' };
    }
    if (!hasCompletedSession) {
      return { status: 'in_progress', label: '勤務中', color: 'bg-blue-100 text-blue-800' };
    }
    return { status: 'normal', label: '正常', color: 'bg-green-100 text-green-800' };
  };

  const todayEvents = getTodayClockEvents();
  const filteredRecords = getFilteredRecords();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span>打刻履歴</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowDetails(!showDetails)}>
            {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="today">今日</TabsTrigger>
            <TabsTrigger value="history">過去履歴</TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="space-y-4">
            {todayEvents.length > 0 ? (
              <div className="space-y-3">
                {todayEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className={`p-2 rounded-full bg-white ${event.color}`}>{event.icon}</div>
                    <div className="flex-1">
                      <div className="font-medium">{event.label}</div>
                      <div className="text-sm text-gray-600">{formatDateTime(event.time)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>今日の打刻記録はありません</p>
              </div>
            )}

            {showDetails && todayAttendance && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-3">詳細情報</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700">勤務時間:</span>
                    <span className="ml-2">
                      {(() => {
                        const { hours, minutes } = calculateWorkTime(todayAttendance);
                        return hours > 0 || minutes > 0
                          ? `${hours}:${minutes.toString().padStart(2, '0')}`
                          : '--:--';
                      })()}
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-700">残業時間:</span>
                    <span className="ml-2">
                      {(() => {
                        const { hours, minutes } = calculateWorkTime(todayAttendance);
                        const totalMinutes = hours * 60 + minutes;
                        const overtimeThreshold = 480; // 8時間
                        const overtimeMinutes = Math.max(0, totalMinutes - overtimeThreshold);

                        if (overtimeMinutes > 0) {
                          const overtimeHours = Math.floor(overtimeMinutes / 60);
                          const overtimeMins = overtimeMinutes % 60;
                          return `${overtimeHours}:${overtimeMins.toString().padStart(2, '0')}`;
                        }
                        return '--:--';
                      })()}
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-700">休憩回数:</span>
                    <span className="ml-2">
                      {(() => {
                        const clockRecords = todayAttendance.clock_records || [];
                        const totalBreaks = clockRecords.reduce((total, session) => {
                          return total + (session.breaks?.length || 0);
                        }, 0);
                        return `${totalBreaks}回`;
                      })()}
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-700">セッション数:</span>
                    <span className="ml-2">{todayAttendance.clock_records?.length || 0}回</span>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <Label htmlFor="month-select">期間</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => {
                      const date = new Date();
                      date.setMonth(date.getMonth() - i);
                      const value = date.toISOString().slice(0, 7);
                      const label = date.toLocaleDateString('ja-JP', {
                        year: 'numeric',
                        month: 'long',
                      });
                      return (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="sm" onClick={onRefreshAction}>
                更新
              </Button>
              {onCsvExport && (
                <Button variant="outline" size="sm" onClick={onCsvExport}>
                  <Download className="w-4 h-4 mr-2" />
                  CSV出力
                </Button>
              )}
            </div>

            {filteredRecords.length > 0 ? (
              <div className="space-y-3">
                {filteredRecords.map((record) => {
                  const status = getAttendanceStatus(record);

                  return (
                    <div
                      key={record.id}
                      className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span className="font-medium">
                            {new Date(record.work_date).toLocaleDateString('ja-JP', {
                              month: 'long',
                              day: 'numeric',
                              weekday: 'short',
                            })}
                          </span>
                        </div>
                        <Badge className={status.color}>{status.label}</Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">出勤:</span>
                          <span className="ml-2">
                            {(() => {
                              const clockRecords = record.clock_records || [];
                              const firstSession = clockRecords[0];
                              return firstSession?.in_time
                                ? formatTime(firstSession.in_time)
                                : '--:--';
                            })()}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">退勤:</span>
                          <span className="ml-2">
                            {(() => {
                              const clockRecords = record.clock_records || [];
                              const lastSession = clockRecords[clockRecords.length - 1];
                              return lastSession?.out_time
                                ? formatTime(lastSession.out_time)
                                : '--:--';
                            })()}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">勤務時間:</span>
                          <span className="ml-2">
                            {(() => {
                              const { hours, minutes } = calculateWorkTime(record);
                              return hours > 0 || minutes > 0
                                ? `${hours}:${minutes.toString().padStart(2, '0')}`
                                : '--:--';
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>選択した期間の記録はありません</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
