'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useData } from '@/contexts/data-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar, Download, Filter } from 'lucide-react';

export default function MemberAttendancePage() {
  const { user } = useAuth();
  const router = useRouter();
  const { getUserAttendance } = useData();
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    if (!user || user.role !== 'member') {
      router.push('/login');
      return;
    }
  }, [user, router]);

  if (!user || user.role !== 'member') {
    return null;
  }

  const attendanceRecords = getUserAttendance(user.id);
  const filteredRecords = attendanceRecords.filter(record => 
    record.workDate?.startsWith(selectedMonth)
  ).sort((a, b) => (b.workDate || '').localeCompare(a.workDate || ''));

  const getStatusBadge = (status: string) => {
    switch (status) {
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
  };

  const formatTime = (time?: string) => {
    return time || '--:--';
  };

  const formatMinutes = (minutes?: number) => {
    if (!minutes) return '--:--';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">勤怠履歴</h1>
          <p className="text-gray-600">過去の勤怠記録を確認できます</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            CSV出力
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>勤怠記録</span>
          </CardTitle>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-40"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>日付</TableHead>
                <TableHead>出勤時刻</TableHead>
                <TableHead>退勤時刻</TableHead>
                <TableHead>勤務時間</TableHead>
                <TableHead>残業時間</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>備考</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>
                    <div className="font-medium">
                      {record.workDate ? new Date(record.workDate).toLocaleDateString('ja-JP') : '-'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {record.workDate ? new Date(record.workDate).toLocaleDateString('ja-JP', { weekday: 'short' }) : '-'}
                    </div>
                  </TableCell>
                  <TableCell>{formatTime(record.clockInTime)}</TableCell>
                  <TableCell>{formatTime(record.clockOutTime)}</TableCell>
                  <TableCell>{formatMinutes(record.actualWorkMinutes)}</TableCell>
                  <TableCell>{formatMinutes(record.overtimeMinutes)}</TableCell>
                  <TableCell>{getStatusBadge(record.status)}</TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-500">
                      {record.notes || '-'}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredRecords.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">選択した月の勤怠記録がありません</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}