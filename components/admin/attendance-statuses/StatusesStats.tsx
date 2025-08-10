'use client';

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from 'lucide-react';
import type { AttendanceStatusData } from '@/schemas/attendance';

export default function StatusesStats({ statuses }: { statuses: AttendanceStatusData[] }) {
  const total = statuses.length;
  const active = useMemo(() => statuses.filter((s) => s.is_active).length, [statuses]);
  const required = useMemo(() => statuses.filter((s) => s.is_required).length, [statuses]);
  const custom = useMemo(() => statuses.filter((s) => !s.is_required).length, [statuses]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">総ステータス数</p>
              <p className="text-2xl font-bold text-gray-900">{total}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Badge className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">有効ステータス</p>
              <p className="text-2xl font-bold text-gray-900">{active}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <Badge className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">必須ステータス</p>
              <p className="text-2xl font-bold text-gray-900">{required}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <Badge className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">カスタムステータス</p>
              <p className="text-2xl font-bold text-gray-900">{custom}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Badge className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
