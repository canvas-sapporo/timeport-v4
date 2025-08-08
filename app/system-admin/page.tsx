'use client';

import { useEffect, useState } from 'react';
import { Building, Users, Settings, BarChart3, AlertCircle, CheckCircle } from 'lucide-react';

import {
  getSystemErrorLogsCount,
  getAuditLogsCount,
  getLogsDataForPeriod,
} from '@/lib/actions/system-admin/stats';
import StatsCard from '@/components/ui/stats-card';
import LogsChart from '@/components/ui/logs-chart';
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

export default function SuperAdminDashboard() {
  const [errorLogsCount, setErrorLogsCount] = useState(0);
  const [errorLogsChange, setErrorLogsChange] = useState(0);
  const [auditLogsCount, setAuditLogsCount] = useState(0);
  const [auditLogsChange, setAuditLogsChange] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState('1month');
  const [graphData, setGraphData] = useState<
    Array<{ date: string; errorLogs: number; auditLogs: number }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  // ログ数を取得
  useEffect(() => {
    async function fetchLogsCount() {
      try {
        const [errorResult, auditResult] = await Promise.all([
          getSystemErrorLogsCount(selectedPeriod),
          getAuditLogsCount(selectedPeriod),
        ]);

        // エラーハンドリング: 結果がundefinedまたはnullの場合のデフォルト値
        const safeErrorResult = errorResult || { todayCount: 0, yesterdayCount: 0, change: 0 };
        const safeAuditResult = auditResult || { todayCount: 0, yesterdayCount: 0, change: 0 };

        setErrorLogsCount(safeErrorResult.todayCount);
        setErrorLogsChange(safeErrorResult.change);
        setAuditLogsCount(safeAuditResult.todayCount);
        setAuditLogsChange(safeAuditResult.change);
      } catch (error) {
        console.error('Error fetching logs count:', error);
        // エラー時のデフォルト値設定
        setErrorLogsCount(0);
        setErrorLogsChange(0);
        setAuditLogsCount(0);
        setAuditLogsChange(0);
      }
    }

    fetchLogsCount();
  }, [selectedPeriod]);

  // グラフデータを取得
  useEffect(() => {
    async function fetchGraphData() {
      setIsLoading(true);
      try {
        const data = await getLogsDataForPeriod(selectedPeriod);
        setGraphData(data);
      } catch (error) {
        console.error('Error fetching graph data:', error);
        setGraphData([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchGraphData();
  }, [selectedPeriod]);

  function handlePeriodChange(period: string) {
    setSelectedPeriod(period);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">システム管理者ダッシュボード</h1>
        <p className="text-gray-600">システム全体の管理と監視を行います</p>
      </div>

      {/* Top Section with Graph and Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Large Graph Area */}
        <div className="lg:col-span-3">
          <Card className="relative overflow-hidden bg-gradient-to-br from-white via-gray-50/50 to-blue-50/30 border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5" />
                  <span>ログ推移</span>
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
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-[350px]">
                  <div className="text-center text-gray-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p>データを読み込み中...</p>
                  </div>
                </div>
              ) : graphData.length > 0 ? (
                <LogsChart data={graphData} selectedPeriod={selectedPeriod} />
              ) : (
                <div className="flex items-center justify-center h-[350px]">
                  <div className="text-center text-gray-500">
                    <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p>データがありません</p>
                    <p className="text-sm">選択した期間にログデータが存在しません</p>
                  </div>
                </div>
              )}
            </CardContent>
            {/* Bottom border with gradient */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-400"></div>
          </Card>
        </div>

        {/* Right Side Stats */}
        <div className="h-[384px] flex flex-col justify-between">
          {/* Latest Day's Error Count */}
          <div className="h-[180px]">
            <StatsCard
              title="最新日のシステムエラーログ"
              value={errorLogsCount}
              change={errorLogsChange}
              icon={<AlertCircle className="w-6 h-6" />}
            />
          </div>

          {/* Latest Day's Audit Log Count */}
          <div className="h-[180px]">
            <StatsCard
              title="最新日の監査ログ数"
              value={auditLogsCount}
              change={auditLogsChange}
              icon={<Settings className="w-6 h-6" />}
            />
          </div>
        </div>
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
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 rounded-full bg-purple-500" />
                  <span className="text-sm font-medium">システム管理者</span>
                </div>
                <Badge variant="outline">1名</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-sm font-medium">管理者</span>
                </div>
                <Badge variant="outline">3名</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm font-medium">メンバー</span>
                </div>
                <Badge variant="outline">25名</Badge>
              </div>
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
                <TableHead>グループ数</TableHead>
                <TableHead>従業員数</TableHead>
                <TableHead>ステータス</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">本社</TableCell>
                <TableCell>5</TableCell>
                <TableCell>20</TableCell>
                <TableCell>
                  <Badge variant="default">アクティブ</Badge>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">支社A</TableCell>
                <TableCell>3</TableCell>
                <TableCell>8</TableCell>
                <TableCell>
                  <Badge variant="default">アクティブ</Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
