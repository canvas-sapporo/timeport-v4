'use client';

import React, { useState, useEffect } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Attendance, BreakRecord } from '@/types/attendance';
import { formatDateTime, formatTime } from '@/lib/utils';

interface ClockHistoryProps {
  userId: string;
  todayAttendance: Attendance | null;
  attendanceRecords: Attendance[];
  onRefresh: () => void;
  onCsvExport?: () => void;
}

export default function ClockHistory({
  userId,
  todayAttendance,
  attendanceRecords,
  onRefresh,
  onCsvExport,
}: ClockHistoryProps) {
  const [activeTab, setActiveTab] = useState('today');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showDetails, setShowDetails] = useState(false);

  // 今日の打刻記録を時系列で整理
  const getTodayClockEvents = () => {
    const events: Array<{
      id: string;
      type: 'clock_in' | 'clock_out' | 'break_start' | 'break_end';
      time: string;
      icon: React.ReactNode;
      label: string;
      color: string;
    }> = [];

    if (todayAttendance?.clock_in_time) {
      events.push({
        id: 'clock-in',
        type: 'clock_in',
        time: todayAttendance.clock_in_time,
        icon: <LogIn className="w-4 h-4" />,
        label: '出勤',
        color: 'text-green-600',
      });
    }

    // 休憩記録を追加
    todayAttendance?.break_records?.forEach((breakRecord, index) => {
      if (breakRecord.start) {
        events.push({
          id: `break-start-${index}`,
          type: 'break_start',
          time: breakRecord.start,
          icon: <Coffee className="w-4 h-4" />,
          label: '休憩開始',
          color: 'text-orange-600',
        });
      }
      if (breakRecord.end) {
        events.push({
          id: `break-end-${index}`,
          type: 'break_end',
          time: breakRecord.end,
          icon: <Coffee className="w-4 h-4" />,
          label: '休憩終了',
          color: 'text-orange-600',
        });
      }
    });

    if (todayAttendance?.clock_out_time) {
      events.push({
        id: 'clock-out',
        type: 'clock_out',
        time: todayAttendance.clock_out_time,
        icon: <LogOut className="w-4 h-4" />,
        label: '退勤',
        color: 'text-red-600',
      });
    }

    return events.sort((a, b) => b.time.localeCompare(a.time));
  };

  // 過去の勤怠記録をフィルタリング
  const getFilteredRecords = () => {
    return attendanceRecords
      .filter((record) => record.work_date?.startsWith(selectedMonth))
      .sort((a, b) => (b.work_date || '').localeCompare(a.work_date || ''))
      .slice(0, 10); // 最新10件まで表示
  };

  // 勤務時間を計算
  const calculateWorkTime = (attendance: Attendance) => {
    if (!attendance.clock_in_time || !attendance.clock_out_time) {
      return { hours: 0, minutes: 0 };
    }

    const clockIn = new Date(`${attendance.work_date}T${attendance.clock_in_time}:00`);
    const clockOut = new Date(`${attendance.work_date}T${attendance.clock_out_time}:00`);
    const totalMinutes = Math.floor((clockOut.getTime() - clockIn.getTime()) / 60000);

    // 休憩時間を差し引く
    const breakMinutes =
      attendance.break_records?.reduce((total, br) => {
        if (br.start && br.end) {
          const breakStart = new Date(`${attendance.work_date}T${br.start}:00`);
          const breakEnd = new Date(`${attendance.work_date}T${br.end}:00`);
          return total + Math.floor((breakEnd.getTime() - breakStart.getTime()) / 60000);
        }
        return total;
      }, 0) || 0;

    const actualMinutes = totalMinutes - breakMinutes;
    const hours = Math.floor(actualMinutes / 60);
    const minutes = actualMinutes % 60;

    return { hours, minutes };
  };

  // 勤怠ステータスを取得
  const getAttendanceStatus = (attendance: Attendance) => {
    if (!attendance.clock_in_time)
      return { status: 'absent', label: '欠勤', color: 'bg-gray-100 text-gray-800' };
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
                      {todayAttendance.actual_work_minutes
                        ? `${Math.floor(todayAttendance.actual_work_minutes / 60)}:${(todayAttendance.actual_work_minutes % 60).toString().padStart(2, '0')}`
                        : '--:--'}
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-700">残業時間:</span>
                    <span className="ml-2">--:--</span>
                  </div>
                  <div>
                    <span className="text-blue-700">休憩回数:</span>
                    <span className="ml-2">
                      {todayAttendance.break_records?.filter((br) => br.start && br.end).length ||
                        0}
                      回
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-700">ステータス:</span>
                    <Badge className="ml-2" variant="outline">
                      {getAttendanceStatus(todayAttendance).label}
                    </Badge>
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
              <Button variant="outline" size="sm" onClick={onRefresh}>
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
                  const { hours, minutes } = calculateWorkTime(record);
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
                          <span className="ml-2">{formatTime(record.clock_in_time)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">退勤:</span>
                          <span className="ml-2">{formatTime(record.clock_out_time)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">勤務時間:</span>
                          <span className="ml-2">
                            {hours > 0 || minutes > 0
                              ? `${hours}:${minutes.toString().padStart(2, '0')}`
                              : '--:--'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">残業:</span>
                          <span className="ml-2">--:--</span>
                        </div>
                      </div>

                      {record.break_records && record.break_records.length > 0 && (
                        <div className="mt-2 pt-2 border-t">
                          <div className="text-sm text-gray-600 mb-1">休憩記録:</div>
                          <div className="space-y-1">
                            {record.break_records.map((br, index) => (
                              <div key={index} className="text-xs text-gray-500">
                                {br.start} - {br.end || '進行中'}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
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
