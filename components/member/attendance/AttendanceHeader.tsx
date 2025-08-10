'use client';

import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Settings, Download } from 'lucide-react';

interface AttendanceHeaderProps {
  onOpenColumnSettings: () => void;
  onOpenCsvExport: () => void;
}

function AttendanceHeaderComponent({
  onOpenColumnSettings,
  onOpenCsvExport,
}: AttendanceHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">勤怠履歴</h1>
        <p className="text-gray-600">過去の勤怠記録を確認できます</p>
      </div>
      <div className="flex items-center space-x-2">
        <Button variant="outline" size="sm" onClick={onOpenColumnSettings}>
          <Settings className="w-4 h-4 mr-2" />
          表示項目
        </Button>
        <Button variant="outline" size="sm" onClick={onOpenCsvExport}>
          <Download className="w-4 h-4 mr-2" />
          CSV出力
        </Button>
      </div>
    </div>
  );
}

const AttendanceHeader = memo(AttendanceHeaderComponent);
export default AttendanceHeader;
