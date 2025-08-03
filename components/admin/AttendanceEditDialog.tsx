'use client';

import { useState, useEffect } from 'react';
import { Clock, User, Calendar, FileText, AlertCircle, Save, X } from 'lucide-react';

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
import { getAttendanceDetail, updateAttendance, getWorkTypes } from '@/lib/actions/attendance';
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

  // 編集用の状態
  const [editData, setEditData] = useState({
    work_type_id: 'none',
    description: '',
    status: 'normal' as 'normal' | 'late' | 'early_leave' | 'absent',
    auto_calculated: true,
    clock_records: [] as ClockRecord[],
  });

  useEffect(() => {
    if (open && attendanceId) {
      fetchAttendanceDetail();
      fetchWorkTypes();
    } else {
      setAttendance(null);
      setError(null);
      setEditData({
        work_type_id: 'none',
        description: '',
        status: 'normal',
        auto_calculated: true,
        clock_records: [],
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

  const handleSave = async () => {
    if (!attendanceId) return;

    setIsSaving(true);

    try {
      const result = await updateAttendance(
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
              </div>
            </CardContent>
          </Card>

          {/* 現在の勤務時間（読み取り専用） */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                現在の勤務時間（読み取り専用）
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

          {/* 勤務セッション（読み取り専用） */}
          {attendance.clock_records && attendance.clock_records.length > 0 && (
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
