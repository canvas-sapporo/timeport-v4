'use client';

import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatTime } from '@/lib/utils';

interface BreakRecord {
  break_start?: string | null;
  break_end?: string | null;
}

interface ClockSession {
  in_time?: string | null;
  out_time?: string | null;
  breaks?: BreakRecord[];
}

interface TodayStatusPanelProps {
  latestClockRecords: ClockSession[];
  latestSession: ClockSession | null;
  overtimeMinutes: number;
}

function TodayStatusPanelComponent({
  latestClockRecords,
  latestSession,
  overtimeMinutes,
}: TodayStatusPanelProps) {
  const totalWorkMinutes = latestClockRecords.reduce((total, session) => {
    if (session.in_time && session.out_time) {
      const inTime = new Date(session.in_time);
      const outTime = new Date(session.out_time);
      const sessionMinutes = Math.floor((outTime.getTime() - inTime.getTime()) / 60000);

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

  const formattedWork =
    totalWorkMinutes > 0
      ? `${Math.floor(totalWorkMinutes / 60)}:${(totalWorkMinutes % 60)
          .toString()
          .padStart(2, '0')}`
      : '--:--';

  const formattedOvertime =
    overtimeMinutes > 0
      ? `${Math.floor(overtimeMinutes / 60)}:${(overtimeMinutes % 60).toString().padStart(2, '0')}`
      : '--:--';

  return (
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
            <div className="text-lg font-bold text-green-900">{formattedWork}</div>
          </div>

          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-sm text-yellow-600 font-medium">残業時間</div>
            <div className="text-lg font-bold text-yellow-900">{formattedOvertime}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const TodayStatusPanel = memo(TodayStatusPanelComponent);
export default TodayStatusPanel;
