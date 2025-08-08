'use client';

import { useState } from 'react';
import { Plus, X, Clock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { BreakTime } from '@/schemas/work-types';

// UUID生成関数
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

interface BreakTimesInputProps {
  value: BreakTime[] | undefined;
  onChange: (value: BreakTime[]) => void;
  workStartTime: string;
  workEndTime: string;
  disabled?: boolean;
  error?: string;
}

export default function BreakTimesInput({
  value,
  onChange,
  workStartTime,
  workEndTime,
  disabled = false,
  error,
}: BreakTimesInputProps) {
  const [localBreakTimes, setLocalBreakTimes] = useState<BreakTime[]>(value || []);

  const addBreakTime = () => {
    const newBreakTime: BreakTime = {
      id: generateUUID(),
      name: `休息${localBreakTimes.length + 1}`,
      start_time: '12:00',
      end_time: '13:00',
      order: localBreakTimes.length,
    };
    const updatedBreakTimes = [...localBreakTimes, newBreakTime];
    setLocalBreakTimes(updatedBreakTimes);
    onChange(updatedBreakTimes);
  };

  const updateBreakTime = (index: number, field: keyof BreakTime, newValue: string | number) => {
    const updatedBreakTimes = localBreakTimes.map((breakTime, i) => {
      if (i === index) {
        return { ...breakTime, [field]: newValue };
      }
      return breakTime;
    });
    setLocalBreakTimes(updatedBreakTimes);
    onChange(updatedBreakTimes);
  };

  const removeBreakTime = (index: number) => {
    const updatedBreakTimes = localBreakTimes.filter((_, i) => i !== index);
    // 順番を再設定
    const reorderedBreakTimes = updatedBreakTimes.map((breakTime, i) => ({
      ...breakTime,
      order: i,
    }));
    setLocalBreakTimes(reorderedBreakTimes);
    onChange(reorderedBreakTimes);
  };

  const validateBreakTimes = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // 勤務時間内チェック
    localBreakTimes.forEach((breakTime, index) => {
      if (breakTime.start_time < workStartTime) {
        errors.push(
          `${breakTime.name}: 休息開始時刻は勤務開始時刻（${workStartTime}）以降に設定してください`
        );
      }
      if (breakTime.end_time > workEndTime) {
        errors.push(
          `${breakTime.name}: 休息終了時刻は勤務終了時刻（${workEndTime}）以前に設定してください`
        );
      }
      if (breakTime.start_time >= breakTime.end_time) {
        errors.push(`${breakTime.name}: 休息終了時刻は休息開始時刻より後に設定してください`);
      }
    });

    // 重複チェック
    for (let i = 0; i < localBreakTimes.length; i++) {
      for (let j = i + 1; j < localBreakTimes.length; j++) {
        const break1 = localBreakTimes[i];
        const break2 = localBreakTimes[j];

        if (
          (break1.start_time <= break2.start_time && break1.end_time > break2.start_time) ||
          (break2.start_time <= break1.start_time && break2.end_time > break1.start_time)
        ) {
          errors.push(`${break1.name}と${break2.name}の時間が重複しています`);
        }
      }
    }

    return { isValid: errors.length === 0, errors };
  };

  const validation = validateBreakTimes();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">休息時刻設定</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addBreakTime}
          disabled={disabled}
        >
          <Plus className="h-4 w-4 mr-2" />
          休息追加
        </Button>
      </div>

      {localBreakTimes.length === 0 ? (
        <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
          <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p>休息時刻が設定されていません</p>
          <p className="text-sm">「休息追加」ボタンから休息時刻を設定してください</p>
        </div>
      ) : (
        <div className="space-y-3">
          {localBreakTimes.map((breakTime, index) => (
            <Card key={breakTime.id} className="border-2">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {breakTime.name}
                  </CardTitle>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeBreakTime(index)}
                    disabled={disabled}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`break-name-${index}`} className="text-xs font-medium">
                      休息名
                    </Label>
                    <Input
                      id={`break-name-${index}`}
                      value={breakTime.name}
                      onChange={(e) => updateBreakTime(index, 'name', e.target.value)}
                      disabled={disabled}
                      placeholder="例：昼休憩"
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`break-start-${index}`} className="text-xs font-medium">
                      開始時刻
                    </Label>
                    <Input
                      id={`break-start-${index}`}
                      type="time"
                      value={breakTime.start_time}
                      onChange={(e) => updateBreakTime(index, 'start_time', e.target.value)}
                      disabled={disabled}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`break-end-${index}`} className="text-xs font-medium">
                      終了時刻
                    </Label>
                    <Input
                      id={`break-end-${index}`}
                      type="time"
                      value={breakTime.end_time}
                      onChange={(e) => updateBreakTime(index, 'end_time', e.target.value)}
                      disabled={disabled}
                      className="text-sm"
                    />
                  </div>
                </div>

                {/* 休息時間の表示 */}
                <div className="text-xs text-gray-600">
                  休息時間:{' '}
                  {(() => {
                    const start = new Date(`2000-01-01T${breakTime.start_time}:00`);
                    const end = new Date(`2000-01-01T${breakTime.end_time}:00`);
                    const diffMs = end.getTime() - start.getTime();
                    const diffMinutes = Math.floor(diffMs / (1000 * 60));
                    const hours = Math.floor(diffMinutes / 60);
                    const minutes = diffMinutes % 60;
                    return `${hours}時間${minutes}分`;
                  })()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* バリデーションエラー表示 */}
      {!validation.isValid && (
        <Alert variant="destructive">
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {validation.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* 外部エラー表示 */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 総休息時間の表示 */}
      {localBreakTimes.length > 0 && (
        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
          <strong>総休息時間:</strong>{' '}
          {(() => {
            const totalMinutes = localBreakTimes.reduce((total, breakTime) => {
              const start = new Date(`2000-01-01T${breakTime.start_time}:00`);
              const end = new Date(`2000-01-01T${breakTime.end_time}:00`);
              const diffMs = end.getTime() - start.getTime();
              return total + Math.floor(diffMs / (1000 * 60));
            }, 0);
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            return `${hours}時間${minutes}分`;
          })()}
        </div>
      )}
    </div>
  );
}
