'use client';

import React, { memo } from 'react';
import StatsCard from '@/components/ui/stats-card';
import { Calendar, Clock, FileText } from 'lucide-react';

interface StatsPanelProps {
  uniqueWorkDays: number;
  workDaysChange: number;
  overtimeHours: string;
  overtimeChange: number;
  pendingRequestsCount: number;
}

function StatsPanelComponent({
  uniqueWorkDays,
  workDaysChange,
  overtimeHours,
  overtimeChange,
  pendingRequestsCount,
}: StatsPanelProps) {
  return (
    <div className="grid grid-cols-1 gap-4">
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
        value={`${pendingRequestsCount}件`}
        icon={<FileText className="w-6 h-6" />}
      />
    </div>
  );
}

const StatsPanel = memo(StatsPanelComponent);
export default StatsPanel;
