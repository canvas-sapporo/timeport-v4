'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileText, Users, Calendar } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { getReportTemplate } from '@/lib/actions/admin/report-templates';
import { getGroups } from '@/lib/actions/admin/groups';
import { ReportTemplate, ReportFieldConfig } from '@/types';

export default function PreviewReportTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [template, setTemplate] = useState<ReportTemplate | null>(null);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [previewData, setPreviewData] = useState<Record<string, unknown>>({});
  // const [templateId, setTemplateId] = useState<string>('');

  useEffect(() => {
    async function initData() {
      try {
        const resolvedParams = await params;
        // setTemplateId(resolvedParams.id);
        await loadData(resolvedParams.id);
      } catch (error) {
        console.error('初期化エラー:', error);
      }
    }
    initData();
  }, [params]);

  async function loadData(id: string) {
    try {
      // テンプレート情報を取得
      const templateResult = await getReportTemplate(id);
      if (templateResult.success && templateResult.data) {
        setTemplate(templateResult.data);

        // プレビューデータを初期化
        const initialData: Record<string, unknown> = {};
        templateResult.data.form_config.forEach((field) => {
          switch (field.type) {
            case 'checkbox':
              initialData[field.id] = false;
              break;
            case 'select':
            case 'radio':
              if (field.options?.options && field.options.options.length > 0) {
                initialData[field.id] = field.options.options[0].value;
              }
              break;
            default:
              initialData[field.id] = '';
          }
        });
        setPreviewData(initialData);
      } else {
        toast({
          title: 'エラー',
          description: templateResult.error || 'テンプレートの取得に失敗しました',
          variant: 'destructive',
        });
        router.push('/admin/report-templates');
        return;
      }

      // グループ一覧を取得
      const groupsResult = await getGroups();
      if (groupsResult.success && groupsResult.data) {
        setGroups(groupsResult.data.groups);
      }
    } catch (error) {
      console.error('データ読み込みエラー:', error);
      toast({
        title: 'エラー',
        description: 'データの読み込みに失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  function renderPreviewField(field: ReportFieldConfig) {
    const value = previewData[field.id] || '';

    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            value={String(value)}
            onChange={(e) => setPreviewData({ ...previewData, [field.id]: e.target.value })}
            placeholder={field.placeholder}
            required={field.required}
            rows={4}
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            value={String(value)}
            onChange={(e) => setPreviewData({ ...previewData, [field.id]: e.target.value })}
            placeholder={field.placeholder}
            required={field.required}
          />
        );
      case 'date':
        return (
          <Input
            type="date"
            value={String(value)}
            onChange={(e) => setPreviewData({ ...previewData, [field.id]: e.target.value })}
            required={field.required}
          />
        );
      case 'time':
        return (
          <Input
            type="time"
            value={String(value)}
            onChange={(e) => setPreviewData({ ...previewData, [field.id]: e.target.value })}
            required={field.required}
          />
        );
      case 'datetime':
        return (
          <Input
            type="datetime-local"
            value={String(value)}
            onChange={(e) => setPreviewData({ ...previewData, [field.id]: e.target.value })}
            required={field.required}
          />
        );
      case 'email':
        return (
          <Input
            type="email"
            value={String(value)}
            onChange={(e) => setPreviewData({ ...previewData, [field.id]: e.target.value })}
            placeholder={field.placeholder}
            required={field.required}
          />
        );
      case 'phone':
        return (
          <Input
            type="tel"
            value={String(value)}
            onChange={(e) => setPreviewData({ ...previewData, [field.id]: e.target.value })}
            placeholder={field.placeholder}
            required={field.required}
          />
        );
      case 'url':
        return (
          <Input
            type="url"
            value={String(value)}
            onChange={(e) => setPreviewData({ ...previewData, [field.id]: e.target.value })}
            placeholder={field.placeholder}
            required={field.required}
          />
        );
      case 'select':
        return (
          <Select
            value={String(value)}
            onValueChange={(val) => setPreviewData({ ...previewData, [field.id]: val })}
          >
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.options?.map((option) => (
                <SelectItem key={option.value} value={String(option.value) || 'default'}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.options?.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <input
                  type="radio"
                  id={`${field.id}-${option.value}`}
                  name={field.id}
                  value={String(option.value)}
                  checked={String(value) === String(option.value)}
                  onChange={(e) => setPreviewData({ ...previewData, [field.id]: e.target.value })}
                  required={field.required}
                />
                <Label htmlFor={`${field.id}-${option.value}`}>{option.label}</Label>
              </div>
            ))}
          </div>
        );
      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id={field.id}
              checked={Boolean(value)}
              onChange={(e) => setPreviewData({ ...previewData, [field.id]: e.target.checked })}
              required={field.required}
            />
            <Label htmlFor={field.id}>{field.label}</Label>
          </div>
        );
      case 'file':
        return (
          <Input
            type="file"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              setPreviewData({ ...previewData, [field.id]: files.map((f) => f.name) });
            }}
            multiple={field.options?.multiple}
            accept={field.options?.accept}
            required={field.required}
          />
        );
      case 'hidden':
        return null;
      default:
        return (
          <Input
            value={String(value)}
            onChange={(e) => setPreviewData({ ...previewData, [field.id]: e.target.value })}
            placeholder={field.placeholder}
            required={field.required}
          />
        );
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">テンプレートが見つかりません</p>
      </div>
    );
  }

  const targetGroup = template.group_id
    ? groups.find((g) => g.id === template.group_id)?.name || '不明'
    : '全グループ';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            戻る
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">テンプレートプレビュー</h1>
            <p className="text-gray-600">レポートテンプレートのプレビューを表示します</p>
          </div>
        </div>
      </div>

      {/* テンプレート情報 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>{template.name}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">対象グループ:</span>
              <Badge variant="outline">{targetGroup}</Badge>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">作成日:</span>
              <span className="text-sm">
                {new Date(template.created_at).toLocaleDateString('ja-JP')}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">編集日:</span>
              <span className="text-sm">
                {new Date(template.updated_at).toLocaleDateString('ja-JP')}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">フォーム項目:</span>
              <Badge variant="outline">{template.form_config.length}項目</Badge>
            </div>
          </div>

          {template.description && (
            <div className="mb-6">
              <h3 className="font-medium mb-2">説明</h3>
              <p className="text-gray-600">{template.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* フォームプレビュー */}
      <Card>
        <CardHeader>
          <CardTitle>フォームプレビュー</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-6">
            {template.form_config.map((field, index) => (
              <div key={field.id} className="space-y-2">
                <Label htmlFor={field.id} className="flex items-center space-x-2">
                  <span>{field.label}</span>
                  {field.required && <span className="text-red-500">*</span>}
                  <Badge variant="outline" className="text-xs">
                    {field.type}
                  </Badge>
                </Label>
                {renderPreviewField(field)}
                {field.placeholder && (
                  <p className="text-xs text-gray-500">プレースホルダー: {field.placeholder}</p>
                )}
              </div>
            ))}

            <div className="flex justify-end pt-6">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                閉じる
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
