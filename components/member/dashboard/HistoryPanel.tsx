'use client';

import React, { memo } from 'react';
import ClockHistory from '@/components/member/dashboard/ClockHistory';
import type { AttendanceData } from '@/schemas/attendance';

interface HistoryPanelProps {
  todayAttendance: AttendanceData | null;
  attendanceRecords: AttendanceData[];
  onRefresh: () => void;
  onCsvExport: () => void;
}

function HistoryPanelComponent({
  todayAttendance,
  attendanceRecords,
  onRefresh,
  onCsvExport,
}: HistoryPanelProps) {
  return (
    <ClockHistory
      todayAttendance={todayAttendance}
      attendanceRecords={attendanceRecords}
      onRefreshAction={onRefresh}
      onCsvExport={onCsvExport}
    />
  );
}

const HistoryPanel = memo(HistoryPanelComponent);
export default HistoryPanel;
