'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface WorkHoursData {
  date: string;
  workHours: number;
  overtimeHours: number;
}

interface WorkHoursChartSimpleProps {
  data: WorkHoursData[];
  onPeriodChange: (period: string) => void;
  selectedPeriod: string;
}

export default function WorkHoursChartSimple({
  data,
  onPeriodChange,
  selectedPeriod,
}: WorkHoursChartSimpleProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();

    // 3年や1年の場合は年月を表示
    if (selectedPeriod === '3years' || selectedPeriod === '1year') {
      return `${year}/${month}`;
    }
    // 半年の場合は月日を表示
    else if (selectedPeriod === '6months') {
      return `${month}/${day}`;
    }
    // 3ヶ月以下の場合は月日を表示
    else {
      return `${month}/${day}`;
    }
  };

  const formatTooltip = (value: number, name: string) => {
    if (name === 'workHours') return [`${value}h`, '勤務時間'];
    if (name === 'overtimeHours') return [`${value}h`, '残業時間'];
    return [value, name];
  };

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={data} margin={{ top: 20, right: 30, left: 30, bottom: 20 }}>
          <defs>
            <linearGradient id="workHoursGradientSimple" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="overtimeHoursGradientSimple" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#EF4444" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" strokeWidth={1} opacity={0.5} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            stroke="#64748b"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#64748b', fontSize: 11 }}
            padding={{ left: 10, right: 10 }}
          />
          <YAxis
            stroke="#64748b"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}h`}
            tick={{ fill: '#64748b', fontSize: 11 }}
          />
          <Tooltip
            formatter={formatTooltip}
            labelFormatter={(label) => `日付: ${label}`}
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
              backdropFilter: 'blur(10px)',
              padding: '12px 16px',
            }}
            cursor={{
              stroke: '#cbd5e1',
              strokeWidth: 1,
              strokeDasharray: '3 3',
            }}
          />
          <Legend
            wrapperStyle={{
              paddingTop: '20px',
              fontSize: '12px',
              fontWeight: '500',
            }}
            iconType="circle"
            iconSize={8}
          />
          <Line
            type="monotone"
            dataKey="workHours"
            stroke="url(#workHoursGradientSimple)"
            strokeWidth={3}
            dot={{
              fill: '#3B82F6',
              stroke: '#ffffff',
              strokeWidth: 2,
              r: 5,
              filter: 'drop-shadow(0 2px 4px rgba(59, 130, 246, 0.3))',
            }}
            activeDot={{
              r: 7,
              stroke: '#3B82F6',
              strokeWidth: 3,
              fill: '#ffffff',
              filter: 'drop-shadow(0 4px 8px rgba(59, 130, 246, 0.4))',
            }}
            name="勤務時間"
          />
          <Line
            type="monotone"
            dataKey="overtimeHours"
            stroke="url(#overtimeHoursGradientSimple)"
            strokeWidth={3}
            dot={{
              fill: '#EF4444',
              stroke: '#ffffff',
              strokeWidth: 2,
              r: 5,
              filter: 'drop-shadow(0 2px 4px rgba(239, 68, 68, 0.3))',
            }}
            activeDot={{
              r: 7,
              stroke: '#EF4444',
              strokeWidth: 3,
              fill: '#ffffff',
              filter: 'drop-shadow(0 4px 8px rgba(239, 68, 68, 0.4))',
            }}
            name="残業時間"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
