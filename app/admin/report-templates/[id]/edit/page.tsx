'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, MoveUp, MoveDown } from 'lucide-react';

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from '@/hooks/use-toast';
import {
  updateReportTemplate,
  getReportTemplate,
  updateReportTemplateStatus,
} from '@/lib/actions/admin/report-templates';
import { getGroups } from '@/lib/actions/admin/groups';
import { getAdminUsers } from '@/lib/actions/admin/users';
import { ReportTemplate, ReportFieldConfig, ReportFieldType } from '@/types';

const fieldTypes: { value: ReportFieldType; label: string }[] = [
  { value: 'text', label: 'テキスト' },
  { value: 'textarea', label: 'テキストエリア' },
  { value: 'number', label: '数値' },
  { value: 'date', label: '日付' },
  { value: 'time', label: '時間' },
  { value: 'datetime', label: '日時' },
  { value: 'email', label: 'メールアドレス' },
  { value: 'phone', label: '電話番号' },
  { value: 'url', label: 'URL' },
  { value: 'select', label: 'セレクトボックス' },
  { value: 'radio', label: 'ラジオボタン' },
  { value: 'checkbox', label: 'チェックボックス' },
  { value: 'file', label: 'ファイル' },
  { value: 'hidden', label: '隠しフィールド' },
];

export default function EditReportTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  // const [template, setTemplate] = useState<ReportTemplate | null>(null);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [templateId, setTemplateId] = useState<string>('');

  // フォームデータ
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    group_id: '',
    is_active: true,
  });
  const [openTargetGroupPopover, setOpenTargetGroupPopover] = useState(false);

  // フォーム設定
  const [formConfig, setFormConfig] = useState<ReportFieldConfig[]>([]);

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
  const [allGroups, setAllGroups] = useState<Array<{ id: string; name: string }>>([]);
  const [openUserPopover, setOpenUserPopover] = useState<number | null>(null);
  const [openConfirmerGroupPopover, setOpenConfirmerGroupPopover] = useState<number | null>(null);

  useEffect(() => {
    async function initData() {
      try {
        const resolvedParams = await params;
        await loadData(resolvedParams.id);
      } catch (error) {
        console.error('初期化エラー:', error);
      }
    }
    initData();
  }, [params]);

  async function loadData(id: string) {
    try {
      setTemplateId(id);

      // ユーザーとグループのデータを読み込み
      const [usersResult, groupsResult] = await Promise.all([
        getAdminUsers('', { limit: 1000 }),
        getGroups('', { limit: 1000 }),
      ]);

      if (usersResult.success && usersResult.data) {
        setUsers(
          usersResult.data.users.map((user) => ({
            id: user.id,
            name: `${user.family_name} ${user.first_name}`,
          }))
        );
      }

      if (groupsResult.success && groupsResult.data) {
        setAllGroups(
          groupsResult.data.groups.map((group) => ({
            id: group.id,
            name: group.name,
          }))
        );
      }

      // テンプレート情報を取得
      const templateResult = await getReportTemplate(id);
      if (templateResult.success && templateResult.data) {
        // setTemplate(templateResult.data);
        setFormData({
          name: templateResult.data.name,
          description: templateResult.data.description || '',
          group_id: templateResult.data.group_id || '',
          is_active: templateResult.data.is_active,
        });
        setFormConfig(templateResult.data.form_config);

        // 確認フロー設定を読み込み
        if (templateResult.data.confirmation_flow) {
          const confirmationFlow = templateResult.data.confirmation_flow;
          setConfirmers(confirmationFlow.confirmers || []);
        }
      } else {
        toast({
          title: 'エラー',
          description: templateResult.error || 'テンプレートの取得に失敗しました',
          variant: 'destructive',
        });
        router.push('/admin/report-templates');
        return;
      }

      // グループ一覧を取得（テンプレートのcompany_idを使用）
      try {
        const groupsResult = await getGroups(templateResult.data.company_id);
        if (groupsResult.success && groupsResult.data) {
          setGroups(groupsResult.data.groups);
        }
      } catch (error) {
        console.error('グループ取得エラー:', error);
        // 認証エラーの場合は全グループを取得
        const allGroupsResult = await getGroups();
        if (allGroupsResult.success && allGroupsResult.data) {
          setGroups(allGroupsResult.data.groups);
        }
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);

    try {
      // システムログ記録
      console.log('レポートテンプレート編集開始:', {
        templateId: templateId,
        name: formData.name,
        description: formData.description,
        fieldCount: formConfig.length,
        timestamp: new Date().toISOString(),
        user: 'admin',
        action: 'edit_report_template',
      });

      const formDataObj = new FormData();
      formDataObj.append('name', formData.name);
      formDataObj.append('description', formData.description);
      formDataObj.append('group_id', formData.group_id || '');
      formDataObj.append('is_active', String(formData.is_active));
      formDataObj.append('form_config', JSON.stringify(formConfig));
      formDataObj.append(
        'confirmation_flow',
        JSON.stringify({
          type: 'static',
          confirmers: confirmers,
        })
      );
      formDataObj.append(
        'status_flow',
        JSON.stringify({
          type: 'static',
          statuses: [],
          transitions: [],
        })
      );

      const result = await updateReportTemplate(templateId, formDataObj);
      if (result.success) {
        // 成功ログ記録
        console.log('レポートテンプレート編集成功:', {
          templateId: templateId,
          name: formData.name,
          timestamp: new Date().toISOString(),
          user: 'admin',
          action: 'edit_report_template_success',
        });

        toast({
          title: '成功',
          description: 'テンプレートを更新しました',
        });
        router.push('/admin/report-templates');
      } else {
        // エラーログ記録
        console.error('レポートテンプレート編集失敗:', {
          templateId: templateId,
          name: formData.name,
          error: result.error,
          timestamp: new Date().toISOString(),
          user: 'admin',
          action: 'edit_report_template_error',
        });

        toast({
          title: 'エラー',
          description: result.error || 'テンプレートの更新に失敗しました',
          variant: 'destructive',
        });
      }
    } catch (error) {
      // 例外ログ記録
      console.error('レポートテンプレート編集例外:', {
        templateId: templateId,
        name: formData.name,
        error: error,
        timestamp: new Date().toISOString(),
        user: 'admin',
        action: 'edit_report_template_exception',
      });

      toast({
        title: 'エラー',
        description: 'テンプレートの更新に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }

  function addField() {
    const newField: ReportFieldConfig = {
      id: `field_${Date.now()}`,
      type: 'text',
      label: '',
      required: false,
      placeholder: '',
    };
    setFormConfig([...formConfig, newField]);
  }

  function removeField(index: number) {
    setFormConfig(formConfig.filter((_, i) => i !== index));
  }

  function updateField(index: number, field: Partial<ReportFieldConfig>) {
    const newConfig = [...formConfig];
    newConfig[index] = { ...newConfig[index], ...field };
    setFormConfig(newConfig);
  }

  function moveField(index: number, direction: 'up' | 'down') {
    const newConfig = [...formConfig];
    if (direction === 'up' && index > 0) {
      [newConfig[index], newConfig[index - 1]] = [newConfig[index - 1], newConfig[index]];
    } else if (direction === 'down' && index < newConfig.length - 1) {
      [newConfig[index], newConfig[index + 1]] = [newConfig[index + 1], newConfig[index]];
    }
    setFormConfig(newConfig);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            戻る
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">テンプレート編集</h1>
            <p className="text-gray-600">レポートテンプレートを編集します</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="basic" className="space-y-6">
          <TabsList>
            <TabsTrigger value="basic">基本情報</TabsTrigger>
            <TabsTrigger value="form">フォーム項目</TabsTrigger>
            <TabsTrigger value="approval">確認フロー</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>基本情報</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">テンプレート名 *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">説明</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                        {formData.group_id
                          ? allGroups.find((group) => group.id === formData.group_id)?.name
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
                                setFormData({ ...formData, group_id: '' });
                                setOpenTargetGroupPopover(false);
                              }}
                            >
                              全グループ
                            </CommandItem>
                            {allGroups.map((group) => (
                              <CommandItem
                                key={group.id}
                                value={group.name}
                                onSelect={() => {
                                  setFormData({ ...formData, group_id: group.id });
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
                    value={String(formData.is_active)}
                    onValueChange={(value) =>
                      setFormData({ ...formData, is_active: value === 'true' })
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

          <TabsContent value="form" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>フォーム項目</span>
                  <Button type="button" onClick={addField}>
                    <Plus className="w-4 h-4 mr-2" />
                    項目追加
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {formConfig.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    フォーム項目がありません。項目を追加してください。
                  </div>
                ) : (
                  <div className="space-y-4">
                    {formConfig.map((field, index) => (
                      <div key={field.id} className="border rounded-lg p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">項目 {index + 1}</Badge>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => moveField(index, 'up')}
                              disabled={index === 0}
                            >
                              <MoveUp className="w-4 h-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => moveField(index, 'down')}
                              disabled={index === formConfig.length - 1}
                            >
                              <MoveDown className="w-4 h-4" />
                            </Button>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeField(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>フィールドタイプ *</Label>
                            <Select
                              value={field.type}
                              onValueChange={(value: ReportFieldType) =>
                                updateField(index, { type: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {fieldTypes.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>ラベル *</Label>
                            <Input
                              value={field.label}
                              onChange={(e) => updateField(index, { label: e.target.value })}
                              placeholder="フィールドのラベル"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>プレースホルダー</Label>
                            <Input
                              value={field.placeholder || ''}
                              onChange={(e) => updateField(index, { placeholder: e.target.value })}
                              placeholder="プレースホルダーテキスト"
                            />
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`required-${field.id}`}
                              checked={field.required}
                              onChange={(e) => updateField(index, { required: e.target.checked })}
                            />
                            <Label htmlFor={`required-${field.id}`}>必須項目</Label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="approval" className="space-y-4">
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
                            variant="ghost"
                            size="sm"
                            onClick={() => removeConfirmer(index)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                      ? allGroups.find((group) => group.id === confirmer.group_id)
                                          ?.name
                                      : 'グループを選択...'}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-full p-0">
                                  <Command>
                                    <CommandInput placeholder="グループを検索..." />
                                    <CommandList>
                                      <CommandEmpty>グループが見つかりません。</CommandEmpty>
                                      <CommandGroup>
                                        {allGroups.map((group) => (
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

        <div className="flex justify-end space-x-4 pt-6">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? '更新中...' : '更新'}
          </Button>
        </div>
      </form>
    </div>
  );
}
