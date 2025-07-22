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
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { createRequestForm } from '@/lib/actions/admin/request-forms';
import { getDefaultFormConfig, getDefaultApprovalFlow } from '@/lib/utils/request-type-defaults';
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

interface RequestFormCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export default function RequestFormCreateDialog({
  open,
  onOpenChange,
  onSuccess,
}: RequestFormCreateDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [formConfig, setFormConfig] = useState<FormFieldConfig[]>([]);
  const [approvalFlow, setApprovalFlow] = useState<ApprovalStep[]>([]);
  const [activeTab, setActiveTab] = useState<'basic' | 'form' | 'approval'>('basic');

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
      category: '',
    },
  });

  const watchedCategory = watch('category');

  // watchedCategoryが変更されたときにselectedCategoryを同期
  useEffect(() => {
    if (watchedCategory && watchedCategory !== selectedCategory) {
      setSelectedCategory(watchedCategory);
    }
  }, [watchedCategory, selectedCategory]);

  // カテゴリが変更されたときにデフォルト設定を更新
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setValue('category', category);

    // カテゴリが選択された場合、デフォルト設定を適用
    if (category && formConfig.length === 0) {
      setFormConfig(getDefaultFormConfig(category));
    }
    if (category && approvalFlow.length === 0) {
      setApprovalFlow(getDefaultApprovalFlow(category));
    }
  };

  const onSubmit = async (data: RequestTypeFormData) => {
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
    for (const step of approvalFlow) {
      if (!step.name || !step.approver_id) {
        toast({
          title: 'エラー',
          description: `ステップ${step.step}の承認者を設定してください`,
          variant: 'destructive',
        });
        return;
      }
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

      console.log('FormData作成完了');
      const result = await createRequestForm(formData);

      if (result.success) {
        toast({
          title: '申請フォームを作成しました',
          description: `${data.name}が正常に作成されました`,
        });
        reset();
        setSelectedCategory('');
        setFormConfig([]);
        setApprovalFlow([]);
        setActiveTab('basic');
        onOpenChange(false);
        onSuccess();
      } else {
        toast({
          title: 'エラー',
          description: result.error || '申請フォームの作成に失敗しました',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('申請種別作成エラー:', error);
      toast({
        title: 'エラー',
        description: '申請フォームの作成中にエラーが発生しました',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    reset();
    setSelectedCategory('');
    setValue('category', '');
    setFormConfig([]);
    setApprovalFlow([]);
    setActiveTab('basic');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] overflow-y-auto dialog-scrollbar"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>新規申請フォーム作成</DialogTitle>
          <DialogDescription>
            新しい申請フォームを作成します。基本情報、フォーム項目、承認フローを設定できます。
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit, (errors) => {
            console.log('バリデーションエラー:', errors);
          })}
          className="space-y-6"
        >
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as 'basic' | 'form' | 'approval')}
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">基本情報</TabsTrigger>
              <TabsTrigger value="form">フォーム項目</TabsTrigger>
              <TabsTrigger value="approval">承認フロー</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
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
                    value={watchedCategory}
                    onValueChange={(value) => {
                      handleCategoryChange(value);
                      setValue('category', value);
                    }}
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
                  onCheckedChange={(checked) =>
                    register('is_active').onChange({ target: { value: checked } })
                  }
                />
                <Label htmlFor="is_active">有効にする</Label>
              </div>
            </TabsContent>

            <TabsContent value="form" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">フォーム項目設定</h3>
                  {selectedCategory && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFormConfig(getDefaultFormConfig(selectedCategory));
                      }}
                    >
                      デフォルト設定を適用
                    </Button>
                  )}
                </div>
                <FormBuilder formConfig={formConfig} onFormConfigChange={setFormConfig} />
              </div>
            </TabsContent>

            <TabsContent value="approval" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  {selectedCategory && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setApprovalFlow(getDefaultApprovalFlow(selectedCategory));
                      }}
                    >
                      デフォルト設定を適用
                    </Button>
                  )}
                </div>
                <ApprovalFlowBuilder
                  approvalFlow={approvalFlow}
                  onApprovalFlowChange={setApprovalFlow}
                />
              </div>
            </TabsContent>
          </Tabs>

          {/* アクションボタン */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={handleCancel} disabled={isLoading}>
              キャンセル
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? '作成中...' : '作成'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
