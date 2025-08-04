'use client';

import { useState, useEffect } from 'react';
import { Clock, User, Calendar, FileText, AlertCircle, Save, X, Plus, Trash2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  getAttendanceDetail,
  updateAttendance,
  updateAttendanceWithClockEdit,
  getWorkTypes,
} from '@/lib/actions/attendance';
import { getAttendanceSettingValue } from '@/lib/actions/settings';
import { formatDate, formatTime } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import type { AttendanceData, ClockRecord } from '@/schemas/attendance';

interface AttendanceEditDialogProps {
  open: boolean;
  onOpenChangeAction: (open: boolean) => void;
  attendanceId: string | null;
  onSuccess?: () => void;
}

export default function AttendanceEditDialog({
  open,
  onOpenChangeAction,
  attendanceId,
  onSuccess,
}: AttendanceEditDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [attendance, setAttendance] = useState<AttendanceData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workTypes, setWorkTypes] = useState<{ id: string; name: string }[]>([]);
  const [clockEditEnabled, setClockEditEnabled] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);

  // 編集用の状態
  const [editData, setEditData] = useState({
    work_type_id: 'none',
    description: '',
    status: 'normal' as 'normal' | 'late' | 'early_leave' | 'absent',
    auto_calculated: true,
    clock_records: [] as ClockRecord[],
    edit_reason: '',
  });

  useEffect(() => {
    if (open && attendanceId) {
      fetchAttendanceDetail();
      fetchWorkTypes();
      fetchClockEditSetting();
    } else {
      setAttendance(null);
      setError(null);
      setEditData({
        work_type_id: 'none',
        description: '',
        status: 'normal',
        auto_calculated: true,
        clock_records: [],
        edit_reason: '',
      });
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
        setEditData({
          work_type_id: result.attendance.work_type_id || 'none',
          description: result.attendance.description || '',
          status: result.attendance.status,
          auto_calculated: result.attendance.auto_calculated,
          clock_records: result.attendance.clock_records || [],
          edit_reason: '',
        });
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

  const fetchWorkTypes = async () => {
    try {
      const types = await getWorkTypes();
      setWorkTypes(types);
    } catch (err) {
      console.error('勤務タイプ取得エラー:', err);
    }
  };

  const fetchClockEditSetting = async () => {
    try {
      // ユーザーから企業IDを取得
      if (user?.company_id) {
        const settingValue = await getAttendanceSettingValue(user.company_id, 'clock_record_edit');
        setClockEditEnabled(settingValue?.enabled || false);
      } else {
        setClockEditEnabled(false);
      }
    } catch (err) {
      console.error('打刻編集設定取得エラー:', err);
      setClockEditEnabled(false);
    }
  };

  const handleSave = async () => {
    if (!attendanceId) return;

    // 打刻編集が有効で、時刻データが変更されている場合は編集理由が必要
    const hasClockChanges =
      JSON.stringify(editData.clock_records) !== JSON.stringify(attendance?.clock_records);
    if (
      clockEditEnabled &&
      hasClockChanges &&
      (!editData.edit_reason || editData.edit_reason.trim() === '')
    ) {
      toast({
        title: '編集理由が必要です',
        description: '時刻を編集する場合は編集理由を入力してください',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      let result;

      if (clockEditEnabled && hasClockChanges) {
        // 打刻編集の場合
        result = await updateAttendanceWithClockEdit(
          attendanceId,
          {
            work_type_id: editData.work_type_id === 'none' ? undefined : editData.work_type_id,
            description: editData.description || undefined,
            status: editData.status,
            auto_calculated: editData.auto_calculated,
            clock_records: editData.clock_records,
            edit_reason: editData.edit_reason,
          },
          user?.id
        );
      } else {
        // 通常の更新の場合
        result = await updateAttendance(
          attendanceId,
          {
            work_type_id: editData.work_type_id === 'none' ? undefined : editData.work_type_id,
            description: editData.description || undefined,
            status: editData.status,
            auto_calculated: editData.auto_calculated,
            clock_records: editData.clock_records,
          },
          user?.id
        );
      }

      if (result.success) {
        toast({
          title: '更新完了',
          description: result.message,
        });
        onSuccess?.();
        onOpenChangeAction(false);
      } else {
        toast({
          title: '更新失敗',
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
      setIsSaving(false);
    }
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

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChangeAction}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>勤怠記録編集</DialogTitle>
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
      <Dialog open={open} onOpenChange={onOpenChangeAction}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>勤怠記録編集</DialogTitle>
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
    <Dialog open={open} onOpenChange={onOpenChangeAction}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            勤怠記録編集
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
              <div className="space-y-4">
                <div>
                  <Label htmlFor="work_type">勤務タイプ</Label>
                  <Select
                    value={editData.work_type_id}
                    onValueChange={(value) => setEditData({ ...editData, work_type_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="勤務タイプを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">未選択</SelectItem>
                      {workTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="status">ステータス</Label>
                  <Select
                    value={editData.status}
                    onValueChange={(value: 'normal' | 'late' | 'early_leave' | 'absent') =>
                      setEditData({ ...editData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">正常出勤</SelectItem>
                      <SelectItem value="late">遅刻</SelectItem>
                      <SelectItem value="early_leave">早退</SelectItem>
                      <SelectItem value="absent">欠勤</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="auto_calculated">自動計算</Label>
                  <Select
                    value={editData.auto_calculated ? 'true' : 'false'}
                    onValueChange={(value) =>
                      setEditData({ ...editData, auto_calculated: value === 'true' })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">有効</SelectItem>
                      <SelectItem value="false">無効</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="description">備考</Label>
                  <Textarea
                    id="description"
                    value={editData.description}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    placeholder="備考を入力してください"
                    rows={3}
                  />
                </div>
                {clockEditEnabled && (
                  <div>
                    <Label htmlFor="edit_reason">編集理由</Label>
                    <Textarea
                      id="edit_reason"
                      value={editData.edit_reason}
                      onChange={(e) => setEditData({ ...editData, edit_reason: e.target.value })}
                      placeholder="編集理由を入力してください"
                      rows={3}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 勤務時間 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                勤務時間{!clockEditEnabled && '（読み取り専用）'}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">出勤時刻</span>
                  {clockEditEnabled && editData.clock_records.length > 0 ? (
                    <input
                      type="time"
                      value={
                        editData.clock_records[0]?.in_time
                          ? formatTime(editData.clock_records[0].in_time).substring(0, 5)
                          : ''
                      }
                      onChange={(e) => {
                        const newClockRecords = [...editData.clock_records];
                        if (newClockRecords.length > 0) {
                          const date = new Date(editData.clock_records[0].in_time || new Date());
                          const [hours, minutes] = e.target.value.split(':');
                          date.setHours(parseInt(hours), parseInt(minutes));
                          newClockRecords[0].in_time = date.toISOString();
                          setEditData({ ...editData, clock_records: newClockRecords });
                        }
                      }}
                      className="text-sm border rounded px-2 py-1 w-24"
                    />
                  ) : (
                    <span className="text-sm">
                      {attendance.clock_in_time ? formatTime(attendance.clock_in_time) : '--:--'}
                    </span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">退勤時刻</span>
                  {clockEditEnabled && editData.clock_records.length > 0 ? (
                    <input
                      type="time"
                      value={
                        editData.clock_records[0]?.out_time
                          ? formatTime(editData.clock_records[0].out_time).substring(0, 5)
                          : ''
                      }
                      onChange={(e) => {
                        const newClockRecords = [...editData.clock_records];
                        if (newClockRecords.length > 0) {
                          const date = new Date(editData.clock_records[0].out_time || new Date());
                          const [hours, minutes] = e.target.value.split(':');
                          date.setHours(parseInt(hours), parseInt(minutes));
                          newClockRecords[0].out_time = date.toISOString();
                          setEditData({ ...editData, clock_records: newClockRecords });
                        }
                      }}
                      className="text-sm border rounded px-2 py-1 w-24"
                    />
                  ) : (
                    <span className="text-sm">
                      {attendance.clock_out_time ? formatTime(attendance.clock_out_time) : '--:--'}
                    </span>
                  )}
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

          {/* 休憩時間 */}
          {(() => {
            const allBreaks: Array<{ sessionIndex: number; breakIndex: number; break: any }> = [];

            // 全セッションから休憩時間を収集
            editData.clock_records?.forEach((session, sessionIndex) => {
              if (session.breaks && session.breaks.length > 0) {
                session.breaks.forEach((breakRecord, breakIndex) => {
                  allBreaks.push({
                    sessionIndex,
                    breakIndex,
                    break: breakRecord,
                  });
                });
              }
            });

            return (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    休憩時間 ({allBreaks.length}回)
                    {clockEditEnabled && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newClockRecords = [...editData.clock_records];
                          if (newClockRecords.length > 0) {
                            if (!newClockRecords[0].breaks) {
                              newClockRecords[0].breaks = [];
                            }
                            newClockRecords[0].breaks.push({
                              break_start: new Date().toISOString(),
                              break_end: '',
                            });
                            setEditData({ ...editData, clock_records: newClockRecords });
                          }
                        }}
                        className="ml-2"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        休憩追加
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {allBreaks.length > 0 ? (
                    <div className="space-y-3">
                      {allBreaks.map(({ sessionIndex, breakIndex, break: breakRecord }, index) => (
                        <div
                          key={`${sessionIndex}-${breakIndex}`}
                          className="flex items-center justify-between text-sm bg-gray-50 p-3 rounded-lg border"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-medium text-gray-700">休憩 {index + 1}</span>
                            {editData.clock_records && editData.clock_records.length > 1 && (
                              <Badge variant="outline" className="text-xs">
                                セッション{sessionIndex + 1}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {clockEditEnabled ? (
                              <>
                                <input
                                  type="time"
                                  value={formatTime(breakRecord.break_start).substring(0, 5)}
                                  onChange={(e) => {
                                    const newClockRecords = [...editData.clock_records];
                                    const date = new Date(breakRecord.break_start);
                                    const [hours, minutes] = e.target.value.split(':');
                                    date.setHours(parseInt(hours), parseInt(minutes));
                                    newClockRecords[sessionIndex].breaks[breakIndex].break_start =
                                      date.toISOString();
                                    setEditData({ ...editData, clock_records: newClockRecords });
                                  }}
                                  className="text-sm border rounded px-2 py-1 w-24"
                                />
                                <span>-</span>
                                <input
                                  type="time"
                                  value={
                                    breakRecord.break_end
                                      ? formatTime(breakRecord.break_end).substring(0, 5)
                                      : ''
                                  }
                                  onChange={(e) => {
                                    const newClockRecords = [...editData.clock_records];
                                    const date = new Date(breakRecord.break_end || new Date());
                                    const [hours, minutes] = e.target.value.split(':');
                                    date.setHours(parseInt(hours), parseInt(minutes));
                                    newClockRecords[sessionIndex].breaks[breakIndex].break_end =
                                      date.toISOString();
                                    setEditData({ ...editData, clock_records: newClockRecords });
                                  }}
                                  className="text-sm border rounded px-2 py-1 w-24"
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const newClockRecords = [...editData.clock_records];
                                    newClockRecords[sessionIndex].breaks.splice(breakIndex, 1);
                                    setEditData({ ...editData, clock_records: newClockRecords });
                                  }}
                                  className="ml-2"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            ) : (
                              <div className="text-right">
                                <div className="font-medium">
                                  {formatTime(breakRecord.break_start)} -{' '}
                                  {breakRecord.break_end
                                    ? formatTime(breakRecord.break_end)
                                    : '終了未定'}
                                </div>
                                {breakRecord.break_end && (
                                  <div className="text-xs text-gray-500">
                                    休憩時間:{' '}
                                    {(() => {
                                      const start = new Date(breakRecord.break_start);
                                      const end = new Date(breakRecord.break_end);
                                      const diffMs = end.getTime() - start.getTime();
                                      const diffMinutes = Math.floor(diffMs / (1000 * 60));
                                      return `${Math.floor(diffMinutes / 60)}h${diffMinutes % 60}m`;
                                    })()}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">休憩記録がありません</div>
                  )}
                </CardContent>
              </Card>
            );
          })()}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChangeAction(false)} disabled={isSaving}>
            <X className="w-4 h-4 mr-2" />
            キャンセル
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? '保存中...' : '保存'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
