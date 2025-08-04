'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, X, FileText } from 'lucide-react';

import { useAuth } from '@/contexts/auth-context';
import { useData } from '@/contexts/data-context';
import { getJSTDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FormFieldConfig, RequestForm } from '@/schemas/request';
import DynamicForm from '@/components/forms/dynamic-form';
import { supabase } from '@/lib/supabase';

// 基本的なバリデーションスキーマ
const createRequestSchema = z.object({
  title: z.string().min(1, 'タイトルは必須です'),
  description: z.string().optional(),
});

type CreateRequestFormData = z.infer<typeof createRequestSchema>;

export default function CreateRequestPage() {
  const { user } = useAuth();
  const { requestForms, createRequest } = useData();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestTypeId = searchParams.get('type');

  const [selectedRequestForm, setSelectedRequestForm] = useState<RequestForm | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    // watch,
  } = useForm<CreateRequestFormData>({
    resolver: zodResolver(createRequestSchema),
  });

  useEffect(() => {
    if (!user || (user.role !== 'member' && user.role !== 'admin')) {
      router.push('/login');
      return;
    }

    if (requestTypeId) {
      const type = requestForms.find((rf) => rf.id === requestTypeId);
      if (type) {
        setSelectedRequestForm(type);
        setValue('title', type.name);
      }
    }
  }, [user, router, requestTypeId, requestForms, setValue]);

  if (!user || (user.role !== 'member' && user.role !== 'admin')) {
    return null;
  }

  function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    setAttachments((prev) => [...prev, ...files]);
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  async function uploadFiles(requestId: string): Promise<string[]> {
    if (attachments.length === 0) return [];

    const uploadedUrls: string[] = [];

    for (const file of attachments) {
      const fileName = `${requestId}/${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from('request-attachments')
        .upload(fileName, file);

      if (error) {
        throw new Error(`ファイルアップロードエラー: ${error.message}`);
      }

      const { data: urlData } = supabase.storage.from('request-attachments').getPublicUrl(fileName);

      uploadedUrls.push(urlData.publicUrl);
    }

    return uploadedUrls;
  }

  async function onSubmit(data: CreateRequestFormData) {
    if (!user) return;
    if (!selectedRequestForm) {
      setError('リクエストタイプを選択してください');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      // リクエストIDを生成
      const requestId = Date.now().toString();
      // リクエストを作成
      await createRequest({
        user_id: user.id,
        request_form_id: selectedRequestForm!.id,
        title: data.title,
        form_data: formData as Record<string, string | number | boolean | Date | string[]>,
        target_date: getJSTDate(),
        start_date: getJSTDate(),
        end_date: getJSTDate(),
        submission_comment: data.description || '',
        current_approval_step: 1,
        comments: [],
        attachments: [],
      });
      // 添付ファイルをアップロード
      if (attachments.length > 0) {
        const attachmentUrls = await uploadFiles(requestId);
        // 添付ファイル情報をリクエストに追加
        await supabase.from('request_attachments').insert(
          attachmentUrls.map((url, index) => ({
            request_id: requestId,
            file_name: attachments[index].name,
            file_url: url,
            file_size: attachments[index].size,
            uploaded_by: user.id,
          }))
        );
      }
      router.push('/member/requests');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'リクエストの作成に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleFormDataChange(data: Record<string, unknown>) {
    setFormData(data);
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          戻る
        </Button>
        <div>
          <h1 className="text-2xl font-bold">リクエスト作成</h1>
          <p className="text-muted-foreground">新しいリクエストを作成します</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>基本情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="requestType">リクエストタイプ</Label>
                <Select
                  value={selectedRequestForm?.id || ''}
                  onValueChange={(value) => {
                    const type = requestForms.find((rf) => rf.id === value);
                    setSelectedRequestForm(type || null);
                    setValue('title', type?.name || '');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="リクエストタイプを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {requestForms
                      .filter((rf) => rf.is_active)
                      .map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          <div className="flex items-center gap-2">
                            <span>{type.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {type.category}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="title">タイトル</Label>
                <Input id="title" {...register('title')} placeholder="リクエストのタイトル" />
                {errors.title && (
                  <p className="text-sm text-destructive mt-1">{errors.title.message}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="description">説明</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="リクエストの詳細説明（任意）"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {selectedRequestForm && (
          <Card>
            <CardHeader>
              <CardTitle>フォーム情報</CardTitle>
              <p className="text-sm text-muted-foreground">
                {selectedRequestForm.name}の詳細情報を入力してください
              </p>
            </CardHeader>
            <CardContent>
              <DynamicForm
                requestType={selectedRequestForm}
                onSubmitAction={handleFormDataChange}
                isLoading={isSubmitting}
                userId={user?.id}
              />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>添付ファイル</CardTitle>
            <p className="text-sm text-muted-foreground">
              関連するファイルを添付してください（任意）
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="attachments">ファイルを選択</Label>
              <div className="mt-2">
                <Input
                  id="attachments"
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="cursor-pointer"
                />
              </div>
            </div>

            {attachments.length > 0 && (
              <div className="space-y-2">
                <Label>選択されたファイル</Label>
                <div className="space-y-2">
                  {attachments.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        <span className="text-sm">{file.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </Badge>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttachment(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            キャンセル
          </Button>
          <Button type="submit" disabled={isSubmitting || !selectedRequestForm}>
            {isSubmitting ? '作成中...' : 'リクエストを作成'}
          </Button>
        </div>
      </form>
    </div>
  );
}
