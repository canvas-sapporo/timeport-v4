'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { deleteWorkType, getWorkTypes } from '@/lib/actions/admin/work-types';
import { useToast } from '@/hooks/use-toast';
import type { WorkType } from '@/types/employment_type';

// 時刻フォーマット関数を追加
const formatTime = (time: string) => {
  if (!time) return '--:--';
  return time.substring(0, 5); // HH:MM形式で表示
};

const deleteWorkTypeSchema = z.object({
  replacement_work_type_id: z.string().min(1, '代替勤務形態を選択してください'),
});

interface WorkTypeDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workType: WorkType | null;
  companyId: string;
  onSuccess: () => void;
}

export default function WorkTypeDeleteDialog({
  open,
  onOpenChange,
  workType,
  companyId,
  onSuccess,
}: WorkTypeDeleteDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [availableWorkTypes, setAvailableWorkTypes] = useState<WorkType[]>([]);
  const { toast } = useToast();

  const form = useForm<{ replacement_work_type_id: string }>({
    resolver: zodResolver(deleteWorkTypeSchema),
    defaultValues: {
      replacement_work_type_id: '',
    },
  });

  // 利用可能な勤務形態を取得
  useEffect(() => {
    if (open && workType) {
      const fetchWorkTypes = async () => {
        try {
          const result = await getWorkTypes(companyId, {
            status: 'active',
            page: 1,
            limit: 100,
          });

          if (result.success) {
            // 削除対象の勤務形態を除外
            const filtered = result.data.work_types.filter((wt) => wt.id !== workType.id);
            setAvailableWorkTypes(filtered);

            // 最初の勤務形態をデフォルト選択
            if (filtered.length > 0) {
              form.setValue('replacement_work_type_id', filtered[0].id);
            }
          }
        } catch (error) {
          console.error('勤務形態取得エラー:', error);
        }
      };

      fetchWorkTypes();
    }
  }, [open, workType, companyId, form]);

  const onSubmit = async (data: { replacement_work_type_id: string }) => {
    if (!workType) return;

    // 代替勤務形態が選択されているかチェック
    if (!data.replacement_work_type_id) {
      toast({
        title: 'エラーが発生しました',
        description: '代替勤務形態を選択してください',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await deleteWorkType(workType.id, data.replacement_work_type_id);

      if (result.success) {
        toast({
          title: '勤務形態を削除しました',
          description: `${workType.name} が正常に削除されました`,
        });
        form.reset();
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
      console.error('勤務形態削除エラー:', error);
      toast({
        title: 'エラーが発生しました',
        description: '勤務形態の削除に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!workType) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-500" />
            勤務形態を削除
          </DialogTitle>
          <DialogDescription>
            この勤務形態を削除しますか？この操作は取り消せません。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 削除対象の情報 */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">削除対象</h4>
            <div className="space-y-1 text-sm">
              <div>
                <span className="font-medium">名前:</span> {workType.name}
              </div>
              <div>
                <span className="font-medium">コード:</span> {workType.code || '-'}
              </div>
              <div>
                <span className="font-medium">勤務時間:</span>{' '}
                {formatTime(workType.work_start_time)} - {formatTime(workType.work_end_time)}
              </div>
              <div>
                <span className="font-medium">タイプ:</span>{' '}
                {workType.is_flexible ? 'フレックス' : '通常'}
              </div>
            </div>
          </div>

          {/* 警告 */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              この勤務形態を使用している従業員がいる場合、代替勤務形態を指定する必要があります。
            </AlertDescription>
          </Alert>

          {/* 代替勤務形態選択 */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="replacement_work_type_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>代替勤務形態 *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="代替勤務形態を選択してください" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableWorkTypes.map((wt) => (
                          <SelectItem key={wt.id} value={wt.id}>
                            {wt.name} ({wt.code || 'コードなし'})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={isLoading || availableWorkTypes.length === 0}
                >
                  {isLoading ? '削除中...' : '削除'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
