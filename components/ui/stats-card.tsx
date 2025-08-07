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
    <Card className="stats-card-enhanced enhanced-hover relative overflow-hidden bg-gradient-to-br from-white via-gray-50/50 to-blue-50/30 border-0 shadow-lg h-full">
      <CardContent className="p-6 h-full flex flex-col justify-center">
        <div className="flex items-center justify-between">
          <div className="space-y-4">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-4xl font-bold text-gray-900">{value}</p>
            {change !== undefined && (
              <div className="flex flex-col space-y-1">
                {change === 0 ? (
                  <div className="flex items-center space-x-1">
                    <div className="w-4 h-4 bg-gray-300 rounded-full flex items-center justify-center">
                      <div className="w-2 h-0.5 bg-gray-500"></div>
                    </div>
                    <span className="text-sm font-medium text-gray-600">変化なし</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1">
                    {isPositive && <TrendingUp className="w-4 h-4 text-green-600" />}
                    {isNegative && <TrendingDown className="w-4 h-4 text-red-600" />}
                    <span
                      className={`text-sm font-medium ${
                        isPositive ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {change > 0 ? '+' : ''}
                      {change}%
                    </span>
                  </div>
                )}
                <span className="text-xs text-gray-500">前月比較</span>
              </div>
            )}
          </div>
          <div className="w-16 h-16 bg-gradient-to-br from-blue-400/20 via-purple-500/20 to-pink-400/20 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/40 shadow-sm">
            <div className="text-blue-600">{icon}</div>
          </div>
        </div>
      </CardContent>
      {/* Bottom border with gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-400"></div>
    </Card>
  );
}
