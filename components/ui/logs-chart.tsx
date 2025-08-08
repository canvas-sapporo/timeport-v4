'use client';

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

interface LogsData {
  date: string;
  errorLogs: number;
  auditLogs: number;
}

interface LogsChartProps {
  data: LogsData[];
  selectedPeriod: string;
}

export default function LogsChart({ data, selectedPeriod }: LogsChartProps) {
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
    if (name === 'errorLogs') return [`${value}件`, 'システムエラーログ'];
    if (name === 'auditLogs') return [`${value}件`, '監査ログ'];
    return [value, name];
  };

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={data} margin={{ top: 20, right: 40, left: 30, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            stroke="#666"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#666"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}件`}
          />
          <Tooltip
            formatter={formatTooltip}
            labelFormatter={(label) => formatDate(label)}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}
          />
          <Legend
            verticalAlign="top"
            height={36}
            iconType="line"
            wrapperStyle={{
              paddingBottom: '10px',
            }}
          />
          <Line
            type="monotone"
            dataKey="errorLogs"
            stroke="#ef4444"
            strokeWidth={3}
            dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#ef4444', strokeWidth: 2 }}
            name="システムエラーログ"
          />
          <Line
            type="monotone"
            dataKey="auditLogs"
            stroke="#3b82f6"
            strokeWidth={3}
            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
            name="監査ログ"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
