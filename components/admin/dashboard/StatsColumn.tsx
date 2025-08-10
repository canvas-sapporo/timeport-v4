'use client';

import { useMemo } from 'react';
import StatsCard from '@/components/ui/stats-card';
import { Clock, TrendingUp } from 'lucide-react';

export default function StatsColumn({
  activeUsers,
  todayAttendance,
  totalOvertimeHours,
}: {
  activeUsers: number;
  todayAttendance: number;
  totalOvertimeHours: number;
}) {
  const stats = useMemo(
    () => [
      {
        title: '今日の出勤率',
        value: `${todayAttendance}/${activeUsers}`,
        change: 0,
        icon: <Clock className="w-6 h-6" />,
      },
      {
        title: '今月残業時間',
        value: `${totalOvertimeHours}h`,
        change: -5.2,
        icon: <TrendingUp className="w-6 h-6" />,
      },
    ],
    [todayAttendance, activeUsers, totalOvertimeHours]
  );

  return (
    <div className="flex flex-col h-full space-y-6">
      {stats.map((stat, index) => (
        <div key={index} className="flex-1">
          <StatsCard title={stat.title} value={stat.value} change={stat.change} icon={stat.icon} />
        </div>
      ))}
    </div>
  );
}
