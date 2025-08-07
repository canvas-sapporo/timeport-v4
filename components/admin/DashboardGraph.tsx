'use client';

import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { GraphDataPoint } from '@/app/api/admin/dashboard/route';

interface DashboardGraphProps {
  data: GraphDataPoint[];
  isLoading: boolean;
}

export default function DashboardGraph({ data, isLoading }: DashboardGraphProps) {
  const [showWeekends, setShowWeekends] = useState(false);

  // デバッグ情報
  console.log('DashboardGraph props:', {
    data: data,
    dataType: typeof data,
    isArray: Array.isArray(data),
    dataLength: Array.isArray(data) ? data.length : 'N/A',
    isLoading: isLoading,
  });

  // データの詳細デバッグ
  if (Array.isArray(data) && data.length > 0) {
    console.log('DashboardGraph: データサンプル:', data.slice(0, 3));
  }

  // 安全なデータ処理
  const safeData = useMemo(() => {
    // dataが未定義、null、または配列でない場合は空配列を返す
    if (!data || !Array.isArray(data)) {
      console.log('DashboardGraph: データが無効です:', data, '型:', typeof data);
      return [];
    }
    return data;
  }, [data]);

  // 土日をフィルタリングしたデータ
  const filteredData = useMemo(() => {
    // safeDataが空配列の場合はそのまま返す
    if (safeData.length === 0) {
      console.log('DashboardGraph: データが空です');
      return [];
    }

    if (showWeekends) {
      return safeData;
    }

    // 安全にフィルタリング
    try {
      return safeData.filter((point) => {
        if (!point || !point.date) {
          console.log('DashboardGraph: 無効なデータポイント:', point);
          return false;
        }
        const date = new Date(point.date);
        const dayOfWeek = date.getDay();
        // 土曜日(6)と日曜日(0)を除外
        return dayOfWeek !== 0 && dayOfWeek !== 6;
      });
    } catch (error) {
      console.error('DashboardGraph: フィルタリングエラー:', error);
      return [];
    }
  }, [safeData, showWeekends]);

  // 縦軸の最大値を計算（時間単位で表示）
  const maxMinutes = useMemo(() => {
    if (filteredData.length === 0) return 480; // デフォルト8時間

    try {
      const maxWork = Math.max(...filteredData.map((d) => d.workMinutes || 0));
      const maxOvertime = Math.max(...filteredData.map((d) => d.overtimeMinutes || 0));
      const max = Math.max(maxWork, maxOvertime);

      // 1時間単位で切り上げ
      return Math.ceil(max / 60) * 60;
    } catch (error) {
      console.error('DashboardGraph: 最大値計算エラー:', error);
      return 480;
    }
  }, [filteredData]);

  // カスタムツールチップ
  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ color: string; name: string; value: number }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          {payload.map((entry, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {Math.round(entry.value)}分
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // 縦軸のラベル（時間単位）
  const CustomYAxisTick = ({
    x,
    y,
    payload,
  }: {
    x: number;
    y: number;
    payload: { value: number };
  }) => {
    const hours = payload.value / 60;
    return (
      <text x={x} y={y} dy={4} textAnchor="end" fill="#666" fontSize={12}>
        {hours}h
      </text>
    );
  };

  // 横軸のラベル（日付を短縮）
  const CustomXAxisTick = ({
    x,
    y,
    payload,
  }: {
    x: number;
    y: number;
    payload: { value: string };
  }) => {
    const date = new Date(payload.value);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return (
      <text x={x} y={y} dy={16} textAnchor="middle" fill="#666" fontSize={12}>
        {month}/{day}
      </text>
    );
  };

  // ローディング状態
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-80 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
          <span className="text-gray-600">グラフデータを読み込み中...</span>
        </div>
      </div>
    );
  }

  // データなし状態
  if (filteredData.length === 0) {
    return (
      <div className="flex items-center justify-center h-80 bg-gray-50 rounded-lg">
        <div className="text-center">
          <p className="text-gray-500 mb-2">データがありません</p>
          <p className="text-sm text-gray-400">直近30日間の勤怠データが存在しません</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 土日表示切り替え */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="show-weekends"
          checked={showWeekends}
          onCheckedChange={(checked) => setShowWeekends(checked as boolean)}
        />
        <Label htmlFor="show-weekends" className="text-sm text-gray-600">
          土日を表示
        </Label>
      </div>

      {/* グラフ */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={filteredData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={CustomXAxisTick} stroke="#666" fontSize={12} />
            <YAxis domain={[0, maxMinutes]} tick={CustomYAxisTick} stroke="#666" fontSize={12} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="workMinutes"
              name="勤務時間"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="overtimeMinutes"
              name="残業時間"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#ef4444', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
