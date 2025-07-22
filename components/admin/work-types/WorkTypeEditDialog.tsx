'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Clock, AlertCircle, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { updateWorkType, toggleWorkTypeStatus } from '@/lib/actions/admin/work-types';
import { useToast } from '@/hooks/use-toast';
import type { WorkType, EditWorkTypeFormData } from '@/types/employment_type';

const editWorkTypeSchema = z
  .object({
    code: z.string().min(1, 'コードは必須です').max(50, 'コードは50文字以内で入力してください'),
    name: z
      .string()
      .min(1, '勤務形態名は必須です')
      .max(255, '勤務形態名は255文字以内で入力してください'),
    work_start_time: z.string().min(1, '勤務開始時刻は必須です'),
    work_end_time: z.string().min(1, '勤務終了時刻は必須です'),
    break_duration_minutes: z.number().min(0, '休憩時間は0分以上で入力してください'),
    is_flexible: z.boolean(),
    flex_start_time: z.string().optional(),
    flex_end_time: z.string().optional(),
    core_start_time: z.string().optional(),
    core_end_time: z.string().optional(),
    overtime_threshold_minutes: z.number().min(0, '残業開始閾値は0分以上で入力してください'),
    description: z.string().max(1000, '説明は1000文字以内で入力してください'),
  })
  .refine(
    (data) => {
      if (data.work_start_time >= data.work_end_time) {
        return false;
      }
      return true;
    },
    {
      message: '勤務開始時刻は勤務終了時刻より前である必要があります',
      path: ['work_end_time'],
    }
  )
  .refine(
    (data) => {
      if (data.is_flexible) {
        if (!data.flex_start_time || !data.flex_end_time) {
          return false;
        }
        if (data.flex_start_time >= data.flex_end_time) {
          return false;
        }
      }
      return true;
    },
    {
      message: 'フレックス開始時刻はフレックス終了時刻より前である必要があります',
      path: ['flex_end_time'],
    }
  )
  .refine(
    (data) => {
      if (data.is_flexible && data.flex_start_time && data.flex_end_time) {
        if (data.core_start_time && data.core_end_time) {
          if (data.core_start_time >= data.core_end_time) {
            return false;
          }
          if (
            data.flex_start_time > data.core_start_time ||
            data.core_end_time > data.flex_end_time
          ) {
            return false;
          }
        }
      }
      return true;
    },
    {
      message: 'コアタイムはフレックス時間内に設定してください',
      path: ['core_end_time'],
    }
  );

interface WorkTypeEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workType: WorkType | null;
  companyId: string;
  onSuccess: () => void;
}

export default function WorkTypeEditDialog({
  open,
  onOpenChange,
  workType,
  companyId,
  onSuccess,
}: WorkTypeEditDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isStatusLoading, setIsStatusLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<EditWorkTypeFormData>({
    resolver: zodResolver(editWorkTypeSchema),
    defaultValues: {
      code: '',
      name: '',
      work_start_time: '09:00',
      work_end_time: '18:00',
      break_duration_minutes: 60,
      is_flexible: false,
      flex_start_time: '',
      flex_end_time: '',
      core_start_time: '',
      core_end_time: '',
      overtime_threshold_minutes: 480,
      description: '',
    },
  });

  const isFlexible = form.watch('is_flexible');
  const requireCoreTime = process.env.NEXT_PUBLIC_FLEX_WORK_REQUIRE_CORE_TIME === 'true';

  // 勤務形態データが変更されたときにフォームを更新
  useEffect(() => {
    if (workType) {
      form.reset({
        code: workType.code || '',
        name: workType.name,
        work_start_time: workType.work_start_time,
        work_end_time: workType.work_end_time,
        break_duration_minutes: workType.break_duration_minutes,
        is_flexible: workType.is_flexible,
        flex_start_time: workType.flex_start_time || '',
        flex_end_time: workType.flex_end_time || '',
        core_start_time: workType.core_start_time || '',
        core_end_time: workType.core_end_time || '',
        overtime_threshold_minutes: workType.overtime_threshold_minutes,
        description: workType.description || '',
      });
    }
  }, [workType, form]);

  const onSubmit = async (data: EditWorkTypeFormData) => {
    if (!workType) return;

    setIsLoading(true);
    try {
      const result = await updateWorkType(workType.id, data, companyId);

      if (result.success) {
        toast({
          title: '勤務形態を更新しました',
          description: `${data.name} が正常に更新されました`,
        });
        onOpenChange(false);
        onSuccess();
      } else {
        toast({
          title: 'エラーが発生しました',
          description: result.error.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('勤務形態更新エラー:', error);
      toast({
        title: 'エラーが発生しました',
        description: '勤務形態の更新に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!workType) return;

    setIsStatusLoading(true);
    try {
      const result = await toggleWorkTypeStatus(workType.id, companyId);

      if (result.success) {
        toast({
          title: 'ステータスを変更しました',
          description: `${workType.name} を${result.data.is_active ? '有効' : '無効'}にしました`,
        });
        onSuccess();
      } else {
        toast({
          title: 'エラーが発生しました',
          description: result.error.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('ステータス変更エラー:', error);
      toast({
        title: 'エラーが発生しました',
        description: 'ステータスの変更に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsStatusLoading(false);
    }
  };

  if (!workType) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>勤務形態を編集</DialogTitle>
          <DialogDescription>勤務形態の情報を編集してください。</DialogDescription>
        </DialogHeader>

        {/* ステータス切り替え */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">ステータス:</span>
            <span className={`text-sm ${workType.is_active ? 'text-green-600' : 'text-gray-500'}`}>
              {workType.is_active ? '有効' : '無効'}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleStatus}
            disabled={isStatusLoading}
            className="flex items-center gap-2"
          >
            {workType.is_active ? (
              <>
                <ToggleLeft className="h-4 w-4" />
                無効化
              </>
            ) : (
              <>
                <ToggleRight className="h-4 w-4" />
                有効化
              </>
            )}
          </Button>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* 基本情報 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>コード</FormLabel>
                    <FormControl>
                      <Input placeholder="WT001" {...field} />
                    </FormControl>
                    <FormDescription>勤務形態を識別するためのコード</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>勤務形態名 *</FormLabel>
                    <FormControl>
                      <Input placeholder="通常勤務" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 勤務時間 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Clock className="h-5 w-5" />
                勤務時間
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="work_start_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>勤務開始時刻 *</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="work_end_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>勤務終了時刻 *</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="break_duration_minutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>休憩時間（分）</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* フレックス勤務設定 */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="is_flexible"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>フレックス勤務</FormLabel>
                      <FormDescription>
                        フレックス勤務を有効にする場合は、フレックス時間とコアタイムを設定してください
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {isFlexible && (
                <div className="space-y-4 pl-6 border-l-2 border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="flex_start_time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>フレックス開始時刻 *</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="flex_end_time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>フレックス終了時刻 *</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="core_start_time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            コアタイム開始時刻
                            {requireCoreTime && ' *'}
                          </FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormDescription>必ず出勤している必要がある時間帯</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="core_end_time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            コアタイム終了時刻
                            {requireCoreTime && ' *'}
                          </FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormDescription>必ず出勤している必要がある時間帯</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {requireCoreTime && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        フレックス勤務の場合は、コアタイムの設定が必須です。
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </div>

            {/* その他設定 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="overtime_threshold_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>残業開始閾値（分）</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>この時間を超えると残業として扱われます</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 説明 */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>説明</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="勤務形態の詳細な説明を入力してください"
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                キャンセル
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? '更新中...' : '更新'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
