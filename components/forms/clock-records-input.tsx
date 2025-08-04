'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Clock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ClockRecord, ClockBreakRecord } from '@/schemas/attendance';
import {
  createDefaultClockRecord,
  createDefaultBreakRecord,
} from '@/lib/utils/attendance-validation';

interface ClockRecordsInputProps {
  value: ClockRecord[];
  onChangeAction: (value: ClockRecord[]) => void;
  error?: string;
  disabled?: boolean;
  workDate?: string;
  userId?: string;
}

export default function ClockRecordsInput({
  value,
  onChangeAction,
  error,
  disabled = false,
  workDate,
  userId,
}: ClockRecordsInputProps) {
  console.log('ClockRecordsInput - コンポーネント開始:', {
    value,
    workDate,
    userId,
    disabled,
    error,
  });

  const [clockRecords, setClockRecords] = useState<ClockRecord[]>(value || []);

  useEffect(() => {
    console.log('ClockRecordsInput - useEffect (value):', { value });
    setClockRecords(value || []);
  }, [value]);

  // 既存の勤怠データを取得
  useEffect(() => {
    const fetchExistingAttendance = async () => {
      if (!workDate || !userId) {
        console.log('ClockRecordsInput - 既存データ取得をスキップ（workDateまたはuserIdが不足）:', {
          workDate,
          userId,
        });
        return;
      }

      // 既にデータが設定されている場合はスキップ
      if (clockRecords.length > 0 && clockRecords.some((record) => record.in_time)) {
        console.log('ClockRecordsInput - 既存データ取得をスキップ（既にデータあり）:', {
          workDate,
          userId,
          clockRecordsLength: clockRecords.length,
          hasInTime: clockRecords.some((record) => record.in_time),
        });
        return;
      }

      console.log('ClockRecordsInput - 既存データ取得開始:', { workDate, userId });

      try {
        const { getLatestAttendance } = await import('@/lib/actions/attendance');
        const existingAttendance = await getLatestAttendance(userId, workDate);

        console.log('ClockRecordsInput - 既存データ取得結果:', { existingAttendance });

        if (existingAttendance && existingAttendance.clock_records) {
          console.log('ClockRecordsInput - 既存データで初期化:', existingAttendance.clock_records);
          setClockRecords(existingAttendance.clock_records);
          onChangeAction(existingAttendance.clock_records);
        }
      } catch (error) {
        console.error('ClockRecordsInput - 既存データ取得エラー:', error);
      }
    };

    fetchExistingAttendance();
  }, [workDate, userId, clockRecords.length, onChangeAction]);

  const updateClockRecords = (newRecords: ClockRecord[]) => {
    setClockRecords(newRecords);
    onChangeAction(newRecords);
  };

  const addSession = () => {
    const newRecords = [...clockRecords, createDefaultClockRecord()];
    updateClockRecords(newRecords);
  };

  const removeSession = (index: number) => {
    const newRecords = clockRecords.filter((_, i) => i !== index);
    updateClockRecords(newRecords);
  };

  const updateSession = (index: number, field: keyof ClockRecord, value: string) => {
    const newRecords = [...clockRecords];
    newRecords[index] = { ...newRecords[index], [field]: value };
    updateClockRecords(newRecords);
  };

  const addBreak = (sessionIndex: number) => {
    const newRecords = [...clockRecords];
    if (!newRecords[sessionIndex].breaks) {
      newRecords[sessionIndex].breaks = [];
    }
    newRecords[sessionIndex].breaks.push(createDefaultBreakRecord());
    updateClockRecords(newRecords);
  };

  const removeBreak = (sessionIndex: number, breakIndex: number) => {
    const newRecords = [...clockRecords];
    newRecords[sessionIndex].breaks.splice(breakIndex, 1);
    updateClockRecords(newRecords);
  };

  const updateBreak = (
    sessionIndex: number,
    breakIndex: number,
    field: keyof ClockBreakRecord,
    value: string
  ) => {
    const newRecords = [...clockRecords];
    newRecords[sessionIndex].breaks[breakIndex] = {
      ...newRecords[sessionIndex].breaks[breakIndex],
      [field]: value,
    };
    updateClockRecords(newRecords);
  };

  const formatDateTimeForInput = (dateTimeString: string): string => {
    if (!dateTimeString) return '';
    try {
      const date = new Date(dateTimeString);
      return date.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">勤務セッション</Label>
        <Button type="button" variant="outline" size="sm" onClick={addSession} disabled={disabled}>
          <Plus className="h-4 w-4 mr-2" />
          セッション追加
        </Button>
      </div>

      {clockRecords.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Clock className="h-8 w-8 mx-auto mb-2" />
          <p>勤務セッションがありません</p>
          <p className="text-sm">「セッション追加」ボタンで勤務セッションを追加してください</p>
        </div>
      )}

      {clockRecords.map((session, sessionIndex) => (
        <Card key={sessionIndex} className="border-dashed">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">セッション {sessionIndex + 1}</CardTitle>
              {clockRecords.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeSession(sessionIndex)}
                  disabled={disabled}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 出勤・退勤時刻 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor={`in_time_${sessionIndex}`} className="text-sm">
                  出勤時刻 *
                </Label>
                <Input
                  id={`in_time_${sessionIndex}`}
                  type="datetime-local"
                  value={formatDateTimeForInput(session.in_time)}
                  onChange={(e) => updateSession(sessionIndex, 'in_time', e.target.value)}
                  disabled={disabled}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`out_time_${sessionIndex}`} className="text-sm">
                  退勤時刻
                  {sessionIndex === clockRecords.length - 1 && ' *'}
                </Label>
                <Input
                  id={`out_time_${sessionIndex}`}
                  type="datetime-local"
                  value={formatDateTimeForInput(session.out_time || '')}
                  onChange={(e) => updateSession(sessionIndex, 'out_time', e.target.value)}
                  disabled={disabled}
                  required={sessionIndex === clockRecords.length - 1}
                />
              </div>
            </div>

            {/* 休憩記録 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">休憩記録</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addBreak(sessionIndex)}
                  disabled={disabled}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  休憩追加
                </Button>
              </div>

              {session.breaks && session.breaks.length > 0 && (
                <div className="space-y-3">
                  {session.breaks.map((breakRecord, breakIndex) => (
                    <div key={breakIndex} className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="flex-1 grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">開始時刻</Label>
                          <Input
                            type="datetime-local"
                            value={formatDateTimeForInput(breakRecord.break_start)}
                            onChange={(e) =>
                              updateBreak(sessionIndex, breakIndex, 'break_start', e.target.value)
                            }
                            disabled={disabled}
                            size={1}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">終了時刻</Label>
                          <Input
                            type="datetime-local"
                            value={formatDateTimeForInput(breakRecord.break_end)}
                            onChange={(e) =>
                              updateBreak(sessionIndex, breakIndex, 'break_end', e.target.value)
                            }
                            disabled={disabled}
                            size={1}
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeBreak(sessionIndex, breakIndex)}
                        disabled={disabled}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {error && <div className="text-sm text-destructive mt-2">{error}</div>}
    </div>
  );
}
