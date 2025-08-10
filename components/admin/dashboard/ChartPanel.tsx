'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { generateWorkHoursGraphData, generateWorkHoursWithChatData } from '@/lib/mock';

const WorkHoursChart = dynamic(() => import('@/components/ui/work-hours-chart'), {
  ssr: false,
  loading: () => <div className="h-72 w-full animate-pulse rounded-lg bg-gray-100" />,
});
const WorkHoursChartSimple = dynamic(() => import('@/components/ui/work-hours-chart-simple'), {
  ssr: false,
  loading: () => <div className="h-72 w-full animate-pulse rounded-lg bg-gray-100" />,
});
const WorkHoursChatChart = dynamic(() => import('@/components/ui/work-hours-chat-chart'), {
  ssr: false,
  loading: () => <div className="h-72 w-full animate-pulse rounded-lg bg-gray-100" />,
});

export default function ChartPanel() {
  const [selectedPeriod, setSelectedPeriod] = useState('1month');
  const [showSimpleChart, setShowSimpleChart] = useState(false);
  const [showChatChart, setShowChatChart] = useState(false);
  const [graphData, setGraphData] = useState<unknown[]>([]);
  const [chatGraphData, setChatGraphData] = useState<unknown[]>([]);

  useEffect(() => {
    setGraphData(generateWorkHoursGraphData(selectedPeriod));
  }, [selectedPeriod]);

  useEffect(() => {
    setChatGraphData(generateWorkHoursWithChatData(selectedPeriod));
  }, [selectedPeriod]);

  const preloadSimple = () => {
    // 手動プリフェッチ
    import('@/components/ui/work-hours-chart-simple').catch(() => {});
  };
  const preloadChat = () => {
    import('@/components/ui/work-hours-chat-chart').catch(() => {});
  };

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
  };

  return (
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
            onMouseEnter={preloadSimple}
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
            onMouseEnter={preloadChat}
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
            data={chatGraphData as any}
            onPeriodChange={handlePeriodChange}
            selectedPeriod={selectedPeriod}
          />
        ) : showSimpleChart ? (
          <WorkHoursChartSimple
            data={graphData as any}
            onPeriodChange={handlePeriodChange}
            selectedPeriod={selectedPeriod}
          />
        ) : (
          <WorkHoursChart
            data={graphData as any}
            onPeriodChange={handlePeriodChange}
            selectedPeriod={selectedPeriod}
          />
        )}
      </CardContent>
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-400" />
    </Card>
  );
}
