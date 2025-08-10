'use client';

import React, { memo } from 'react';
import AttendanceFiltersComponent from '@/components/member/attendance/AttendanceFilters';
import type { AttendanceFilters } from '@/schemas/attendance';

interface AttendanceFiltersPanelProps {
  filters: AttendanceFilters;
  onFiltersChange: (f: AttendanceFilters) => void;
  workTypes: { id: string; name: string }[];
  selectedMonth: string;
  onMonthChange: (m: string) => void;
  isLoadingWorkTypes: boolean;
}

function AttendanceFiltersPanelComponent({
  filters,
  onFiltersChange,
  workTypes,
  selectedMonth,
  onMonthChange,
  isLoadingWorkTypes,
}: AttendanceFiltersPanelProps) {
  return (
    <AttendanceFiltersComponent
      filters={filters}
      onFiltersChangeAction={onFiltersChange}
      workTypes={workTypes}
      selectedMonth={selectedMonth}
      onMonthChangeAction={onMonthChange}
      isLoading={isLoadingWorkTypes}
    />
  );
}

const AttendanceFiltersPanel = memo(AttendanceFiltersPanelComponent);
export default AttendanceFiltersPanel;
