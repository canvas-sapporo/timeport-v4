'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useData } from '@/contexts/data-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Clock, Calendar, Download, Filter, Edit, Eye, Plus } from 'lucide-react';

export default function AdminAttendancePage() {
  const { user } = useAuth();
  const { attendanceRecords, users, departments, workplaces } = useData();
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedUser, setSelectedUser] = useState('all');

  if (!user || user.role !== 'admin') {
    return <div>アクセス権限がありません</div>;
  }

  // Filter attendance records
  const filteredRecords = attendanceRecords.filter(record => {
    const matchesMonth = record.workDate.startsWith(selectedMonth);
    const recordUser = users.find(u => u.id === record.userId);
    const matchesDepartment = selectedDepartment === 'all' || recordUser?.departmentId === selectedDepartment;
    const matchesUser = selectedUser === 'all' || record.userId === selectedUser;
    
    return matchesMonth && matchesDepartment && matchesUser;
  }).sort((a, b) => b.workDate.localeCompare(a.workDate));

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

  // Calculate summary statistics
  const totalRecords = filteredRecords.length;
  const lateRecords = filteredRecords.filter(r => r.status === 'late').length;
  const totalOvertimeMinutes = filteredRecords.reduce((sum, r) => sum + r.overtimeMinutes, 0);
  const avgOvertimeHours = totalRecords > 0 ? Math.round(totalOvertimeMinutes / totalRecords / 60 * 10) / 10 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">勤怠管理</h1>
          <p className="text-gray-600">全社員の勤怠記録を管理できます</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            CSV出力
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                勤怠記録作成
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>勤怠記録作成</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="employee">社員</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="社員を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.filter(u => u.role === 'user').map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} ({user.employeeId})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="workDate">勤務日</Label>
                  <Input id="workDate" type="date" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="clockIn">出勤時刻</Label>
                    <Input id="clockIn" type="time" />
                  </div>
                  <div>
                    <Label htmlFor="clockOut">退勤時刻</Label>
                    <Input id="clockOut" type="time" />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline">キャンセル</Button>
                  <Button>作成</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">総勤怠記録</p>
                <p className="text-2xl font-bold text-gray-900">{totalRecords}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">遅刻件数</p>
                <p className="text-2xl font-bold text-gray-900">{lateRecords}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">平均残業時間</p>
                <p className="text-2xl font-bold text-gray-900">{avgOvertimeHours}h</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">出勤率</p>
                <p className="text-2xl font-bold text-gray-900">
                  {totalRecords > 0 ? Math.round((totalRecords - filteredRecords.filter(r => r.status === 'absent').length) / totalRecords * 100) : 0}%
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="w-5 h-5" />
            <span>フィルター</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="month">対象月</Label>
              <Input
                id="month"
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="department">部署</Label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="部署を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部署</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="user">社員</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="社員を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全社員</SelectItem>
                  {users.filter(u => u.role === 'user').map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.employeeId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Records Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span>勤怠記録一覧</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>社員</TableHead>
                <TableHead>日付</TableHead>
                <TableHead>出勤時刻</TableHead>
                <TableHead>退勤時刻</TableHead>
                <TableHead>勤務時間</TableHead>
                <TableHead>残業時間</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.map((record) => {
                const recordUser = users.find(u => u.id === record.userId);
                return (
                  <TableRow key={record.id}>
                    <TableCell>
                      <div className="font-medium">{recordUser?.name}</div>
                      <div className="text-sm text-gray-500">{recordUser?.employeeId}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {new Date(record.workDate).toLocaleDateString('ja-JP')}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(record.workDate).toLocaleDateString('ja-JP', { weekday: 'short' })}
                      </div>
                    </TableCell>
                    <TableCell>{formatTime(record.clockInTime)}</TableCell>
                    <TableCell>{formatTime(record.clockOutTime)}</TableCell>
                    <TableCell>{formatMinutes(record.actualWorkMinutes)}</TableCell>
                    <TableCell>{formatMinutes(record.overtimeMinutes)}</TableCell>
                    <TableCell>{getStatusBadge(record.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          
          {filteredRecords.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">条件に一致する勤怠記録がありません</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}