'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { createReportTemplate } from '@/lib/actions/admin/report-templates';
import type { ReportFieldConfig } from '@/types/report';

// フィールドタイプの定義
const fieldTypes = [
  { id: 'text', label: 'テキスト', icon: '📝' },
  { id: 'textarea', label: 'テキストエリア', icon: '📄' },
  { id: 'number', label: '数値', icon: '🔢' },
  { id: 'date', label: '日付', icon: '📅' },
  { id: 'time', label: '時刻', icon: '🕐' },
  { id: 'datetime', label: '日時', icon: '📅🕐' },
  { id: 'email', label: 'メール', icon: '📧' },
  { id: 'phone', label: '電話番号', icon: '📞' },
  { id: 'url', label: 'URL', icon: '🔗' },
  { id: 'select', label: 'セレクト', icon: '📋' },
  { id: 'radio', label: 'ラジオ', icon: '🔘' },
  { id: 'checkbox', label: 'チェックボックス', icon: '☑️' },
  { id: 'file', label: 'ファイル', icon: '📎' },
  { id: 'hidden', label: '隠しフィールド', icon: '👻' },
];

export default function CreateReportTemplatePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  // 基本情報
  const [basicInfo, setBasicInfo] = useState({
    name: '',
    description: '',
    group_id: '',
    is_active: true,
  });

  // フォーム設定
  const [formFields, setFormFields] = useState<ReportFieldConfig[]>([]);

  // フィールドを追加
  const addField = (fieldType: string) => {
    const newField: ReportFieldConfig = {
      id: `field_${Date.now()}`,
      type: fieldType as any,
      label: '',
      required: false,
      placeholder: '',
      options: {},
    };

    // フィールドタイプに応じたデフォルト設定
    switch (fieldType) {
      case 'textarea':
        newField.options = {
          markdown: true,
          preview: true,
          rows: 3,
        };
        break;
      case 'number':
        newField.options = {
          min: 0,
          max: 100,
          step: 1,
        };
        break;
      case 'select':
        newField.options = {
          options: [
            { label: '選択肢1', value: 'option1' },
            { label: '選択肢2', value: 'option2' },
            { label: '選択肢3', value: 'option3' },
          ],
        };
        break;
      case 'radio':
        newField.options = {
          options: [
            { label: '選択肢1', value: 'option1' },
            { label: '選択肢2', value: 'option2' },
            { label: '選択肢3', value: 'option3' },
          ],
        };
        break;
      case 'checkbox':
        newField.options = {
          options: [
            { label: '選択肢1', value: 'option1' },
            { label: '選択肢2', value: 'option2' },
            { label: '選択肢3', value: 'option3' },
          ],
        };
        break;
    }

    setFormFields([...formFields, newField]);
  };

  // フィールドを削除
  const removeField = (index: number) => {
    setFormFields(formFields.filter((_, i) => i !== index));
  };

  // フィールドを更新
  const updateField = (index: number, field: ReportFieldConfig) => {
    const newFields = [...formFields];
    newFields[index] = field;
    setFormFields(newFields);
  };

  // フィールドを上に移動
  const moveFieldUp = (index: number) => {
    if (index === 0) return;
    const newFields = [...formFields];
    [newFields[index], newFields[index - 1]] = [newFields[index - 1], newFields[index]];
    setFormFields(newFields);
  };

  // フィールドを下に移動
  const moveFieldDown = (index: number) => {
    if (index === formFields.length - 1) return;
    const newFields = [...formFields];
    [newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]];
    setFormFields(newFields);
  };

  // フォーム送信
  const handleSubmit = async () => {
    if (!basicInfo.name.trim()) {
      toast({
        title: 'エラー',
        description: 'テンプレート名を入力してください',
        variant: 'destructive',
      });
      return;
    }

    if (formFields.length === 0) {
      toast({
        title: 'エラー',
        description: '少なくとも1つのフィールドを追加してください',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const formData = new FormData();
      formData.append('name', basicInfo.name);
      formData.append('description', basicInfo.description);
      if (basicInfo.group_id) {
        formData.append('group_id', basicInfo.group_id);
      }
      formData.append('form_config', JSON.stringify(formFields));
      formData.append(
        'approval_flow',
        JSON.stringify({
          type: 'static',
          approvers: [],
        })
      );
      formData.append(
        'status_flow',
        JSON.stringify({
          transitions: [
            { from: '作成中', to: '提出済み', action: 'submit' },
            { from: '提出済み', to: '未読', action: 'auto' },
            { from: '未読', to: '既読', action: 'read' },
            { from: '既読', to: '承認', action: 'approve' },
            { from: '既読', to: '却下', action: 'reject' },
            { from: '却下', to: '再提出', action: 'resubmit' },
          ],
        })
      );
      formData.append('is_active', String(basicInfo.is_active));

      const result = await createReportTemplate(formData);

      if (result.success) {
        toast({
          title: '成功',
          description: 'テンプレートを作成しました',
        });
        router.push('/admin/report-templates');
      } else {
        toast({
          title: 'エラー',
          description: result.error || 'テンプレートの作成に失敗しました',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('テンプレート作成エラー:', error);
      toast({
        title: 'エラー',
        description: 'テンプレートの作成に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            戻る
          </Button>
          <div>
            <h1 className="text-3xl font-bold">新規レポートテンプレート作成</h1>
            <p className="text-muted-foreground mt-2">
              新しいレポートテンプレートを作成します。基本情報、フォーム項目、承認フローを設定できます。
            </p>
          </div>
        </div>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          <Save className="h-4 w-4 mr-2" />
          {isSubmitting ? '作成中...' : '作成'}
        </Button>
      </div>

      {/* タブ */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">基本情報</TabsTrigger>
          <TabsTrigger value="form">フォーム項目</TabsTrigger>
          <TabsTrigger value="approval">承認フロー</TabsTrigger>
        </TabsList>

        {/* 基本情報タブ */}
        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>基本情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">テンプレート名 *</Label>
                <Input
                  id="name"
                  value={basicInfo.name}
                  onChange={(e) => setBasicInfo({ ...basicInfo, name: e.target.value })}
                  placeholder="例：日報テンプレート"
                />
              </div>
              <div>
                <Label htmlFor="description">説明</Label>
                <Textarea
                  id="description"
                  value={basicInfo.description}
                  onChange={(e) => setBasicInfo({ ...basicInfo, description: e.target.value })}
                  placeholder="テンプレートの説明を入力してください"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="group_id">対象グループ</Label>
                <Input
                  id="group_id"
                  value={basicInfo.group_id}
                  onChange={(e) => setBasicInfo({ ...basicInfo, group_id: e.target.value })}
                  placeholder="全グループ（未入力）"
                />
              </div>
              <div>
                <Label htmlFor="is_active">ステータス</Label>
                <select
                  id="is_active"
                  value={String(basicInfo.is_active)}
                  onChange={(e) =>
                    setBasicInfo({ ...basicInfo, is_active: e.target.value === 'true' })
                  }
                  className="w-full p-2 border rounded-md"
                >
                  <option value="true">有効</option>
                  <option value="false">無効</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* フォーム項目タブ */}
        <TabsContent value="form">
          <Card>
            <CardHeader>
              <CardTitle>フォーム項目設定</CardTitle>
            </CardHeader>
            <CardContent>
              {/* フィールド追加エリア */}
              <div className="mb-6 p-4 border-2 border-dashed border-gray-300 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl mb-2">+</div>
                  <div className="text-lg font-medium mb-2">フィールドを追加</div>
                  <div className="text-sm text-gray-500 mb-4">
                    以下のフィールドタイプから選択してください
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {fieldTypes.map((fieldType) => (
                      <Button
                        key={fieldType.id}
                        variant="outline"
                        size="sm"
                        onClick={() => addField(fieldType.id)}
                        className="flex flex-col items-center p-2 h-auto"
                      >
                        <span className="text-lg mb-1">{fieldType.icon}</span>
                        <span className="text-xs">{fieldType.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* フィールド一覧 */}
              {formFields.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  フィールドがありません。上記からフィールドを追加してください。
                </div>
              ) : (
                <div className="space-y-4">
                  {formFields.map((field, index) => (
                    <Card key={field.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium">フィールド {index + 1}</span>
                            <span className="text-xs text-gray-500">({field.type})</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => moveFieldUp(index)}
                              disabled={index === 0}
                            >
                              ↑
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => moveFieldDown(index)}
                              disabled={index === formFields.length - 1}
                            >
                              ↓
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeField(index)}
                              className="text-red-600"
                            >
                              ×
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>ラベル *</Label>
                            <Input
                              value={field.label}
                              onChange={(e) =>
                                updateField(index, { ...field, label: e.target.value })
                              }
                              placeholder="フィールドのラベル"
                            />
                          </div>
                          <div>
                            <Label>プレースホルダー</Label>
                            <Input
                              value={field.placeholder}
                              onChange={(e) =>
                                updateField(index, { ...field, placeholder: e.target.value })
                              }
                              placeholder="プレースホルダーテキスト"
                            />
                          </div>
                        </div>

                        <div className="mt-4">
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(e) =>
                                updateField(index, { ...field, required: e.target.checked })
                              }
                            />
                            <span>必須項目</span>
                          </label>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 承認フロータブ */}
        <TabsContent value="approval">
          <Card>
            <CardHeader>
              <CardTitle>承認フロー設定</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                承認フロー設定は後で実装予定です。
                <br />
                現在はデフォルトの承認フローが適用されます。
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
