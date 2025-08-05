'use client';

import { useState, useEffect } from 'react';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

import { useAuth } from '@/contexts/auth-context';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn, getJSTDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { updateRequest, updateRequestStatus } from '@/lib/actions/requests';
import ClockRecordsInput from '@/components/forms/clock-records-input';
import { RequestData, FormFieldConfig } from '@/schemas/request';
import { RequestFormData } from '@/schemas/request-forms';
import { DynamicFormData } from '@/types/dynamic-data';

interface RequestEditDialogProps {
  isOpen: boolean;
  onCloseAction: () => void;
  request: RequestData;
  requestForms: RequestFormData[];
  onSuccessAction: () => void;
}

const RequestEditDialog = ({
  isOpen,
  onCloseAction,
  request,
  requestForms,
  onSuccessAction,
}: RequestEditDialogProps) => {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [formData, setFormData] = useState<DynamicFormData>({});
  const [targetDate, setTargetDate] = useState<Date | undefined>(
    request?.target_date ? new Date(request.target_date) : undefined
  );
  const [startDate, setStartDate] = useState<Date | undefined>(
    request?.start_date ? new Date(request.start_date) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    request?.end_date ? new Date(request.end_date) : undefined
  );

  const requestForm = requestForms.find(
    (form: RequestFormData) => (form as unknown as { id: string }).id === request?.request_form_id
  );

  useEffect(() => {
    if (request) {
      setFormData((request.form_data as DynamicFormData) || {});
      setTargetDate(request.target_date ? new Date(request.target_date) : undefined);
      setStartDate(request.start_date ? new Date(request.start_date) : undefined);
      setEndDate(request.end_date ? new Date(request.end_date) : undefined);
    }
  }, [request]);

  const handleSubmit = async () => {
    if (!request) return;

    setIsLoading(true);
    try {
      // 日付の検証とクリーンアップ
      const validateAndCleanDate = (dateValue: Date | undefined): string | null => {
        if (!dateValue) return null;
        const date = new Date(dateValue);
        return isNaN(date.getTime()) ? null : getJSTDate(date);
      };

      const cleanedFormData = { ...formData };
      // 無効な日付値を削除
      Object.keys(cleanedFormData).forEach((key) => {
        const value = cleanedFormData[key];
        if (value === 'aaa' || value === 'undefined' || value === 'null' || value === '') {
          delete cleanedFormData[key];
        }
      });

      const result = await updateRequest(
        request.id,
        {
          form_data: cleanedFormData,
          target_date: validateAndCleanDate(targetDate),
          start_date: validateAndCleanDate(startDate),
          end_date: validateAndCleanDate(endDate),
        },
        currentUser?.id
      );

      if (result.success) {
        toast({
          title: '申請更新完了',
          description: '申請が正常に更新されました。',
        });
        onSuccessAction();
        onCloseAction();
      } else {
        toast({
          title: 'エラー',
          description: result.error || '申請の更新に失敗しました。',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('申請更新エラー:', error);
      toast({
        title: 'エラー',
        description: '申請の更新中にエラーが発生しました。',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormDataChange = (fieldName: string, value: unknown) => {
    setFormData(
      (prev: DynamicFormData) =>
        ({
          ...prev,
          [fieldName]: value,
        }) as DynamicFormData
    );
  };

  const handleSubmitRequest = () => {
    setIsSubmitDialogOpen(true);
  };

  const confirmSubmitRequest = async () => {
    if (!request) return;

    setIsLoading(true);
    try {
      // まず申請内容を更新
      const validateAndCleanDate = (dateValue: Date | undefined): string | null => {
        if (!dateValue) return null;
        const date = new Date(dateValue);
        return isNaN(date.getTime()) ? null : getJSTDate(date);
      };

      const cleanedFormData = { ...formData };
      // 無効な日付値を削除
      Object.keys(cleanedFormData).forEach((key) => {
        const value = cleanedFormData[key];
        if (value === 'aaa' || value === 'undefined' || value === 'null' || value === '') {
          delete cleanedFormData[key];
        }
      });

      // 申請内容を更新
      const updateResult = await updateRequest(
        request.id,
        {
          form_data: cleanedFormData,
          target_date: validateAndCleanDate(targetDate),
          start_date: validateAndCleanDate(startDate),
          end_date: validateAndCleanDate(endDate),
        },
        currentUser?.id
      );

      if (!updateResult.success) {
        throw new Error(updateResult.error || '申請の更新に失敗しました。');
      }

      // ステータスを「承認待ち」に更新
      const statusResult = await updateRequestStatus(request.id, 'pending');

      if (statusResult.success) {
        toast({
          title: '申請完了',
          description: '申請が正常に送信されました。',
        });
        setIsSubmitDialogOpen(false);
        onSuccessAction();
        onCloseAction();
      } else {
        toast({
          title: 'エラー',
          description: statusResult.error || '申請の送信に失敗しました。',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('申請送信エラー:', error);
      toast({
        title: 'エラー',
        description: '申請の送信中にエラーが発生しました。',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onCloseAction}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>申請編集</span>
            <Button variant="ghost" size="sm" onClick={onCloseAction}>
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 申請種別 */}
          <div>
            <Label>申請種別</Label>
            <Input value={requestForm?.name || ''} disabled />
          </div>

          {/* 対象日 */}
          <div>
            <Label>対象日</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !targetDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {targetDate ? format(targetDate, 'yyyy/MM/dd', { locale: ja }) : '日付を選択'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={targetDate}
                  onSelect={setTargetDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* 期間（開始日・終了日） */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>開始日</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !startDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'yyyy/MM/dd', { locale: ja }) : '日付を選択'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>終了日</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !endDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, 'yyyy/MM/dd', { locale: ja }) : '日付を選択'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* 動的フォーム */}
          {requestForm && (
            <div>
              <Label>申請内容</Label>
              <div className="space-y-4">
                {requestForm.form_config?.map((field: FormFieldConfig) => (
                  <div key={field.id} className="space-y-2">
                    <Label htmlFor={field.name}>
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    {field.type === 'object' && field.metadata?.object_type === 'attendance' ? (
                      <ClockRecordsInput
                        value={
                          (formData[field.name] as unknown as {
                            in_time: string;
                            breaks: { break_start: string; break_end: string }[];
                            out_time?: string | undefined;
                          }[]) || []
                        }
                        onChangeAction={(value) => handleFormDataChange(field.name, value)}
                        workDate={formData.work_date as string}
                        onWorkDateChange={(newWorkDate) =>
                          handleFormDataChange('work_date', newWorkDate)
                        }
                      />
                    ) : field.type === 'text' ? (
                      <Input
                        id={field.name}
                        value={String(formData[field.name] || '')}
                        onChange={(e) => handleFormDataChange(field.name, e.target.value)}
                        placeholder={field.placeholder}
                      />
                    ) : field.type === 'textarea' ? (
                      <Textarea
                        id={field.name}
                        value={String(formData[field.name] || '')}
                        onChange={(e) => handleFormDataChange(field.name, e.target.value)}
                        placeholder={field.placeholder}
                      />
                    ) : field.type === 'number' ? (
                      <Input
                        id={field.name}
                        type="number"
                        value={String(formData[field.name] || '')}
                        onChange={(e) => handleFormDataChange(field.name, e.target.value)}
                        placeholder={field.placeholder}
                      />
                    ) : (
                      <Input
                        id={field.name}
                        value={String(formData[field.name] || '')}
                        onChange={(e) => handleFormDataChange(field.name, e.target.value)}
                        placeholder={field.placeholder}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ボタン */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={onCloseAction} disabled={isLoading}>
              キャンセル
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? '更新中...' : '更新'}
            </Button>
            <Button
              onClick={handleSubmitRequest}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              申請する
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* 申請確認ダイアログ */}
      <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>申請確認</DialogTitle>
            <DialogDescription>{requestForm?.name}を申請しますか？</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 rounded-md">
              <p className="text-sm text-blue-700">
                申請を送信すると、承認者の承認を待つ状態になります。
              </p>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsSubmitDialogOpen(false)}
                disabled={isLoading}
              >
                キャンセル
              </Button>
              <Button
                onClick={confirmSubmitRequest}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={isLoading}
              >
                {isLoading ? '送信中...' : '申請する'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

export { RequestEditDialog };
