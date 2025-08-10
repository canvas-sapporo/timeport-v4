'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function MonthlySummary({
  monthlyAttendanceCount,
  monthlyAttendanceMinutes,
  totalOvertimeHours,
  totalRequests,
}: {
  monthlyAttendanceCount: number;
  monthlyAttendanceMinutes: number;
  totalOvertimeHours: number;
  totalRequests: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>月次サマリー</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{monthlyAttendanceCount}</div>
            <div className="text-sm text-blue-600">総出勤回数</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {Math.round(monthlyAttendanceMinutes / 60)}h
            </div>
            <div className="text-sm text-green-600">総勤務時間</div>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{totalOvertimeHours}h</div>
            <div className="text-sm text-yellow-600">総残業時間</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{totalRequests}</div>
            <div className="text-sm text-purple-600">総申請数</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
