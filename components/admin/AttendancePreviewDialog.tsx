'use client';

import { useState, useEffect } from 'react';
import {
  Clock,
  User,
  Calendar,
  FileText,
  AlertCircle,
  CheckCircle,
  History,
  Info,
} from 'lucide-react';

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
import { getAttendanceDetail, getAttendanceStatuses } from '@/lib/actions/attendance';
import WorkTypeDetailDialog from '@/components/admin/WorkTypeDetailDialog';
import { formatDate, formatTime } from '@/lib/utils';
import type { AttendanceData, AttendanceStatusData, ClockBreakRecord } from '@/schemas/attendance';

interface AttendancePreviewDialogProps {
  open: boolean;
  onOpenChangeAction: (open: boolean) => void;
  attendanceId: string | null;
  companyId?: string;
}

export default function AttendancePreviewDialog({
  open,
  onOpenChangeAction,
  attendanceId,
  companyId,
}: AttendancePreviewDialogProps) {
  const [attendance, setAttendance] = useState<AttendanceData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attendanceStatuses, setAttendanceStatuses] = useState<AttendanceStatusData[]>([]);

  // 勤務形態詳細ダイアログの状態
  const [workTypeDetailDialogOpen, setWorkTypeDetailDialogOpen] = useState(false);
  const [selectedWorkTypeId, setSelectedWorkTypeId] = useState<string | null>(null);

  useEffect(() => {
    if (open && attendanceId) {
      fetchAttendanceDetail();
      if (companyId) {
        fetchAttendanceStatuses();
      }
    } else {
      setAttendance(null);
      setError(null);
    }
  }, [open, attendanceId, companyId]);

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

  const fetchAttendanceStatuses = async () => {
    if (!companyId) return;

    try {
      const result = await getAttendanceStatuses(companyId);
      if (result.success && result.statuses) {
        setAttendanceStatuses(result.statuses);
      }
    } catch (err) {
      console.error('勤怠ステータス取得エラー:', err);
    }
  };

  // 勤怠ステータスを動的に計算する関数
  const getAttendanceStatus = (
    record?: AttendanceData
  ): 'normal' | 'late' | 'early_leave' | 'late_early_leave' | 'absent' => {
    if (!record) return 'absent';

    const clockRecords = record.clock_records || [];
    const hasAnySession = clockRecords.length > 0;
    const hasCompletedSession = clockRecords.some((session) => session.in_time && session.out_time);

    if (!hasAnySession) return 'absent';
    if (!hasCompletedSession) return 'normal'; // 勤務中

    // 複合ステータス判定
    const hasLate = record.late_minutes && record.late_minutes > 0;
    const hasEarlyLeave = record.early_leave_minutes && record.early_leave_minutes > 0;

    if (hasLate && hasEarlyLeave) {
      return 'late_early_leave'; // 遅刻・早退
    } else if (hasLate) {
      return 'late'; // 遅刻のみ
    } else if (hasEarlyLeave) {
      return 'early_leave'; // 早退のみ
    }

    return 'normal';
  };

  const getStatusBadge = (status: string) => {
    // データベースから取得したステータス設定を使用
    const statusConfig = attendanceStatuses.find((s) => s.name === status);

    if (statusConfig) {
      return (
        <Badge
          variant={statusConfig.color as 'default' | 'destructive' | 'secondary' | 'outline'}
          style={{
            color: statusConfig.font_color,
            backgroundColor: statusConfig.background_color,
          }}
        >
          {statusConfig.display_name}
        </Badge>
      );
    }

    // フォールバック: デフォルトの表示
    switch (status) {
      case 'normal':
        return <Badge variant="default">正常</Badge>;
      case 'late':
        return <Badge variant="destructive">遅刻</Badge>;
      case 'early_leave':
        return <Badge variant="secondary">早退</Badge>;
      case 'late_early_leave':
        return <Badge variant="destructive">遅刻・早退</Badge>;
      case 'absent':
        return <Badge variant="outline">欠勤</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const calculateTotalBreakMinutes = (): number => {
    if (!attendance) return 0;

    const breakRecords = attendance.break_records || [];
    return breakRecords.reduce((total, record) => {
      if (record.break_start && record.break_end) {
        const start = new Date(record.break_start);
        const end = new Date(record.break_end);
        return total + Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
      }
      return total;
    }, 0);
  };

  const getApprovalStatusBadge = (approvedBy?: string) => {
    if (approvedBy) {
      return (
        <div className="flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <Badge variant="default">承認済み</Badge>
        </div>
      );
    } else {
      return (
        <div className="flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-yellow-600" />
          <Badge variant="secondary">未承認</Badge>
        </div>
      );
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChangeAction}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>勤怠記録詳細</DialogTitle>
            <DialogDescription>データを読み込み中...</DialogDescription>
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
      <Dialog open={open} onOpenChange={onOpenChangeAction}>
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
    <>
      <Dialog open={open} onOpenChange={onOpenChangeAction}>
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
                    <span className="text-sm font-medium text-gray-600">勤務形態</span>
                    <div className="flex items-center space-x-1">
                      <span className="text-sm">{attendance.work_type_name || '-'}</span>
                      {attendance.work_type_id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedWorkTypeId(attendance.work_type_id!);
                            setWorkTypeDetailDialogOpen(true);
                          }}
                          className="p-1 h-auto text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                          title="勤務形態詳細"
                        >
                          <Info className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600">ステータス</span>
                    <div>
                      {attendance.attendance_status_id
                        ? // データベースのattendance_status_idを優先
                          (() => {
                            const statusConfig = attendanceStatuses.find(
                              (s) => s.id === attendance.attendance_status_id
                            );
                            return statusConfig ? (
                              <Badge
                                variant={
                                  statusConfig.color as
                                    | 'default'
                                    | 'destructive'
                                    | 'secondary'
                                    | 'outline'
                                }
                                style={{
                                  color: statusConfig.font_color,
                                  backgroundColor: statusConfig.background_color,
                                }}
                              >
                                {statusConfig.display_name}
                              </Badge>
                            ) : (
                              getStatusBadge(getAttendanceStatus(attendance))
                            );
                          })()
                        : // フォールバック: 動的計算
                          getStatusBadge(getAttendanceStatus(attendance))}
                    </div>
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
            {attendance.has_edit_history && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="w-4 h-4" />
                    編集履歴
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm text-yellow-800">
                        この勤怠記録は編集履歴があります
                      </span>
                    </div>
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
                    <span className="text-sm font-medium text-gray-600">休憩時間</span>
                    <span className="text-sm">
                      {(() => {
                        const totalBreakMinutes = calculateTotalBreakMinutes();
                        return totalBreakMinutes > 0
                          ? `${Math.floor(totalBreakMinutes / 60)}h${totalBreakMinutes % 60}m`
                          : '--:--';
                      })()}
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
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">出勤時刻</span>
                            <span>{session.in_time ? formatTime(session.in_time) : '--:--'}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">退勤時刻</span>
                            <span>{session.out_time ? formatTime(session.out_time) : '--:--'}</span>
                          </div>
                          {session.breaks && session.breaks.length > 0 && (
                            <div className="mt-3">
                              <h5 className="text-sm font-medium text-gray-700 mb-2">休憩記録</h5>
                              <div className="space-y-1">
                                {session.breaks.map(
                                  (breakRecord: ClockBreakRecord, breakIndex: number) => {
                                    const breakStart = new Date(breakRecord.break_start);
                                    const breakEnd = breakRecord.break_end
                                      ? new Date(breakRecord.break_end)
                                      : null;
                                    const breakMinutes = breakEnd
                                      ? Math.floor(
                                          (breakEnd.getTime() - breakStart.getTime()) / (1000 * 60)
                                        )
                                      : 0;

                                    return (
                                      <div
                                        key={breakIndex}
                                        className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded"
                                      >
                                        <span>休憩 {breakIndex + 1}</span>
                                        <div className="flex items-center space-x-2">
                                          <span>
                                            {formatTime(breakRecord.break_start)} -{' '}
                                            {breakRecord.break_end
                                              ? formatTime(breakRecord.break_end)
                                              : '終了未定'}
                                          </span>
                                          {breakMinutes > 0 && (
                                            <span className="text-xs text-gray-500">
                                              ({breakMinutes}分)
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  }
                                )}
                              </div>
                            </div>
                          )}
                        </div>
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
                    <span className="text-gray-600">編集日時</span>
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
            <Button onClick={() => onOpenChangeAction(false)}>閉じる</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 勤務形態詳細ダイアログ */}
      <WorkTypeDetailDialog
        open={workTypeDetailDialogOpen}
        onOpenChangeAction={setWorkTypeDetailDialogOpen}
        workTypeId={selectedWorkTypeId}
      />
    </>
  );
}
