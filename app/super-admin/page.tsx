'use client';

import { useAuth } from '@/contexts/auth-context';
import { useData } from '@/contexts/data-context';
import StatsCard from '@/components/ui/stats-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Building, Users, Settings, BarChart3, AlertCircle, CheckCircle } from 'lucide-react';

export default function SuperAdminDashboard() {
  const { user } = useAuth();
  const { users, workplaces, departments, requests } = useData();

  if (!user || user.role !== 'super_admin') {
    return <div>アクセス権限がありません</div>;
  }

  const totalUsers = users.filter(u => u.isActive).length;
  const totalWorkplaces = workplaces.length;
  const totalDepartments = departments.length;
  const pendingRequests = requests.filter(r => r.status === 'pending').length;

  const stats = [
    {
      title: '総ユーザー数',
      value: totalUsers,
      change: 5,
      icon: <Users className="w-6 h-6" />
    },
    {
      title: '勤務地数',
      value: totalWorkplaces,
      change: 0,
      icon: <Building className="w-6 h-6" />
    },
    {
      title: '部署数',
      value: totalDepartments,
      change: 1,
      icon: <BarChart3 className="w-6 h-6" />
    },
    {
      title: '未処理申請',
      value: pendingRequests,
      change: -2,
      icon: <Settings className="w-6 h-6" />
    }
  ];

  const roleDistribution = [
    { role: 'super_admin', count: users.filter(u => u.role === 'super_admin').length, label: 'スーパー管理者' },
    { role: 'admin', count: users.filter(u => u.role === 'admin').length, label: '管理者' },
    { role: 'member', count: users.filter(u => u.role === 'member').length, label: 'メンバー' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">スーパー管理者ダッシュボード</h1>
        <p className="text-gray-600">システム全体の管理と監視を行います</p>
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
        {/* Role Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>ロール別ユーザー数</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {roleDistribution.map((item) => (
                <div key={item.role} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      item.role === 'super_admin' ? 'bg-purple-500' :
                      item.role === 'admin' ? 'bg-blue-500' : 'bg-green-500'
                    }`} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  <Badge variant="outline">{item.count}名</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="w-5 h-5" />
              <span>システム状態</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <div className="font-medium text-sm text-green-800">システム正常稼働中</div>
                  <div className="text-xs text-green-700">全サービスが正常に動作しています</div>
                </div>
              </div>
              
              {pendingRequests > 0 && (
                <div className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  <div>
                    <div className="font-medium text-sm text-yellow-800">未処理申請あり</div>
                    <div className="text-xs text-yellow-700">{pendingRequests}件の申請が処理待ちです</div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Organization Overview */}
      <Card>
        <CardHeader>
          <CardTitle>組織概要</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>勤務地</TableHead>
                <TableHead>部署数</TableHead>
                <TableHead>従業員数</TableHead>
                <TableHead>ステータス</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workplaces.map((workplace) => {
                const workplaceDepartments = departments.filter(d => d.workplaceId === workplace.id);
                const workplaceUsers = workplaceDepartments.reduce((total, dept) => 
                  total + users.filter(u => u.departmentId === dept.id && u.isActive).length, 0
                );
                
                return (
                  <TableRow key={workplace.id}>
                    <TableCell className="font-medium">{workplace.name}</TableCell>
                    <TableCell>{workplaceDepartments.length}</TableCell>
                    <TableCell>{workplaceUsers}</TableCell>
                    <TableCell>
                      <Badge variant="default">アクティブ</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}