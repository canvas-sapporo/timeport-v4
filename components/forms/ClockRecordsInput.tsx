'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Plus, Trash2, Clock, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ClockRecord, ClockBreakRecord } from '@/schemas/attendance';
import {
  createDefaultClockRecord,
  createDefaultBreakRecord,
} from '@/lib/utils/attendance-validation';
import {
  formatDateTimeForInput,
  getJSTDate,
  convertJSTDateTimeToUTC,
  convertUTCDateTimeToJST,
  formatDateTimeForInputJST,
} from '@/lib/utils';

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

  const [clockRecords, setClockRecords] = useState<ClockRecord[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const isInitialMount = useRef(true);
  const lastValueRef = useRef<ClockRecord[]>([]);
  const onChangeActionRef = useRef(onChangeAction);

  // 外部から渡されたvalueを初期値として設定（編集時）
  useEffect(() => {
    // 初回マウント時のみ実行
    if (isInitialMount.current && value && value.length > 0) {
      console.log('ClockRecordsInput - 外部valueで初期化:', value);
      setClockRecords(value);
      lastValueRef.current = value;
      setIsInitialized(true);
      isInitialMount.current = false;
    }
  }, []); // 依存関係を空配列に変更

  // 勤務日変更時の処理を改善
  useEffect(() => {
    // 編集時（外部valueがある場合）はデータ取得をスキップ
    if (value && value.length > 0) {
      console.log('ClockRecordsInput - 編集時はデータ取得をスキップ');
      return;
    }

    const fetchAttendanceData = async () => {
      if (!userId) {
        console.log('ClockRecordsInput - データ取得をスキップ（userIdが不足）:', { userId });
        // userIdがない場合はデフォルトセッションを作成
        const targetWorkDate = workDate || getJSTDate();
        const defaultRecord = createDefaultClockRecord(targetWorkDate);
        setClockRecords([defaultRecord]);
        setIsInitialized(true);
        return;
      }

      // 勤務日が設定されていない場合は日本時間の当日を使用
      const targetWorkDate = workDate || getJSTDate();
      console.log('ClockRecordsInput - 勤務日変更時のデータ取得開始:', {
        workDate,
        targetWorkDate,
        userId,
      });

      try {
        const { getLatestAttendance, getUserWorkTypeDetail } = await import(
          '@/lib/actions/attendance'
        );

        // 1. 当日のattendancesテーブルからデータを取得
        const existingAttendance = await getLatestAttendance(userId, targetWorkDate);
        console.log('ClockRecordsInput - 当日のattendancesデータ取得結果:', { existingAttendance });

        if (
          existingAttendance &&
          existingAttendance.clock_records &&
          existingAttendance.clock_records.length > 0
        ) {
          // attendancesテーブルにデータがある場合：そのデータを使用
          console.log(
            'ClockRecordsInput - attendancesデータで初期化:',
            existingAttendance.clock_records
          );
          setClockRecords(existingAttendance.clock_records);
        } else {
          // attendancesテーブルにデータがない場合：work_typesテーブルの設定を使用
          console.log('ClockRecordsInput - attendancesデータなし、ユーザーの勤務タイプ詳細を取得');

          const workTypeDetail = await getUserWorkTypeDetail(userId);
          console.log('ClockRecordsInput - 勤務タイプ詳細:', workTypeDetail);

          if (workTypeDetail) {
            // work_typesテーブルの勤務開始・終了時刻を使用してデフォルトセッションを作成
            const defaultRecord = createDefaultClockRecord(targetWorkDate, workTypeDetail);
            console.log('ClockRecordsInput - work_types設定で初期化:', defaultRecord);
            setClockRecords([defaultRecord]);
          } else {
            // 勤務タイプが設定されていない場合：従来のデフォルト値を使用
            console.log('ClockRecordsInput - 勤務タイプ未設定、従来のデフォルト値を使用');
            const defaultRecord = createDefaultClockRecord(targetWorkDate);
            setClockRecords([defaultRecord]);
          }
        }
        setIsInitialized(true);
      } catch (error) {
        console.error('ClockRecordsInput - データ取得エラー:', error);
        // エラーの場合もデフォルトセッションを作成
        const targetWorkDate = workDate || getJSTDate();
        const defaultRecord = createDefaultClockRecord(targetWorkDate);
        setClockRecords([defaultRecord]);
        setIsInitialized(true);
      }
    };

    // 初期化されていない場合のみデータを取得する
    if (!isInitialized) {
      fetchAttendanceData();
    }
  }, [workDate, userId]); // valueとisInitializedを依存関係から削除

  // onChangeActionRefを更新
  useEffect(() => {
    onChangeActionRef.current = onChangeAction;
  }, [onChangeAction]);

  // clockRecordsが変更されたときにonChangeActionを呼び出す（初期化後のみ）
  useEffect(() => {
    if (isInitialized && clockRecords.length > 0) {
      // 前回の値と比較して、実際に変更があった場合のみonChangeActionを呼び出す
      const currentValue = JSON.stringify(clockRecords);
      const lastValue = JSON.stringify(lastValueRef.current);

      if (currentValue !== lastValue) {
        console.log('ClockRecordsInput - onChangeAction呼び出し:', clockRecords);
        lastValueRef.current = clockRecords;
        // onChangeActionを非同期で実行して無限ループを防ぐ
        setTimeout(() => {
          onChangeActionRef.current(clockRecords);
        }, 0);
      }
    }
  }, [clockRecords, isInitialized]); // onChangeActionを依存関係から削除

  const updateClockRecords = useCallback((newRecords: ClockRecord[]) => {
    console.log('ClockRecordsInput - updateClockRecords:', newRecords);
    setClockRecords(newRecords);
  }, []);

  const addSession = async () => {
    if (!userId) {
      console.error('addSession - userIdが設定されていません');
      // userIdがない場合は従来のデフォルト値を使用
      const targetWorkDate = workDate || getJSTDate();
      const newRecords = [...clockRecords, createDefaultClockRecord(targetWorkDate)];
      updateClockRecords(newRecords);
      return;
    }

    try {
      // ユーザーの勤務タイプの詳細情報を取得
      const { getUserWorkTypeDetail } = await import('@/lib/actions/attendance');
      const workTypeDetail = await getUserWorkTypeDetail(userId);
      console.log('addSession - 勤務タイプ詳細:', workTypeDetail);

      // 勤務日が設定されていない場合は日本時間の当日を使用
      const targetWorkDate = workDate || getJSTDate();

      // ユーザーの勤務タイプの設定を使用してデフォルトセッションを作成
      const newRecords = [
        ...clockRecords,
        createDefaultClockRecord(targetWorkDate, workTypeDetail || undefined),
      ];
      updateClockRecords(newRecords);
    } catch (error) {
      console.error('addSession - 勤務タイプ詳細取得エラー:', error);
      // エラーの場合は従来のデフォルト値を使用
      const targetWorkDate = workDate || getJSTDate();
      const newRecords = [...clockRecords, createDefaultClockRecord(targetWorkDate)];
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
      // 新しい統一された関数を使用してJST時刻をUTC時刻に変換
      const utcDateTime = convertJSTDateTimeToUTC(value + ':00');

      console.log('updateSession - 時刻更新:', {
        field,
        inputValue: value,
        utcDateTime,
      });

      newRecords[index] = { ...newRecords[index], [field]: utcDateTime };
    } else {
      newRecords[index] = { ...newRecords[index], [field]: value };
    }

    updateClockRecords(newRecords);
  };

  const addBreak = async (sessionIndex: number) => {
    if (!userId) {
      // userIdがない場合は従来のデフォルト値を使用
      const newRecords = [...clockRecords];
      if (!newRecords[sessionIndex].breaks) {
        newRecords[sessionIndex].breaks = [];
      }
      newRecords[sessionIndex].breaks.push(createDefaultBreakRecord(workDate));
      updateClockRecords(newRecords);
      return;
    }

    try {
      // ユーザーの勤務タイプの詳細情報を取得
      const { getUserWorkTypeDetail } = await import('@/lib/actions/attendance');
      const workTypeDetail = await getUserWorkTypeDetail(userId);
      console.log('addBreak - 勤務タイプ詳細:', workTypeDetail);

      const newRecords = [...clockRecords];
      if (!newRecords[sessionIndex].breaks) {
        newRecords[sessionIndex].breaks = [];
      }

      if (workTypeDetail?.break_times && workTypeDetail.break_times.length > 0) {
        // work_typesのbreak_timesから次の休憩を追加
        const existingBreakCount = newRecords[sessionIndex].breaks.length;
        const nextBreakTime = workTypeDetail.break_times.find(
          (bt) => bt.order === existingBreakCount
        );

        if (nextBreakTime) {
          const targetDate = workDate || getJSTDate();

          // break_timesの時刻はJST時刻として扱う
          const jstBreakStartStr = `${targetDate}T${nextBreakTime.start_time}:00`;
          const jstBreakEndStr = `${targetDate}T${nextBreakTime.end_time}:00`;

          // 新しい統一された関数を使用してJST時刻をUTC時刻に変換
          newRecords[sessionIndex].breaks.push({
            break_start: convertJSTDateTimeToUTC(jstBreakStartStr),
            break_end: convertJSTDateTimeToUTC(jstBreakEndStr),
          });

          console.log('addBreak - work_typesのbreak_times使用:', nextBreakTime);
        } else {
          // 対応するbreak_timesがない場合は従来のデフォルト値を使用
          newRecords[sessionIndex].breaks.push(createDefaultBreakRecord(workDate));
        }
      } else {
        // break_timesがない場合は従来のデフォルト値を使用
        newRecords[sessionIndex].breaks.push(createDefaultBreakRecord(workDate));
      }

      updateClockRecords(newRecords);
    } catch (error) {
      console.error('addBreak - 勤務タイプ詳細取得エラー:', error);
      // エラーの場合は従来のデフォルト値を使用
      const newRecords = [...clockRecords];
      if (!newRecords[sessionIndex].breaks) {
        newRecords[sessionIndex].breaks = [];
      }
      newRecords[sessionIndex].breaks.push(createDefaultBreakRecord(workDate));
      updateClockRecords(newRecords);
    }
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
      // 新しい統一された関数を使用してJST時刻をUTC時刻に変換
      const utcDateTime = convertJSTDateTimeToUTC(value + ':00');

      newRecords[sessionIndex].breaks[breakIndex] = {
        ...newRecords[sessionIndex].breaks[breakIndex],
        [field]: utcDateTime,
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
      // UTC時刻をJST時刻に変換して時刻部分を抽出
      const jstDateTime = convertUTCDateTimeToJST(dateTimeString);
      const timeString = jstDateTime.split(' ')[1]; // HH:mm:ss部分を取得

      // 新しい勤務日でJST時刻を再構築
      const newJstDateTimeStr = `${newWorkDate}T${timeString}`;

      // JST時刻をUTC時刻に変換
      const result = convertJSTDateTimeToUTC(newJstDateTimeStr);

      console.log('updateDateTimeWithNewWorkDate:', {
        original: dateTimeString,
        newWorkDate,
        timeString,
        newJstDateTimeStr,
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
      // UTC時刻をJST時刻に変換して日付を取得
      const jstDate = date.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' });
      const jstDateOnly = jstDate.split(',')[0];
      // 勤務日が指定されている場合は勤務日を優先、そうでなければJST時刻の日付を使用
      return workDate || jstDateOnly;
    } catch (error) {
      return workDate || '';
    }
  };

  const getTimeFromDateTime = (dateTimeString: string): string => {
    if (!dateTimeString) return '';
    try {
      const date = new Date(dateTimeString);
      // UTC時刻をJST時刻に変換して時刻を取得
      const jstTime = date.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Tokyo',
      });
      return jstTime; // HH:mm形式
    } catch (error) {
      return '';
    }
  };

  const createDateTimeFromDateAndTime = (date: string, time: string): string => {
    if (!date || !time) return '';
    // 指定された日付と時刻でJST時刻を作成し、UTC時刻に変換
    const jstDateTime = `${date}T${time}:00`;

    // 新しい統一された関数を使用してJST時刻をUTC時刻に変換
    const utcDateTime = convertJSTDateTimeToUTC(jstDateTime);

    console.log('createDateTimeFromDateAndTime:', {
      inputDate: date,
      inputTime: time,
      jstDateTime,
      utcDateTime,
    });

    return utcDateTime;
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

    // 勤務日が変更された場合、既存の時刻データの日付部分を更新
    if (clockRecords.length > 0) {
      const updatedRecords = clockRecords.map((record) => ({
        ...record,
        in_time: updateDateTimeWithNewWorkDate(record.in_time, newWorkDate),
        out_time: record.out_time
          ? updateDateTimeWithNewWorkDate(record.out_time, newWorkDate)
          : undefined,
        breaks:
          record.breaks?.map((breakRecord) => ({
            ...breakRecord,
            break_start: updateDateTimeWithNewWorkDate(breakRecord.break_start, newWorkDate),
            break_end: updateDateTimeWithNewWorkDate(breakRecord.break_end, newWorkDate),
          })) || [],
      }));

      console.log('handleWorkDateChange - 時刻データ更新:', {
        originalRecords: clockRecords,
        updatedRecords: updatedRecords,
      });

      setClockRecords(updatedRecords);
      // onChangeActionは別のuseEffectで処理されるため、ここでは呼び出さない
    }
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
                  onClick={async () => await addBreak(sessionIndex)}
                  disabled={disabled}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  休憩追加
                </Button>
              </div>

              {session.breaks && session.breaks.length > 0 && (
                <div className="space-y-3">
                  {session.breaks.map((breakRecord, breakIndex) => (
                    <div key={breakIndex} className="space-y-3 p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">休憩 {breakIndex + 1}</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeBreak(sessionIndex, breakIndex)}
                          disabled={disabled}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs font-medium">開始時刻</Label>
                          <div className="grid grid-cols-2 gap-2">
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
                              className="text-sm"
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
                              className="text-sm"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-medium">終了時刻</Label>
                          <div className="grid grid-cols-2 gap-2">
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
                              className="text-sm"
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
                              className="text-sm"
                            />
                          </div>
                        </div>
                      </div>
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
