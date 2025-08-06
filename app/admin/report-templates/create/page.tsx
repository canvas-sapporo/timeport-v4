'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { StandardButton } from '@/components/ui/standard-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { createReportTemplate } from '@/lib/actions/admin/report-templates';
import { getAdminUsers } from '@/lib/actions/admin/users';
import { getGroups } from '@/lib/actions/admin/groups';
import type { ReportFieldConfig } from '@/schemas/report';

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

  // データ読み込み
  useEffect(() => {
    async function loadData() {
      try {
        // ユーザー一覧を取得
        const usersResult = await getAdminUsers('', { limit: 1000 });
        if (usersResult.success && usersResult.data) {
          setUsers(
            usersResult.data.map((user) => ({
              id: user.id,
              name: `${user.family_name} ${user.first_name}`,
            }))
          );
        }

        // グループ一覧を取得
        const groupsResult = await getGroups('', { limit: 1000 });
        if (groupsResult.success && groupsResult.data) {
          setGroups(
            groupsResult.data.groups.map((group) => ({
              id: group.id,
              name: group.name,
            }))
          );
        }
      } catch (error) {
        console.error('データ読み込みエラー:', error);
      }
    }

    loadData();
  }, []);

  // 基本情報
  const [basicInfo, setBasicInfo] = useState({
    name: '',
    description: '',
    group_id: '',
    is_active: true,
  });
  const [openTargetGroupPopover, setOpenTargetGroupPopover] = useState(false);

  // フォーム設定
  const [formFields, setFormFields] = useState<ReportFieldConfig[]>([]);

  // 確認フロー設定
  const [confirmers, setConfirmers] = useState<
    Array<{
      type: 'user' | 'group';
      user_id?: string;
      group_id?: string;
    }>
  >([]);

  // ユーザーとグループのデータ
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([]);
  const [groups, setGroups] = useState<Array<{ id: string; name: string }>>([]);
  const [openUserPopover, setOpenUserPopover] = useState<number | null>(null);
  const [openConfirmerGroupPopover, setOpenConfirmerGroupPopover] = useState<number | null>(null);

  // フィールドを追加
  function addField(fieldType: string) {
    const newField: ReportFieldConfig = {
      id: `field_${Date.now()}`,
      type: fieldType as
        | 'text'
        | 'textarea'
        | 'number'
        | 'date'
        | 'time'
        | 'datetime'
        | 'email'
        | 'phone'
        | 'url'
        | 'select'
        | 'radio'
        | 'checkbox'
        | 'file'
        | 'hidden',
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
  }

  // フィールドを削除
  function removeField(index: number) {
    setFormFields(formFields.filter((_, i) => i !== index));
  }

  // フィールドを更新
  function updateField(index: number, field: ReportFieldConfig) {
    const newFields = [...formFields];
    newFields[index] = field;
    setFormFields(newFields);
  }

  // 確認者を追加
  function addConfirmer() {
    setConfirmers((prev) => [
      ...prev,
      {
        type: 'user',
        user_id: '',
        group_id: undefined,
      },
    ]);
  }

  // 確認者を削除
  function removeConfirmer(index: number) {
    setConfirmers((prev) => prev.filter((_, i) => i !== index));
  }

  // 確認者を更新
  function updateConfirmer(
    index: number,
    confirmer: {
      type: 'user' | 'group';
      user_id?: string;
      group_id?: string;
    }
  ) {
    setConfirmers((prev) => prev.map((c, i) => (i === index ? confirmer : c)));
  }

  // フィールドを上に移動
  function moveFieldUp(index: number) {
    if (index === 0) return;
    const newFields = [...formFields];
    [newFields[index], newFields[index - 1]] = [newFields[index - 1], newFields[index]];
    setFormFields(newFields);
  }

  // フィールドを下に移動
  function moveFieldDown(index: number) {
    if (index === formFields.length - 1) return;
    const newFields = [...formFields];
    [newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]];
    setFormFields(newFields);
  }

  // フォーム送信
  async function handleSubmit() {
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

      // システムログ記録
      console.log('レポートテンプレート作成開始:', {
        name: basicInfo.name,
        description: basicInfo.description,
        fieldCount: formFields.length,
        timestamp: new Date().toISOString(),
        user: 'admin',
        action: 'create_report_template',
      });

      const formData = new FormData();
      formData.append('name', basicInfo.name);
      formData.append('description', basicInfo.description);
      if (basicInfo.group_id) {
        formData.append('group_id', basicInfo.group_id);
      }
      formData.append('form_config', JSON.stringify(formFields));
      formData.append(
        'confirmation_flow',
        JSON.stringify({
          type: 'static',
          confirmers: confirmers,
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
        // 成功ログ記録
        console.log('レポートテンプレート作成成功:', {
          templateId: result.data?.id,
          name: basicInfo.name,
          timestamp: new Date().toISOString(),
          user: 'admin',
          action: 'create_report_template_success',
        });

        toast({
          title: '成功',
          description: 'テンプレートを作成しました',
        });
        router.push('/admin/report-templates');
      } else {
        // エラーログ記録
        console.error('レポートテンプレート作成失敗:', {
          name: basicInfo.name,
          error: result.error,
          timestamp: new Date().toISOString(),
          user: 'admin',
          action: 'create_report_template_error',
        });

        toast({
          title: 'エラー',
          description: result.error || 'テンプレートの作成に失敗しました',
          variant: 'destructive',
        });
      }
    } catch (error) {
      // 例外ログ記録
      console.error('レポートテンプレート作成例外:', {
        name: basicInfo.name,
        error: error,
        timestamp: new Date().toISOString(),
        user: 'admin',
        action: 'create_report_template_exception',
      });

      toast({
        title: 'エラー',
        description: 'テンプレートの作成に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="container mx-auto p-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">新規レポートテンプレート作成</h1>
          <p className="text-muted-foreground mt-2">
            新しいレポートテンプレートを作成します。基本情報、フォーム項目、確認フローを設定できます。
          </p>
        </div>
        <StandardButton buttonType="create" onClick={handleSubmit} disabled={isSubmitting}>
          <Save className="h-4 w-4 mr-2" />
          {isSubmitting ? '作成中...' : '作成'}
        </StandardButton>
      </div>

      {/* タブ */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">基本情報</TabsTrigger>
          <TabsTrigger value="form">フォーム項目</TabsTrigger>
          <TabsTrigger value="approval">確認フロー</TabsTrigger>
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
                <Popover open={openTargetGroupPopover} onOpenChange={setOpenTargetGroupPopover}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openTargetGroupPopover}
                      className="w-full justify-between"
                    >
                      {basicInfo.group_id
                        ? groups.find((group) => group.id === basicInfo.group_id)?.name
                        : '全グループ'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="グループを検索..." />
                      <CommandList>
                        <CommandEmpty>グループが見つかりません。</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="all"
                            onSelect={() => {
                              setBasicInfo({ ...basicInfo, group_id: '' });
                              setOpenTargetGroupPopover(false);
                            }}
                          >
                            全グループ
                          </CommandItem>
                          {groups.map((group) => (
                            <CommandItem
                              key={group.id}
                              value={group.name}
                              onSelect={() => {
                                setBasicInfo({ ...basicInfo, group_id: group.id });
                                setOpenTargetGroupPopover(false);
                              }}
                            >
                              {group.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label htmlFor="is_active">ステータス</Label>
                <Select
                  value={String(basicInfo.is_active)}
                  onValueChange={(value) =>
                    setBasicInfo({ ...basicInfo, is_active: value === 'true' })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">有効</SelectItem>
                    <SelectItem value="false">無効</SelectItem>
                  </SelectContent>
                </Select>
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

        {/* 確認フロータブ */}
        <TabsContent value="approval">
          <Card>
            <CardHeader>
              <CardTitle>確認フロー設定</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <Label className="text-base font-medium">確認者設定</Label>
                  <p className="text-sm text-gray-500 mt-1">
                    レポートの確認を行う確認者を設定してください
                  </p>
                </div>

                <div className="space-y-3">
                  {confirmers.map((confirmer, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium">確認者 {index + 1}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeConfirmer(index)}
                          className="text-red-600"
                        >
                          削除
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>確認者タイプ</Label>
                          <Select
                            value={confirmer.type}
                            onValueChange={(value: 'user' | 'group') =>
                              updateConfirmer(index, { ...confirmer, type: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">ユーザー</SelectItem>
                              <SelectItem value="group">グループ</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>確認者</Label>
                          {confirmer.type === 'user' ? (
                            <Popover
                              open={openUserPopover === index}
                              onOpenChange={(open) => setOpenUserPopover(open ? index : null)}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={openUserPopover === index}
                                  className="w-full justify-between"
                                >
                                  {confirmer.user_id
                                    ? users.find((user) => user.id === confirmer.user_id)?.name
                                    : 'ユーザーを選択...'}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-full p-0">
                                <Command>
                                  <CommandInput placeholder="ユーザーを検索..." />
                                  <CommandList>
                                    <CommandEmpty>ユーザーが見つかりません。</CommandEmpty>
                                    <CommandGroup>
                                      {users.map((user) => (
                                        <CommandItem
                                          key={user.id}
                                          value={user.name}
                                          onSelect={() => {
                                            updateConfirmer(index, {
                                              ...confirmer,
                                              user_id: user.id,
                                              group_id: undefined,
                                            });
                                            setOpenUserPopover(null);
                                          }}
                                        >
                                          {user.name}
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          ) : (
                            <Popover
                              open={openConfirmerGroupPopover === index}
                              onOpenChange={(open) =>
                                setOpenConfirmerGroupPopover(open ? index : null)
                              }
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={openConfirmerGroupPopover === index}
                                  className="w-full justify-between"
                                >
                                  {confirmer.group_id
                                    ? groups.find((group) => group.id === confirmer.group_id)?.name
                                    : 'グループを選択...'}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-full p-0">
                                <Command>
                                  <CommandInput placeholder="グループを検索..." />
                                  <CommandList>
                                    <CommandEmpty>グループが見つかりません。</CommandEmpty>
                                    <CommandGroup>
                                      {groups.map((group) => (
                                        <CommandItem
                                          key={group.id}
                                          value={group.name}
                                          onSelect={() => {
                                            updateConfirmer(index, {
                                              ...confirmer,
                                              group_id: group.id,
                                              user_id: undefined,
                                            });
                                            setOpenConfirmerGroupPopover(null);
                                          }}
                                        >
                                          {group.name}
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                <Button type="button" variant="outline" onClick={addConfirmer} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  確認者を追加
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
