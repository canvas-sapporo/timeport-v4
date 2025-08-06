'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { formatDateTimeForInput, getJSTDate } from '@/lib/utils';

interface ClockRecordsInputProps {
  value: ClockRecord[];
  onChangeAction: (value: ClockRecord[]) => void;
  error?: string;
  disabled?: boolean;
  workDate?: string;
  userId?: string;
  onWorkDateChange?: (workDate: string) => void;
}

export default function ClockRecordsInput({
  value,
  onChangeAction,
  error,
  disabled = false,
  workDate,
  userId,
  onWorkDateChange,
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
    // 外部から渡されたvalueが空でない場合のみ更新
    if (value && value.length > 0) {
      setClockRecords(value);
    }
  }, [value]);

  // 勤務日変更時の処理を改善
  useEffect(() => {
    const fetchAttendanceData = async () => {
      if (!workDate || !userId) {
        console.log('ClockRecordsInput - データ取得をスキップ（workDateまたはuserIdが不足）:', {
          workDate,
          userId,
        });
        return;
      }

      console.log('ClockRecordsInput - 勤務日変更時のデータ取得開始:', { workDate, userId });

      try {
        const { getUserWorkTypeDetail } = await import('@/lib/actions/attendance');

        // 新規申請作成時は、勤務形態の設定を優先して使用
        console.log('ClockRecordsInput - ユーザーの勤務タイプ詳細を取得');

        const workTypeDetail = await getUserWorkTypeDetail(userId);
        console.log('ClockRecordsInput - 勤務タイプ詳細:', workTypeDetail);

        if (workTypeDetail) {
          // work_typesテーブルの勤務開始・終了時刻を使用してデフォルトセッションを作成
          const defaultRecord = createDefaultClockRecord(workDate, workTypeDetail);
          console.log('ClockRecordsInput - work_types設定で初期化:', defaultRecord);
          setClockRecords([defaultRecord]);
          onChangeAction([defaultRecord]);
        } else {
          // 勤務タイプが設定されていない場合：従来のデフォルト値を使用
          console.log('ClockRecordsInput - 勤務タイプ未設定、従来のデフォルト値を使用');
          const defaultRecord = createDefaultClockRecord(workDate || getJSTDate());
          setClockRecords([defaultRecord]);
          onChangeAction([defaultRecord]);
        }
      } catch (error) {
        console.error('ClockRecordsInput - データ取得エラー:', error);
        // エラーの場合もデフォルトセッションを作成
        const defaultRecord = createDefaultClockRecord(workDate || getJSTDate());
        setClockRecords([defaultRecord]);
        onChangeAction([defaultRecord]);
      }
    };

    // 勤務日が変更された場合は常にデータを取得する
    fetchAttendanceData();
  }, [workDate, userId]); // onChangeActionを依存関係から削除

  const updateClockRecords = useCallback(
    (newRecords: ClockRecord[]) => {
      setClockRecords(newRecords);
      onChangeAction(newRecords);
    },
    [onChangeAction]
  );

  const addSession = async () => {
    if (!userId) {
      console.error('addSession - userIdが設定されていません');
      // userIdがない場合は従来のデフォルト値を使用
      const newRecords = [...clockRecords, createDefaultClockRecord(workDate || getJSTDate())];
      updateClockRecords(newRecords);
      return;
    }

    try {
      // ユーザーの勤務タイプの詳細情報を取得
      const { getUserWorkTypeDetail } = await import('@/lib/actions/attendance');
      const workTypeDetail = await getUserWorkTypeDetail(userId);
      console.log('addSession - 勤務タイプ詳細:', workTypeDetail);

      // ユーザーの勤務タイプの設定を使用してデフォルトセッションを作成
      const newRecords = [
        ...clockRecords,
        createDefaultClockRecord(workDate || getJSTDate(), workTypeDetail || undefined),
      ];
      updateClockRecords(newRecords);
    } catch (error) {
      console.error('addSession - 勤務タイプ詳細取得エラー:', error);
      // エラーの場合は従来のデフォルト値を使用
      const newRecords = [...clockRecords, createDefaultClockRecord(workDate || getJSTDate())];
      updateClockRecords(newRecords);
    }
  };

  const removeSession = (index: number) => {
    const newRecords = clockRecords.filter((_, i) => i !== index);
    updateClockRecords(newRecords);
  };

  const updateSession = (index: number, field: keyof ClockRecord, value: string) => {
    const newRecords = [...clockRecords];

    if ((field === 'in_time' || field === 'out_time') && value) {
      // ユーザーが入力した時刻はJST時刻として扱う
      // datetime-local入力から取得した値は"YYYY-MM-DDTHH:mm"形式のJST時刻
      // JST時刻をUTC時刻に変換
      const jstDate = new Date(value);
      const jstOffset = 9 * 60; // JSTはUTC+9
      const utcDate = new Date(jstDate.getTime() - jstOffset * 60 * 1000);
      newRecords[index] = { ...newRecords[index], [field]: utcDate.toISOString() };
    } else {
      newRecords[index] = { ...newRecords[index], [field]: value };
    }

    updateClockRecords(newRecords);
  };

  const addBreak = (sessionIndex: number) => {
    const newRecords = [...clockRecords];
    if (!newRecords[sessionIndex].breaks) {
      newRecords[sessionIndex].breaks = [];
    }
    newRecords[sessionIndex].breaks.push(createDefaultBreakRecord(workDate));
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

    if ((field === 'break_start' || field === 'break_end') && value) {
      // ユーザーが入力した時刻はJST時刻として扱う
      // datetime-local入力から取得した値は"YYYY-MM-DDTHH:mm"形式のJST時刻
      // JST時刻をUTC時刻に変換
      const jstDate = new Date(value);
      const jstOffset = 9 * 60; // JSTはUTC+9
      const utcDate = new Date(jstDate.getTime() - jstOffset * 60 * 1000);
      newRecords[sessionIndex].breaks[breakIndex] = {
        ...newRecords[sessionIndex].breaks[breakIndex],
        [field]: utcDate.toISOString(),
      };
    } else {
      newRecords[sessionIndex].breaks[breakIndex] = {
        ...newRecords[sessionIndex].breaks[breakIndex],
        [field]: value,
      };
    }

    updateClockRecords(newRecords);
  };

  // 勤務日が変更された際に、時刻データの日付部分を更新する関数
  const updateDateTimeWithNewWorkDate = (dateTimeString: string, newWorkDate: string): string => {
    if (!dateTimeString) return '';
    try {
      const date = new Date(dateTimeString);
      // UTC時刻からJST時刻を抽出（HH:mm:ss）
      const jstOffset = 9 * 60; // JSTはUTC+9
      const jstTime = new Date(date.getTime() + jstOffset * 60 * 1000);
      const timeString = jstTime.toISOString().split('T')[1].split('.')[0];

      // 新しい勤務日でJST時刻を再構築
      const newJstDateTime = new Date(`${newWorkDate}T${timeString}`);

      // JST時刻をUTC時刻に変換
      const newUtcDateTime = new Date(newJstDateTime.getTime() - jstOffset * 60 * 1000);

      const result = newUtcDateTime.toISOString();
      console.log('updateDateTimeWithNewWorkDate:', {
        original: dateTimeString,
        newWorkDate,
        timeString,
        result,
      });
      return result;
    } catch (error) {
      console.error('updateDateTimeWithNewWorkDate error:', error);
      return '';
    }
  };

  // 日付と時刻を独立して処理するためのヘルパー関数
  const getDateFromDateTime = (dateTimeString: string): string => {
    if (!dateTimeString) return workDate || '';
    try {
      const date = new Date(dateTimeString);
      return date.toISOString().split('T')[0];
    } catch (error) {
      return workDate || '';
    }
  };

  const getTimeFromDateTime = (dateTimeString: string): string => {
    if (!dateTimeString) return '';
    try {
      const date = new Date(dateTimeString);
      return date.toISOString().split('T')[1].substring(0, 5); // HH:mm形式
    } catch (error) {
      return '';
    }
  };

  const createDateTimeFromDateAndTime = (date: string, time: string): string => {
    if (!date || !time) return '';
    return `${date}T${time}:00.000Z`;
  };

  // 勤務形態の時刻を日本時間でISO形式に変換する関数
  const createJSTDateTimeFromWorkTypeTime = (workDate: string, workTypeTime: string): string => {
    if (!workDate || !workTypeTime) return '';

    // 勤務形態の時刻はHH:mm:ss形式なので、HH:mm部分のみを抽出
    const timeOnly = workTypeTime.substring(0, 5); // HH:mm形式に変換

    // 勤務日と時刻を組み合わせて日本時間のISO形式を作成
    const jstDateTime = `${workDate}T${timeOnly}:00`;

    console.log('createJSTDateTimeFromWorkTypeTime:', {
      workDate,
      workTypeTime,
      timeOnly,
      jstDateTime,
    });

    // 日本時間をUTC時間に変換
    const jstDate = new Date(jstDateTime);

    // 日付が有効かチェック
    if (isNaN(jstDate.getTime())) {
      console.error('無効な日付が作成されました:', { jstDateTime, jstDate });
      return '';
    }

    const utcDate = new Date(jstDate.getTime() - 9 * 60 * 60 * 1000); // JSTからUTCに変換（-9時間）

    return utcDate.toISOString();
  };

  // デフォルトのClockRecordを作成する関数（勤務形態の設定を使用）
  const createDefaultClockRecord = (
    workDate: string,
    workTypeDetail?: {
      id: string;
      name: string;
      work_start_time: string;
      work_end_time: string;
    }
  ): ClockRecord => {
    const defaultInTime = workTypeDetail
      ? createJSTDateTimeFromWorkTypeTime(workDate, workTypeDetail.work_start_time)
      : createDateTimeFromDateAndTime(workDate, '09:00');

    const defaultOutTime = workTypeDetail
      ? createJSTDateTimeFromWorkTypeTime(workDate, workTypeDetail.work_end_time)
      : createDateTimeFromDateAndTime(workDate, '18:00');

    return {
      in_time: defaultInTime,
      out_time: defaultOutTime,
      breaks: [],
    };
  };

  // 勤務日変更時の処理
  const handleWorkDateChange = (newWorkDate: string) => {
    console.log('handleWorkDateChange 開始:', {
      newWorkDate,
      currentWorkDate: workDate,
      clockRecordsLength: clockRecords.length,
      clockRecords: clockRecords,
    });

    // 親コンポーネントに勤務日変更を通知
    onWorkDateChange?.(newWorkDate);

    // 勤務日が変更された場合、既存データの取得処理を実行
    // useEffectが新しいworkDateで実行されるため、自動的に既存データが取得される
  };

  return (
    <div className="space-y-4">
      {/* 勤務日選択 */}
      <div className="space-y-2">
        <Label htmlFor="work_date" className="text-sm font-medium">
          勤務日 *
        </Label>
        <Input
          id="work_date"
          type="date"
          value={workDate || ''}
          onChange={(e) => handleWorkDateChange(e.target.value)}
          disabled={disabled}
          required
        />
      </div>

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
                <div className="grid grid-cols-[2fr,1fr] gap-2">
                  <Input
                    id={`in_date_${sessionIndex}`}
                    type="date"
                    value={getDateFromDateTime(session.in_time)}
                    onChange={(e) => {
                      const currentTime = getTimeFromDateTime(session.in_time);
                      const newDateTime = createDateTimeFromDateAndTime(
                        e.target.value,
                        currentTime
                      );
                      updateSession(sessionIndex, 'in_time', newDateTime);
                    }}
                    disabled={disabled}
                    required
                  />
                  <Input
                    id={`in_time_${sessionIndex}`}
                    type="time"
                    value={getTimeFromDateTime(session.in_time)}
                    onChange={(e) => {
                      const currentDate = getDateFromDateTime(session.in_time);
                      const newDateTime = createDateTimeFromDateAndTime(
                        currentDate,
                        e.target.value
                      );
                      updateSession(sessionIndex, 'in_time', newDateTime);
                    }}
                    disabled={disabled}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`out_time_${sessionIndex}`} className="text-sm">
                  退勤時刻
                  {sessionIndex === clockRecords.length - 1 && ' *'}
                </Label>
                <div className="grid grid-cols-[2fr,1fr] gap-2">
                  <Input
                    id={`out_date_${sessionIndex}`}
                    type="date"
                    value={getDateFromDateTime(session.out_time || '')}
                    onChange={(e) => {
                      const currentTime = getTimeFromDateTime(session.out_time || '');
                      const newDateTime = createDateTimeFromDateAndTime(
                        e.target.value,
                        currentTime
                      );
                      updateSession(sessionIndex, 'out_time', newDateTime);
                    }}
                    disabled={disabled}
                    required={sessionIndex === clockRecords.length - 1}
                  />
                  <Input
                    id={`out_time_${sessionIndex}`}
                    type="time"
                    value={getTimeFromDateTime(session.out_time || '')}
                    onChange={(e) => {
                      const currentDate = getDateFromDateTime(session.out_time || '');
                      const newDateTime = createDateTimeFromDateAndTime(
                        currentDate,
                        e.target.value
                      );
                      updateSession(sessionIndex, 'out_time', newDateTime);
                    }}
                    disabled={disabled}
                    required={sessionIndex === clockRecords.length - 1}
                  />
                </div>
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
                          <div className="grid grid-cols-[2fr,1fr] gap-1">
                            <Input
                              id={`break_start_date_${sessionIndex}_${breakIndex}`}
                              type="date"
                              value={getDateFromDateTime(breakRecord.break_start)}
                              onChange={(e) => {
                                const currentTime = getTimeFromDateTime(breakRecord.break_start);
                                const newDateTime = createDateTimeFromDateAndTime(
                                  e.target.value,
                                  currentTime
                                );
                                updateBreak(sessionIndex, breakIndex, 'break_start', newDateTime);
                              }}
                              disabled={disabled}
                              required
                            />
                            <Input
                              id={`break_start_time_${sessionIndex}_${breakIndex}`}
                              type="time"
                              value={getTimeFromDateTime(breakRecord.break_start)}
                              onChange={(e) => {
                                const currentDate = getDateFromDateTime(breakRecord.break_start);
                                const newDateTime = createDateTimeFromDateAndTime(
                                  currentDate,
                                  e.target.value
                                );
                                updateBreak(sessionIndex, breakIndex, 'break_start', newDateTime);
                              }}
                              disabled={disabled}
                              required
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">終了時刻</Label>
                          <div className="grid grid-cols-[2fr,1fr] gap-1">
                            <Input
                              id={`break_end_date_${sessionIndex}_${breakIndex}`}
                              type="date"
                              value={getDateFromDateTime(breakRecord.break_end)}
                              onChange={(e) => {
                                const currentTime = getTimeFromDateTime(breakRecord.break_end);
                                const newDateTime = createDateTimeFromDateAndTime(
                                  e.target.value,
                                  currentTime
                                );
                                updateBreak(sessionIndex, breakIndex, 'break_end', newDateTime);
                              }}
                              disabled={disabled}
                              required
                            />
                            <Input
                              id={`break_end_time_${sessionIndex}_${breakIndex}`}
                              type="time"
                              value={getTimeFromDateTime(breakRecord.break_end)}
                              onChange={(e) => {
                                const currentDate = getDateFromDateTime(breakRecord.break_end);
                                const newDateTime = createDateTimeFromDateAndTime(
                                  currentDate,
                                  e.target.value
                                );
                                updateBreak(sessionIndex, breakIndex, 'break_end', newDateTime);
                              }}
                              disabled={disabled}
                              required
                            />
                          </div>
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
