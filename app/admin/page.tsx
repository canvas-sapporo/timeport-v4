'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Clock, FileText, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';

import { useAuth } from '@/contexts/auth-context';
import { useData } from '@/contexts/data-context';
import { getJSTDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { getWorkTypes } from '@/lib/actions/admin/work-types';
import { generateWorkHoursGraphData, generateWorkHoursWithChatData } from '@/lib/mock';
import StatsCard from '@/components/ui/stats-card';
import WorkHoursChart from '@/components/ui/work-hours-chart';
import WorkHoursChartSimple from '@/components/ui/work-hours-chart-simple';
import WorkHoursChatChart from '@/components/ui/work-hours-chat-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const { users, requests, attendanceRecords } = useData();
  const { toast } = useToast();
  const [hasCheckedWorkTypes, setHasCheckedWorkTypes] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('1month');
  const [showSimpleChart, setShowSimpleChart] = useState(false);
  const [showChatChart, setShowChatChart] = useState(false);

  async function checkWorkTypes() {
    if (!user?.company_id) return;
    try {
      const result = await getWorkTypes(user.company_id, { page: 1, limit: 1 });
      if (result.success && result.data.work_types.length === 0) {
        toast({
          title: '勤務形態が未設定です',
          description: '勤務形態を設定してください。設定画面から勤務形態を追加できます。',
          variant: 'destructive',
        });
      }
      setHasCheckedWorkTypes(true);
    } catch (error) {
      console.error('勤務形態確認エラー:', error);
      setHasCheckedWorkTypes(true);
    }
  }

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/login');
      return;
    }

    // 勤務形態の確認（一度だけ実行）
    if (user?.company_id && !hasCheckedWorkTypes) {
      checkWorkTypes();
    }
  }, [user, router, hasCheckedWorkTypes, toast, checkWorkTypes]);

  if (!user || user.role !== 'admin') {
    return null;
  }

  const activeUsers = users.filter((u) => u.is_active).length;
  const pendingRequests = requests.filter((a) => a.status_id === 'pending').length;
  const todayAttendance = attendanceRecords.filter((r) => r.work_date === getJSTDate()).length;
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthlyAttendance = attendanceRecords.filter((r) => r.work_date.startsWith(thisMonth));
  const totalOvertimeHours =
    Math.round((monthlyAttendance.reduce((sum, r) => sum + r.overtime_minutes, 0) / 60) * 10) / 10;

  const stats = [
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
  ];

  const recentRequests = requests.slice(0, 5);

  // データ生成を確実にするためにuseEffectを使用
  const [graphData, setGraphData] = useState<any[]>([]);
  const [chatGraphData, setChatGraphData] = useState<any[]>([]);

  useEffect(() => {
    const data = generateWorkHoursGraphData(selectedPeriod);
    setGraphData(data);
    console.log('Generated graph data:', data.length, 'records');
  }, [selectedPeriod]);

  useEffect(() => {
    const data = generateWorkHoursWithChatData(selectedPeriod);
    setChatGraphData(data);
    console.log('Generated chat graph data:', data.length, 'records');
  }, [selectedPeriod]);

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">管理者ダッシュボード</h1>
        <p className="text-gray-600">全社の勤怠状況を確認できます</p>
      </div>

      {/* Stats Cards and Graph Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Graph Display Area */}
        <div className="lg:col-span-3">
          <Card className="relative overflow-hidden bg-gradient-to-br from-white via-gray-50/50 to-blue-50/30 border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5" />
                  <span>勤務チャート</span>
                </div>
                <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1month">1か月</SelectItem>
                    <SelectItem value="3months">3か月</SelectItem>
                    <SelectItem value="6months">半年</SelectItem>
                    <SelectItem value="1year">1年</SelectItem>
                    <SelectItem value="3years">3年</SelectItem>
                  </SelectContent>
                </Select>
              </CardTitle>
              <div className="flex space-x-1 mt-2">
                <button
                  onClick={() => {
                    setShowSimpleChart(true);
                    setShowChatChart(false);
                  }}
                  className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                    showSimpleChart && !showChatChart
                      ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm'
                      : 'text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-700'
                  }`}
                >
                  シンプル
                </button>
                <button
                  onClick={() => {
                    setShowSimpleChart(false);
                    setShowChatChart(false);
                  }}
                  className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                    !showSimpleChart && !showChatChart
                      ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm'
                      : 'text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-700'
                  }`}
                >
                  TODO
                </button>
                <button
                  onClick={() => {
                    setShowSimpleChart(false);
                    setShowChatChart(true);
                  }}
                  className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                    showChatChart
                      ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm'
                      : 'text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-700'
                  }`}
                >
                  チャット
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {showChatChart ? (
                <WorkHoursChatChart
                  data={chatGraphData}
                  onPeriodChange={handlePeriodChange}
                  selectedPeriod={selectedPeriod}
                />
              ) : showSimpleChart ? (
                <WorkHoursChartSimple
                  data={graphData}
                  onPeriodChange={handlePeriodChange}
                  selectedPeriod={selectedPeriod}
                />
              ) : (
                <WorkHoursChart
                  data={graphData}
                  onPeriodChange={handlePeriodChange}
                  selectedPeriod={selectedPeriod}
                />
              )}
            </CardContent>
            {/* Bottom border with gradient */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-400"></div>
          </Card>
        </div>

        {/* Stats Cards - Vertical Layout */}
        <div className="flex flex-col h-full space-y-6">
          {stats.map((stat, index) => (
            <div key={index} className="flex-1">
              <StatsCard
                title={stat.title}
                value={stat.value}
                change={stat.change}
                icon={stat.icon}
              />
            </div>
          ))}
        </div>
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
                  const requestant = users.find((u) => u.id === request.user_id);
                  return (
                    <TableRow key={request.id}>
                      <TableCell>
                        {requestant ? `${requestant.family_name} ${requestant.first_name}` : '-'}
                      </TableCell>
                      <TableCell>{request.title}</TableCell>
                      <TableCell>
                        {request.status_id === 'pending' && (
                          <Badge variant="secondary">承認待ち</Badge>
                        )}
                        {request.status_id === 'approved' && (
                          <Badge variant="default">承認済み</Badge>
                        )}
                        {request.status_id === 'rejected' && (
                          <Badge variant="destructive">却下</Badge>
                        )}
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
                  <div className="text-xs text-yellow-700">
                    {pendingRequests}件の申請が承認待ちです
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <div className="font-medium text-sm text-green-800">システム正常動作中</div>
                  <div className="text-xs text-green-700">
                    すべてのシステムが正常に動作しています
                  </div>
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
                {Math.round(
                  monthlyAttendance.reduce((sum, r) => sum + (r.actual_work_minutes || 0), 0) / 60
                )}
                h
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
