'use client';

import React, { memo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';
import type { AttendanceData, AttendanceFilters, AttendanceStatusData } from '@/schemas/attendance';
import { Badge } from '@/components/ui/badge';

interface VisibleColumns {
  date: boolean;
  clockIn: boolean;
  clockOut: boolean;
  workTime: boolean;
  overtime: boolean;
  status: boolean;
  break: boolean;
  workType: boolean;
  late: boolean;
  earlyLeave: boolean;
  approval: boolean;
  approver: boolean;
  updatedAt: boolean;
}

interface AttendanceTableProps {
  records: AttendanceData[];
  visibleColumns: VisibleColumns;
  onClickBreakDetails: (record: AttendanceData) => void;
}

function formatTime(time?: string) {
  if (!time) return '--:--';
  try {
    const date = new Date(time);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch {
    return '--:--';
  }
}

function formatMinutes(minutes?: number) {
  if (minutes === undefined || minutes === null || minutes === 0) {
    return '--:--';
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}:${mins.toString().padStart(2, '0')}`;
}

function getStatusBadge(status: AttendanceStatusData | string, isWeekend: boolean) {
  const statusString = typeof status === 'string' ? status : status.name;
  if (isWeekend && statusString === 'absent') {
    return <Badge variant="outline">休日</Badge>;
  }
  switch (statusString) {
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
}

function getAttendanceStatus(record?: AttendanceData): AttendanceStatusData | string {
  if (!record || !record.clock_records || record.clock_records.length === 0) return 'absent';
  const latestSession = record.clock_records[record.clock_records.length - 1];
  if (!latestSession.in_time) return 'absent';
  return 'normal';
}

function getClockInTime(record?: AttendanceData): string | undefined {
  if (!record?.clock_records || record.clock_records.length === 0) return undefined;
  const latestSession = record.clock_records[record.clock_records.length - 1];
  return latestSession.in_time;
}

function getClockOutTime(record?: AttendanceData): string | undefined {
  if (!record?.clock_records || record.clock_records.length === 0) return undefined;
  const latestSession = record.clock_records[record.clock_records.length - 1];
  return latestSession.out_time;
}

function formatDateWithWeekday(date: string, weekday: string, weekdayColor: string) {
  try {
    const dateObj = new Date(date);
    const year = dateObj.getFullYear();
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const day = dateObj.getDate().toString().padStart(2, '0');
    return (
      <span className="font-medium whitespace-nowrap">
        {year}/{month}/{day} <span className={`text-sm ml-1 ${weekdayColor}`}>({weekday})</span>
      </span>
    );
  } catch {
    return '-';
  }
}

function AttendanceTableComponent({
  records,
  visibleColumns,
  onClickBreakDetails,
}: AttendanceTableProps) {
  return (
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
            {visibleColumns.workType && <TableHead className="w-[100px]">勤務形態</TableHead>}
            {visibleColumns.late && <TableHead className="w-[80px]">遅刻</TableHead>}
            {visibleColumns.earlyLeave && <TableHead className="w-[80px]">早退</TableHead>}
            {visibleColumns.status && <TableHead className="w-[100px]">ステータス</TableHead>}
            {visibleColumns.approval && <TableHead className="w-[80px]">承認</TableHead>}
            {visibleColumns.approver && <TableHead className="w-[100px]">承認者</TableHead>}
            {visibleColumns.updatedAt && <TableHead className="w-[120px]">編集日時</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record) => {
            const date = new Date(record.work_date);
            const weekday = date.toLocaleDateString('ja-JP', { weekday: 'short' });
            const dayOfWeek = date.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const weekdayColor = isWeekend ? 'text-red-600' : 'text-gray-600';

            return (
              <TableRow key={record.id} className="hover:bg-gray-50">
                {visibleColumns.date && (
                  <TableCell>
                    {formatDateWithWeekday(record.work_date!, weekday, weekdayColor)}
                  </TableCell>
                )}
                {visibleColumns.clockIn && (
                  <TableCell className="text-sm">{formatTime(getClockInTime(record))}</TableCell>
                )}
                {visibleColumns.clockOut && (
                  <TableCell className="text-sm">{formatTime(getClockOutTime(record))}</TableCell>
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
                      <span className="text-xs">{formatMinutes(record.total_break_minutes)}</span>
                      {record.break_count && record.break_count > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onClickBreakDetails(record);
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
                    <div className="flex items-center space-x-1">
                      <span>{record.work_type_name || '-'}</span>
                    </div>
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
                  <TableCell>{getStatusBadge(getAttendanceStatus(record), isWeekend)}</TableCell>
                )}
                {visibleColumns.approval && (
                  <TableCell>{/* 省略: 承認バッジは一覧画面では不要 */}</TableCell>
                )}
                {visibleColumns.approver && (
                  <TableCell className="text-sm whitespace-nowrap">
                    {record.approver_name || '-'}
                  </TableCell>
                )}
                {visibleColumns.updatedAt && (
                  <TableCell>
                    {record.updated_at ? new Date(record.updated_at).toLocaleString('ja-JP') : '-'}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

const AttendanceTable = memo(AttendanceTableComponent);
export default AttendanceTable;
