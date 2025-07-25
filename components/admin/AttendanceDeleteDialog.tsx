'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, X, User, Calendar, Clock } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAttendanceDetail, deleteAttendance } from '@/lib/actions/attendance';
import { formatDate, formatTime } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { Attendance } from '@/types/attendance';

interface AttendanceDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attendanceId: string | null;
  onSuccess?: () => void;
}

export default function AttendanceDeleteDialog({
  open,
  onOpenChange,
  attendanceId,
  onSuccess,
}: AttendanceDeleteDialogProps) {
  const { toast } = useToast();
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && attendanceId) {
      fetchAttendanceDetail();
    } else {
      setAttendance(null);
      setError(null);
    }
  }, [open, attendanceId]);

  const fetchAttendanceDetail = async () => {
    if (!attendanceId) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await getAttendanceDetail(attendanceId);
      if (result.success && result.attendance) {
        setAttendance(result.attendance);
      } else {
        // UUID形式エラーの場合は適切なメッセージを表示
        if (result.error?.includes('invalid input syntax for type uuid')) {
          setError('該当する勤怠記録が見つかりません');
        } else {
          setError(result.error || '勤怠記録の取得に失敗しました');
        }
      }
    } catch (err) {
      setError('予期しないエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!attendanceId) return;

    setIsDeleting(true);

    try {
      const result = await deleteAttendance(attendanceId);
      if (result.success) {
        toast({
          title: '削除完了',
          description: result.message,
        });
        onSuccess?.();
        onOpenChange(false);
      } else {
        toast({
          title: '削除失敗',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: 'エラー',
        description: '予期しないエラーが発生しました',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>勤怠記録削除</DialogTitle>
            <DialogDescription>読み込み中...</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>勤怠記録削除</DialogTitle>
            <DialogDescription>エラーが発生しました</DialogDescription>
          </DialogHeader>
          <div className="text-center py-8">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600">{error}</p>
            <Button onClick={fetchAttendanceDetail} className="mt-4">
              再試行
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!attendance) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            勤怠記録削除
          </DialogTitle>
          <DialogDescription>
            以下の勤怠記録を削除します。この操作は取り消せません。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 警告メッセージ */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-red-800">削除の確認</h4>
                <p className="text-sm text-red-700 mt-1">
                  この勤怠記録を削除すると、関連するすべてのデータが失われます。
                  この操作は取り消すことができません。
                </p>
              </div>
            </div>
          </div>

          {/* 削除対象の情報 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">削除対象</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">メンバー:</span>
                <span className="text-sm">{attendance.user_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">勤務日:</span>
                <span className="text-sm">{formatDate(attendance.work_date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">勤務時間:</span>
                <span className="text-sm">
                  {attendance.clock_in_time ? formatTime(attendance.clock_in_time) : '--:--'} -{' '}
                  {attendance.clock_out_time ? formatTime(attendance.clock_out_time) : '--:--'}
                </span>
              </div>
              {attendance.actual_work_minutes !== undefined && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">実勤務時間:</span>
                  <span className="text-sm">
                    {`${Math.floor(attendance.actual_work_minutes / 60)}h${attendance.actual_work_minutes % 60}m`}
                  </span>
                </div>
              )}
              {attendance.description && (
                <div className="mt-3 p-3 bg-gray-50 rounded border">
                  <span className="text-sm font-medium text-gray-600">備考:</span>
                  <p className="text-sm text-gray-700 mt-1">{attendance.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 最終確認 */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-yellow-800">最終確認</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  本当にこの勤怠記録を削除しますか？ 削除後は元に戻すことができません。
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            <X className="w-4 h-4 mr-2" />
            キャンセル
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            <Trash2 className="w-4 h-4 mr-2" />
            {isDeleting ? '削除中...' : '削除'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
