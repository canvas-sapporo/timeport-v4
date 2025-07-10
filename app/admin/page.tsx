'use client';

import { useAuth } from '@/contexts/auth-context';
import { useData } from '@/contexts/data-context';
import StatsCard from '@/components/ui/stats-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Users, Clock, FileText, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';

export default function AdminDashboard() {
  const { user } = useAuth();
  const { users, requests, attendanceRecords, notifications } = useData();

  if (!user || user.role !== 'admin') {
    return <div>アクセス権限がありません</div>;
  }

  const activeUsers = users.filter(u => u.isActive).length;
  const pendingRequests = requests.filter(a => a.status === 'pending').length;
  const todayAttendance = attendanceRecords.filter(r => r.workDate === new Date().toISOString().split('T')[0]).length;
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthlyAttendance = attendanceRecords.filter(r => r.workDate.startsWith(thisMonth));
  const totalOvertimeHours = Math.round(monthlyAttendance.reduce((sum, r) => sum + r.overtimeMinutes, 0) / 60 * 10) / 10;

  const stats = [
    {
      title: '総ユーザー数',
      value: activeUsers,
      change: 2,
      icon: <Users className="w-6 h-6" />
    },
    {
      title: '未承認申請',
      value: pendingRequests,
      change: -1,
      icon: <FileText className="w-6 h-6" />
    },
    {
      title: '今日の出勤',
      value: todayAttendance,
      change: 0,
      icon: <Clock className="w-6 h-6" />
    },
    {
      title: '今月残業時間',
      value: `${totalOvertimeHours}h`,
      change: -5.2,
      icon: <TrendingUp className="w-6 h-6" />
    }
  ];

  const recentRequests = requests.slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">管理者ダッシュボード</h1>
        <p className="text-gray-600">全社の勤怠状況を確認できます</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatsCard
            key={index}
            title={stat.title}
            value={stat.value}
            change={stat.change}
            icon={stat.icon}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Requests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>最近の申請</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>申請者</TableHead>
                  <TableHead>種別</TableHead>
                  <TableHead>ステータス</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentRequests.map((request) => {
                  const requestant = users.find(u => u.id === request.user_id);
                  return (
                    <TableRow key={request.id}>
                      <TableCell>{requestant?.name}</TableCell>
                      <TableCell>{request.title}</TableCell>
                      <TableCell>
                        {request.status === 'pending' && <Badge variant="secondary">承認待ち</Badge>}
                        {request.status === 'approved' && <Badge variant="default">承認済み</Badge>}
                        {request.status === 'rejected' && <Badge variant="destructive">却下</Badge>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* System Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5" />
              <span>システムアラート</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <div>
                  <div className="font-medium text-sm text-yellow-800">承認待ち申請があります</div>
                  <div className="text-xs text-yellow-700">{pendingRequests}件の申請が承認待ちです</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <div className="font-medium text-sm text-green-800">システム正常動作中</div>
                  <div className="text-xs text-green-700">すべてのシステムが正常に動作しています</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Summary */}
      <Card>
        <CardHeader>
          <CardTitle>月次サマリー</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{monthlyAttendance.length}</div>
              <div className="text-sm text-blue-600">総出勤回数</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {Math.round(monthlyAttendance.reduce((sum, r) => sum + (r.actual_work_minutes || 0), 0) / 60)}h
              </div>
              <div className="text-sm text-green-600">総勤務時間</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{totalOvertimeHours}h</div>
              <div className="text-sm text-yellow-600">総残業時間</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{requests.length}</div>
              <div className="text-sm text-purple-600">総申請数</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}