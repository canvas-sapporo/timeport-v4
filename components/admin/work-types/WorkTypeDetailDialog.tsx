'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Info,
  Clock,
  Coffee,
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
  CalendarDays,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { getWorkTypeDetail } from '@/lib/actions/attendance';
import { formatTime } from '@/lib/utils';

interface WorkTypeDetailDialogProps {
  open: boolean;
  onOpenChangeAction: (open: boolean) => void;
  workTypeId: string | null;
}

interface WorkTypeDetail {
  id: string;
  name: string;
  code?: string;
  work_start_time: string;
  work_end_time: string;
  break_duration_minutes: number;
  is_flexible: boolean;
  flex_start_time?: string;
  flex_end_time?: string;
  core_start_time?: string;
  core_end_time?: string;
  overtime_threshold_minutes: number;
  late_threshold_minutes: number;
  description?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export default function WorkTypeDetailDialog({
  open,
  onOpenChangeAction,
  workTypeId,
}: WorkTypeDetailDialogProps) {
  const [workTypeDetail, setWorkTypeDetail] = useState<WorkTypeDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchWorkTypeDetail = useCallback(async () => {
    if (!workTypeId) return;

    setIsLoading(true);
    try {
      const detail = await getWorkTypeDetail(workTypeId);
      setWorkTypeDetail(detail);
    } catch (error) {
      console.error('勤務形態詳細取得エラー:', error);
    } finally {
      setIsLoading(false);
    }
  }, [workTypeId]);

  useEffect(() => {
    if (open && workTypeId) {
      fetchWorkTypeDetail();
    }
  }, [open, workTypeId, fetchWorkTypeDetail]);

  const formatMinutes = (minutes: number) => {
    if (minutes === 0) return '0分';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return mins > 0 ? `${hours}時間${mins}分` : `${hours}時間`;
    }
    return `${mins}分`;
  };

  const formatDateTime = (dateTime: string) => {
    if (!dateTime) return '--';
    return new Date(dateTime).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 標準勤務時間を計算（休憩時間を除く）
  const calculateStandardWorkMinutes = () => {
    if (!workTypeDetail) return 0;

    const startTime = new Date(`2000-01-01T${workTypeDetail.work_start_time}`);
    const endTime = new Date(`2000-01-01T${workTypeDetail.work_end_time}`);
    const totalMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
    return Math.max(0, totalMinutes - workTypeDetail.break_duration_minutes);
  };

  if (!workTypeDetail && !isLoading) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChangeAction}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Info className="w-5 h-5 text-blue-600" />
            <span>勤務形態詳細</span>
          </DialogTitle>
          <DialogDescription>勤務形態の詳細情報を表示します</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : workTypeDetail ? (
          <div className="space-y-4">
            {/* 基本情報 */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-900">基本情報</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">勤務形態名</span>
                  <div className="font-medium">{workTypeDetail.name}</div>
                </div>
                {workTypeDetail.code && (
                  <div>
                    <span className="text-gray-500">コード</span>
                    <div className="font-medium">{workTypeDetail.code}</div>
                  </div>
                )}
              </div>
              {workTypeDetail.description && (
                <div>
                  <span className="text-gray-500">説明</span>
                  <div className="text-sm mt-1">{workTypeDetail.description}</div>
                </div>
              )}
              {/* 状態表示 */}
              <div className="flex items-center space-x-2">
                <span className="text-gray-500 text-sm">状態</span>
                <Badge
                  variant={workTypeDetail.is_active !== false ? 'default' : 'secondary'}
                  className="flex items-center space-x-1"
                >
                  {workTypeDetail.is_active !== false ? (
                    <>
                      <CheckCircle className="w-3 h-3" />
                      <span>有効</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3 h-3" />
                      <span>無効</span>
                    </>
                  )}
                </Badge>
              </div>
            </div>

            <Separator />

            {/* 勤務時間 */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-900 flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>勤務時間</span>
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">開始時刻</span>
                  <div className="font-medium">{formatTime(workTypeDetail.work_start_time)}</div>
                </div>
                <div>
                  <span className="text-gray-500">終了時刻</span>
                  <div className="font-medium">{formatTime(workTypeDetail.work_end_time)}</div>
                </div>
              </div>
              {/* 標準勤務時間の表示 */}
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="text-sm">
                  <span className="text-gray-600 font-medium">標準勤務時間</span>
                  <div className="text-blue-700 font-semibold text-lg">
                    {formatMinutes(calculateStandardWorkMinutes())}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    （休憩時間 {formatMinutes(workTypeDetail.break_duration_minutes)} を除く）
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* 休憩時間 */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-900 flex items-center space-x-2">
                <Coffee className="w-4 h-4" />
                <span>休憩時間</span>
              </h3>
              <div className="text-sm">
                <span className="text-gray-500">休憩時間</span>
                <div className="font-medium">
                  {formatMinutes(workTypeDetail.break_duration_minutes)}
                </div>
              </div>
            </div>

            <Separator />

            {/* フレックス勤務 */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-900 flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>フレックス勤務</span>
                <Badge variant={workTypeDetail.is_flexible ? 'default' : 'secondary'}>
                  {workTypeDetail.is_flexible ? '有効' : '無効'}
                </Badge>
              </h3>
              {workTypeDetail.is_flexible && (
                <div className="space-y-2 text-sm">
                  {workTypeDetail.flex_start_time && workTypeDetail.flex_end_time && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-gray-500">フレックス開始</span>
                        <div className="font-medium">
                          {formatTime(workTypeDetail.flex_start_time)}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">フレックス終了</span>
                        <div className="font-medium">
                          {formatTime(workTypeDetail.flex_end_time)}
                        </div>
                      </div>
                    </div>
                  )}
                  {workTypeDetail.core_start_time && workTypeDetail.core_end_time && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-gray-500">コアタイム開始</span>
                        <div className="font-medium">
                          {formatTime(workTypeDetail.core_start_time)}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">コアタイム終了</span>
                        <div className="font-medium">
                          {formatTime(workTypeDetail.core_end_time)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* 設定 */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-900 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4" />
                <span>設定</span>
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">残業開始閾値</span>
                  <div className="font-medium">
                    {formatMinutes(workTypeDetail.overtime_threshold_minutes)}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">遅刻許容時間</span>
                  <div className="font-medium">
                    {formatMinutes(workTypeDetail.late_threshold_minutes)}
                  </div>
                </div>
              </div>
            </div>

            {/* 作成・更新日時 */}
            {(workTypeDetail.created_at || workTypeDetail.updated_at) && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-900 flex items-center space-x-2">
                    <CalendarDays className="w-4 h-4" />
                    <span>履歴</span>
                  </h3>
                  <div className="space-y-2 text-sm">
                    {workTypeDetail.created_at && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">作成日時</span>
                        <span className="font-medium">
                          {formatDateTime(workTypeDetail.created_at)}
                        </span>
                      </div>
                    )}
                    {workTypeDetail.updated_at && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">更新日時</span>
                        <span className="font-medium">
                          {formatDateTime(workTypeDetail.updated_at)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            勤務形態の詳細情報を取得できませんでした
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
