'use client';

import { useState, useEffect } from 'react';
import { Clock, User, Calendar, FileText, AlertCircle, CheckCircle, History } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { getAttendanceDetail } from '@/lib/actions/attendance';
import { formatDate, formatTime } from '@/lib/utils';
import type { Attendance } from '@/types/attendance';

interface AttendancePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attendanceId: string | null;
}

export default function AttendancePreviewDialog({
  open,
  onOpenChange,
  attendanceId,
}: AttendancePreviewDialogProps) {
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [isLoading, setIsLoading] = useState(false);
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
        console.log('プレビューダイアログ - 取得したデータ:', result.attendance);
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

  // 勤怠ステータスを動的に計算する関数
  const getAttendanceStatus = (
    record?: Attendance
  ): 'normal' | 'late' | 'early_leave' | 'absent' => {
    if (!record) return 'absent';

    const clockRecords = record.clock_records || [];
    const hasAnySession = clockRecords.length > 0;
    const hasCompletedSession = clockRecords.some((session) => session.in_time && session.out_time);

    if (!hasAnySession) return 'absent';
    if (!hasCompletedSession) return 'normal'; // 勤務中
    return 'normal';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'normal':
        return <Badge variant="default">正常</Badge>;
      case 'late':
        return <Badge variant="destructive">遅刻</Badge>;
      case 'early_leave':
        return <Badge variant="secondary">早退</Badge>;
      case 'absent':
        return <Badge variant="outline">欠勤</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getApprovalStatusBadge = (approvedBy?: string) => {
    if (approvedBy) {
      return (
        <Badge variant="default" className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          承認済み
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          未承認
        </Badge>
      );
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>勤怠記録詳細</DialogTitle>
            <DialogDescription>読み込み中...</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>勤怠記録詳細</DialogTitle>
            <DialogDescription>エラーが発生しました</DialogDescription>
          </DialogHeader>
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
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
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto dialog-scrollbar">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            勤怠記録詳細
          </DialogTitle>
          <DialogDescription>
            {attendance.user_name} - {formatDate(attendance.work_date)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 基本情報 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-4 h-4" />
                基本情報
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">メンバー</span>
                  <span className="text-sm">{attendance.user_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">勤務日</span>
                  <span className="text-sm">{formatDate(attendance.work_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">勤務タイプ</span>
                  <span className="text-sm">{attendance.work_type_name || '-'}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">ステータス</span>
                  <div>{getStatusBadge(getAttendanceStatus(attendance))}</div>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">承認状態</span>
                  <div>{getApprovalStatusBadge(attendance.approved_by)}</div>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">自動計算</span>
                  <span className="text-sm">{attendance.auto_calculated ? '有効' : '無効'}</span>
                </div>

                {/* デバッグ情報 */}
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">デバッグ</span>
                  <span className="text-sm">
                    source_id: {attendance.source_id ? 'あり' : 'なし'}, edit_reason:{' '}
                    {attendance.edit_reason ? 'あり' : 'なし'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 編集履歴情報 */}
          {(attendance.source_id || (attendance.has_edit_history && !attendance.source_id)) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-4 h-4" />
                  編集履歴情報
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {attendance.source_id ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-600">編集理由</span>
                        <span className="text-sm">{attendance.edit_reason || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-600">編集者</span>
                        <span className="text-sm">{attendance.edited_by || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-600">元レコードID</span>
                        <span className="font-mono text-xs">{attendance.source_id}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-600">編集履歴</span>
                      <span className="text-sm text-blue-600 font-medium">あり</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 勤務時間 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                勤務時間
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">出勤時刻</span>
                  <span className="text-sm">
                    {attendance.clock_in_time ? formatTime(attendance.clock_in_time) : '--:--'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">退勤時刻</span>
                  <span className="text-sm">
                    {attendance.clock_out_time ? formatTime(attendance.clock_out_time) : '--:--'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">実勤務時間</span>
                  <span className="text-sm">
                    {attendance.actual_work_minutes !== undefined
                      ? `${Math.floor(attendance.actual_work_minutes / 60)}h${attendance.actual_work_minutes % 60}m`
                      : '--:--'}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">残業時間</span>
                  <span className="text-sm">
                    {attendance.overtime_minutes !== undefined
                      ? `${Math.floor(attendance.overtime_minutes / 60)}h${attendance.overtime_minutes % 60}m`
                      : '--:--'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">遅刻時間</span>
                  <span className="text-sm">
                    {attendance.late_minutes !== undefined
                      ? `${Math.floor(attendance.late_minutes / 60)}h${attendance.late_minutes % 60}m`
                      : '--:--'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">早退時間</span>
                  <span className="text-sm">
                    {attendance.early_leave_minutes !== undefined
                      ? `${Math.floor(attendance.early_leave_minutes / 60)}h${attendance.early_leave_minutes % 60}m`
                      : '--:--'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 勤務セッション */}
          {attendance.clock_records && attendance.clock_records.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  勤務セッション ({attendance.clock_records.length}回)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {attendance.clock_records.map((session, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">セッション {index + 1}</h4>
                        <div className="text-sm text-gray-500">
                          {session.in_time ? formatTime(session.in_time) : '--:--'} -{' '}
                          {session.out_time ? formatTime(session.out_time) : '--:--'}
                        </div>
                      </div>

                      {session.breaks && session.breaks.length > 0 && (
                        <div className="mt-3">
                          <h5 className="text-sm font-medium text-gray-600 mb-2">休憩記録</h5>
                          <div className="space-y-2">
                            {session.breaks.map((breakRecord, breakIndex) => (
                              <div
                                key={breakIndex}
                                className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded"
                              >
                                <span>休憩 {breakIndex + 1}</span>
                                <span>
                                  {formatTime(breakRecord.break_start)} -{' '}
                                  {breakRecord.break_end
                                    ? formatTime(breakRecord.break_end)
                                    : '終了未定'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 備考 */}
          {attendance.description && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  備考
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm whitespace-pre-wrap">{attendance.description}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* システム情報 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">システム情報</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">レコードID</span>
                  <span className="font-mono text-xs">{attendance.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">作成日時</span>
                  <span>
                    {attendance.created_at
                      ? new Date(attendance.created_at).toLocaleString('ja-JP')
                      : '-'}
                  </span>
                </div>
                <div></div>
                <div className="flex justify-between">
                  <span className="text-gray-600">更新日時</span>
                  <span>
                    {attendance.updated_at
                      ? new Date(attendance.updated_at).toLocaleString('ja-JP')
                      : '-'}
                  </span>
                </div>
              </div>
              {attendance.approved_at && (
                <div className="mt-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">承認日時</span>
                    <span>{new Date(attendance.approved_at).toLocaleString('ja-JP')}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={() => onOpenChange(false)}>閉じる</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
