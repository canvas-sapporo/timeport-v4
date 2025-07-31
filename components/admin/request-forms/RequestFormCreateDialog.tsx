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
import { getObjectTypeDefaults } from '@/lib/utils/request-type-utils';
import FormBuilder from '@/components/forms/form-builder';
import ApprovalFlowBuilder from '@/components/admin/request-forms/ApprovalFlowBuilder';
import ObjectTypeSettingsDialog from '@/components/forms/object-type-settings-dialog';
import type { RequestForm, FormFieldConfig, ApprovalStep, ObjectMetadata } from '@/schemas/request';

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
  onOpenChangeAction: (open: boolean) => void;
  onSuccessAction: () => void;
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
  onOpenChangeAction,
  onSuccessAction,
}: RequestFormCreateDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [formConfig, setFormConfig] = useState<FormFieldConfig[]>([]);
  const [approvalFlow, setApprovalFlow] = useState<ApprovalStep[]>([]);
  const [activeTab, setActiveTab] = useState<'basic' | 'form' | 'approval'>('basic');
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  const [objectTypeSettingsOpen, setObjectTypeSettingsOpen] = useState(false);
  const [objectMetadata, setObjectMetadata] = useState<ObjectMetadata | null>(null);

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

  // カテゴリが変更されたときの処理
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setValue('category', category);
  };

  // バリデーション関数
  const validateCurrentTab = () => {
    const errors: Record<string, string[]> = {};

    if (activeTab === 'basic') {
      const basicErrors: string[] = [];
      if (!watch('name') || watch('name').trim() === '') {
        basicErrors.push('申請フォーム名');
      }
      if (!watch('category') || watch('category') === '') {
        basicErrors.push('カテゴリ');
      }
      if (basicErrors.length > 0) {
        errors.basic = basicErrors;
      }
    } else if (activeTab === 'form') {
      if (formConfig.length === 0) {
        errors.form = ['フォーム項目を設定してください'];
      }
    } else if (activeTab === 'approval') {
      if (approvalFlow.length === 0) {
        errors.approval = ['承認フローを設定してください'];
      } else {
        const approvalErrors: string[] = [];
        for (const step of approvalFlow) {
          if (!step.name) {
            approvalErrors.push(`ステップ${step.step}のステップ名`);
          }
          if (!step.approver_id) {
            approvalErrors.push(`ステップ${step.step}の承認者`);
          }
        }
        if (approvalErrors.length > 0) {
          errors.approval = approvalErrors;
        }
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 次へボタンの処理
  const handleNext = () => {
    if (validateCurrentTab()) {
      if (activeTab === 'basic') {
        setActiveTab('form');
      } else if (activeTab === 'form') {
        setActiveTab('approval');
      }
    } else {
      const currentErrors = validationErrors[activeTab] || [];
      toast({
        title: 'エラー',
        description: `以下の項目を設定してください：${currentErrors.join('、')}`,
        variant: 'destructive',
      });
    }
  };

  // 戻るボタンの処理
  const handleBack = () => {
    if (activeTab === 'form') {
      setActiveTab('basic');
    } else if (activeTab === 'approval') {
      setActiveTab('form');
    }
  };

  // 全バリデーションOKかチェック
  const isAllValidationOK = () => {
    // 基本情報のバリデーション
    if (
      !watch('name') ||
      watch('name').trim() === '' ||
      !watch('category') ||
      watch('category') === ''
    ) {
      return false;
    }
    // フォーム項目のバリデーション
    if (formConfig.length === 0) {
      return false;
    }
    // 承認フローのバリデーション
    if (approvalFlow.length === 0) {
      return false;
    }
    for (const step of approvalFlow) {
      if (!step.name || !step.approver_id) {
        return false;
      }
    }
    return true;
  };

  const onSubmit = async (data: RequestTypeFormData) => {
    console.log('フォーム送信開始:', data);
    console.log('フォーム設定:', formConfig);
    console.log('承認フロー:', approvalFlow);
    console.log('オブジェクトメタデータ:', objectMetadata);

    // 全バリデーションをチェック
    if (!isAllValidationOK()) {
      toast({
        title: 'エラー',
        description: 'すべての項目を正しく設定してください',
        variant: 'destructive',
      });
      return;
    }

    // フォーム設定をそのまま使用（field.metadataは既に正しく設定されている）
    const finalFormConfig = [...formConfig];

    setIsLoading(true);
    try {
      // FormDataを作成
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('description', data.description || '');
      formData.append('category', data.category);
      formData.append('form_config', JSON.stringify(finalFormConfig));
      formData.append('approval_flow', JSON.stringify(approvalFlow));
      formData.append('is_active', data.is_active.toString());

      // オブジェクトメタデータがある場合は追加
      if (objectMetadata) {
        formData.append('object_config', JSON.stringify(objectMetadata));
      }

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
        setObjectMetadata(null);
        setActiveTab('basic');
        onOpenChangeAction(false);
        onSuccessAction();
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
    setObjectMetadata(null);
    setActiveTab('basic');
    onOpenChangeAction(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChangeAction}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto dialog-scrollbar">
        <DialogHeader>
          <DialogTitle>新規申請フォーム作成</DialogTitle>
          <DialogDescription>
            新しい申請フォームを作成します。基本情報、フォーム項目、承認フローを設定できます。
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit, (errors) => {
            console.log('react-hook-formバリデーションエラー:', errors);
            const errorMessages: string[] = [];

            if (errors.name) {
              errorMessages.push('申請フォーム名');
            }
            if (errors.category) {
              errorMessages.push('カテゴリ');
            }
            if (errors.display_order) {
              errorMessages.push('表示順序');
            }

            if (errorMessages.length > 0) {
              toast({
                title: 'エラー',
                description: `以下の項目を設定してください：${errorMessages.join('、')}`,
                variant: 'destructive',
              });
            }
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
                  <div className="flex items-center space-x-2">
                    {selectedCategory === 'attendance_correction' && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setObjectTypeSettingsOpen(true)}
                      >
                        オブジェクトタイプ設定
                      </Button>
                    )}
                    {selectedCategory && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (selectedCategory === 'attendance_correction' && objectMetadata) {
                            setFormConfig(getDefaultFormConfig(selectedCategory));
                          } else {
                            setFormConfig(getDefaultFormConfig(selectedCategory));
                          }
                        }}
                      >
                        デフォルト設定を適用
                      </Button>
                    )}
                  </div>
                </div>
                <FormBuilder formConfig={formConfig} onFormConfigChangeAction={setFormConfig} />
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
                  onApprovalFlowChangeAction={setApprovalFlow}
                />
              </div>
            </TabsContent>
          </Tabs>

          {/* アクションボタン */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              キャンセル
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={activeTab === 'basic' || isLoading}
              className="border-gray-400 text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              戻る
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleNext}
              disabled={activeTab === 'approval' || isLoading}
              className="border-blue-500 text-blue-600 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              次へ
            </Button>
            <Button
              type="submit"
              disabled={!isAllValidationOK() || isLoading}
              className={`${
                isAllValidationOK()
                  ? 'bg-green-600 hover:bg-green-700 text-white border-green-600'
                  : 'bg-gray-300 text-gray-500 border-gray-300 cursor-not-allowed'
              } disabled:opacity-50`}
            >
              {isLoading ? '作成中...' : '作成'}
            </Button>
          </div>
        </form>

        {/* オブジェクトタイプ設定ダイアログ */}
        <ObjectTypeSettingsDialog
          open={objectTypeSettingsOpen}
          onOpenChangeAction={setObjectTypeSettingsOpen}
          metadata={objectMetadata}
          onMetadataChangeAction={setObjectMetadata}
        />
      </DialogContent>
    </Dialog>
  );
}
