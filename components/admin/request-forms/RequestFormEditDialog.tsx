'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { updateRequestForm } from '@/lib/actions/admin/request-forms';
import FormBuilder from '@/components/forms/form-builder';
import ApprovalFlowBuilder from '@/components/admin/request-forms/ApprovalFlowBuilder';
import type { RequestForm, FormFieldConfig, ApprovalStep } from '@/types/request';

const requestTypeSchema = z.object({
  name: z.string().min(1, '申請フォーム名は必須です'),
  description: z.string().optional(),
  category: z.string().min(1, 'カテゴリは必須です'),
  is_active: z.boolean(),
  display_order: z.number().min(0, '表示順序は0以上の数値である必要があります'),
});

type RequestTypeFormData = z.infer<typeof requestTypeSchema>;

interface RequestFormEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestForm: RequestForm | null;
  onSuccess: () => void;
}

const CATEGORIES = [
  { value: 'leave', label: '休暇関連' },
  { value: 'overtime', label: '残業関連' },
  { value: 'attendance_correction', label: '勤怠修正' },
  { value: 'business_trip', label: '出張関連' },
  { value: 'expense', label: '経費関連' },
  { value: 'system', label: 'システム関連' },
  { value: 'hr', label: '人事関連' },
  { value: 'general', label: 'その他' },
];

export default function RequestFormEditDialog({
  open,
  onOpenChange,
  requestForm,
  onSuccess,
}: RequestFormEditDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [formConfig, setFormConfig] = useState<FormFieldConfig[]>([]);
  const [approvalFlow, setApprovalFlow] = useState<ApprovalStep[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<RequestTypeFormData>({
    resolver: zodResolver(requestTypeSchema),
    defaultValues: {
      is_active: true,
      display_order: 0,
    },
  });

  // 申請種別データが変更されたときにフォームをリセット
  useEffect(() => {
    if (requestForm) {
      reset({
        name: requestForm.name,
        description: requestForm.description || '',
        category: requestForm.category,
        is_active: requestForm.is_active,
        display_order: requestForm.display_order,
      });
      setFormConfig([...requestForm.form_config]);
      setApprovalFlow([...requestForm.approval_flow]);
    }
  }, [requestForm, reset]);

  const onSubmit = async (data: RequestTypeFormData) => {
    if (!requestForm) return;

    console.log('フォーム送信開始:', data);
    console.log('フォーム設定:', formConfig);
    console.log('承認フロー:', approvalFlow);

    // 承認フローのバリデーション
    if (approvalFlow.length === 0) {
      toast({
        title: 'エラー',
        description: '承認フローを設定してください',
        variant: 'destructive',
      });
      return;
    }

    // 承認フローの各ステップのバリデーション
    const validationErrors: string[] = [];
    for (const step of approvalFlow) {
      if (!step.name) {
        validationErrors.push(`ステップ${step.step}のステップ名`);
      }
      if (!step.approver_id) {
        validationErrors.push(`ステップ${step.step}の承認者`);
      }
    }

    if (validationErrors.length > 0) {
      toast({
        title: 'エラー',
        description: `以下の項目を設定してください：${validationErrors.join('、')}`,
        variant: 'destructive',
      });
      return;
    }

    // フォーム項目のバリデーション
    if (formConfig.length === 0) {
      toast({
        title: 'エラー',
        description: 'フォーム項目を設定してください',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      // FormDataを作成
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('description', data.description || '');
      formData.append('category', data.category);
      formData.append('form_config', JSON.stringify(formConfig));
      formData.append('approval_flow', JSON.stringify(approvalFlow));
      formData.append('is_active', data.is_active.toString());

      const result = await updateRequestForm(requestForm.id, formData);

      if (result.success) {
        toast({
          title: '申請フォームを更新しました',
          description: `${data.name}が正常に更新されました`,
        });
        onOpenChange(false);
        onSuccess();
      } else {
        toast({
          title: 'エラー',
          description: result.error || '申請フォームの更新に失敗しました',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('申請種別更新エラー:', error);
      toast({
        title: 'エラー',
        description: '申請フォームの更新中にエラーが発生しました',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  if (!requestForm) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto dialog-scrollbar">
        <DialogHeader>
          <DialogTitle>申請フォーム編集: {requestForm.name}</DialogTitle>
          <DialogDescription>
            申請フォームの基本情報、フォーム項目、承認フローを編集できます。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">基本情報</TabsTrigger>
              <TabsTrigger value="form">フォーム項目</TabsTrigger>
              <TabsTrigger value="approval">承認フロー</TabsTrigger>
            </TabsList>

            {/* 基本情報タブ */}
            <TabsContent value="basic" className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">申請フォーム名 *</Label>
                  <Input id="name" {...register('name')} placeholder="例: 有給申請, 残業申請" />
                  {errors.name && (
                    <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="description">説明</Label>
                  <Textarea
                    id="description"
                    {...register('description')}
                    placeholder="申請フォームの説明を入力してください"
                    rows={3}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">カテゴリ *</Label>
                  <Select
                    value={watch('category')}
                    onValueChange={(value) => setValue('category', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="カテゴリを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.category && (
                    <p className="text-sm text-red-600 mt-1">{errors.category.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="display_order">表示順序</Label>
                  <Input
                    id="display_order"
                    type="number"
                    {...register('display_order', { valueAsNumber: true })}
                    placeholder="0"
                  />
                  {errors.display_order && (
                    <p className="text-sm text-red-600 mt-1">{errors.display_order.message}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={watch('is_active')}
                  onCheckedChange={(checked) => setValue('is_active', checked)}
                />
                <Label htmlFor="is_active">有効にする</Label>
              </div>
            </TabsContent>

            {/* フォーム項目タブ */}
            <TabsContent value="form" className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">フォーム項目設定</h3>
                </div>
                <FormBuilder formConfig={formConfig} onFormConfigChange={setFormConfig} />
              </div>
            </TabsContent>

            {/* 承認フロータブ */}
            <TabsContent value="approval" className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">承認フロー設定</h3>
                </div>
                <ApprovalFlowBuilder
                  approvalFlow={approvalFlow}
                  onApprovalFlowChange={setApprovalFlow}
                />
              </div>
            </TabsContent>
          </Tabs>

          {/* アクションボタン */}
          <div className="flex justify-end space-x-2 pt-6">
            <Button type="button" variant="outline" onClick={handleCancel} disabled={isLoading}>
              キャンセル
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? '更新中...' : '更新'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
