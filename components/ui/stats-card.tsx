import { TrendingUp, TrendingDown } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
}

export default function StatsCard({ title, value, change, icon }: StatsCardProps) {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <Card className="stats-card-enhanced enhanced-hover">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            {change !== undefined && (
              <div className="flex items-center space-x-1">
                {isPositive && <TrendingUp className="w-4 h-4 text-green-600" />}
                {isNegative && <TrendingDown className="w-4 h-4 text-red-600" />}
                <span
                  className={`text-sm font-medium ${
                    isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-600'
                  }`}
                >
                  {change > 0 ? '+' : ''}
                  {change}%
                </span>
              </div>
            )}
          </div>
          <div className="w-14 h-14 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/30">
            <div className="text-blue-600">{icon}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
