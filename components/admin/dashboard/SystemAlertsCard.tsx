'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle } from 'lucide-react';

export default function SystemAlertsCard({ pendingRequests }: { pendingRequests: number }) {
  return (
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
              <div className="text-xs text-yellow-700">{pendingRequests}件の申請が承認待ちです</div>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <div className="font-medium text-sm text-green-800">システム正常動作中</div>
              <div className="text-xs text-green-700">すべてのシステムが正常に動作しています</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
