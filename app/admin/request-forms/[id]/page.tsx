'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FormInput, Edit, ArrowLeft, Eye } from 'lucide-react';
import Link from 'next/link';

import { useAuth } from '@/contexts/auth-context';
import { useData } from '@/contexts/data-context';
import { RequestForm } from '@/types/request';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import DynamicForm from '@/components/forms/dynamic-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function RequestTypeDetailPage() {
  const { user } = useAuth();
  const { requestForms } = useData();
  const params = useParams();
  const router = useRouter();
  const [requestType, setRequestType] = useState<RequestForm | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const requestTypeId = params.id as string;

  useEffect(() => {
    const type = requestForms.find((t) => t.id === requestTypeId);
    if (type) {
      setRequestType(type);
    } else {
      router.push('/admin/request-forms');
    }
  }, [requestTypeId, requestForms, router]);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/login');
      return;
    }
  }, [user, router]);

  if (!user || user.role !== 'admin') {
    return null;
  }

  if (!requestType) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const fieldTypeLabels: Record<string, string> = {
    text: '一行テキスト',
    textarea: '複数行テキスト',
    number: '数値',
    date: '日付',
    time: '時刻',
    'datetime-local': '日時',
    email: 'メールアドレス',
    tel: '電話番号',
    select: 'ドロップダウン選択',
    radio: 'ラジオボタン',
    checkbox: 'チェックボックス',
    file: 'ファイルアップロード',
  };

  const formatDate = (date?: string) =>
    typeof date === 'string'
      ? new Date(date).toLocaleDateString('ja-JP', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '-';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/admin/request-forms">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              戻る
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{requestType.name}</h1>
            <p className="text-gray-600">申請フォームの詳細</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Eye className="w-4 h-4 mr-2" />
                プレビュー
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto dialog-scrollbar">
              <DialogHeader>
                <DialogTitle>フォームプレビュー</DialogTitle>
              </DialogHeader>
              <DynamicForm
                requestType={requestType}
                onSubmitAction={(data) => {
                  console.log('Preview form data:', data);
                  alert('プレビューモードです');
                }}
              />
            </DialogContent>
          </Dialog>
          <Link href={`/admin/request-forms/${requestType.id}/edit`}>
            <Button>
              <Edit className="w-4 h-4 mr-2" />
              編集
            </Button>
          </Link>
        </div>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FormInput className="w-5 h-5" />
            <span>基本情報</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-sm font-medium text-gray-600">申請名</div>
              <div className="text-lg font-semibold text-gray-900">{requestType.name}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-600">申請コード</div>
              <Badge variant="outline" className="text-sm">
                {requestType.code}
              </Badge>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-600">ステータス</div>
              <Badge variant={requestType.is_active ? 'default' : 'secondary'}>
                {requestType.is_active ? '有効' : '無効'}
              </Badge>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-600">項目数</div>
              <div className="text-lg font-semibold text-gray-900">
                {requestType.form_config.length}項目
              </div>
            </div>
          </div>
          {requestType.description && (
            <div>
              <div className="text-sm font-medium text-gray-600">説明</div>
              <div className="text-gray-900">{requestType.description}</div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-sm font-medium text-gray-600">作成日</div>
              <div className="text-gray-900">{formatDate(requestType.created_at)}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-600">更新日</div>
              <div className="text-gray-900">{formatDate(requestType.updated_at)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form Fields */}
      <Card>
        <CardHeader>
          <CardTitle>フォーム項目</CardTitle>
        </CardHeader>
        <CardContent>
          {requestType.form_config.length === 0 ? (
            <div className="text-center py-8 text-gray-500">フォーム項目が設定されていません</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>順序</TableHead>
                  <TableHead>項目名</TableHead>
                  <TableHead>入力タイプ</TableHead>
                  <TableHead>必須</TableHead>
                  <TableHead>プレースホルダー</TableHead>
                  <TableHead>バリデーション</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requestType.form_config
                  .sort((a, b) => a.order - b.order)
                  .map((field) => (
                    <TableRow key={field.id}>
                      <TableCell>{field.order}</TableCell>
                      <TableCell className="font-medium">{field.label}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{fieldTypeLabels[field.type] || field.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={field.required ? 'destructive' : 'secondary'}>
                          {field.required ? '必須' : '任意'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {field.placeholder || '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {field.validation_rules && field.validation_rules.length > 0 ? (
                          <div className="space-y-1">
                            {field.validation_rules.map((rule, index) => (
                              <div key={index}>
                                {rule.type === 'minLength' && `最小: ${rule.value}文字`}
                                {rule.type === 'maxLength' && `最大: ${rule.value}文字`}
                                {rule.type === 'pattern' && `パターン: ${rule.value}`}
                                {rule.type === 'required' && '必須'}
                              </div>
                            ))}
                            {field.options && field.options.length > 0 && (
                              <div>選択肢: {field.options.length}個</div>
                            )}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
