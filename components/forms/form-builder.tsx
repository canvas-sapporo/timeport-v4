'use client';

import { useState, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Plus, GripVertical, Trash2, Settings, Copy } from 'lucide-react';

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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type {
  FormFieldConfig,
  FormFieldType,
  ValidationRule,
  ConditionalLogic,
  CalculationConfig,
} from '@/schemas/request';

interface FormBuilderProps {
  formConfig: FormFieldConfig[];
  onFormConfigChangeAction: (config: FormFieldConfig[]) => void;
}

const FIELD_TYPES: { value: FormFieldType; label: string; icon: string }[] = [
  { value: 'text', label: 'テキスト', icon: '📝' },
  { value: 'textarea', label: 'テキストエリア', icon: '📄' },
  { value: 'number', label: '数値', icon: '🔢' },
  { value: 'date', label: '日付', icon: '📅' },
  { value: 'time', label: '時刻', icon: '🕐' },
  { value: 'datetime-local', label: '日時', icon: '📅🕐' },
  { value: 'email', label: 'メール', icon: '📧' },
  { value: 'tel', label: '電話番号', icon: '📞' },
  { value: 'url', label: 'URL', icon: '🔗' },
  { value: 'select', label: 'セレクト', icon: '📋' },
  { value: 'radio', label: 'ラジオ', icon: '🔘' },
  { value: 'checkbox', label: 'チェックボックス', icon: '☑️' },
  { value: 'file', label: 'ファイル', icon: '📎' },
  { value: 'hidden', label: '隠しフィールド', icon: '👻' },
  { value: 'object', label: 'オブジェクト', icon: '🗂️' },
];

const VALIDATION_TYPES = [
  { value: 'required', label: '必須' },
  { value: 'minLength', label: '最小文字数' },
  { value: 'maxLength', label: '最大文字数' },
  { value: 'min', label: '最小値' },
  { value: 'max', label: '最大値' },
  { value: 'pattern', label: '正規表現' },
  { value: 'email', label: 'メール形式' },
  { value: 'tel', label: '電話番号形式' },
  { value: 'url', label: 'URL形式' },
  { value: 'custom', label: 'カスタム' },
];

const WIDTH_OPTIONS = [
  { value: 'full', label: '全幅' },
  { value: 'half', label: '半幅' },
  { value: 'third', label: '1/3幅' },
  { value: 'quarter', label: '1/4幅' },
];

export default function FormBuilder({ formConfig, onFormConfigChangeAction }: FormBuilderProps) {
  const [selectedField, setSelectedField] = useState<FormFieldConfig | null>(null);
  const [fieldSettingsOpen, setFieldSettingsOpen] = useState(false);
  const [calculationSettingsOpen, setCalculationSettingsOpen] = useState(false);

  // フィールドを追加
  const addField = useCallback(
    (type: FormFieldType) => {
      const newField: FormFieldConfig = {
        id: `field_${Date.now()}`,
        name: '',
        type,
        label: '',
        required: false,
        validation_rules: [],
        order: formConfig.length + 1,
        width: 'full',
      };

      const newConfig = [...formConfig, newField];
      onFormConfigChangeAction(newConfig);
      setSelectedField(newField);
      // 少し遅延を入れてダイアログを開く
      setTimeout(() => {
        setFieldSettingsOpen(true);
      }, 10);
    },
    [formConfig.length, onFormConfigChangeAction]
  );

  // フィールドを削除
  const removeField = useCallback(
    (fieldId: string) => {
      const newConfig = formConfig.filter((field) => field.id !== fieldId);
      newConfig.forEach((field, index) => {
        field.order = index + 1;
      });
      onFormConfigChangeAction(newConfig);
      if (selectedField && selectedField.id === fieldId) {
        setSelectedField(null);
        setFieldSettingsOpen(false);
      }
    },
    [formConfig, selectedField, onFormConfigChangeAction]
  );

  // フィールドを複製
  const duplicateField = useCallback(
    (field: FormFieldConfig) => {
      const newField: FormFieldConfig = {
        ...field,
        id: `field_${Date.now()}`,
        name: `${field.name}_copy`,
        label: `${field.label} (コピー)`,
        order: formConfig.length + 1,
      };
      const newConfig = [...formConfig, newField];
      onFormConfigChangeAction(newConfig);
    },
    [formConfig.length, onFormConfigChangeAction]
  );

  // フィールド設定を更新
  const updateField = useCallback(
    (fieldId: string, updates: Partial<FormFieldConfig>) => {
      const newConfig = formConfig.map((field) =>
        field.id === fieldId ? { ...field, ...updates } : field
      );
      onFormConfigChangeAction(newConfig);
    },
    [formConfig, onFormConfigChangeAction]
  );

  // ドラッグ&ドロップで順序を変更
  const handleDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return;

      const items = Array.from(formConfig);
      const [reorderedItem] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, reorderedItem);

      // 順序を再設定
      items.forEach((item, index) => {
        item.order = index + 1;
      });

      onFormConfigChangeAction(items);
    },
    [onFormConfigChangeAction]
  );

  // バリデーションルールを追加
  const addValidationRule = useCallback(
    (fieldId: string) => {
      const newRule: ValidationRule = {
        type: 'required',
        value: '',
        message: '',
      };

      const field = formConfig.find((f) => f.id === fieldId);
      if (field) {
        const newRules = [...field.validation_rules, newRule];
        const newConfig = formConfig.map((f) =>
          f.id === fieldId ? { ...f, validation_rules: newRules } : f
        );
        onFormConfigChangeAction(newConfig);
      }
    },
    [formConfig, onFormConfigChangeAction]
  );

  // バリデーションルールを削除
  const removeValidationRule = useCallback(
    (fieldId: string, ruleIndex: number) => {
      const field = formConfig.find((f) => f.id === fieldId);
      if (field) {
        const newRules = field.validation_rules.filter((_, index) => index !== ruleIndex);
        const newConfig = formConfig.map((f) =>
          f.id === fieldId ? { ...f, validation_rules: newRules } : f
        );
        onFormConfigChangeAction(newConfig);
      }
    },
    [formConfig, onFormConfigChangeAction]
  );

  // 条件表示ロジックを追加
  const addConditionalLogic = useCallback(
    (fieldId: string) => {
      const newLogic: ConditionalLogic = {
        field: '',
        operator: 'equals',
        value: '',
        action: 'show',
      };

      const field = formConfig.find((f) => f.id === fieldId);
      if (field) {
        const newLogicList = [...(field.conditional_logic || []), newLogic];
        const newConfig = formConfig.map((f) =>
          f.id === fieldId ? { ...f, conditional_logic: newLogicList } : f
        );
        onFormConfigChangeAction(newConfig);
      }
    },
    [formConfig, onFormConfigChangeAction]
  );

  // 条件表示ロジックを削除
  const removeConditionalLogic = useCallback(
    (fieldId: string, logicIndex: number) => {
      const field = formConfig.find((f) => f.id === fieldId);
      if (field && field.conditional_logic) {
        const newLogicList = field.conditional_logic.filter((_, index) => index !== logicIndex);
        const newConfig = formConfig.map((f) =>
          f.id === fieldId ? { ...f, conditional_logic: newLogicList } : f
        );
        onFormConfigChangeAction(newConfig);
      }
    },
    [formConfig, onFormConfigChangeAction]
  );

  return (
    <div className="space-y-6">
      {/* フィールドタイプ選択 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plus className="w-5 h-5" />
            <span>フィールドを追加</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {FIELD_TYPES.map((fieldType) => (
              <Button
                key={fieldType.value}
                variant="outline"
                className="h-20 flex flex-col items-center justify-center space-y-1"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  addField(fieldType.value);
                }}
              >
                <span className="text-lg">{fieldType.icon}</span>
                <span className="text-xs">{fieldType.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* フィールド一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>フォーム項目</CardTitle>
        </CardHeader>
        <CardContent>
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="fields">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                  {formConfig.map((field, index) => (
                    <Draggable key={field.id} draggableId={field.id} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className="border rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div {...provided.dragHandleProps}>
                                <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
                              </div>
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline">{field.type}</Badge>
                                <span className="font-medium">{field.label || '未設定'}</span>
                                {field.required && (
                                  <Badge variant="destructive" className="text-xs">
                                    必須
                                  </Badge>
                                )}
                                <Badge variant="secondary" className="text-xs">
                                  {field.width}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSelectedField(field);
                                  setFieldSettingsOpen(true);
                                }}
                              >
                                <Settings className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  duplicateField(field);
                                }}
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  removeField(field.id);
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          {formConfig.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>フィールドがありません。上記からフィールドを追加してください。</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* フィールド設定ダイアログ */}
      <Dialog
        open={fieldSettingsOpen}
        onOpenChange={(open) => {
          // 意図しない閉じる動作を防ぐ
          if (!open && selectedField) {
            // フィールドが選択されている場合は、明示的に閉じる操作のみ許可
            setFieldSettingsOpen(false);
            setSelectedField(null);
          } else if (open) {
            setFieldSettingsOpen(true);
          }
        }}
      >
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          onPointerDownOutside={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onInteractOutside={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <DialogHeader>
            <DialogTitle>フィールド設定</DialogTitle>
            <DialogDescription>フォームフィールドの詳細設定を行います。</DialogDescription>
          </DialogHeader>

          {selectedField &&
            (() => {
              // formConfigから最新のフィールド情報を取得
              const currentField = formConfig.find((f) => f.id === selectedField.id);
              if (!currentField) return null;

              return (
                <>
                  <Tabs key={currentField.id} defaultValue="basic" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="basic">基本設定</TabsTrigger>
                      <TabsTrigger value="validation">バリデーション</TabsTrigger>
                      <TabsTrigger value="conditional">条件表示</TabsTrigger>
                      <TabsTrigger value="calculation">計算設定</TabsTrigger>
                    </TabsList>

                    <TabsContent value="basic" className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="fieldName">フィールド名 *</Label>
                          <Input
                            id="fieldName"
                            value={currentField.name}
                            onChange={(e) => updateField(currentField.id, { name: e.target.value })}
                            placeholder="例: start_date"
                          />
                        </div>
                        <div>
                          <Label htmlFor="fieldLabel">ラベル *</Label>
                          <Input
                            id="fieldLabel"
                            value={currentField.label}
                            onChange={(e) =>
                              updateField(currentField.id, { label: e.target.value })
                            }
                            placeholder="例: 開始日"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="fieldDescription">説明</Label>
                        <Textarea
                          id="fieldDescription"
                          value={currentField.description || ''}
                          onChange={(e) =>
                            updateField(currentField.id, { description: e.target.value })
                          }
                          placeholder="フィールドの説明を入力"
                          rows={2}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="fieldWidth">表示幅</Label>
                          <Select
                            value={currentField.width || 'full'}
                            onValueChange={(value) =>
                              updateField(currentField.id, {
                                width: value as 'full' | 'half' | 'third' | 'quarter',
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {WIDTH_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="fieldOrder">表示順序</Label>
                          <Input
                            id="fieldOrder"
                            type="number"
                            value={currentField.order}
                            onChange={(e) =>
                              updateField(currentField.id, { order: parseInt(e.target.value) })
                            }
                          />
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="fieldRequired"
                          checked={currentField.required}
                          onCheckedChange={(checked) =>
                            updateField(currentField.id, { required: checked })
                          }
                        />
                        <Label htmlFor="fieldRequired">必須フィールド</Label>
                      </div>

                      {/* 選択肢フィールドの場合 */}
                      {(currentField.type === 'select' ||
                        currentField.type === 'radio' ||
                        currentField.type === 'checkbox') && (
                        <div>
                          <Label htmlFor="fieldOptions">選択肢</Label>
                          <Textarea
                            id="fieldOptions"
                            value={currentField.options?.join('\n') || ''}
                            onChange={(e) => {
                              const options = e.target.value
                                .split('\n')
                                .filter((option) => option.trim());
                              updateField(currentField.id, { options });
                            }}
                            placeholder="選択肢を1行に1つずつ入力"
                            rows={4}
                          />
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="validation" className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>バリデーションルール</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addValidationRule(currentField.id)}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          ルール追加
                        </Button>
                      </div>

                      <div className="space-y-3">
                        {currentField.validation_rules.map((rule, index) => (
                          <div key={index} className="border rounded-lg p-3 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">ルール {index + 1}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-red-600"
                                onClick={() => removeValidationRule(currentField.id, index)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label>タイプ</Label>
                                <Select
                                  value={rule.type}
                                  onValueChange={(value) => {
                                    const newRules = [...currentField.validation_rules];
                                    newRules[index] = {
                                      ...rule,
                                      type: value as ValidationRule['type'],
                                    };
                                    updateField(currentField.id, { validation_rules: newRules });
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {VALIDATION_TYPES.map((type) => (
                                      <SelectItem key={type.value} value={type.value}>
                                        {type.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <Label>値</Label>
                                <Input
                                  value={rule.value || ''}
                                  onChange={(e) => {
                                    const newRules = [...currentField.validation_rules];
                                    newRules[index] = { ...rule, value: e.target.value };
                                    updateField(currentField.id, { validation_rules: newRules });
                                  }}
                                  placeholder="バリデーション値"
                                />
                              </div>
                            </div>

                            <div>
                              <Label>エラーメッセージ</Label>
                              <Input
                                value={rule.message || ''}
                                onChange={(e) => {
                                  const newRules = [...currentField.validation_rules];
                                  newRules[index] = { ...rule, message: e.target.value };
                                  updateField(currentField.id, { validation_rules: newRules });
                                }}
                                placeholder="エラーメッセージ"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="conditional" className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>条件表示ロジック</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addConditionalLogic(currentField.id)}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          条件追加
                        </Button>
                      </div>

                      <div className="space-y-3">
                        {currentField.conditional_logic?.map((logic, index) => (
                          <div key={index} className="border rounded-lg p-3 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">条件 {index + 1}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-red-600"
                                onClick={() => removeConditionalLogic(currentField.id, index)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>

                            <div className="grid grid-cols-4 gap-3">
                              <div>
                                <Label>対象フィールド</Label>
                                <Select
                                  value={logic.field}
                                  onValueChange={(value) => {
                                    const newLogic = [...(currentField.conditional_logic || [])];
                                    newLogic[index] = { ...logic, field: value };
                                    updateField(currentField.id, { conditional_logic: newLogic });
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="フィールド選択" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {formConfig
                                      .filter((f) => f.id !== currentField.id)
                                      .map((field) => (
                                        <SelectItem key={field.id} value={field.id}>
                                          {field.label}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <Label>演算子</Label>
                                <Select
                                  value={logic.operator}
                                  onValueChange={(value) => {
                                    const newLogic = [...(currentField.conditional_logic || [])];
                                    newLogic[index] = {
                                      ...logic,
                                      operator: value as ConditionalLogic['operator'],
                                    };
                                    updateField(currentField.id, { conditional_logic: newLogic });
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="equals">等しい</SelectItem>
                                    <SelectItem value="not_equals">等しくない</SelectItem>
                                    <SelectItem value="contains">含む</SelectItem>
                                    <SelectItem value="not_contains">含まない</SelectItem>
                                    <SelectItem value="greater_than">より大きい</SelectItem>
                                    <SelectItem value="less_than">より小さい</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <Label>値</Label>
                                <Input
                                  value={logic.value as string}
                                  onChange={(e) => {
                                    const newLogic = [...(currentField.conditional_logic || [])];
                                    newLogic[index] = { ...logic, value: e.target.value };
                                    updateField(currentField.id, { conditional_logic: newLogic });
                                  }}
                                  placeholder="条件値"
                                />
                              </div>

                              <div>
                                <Label>アクション</Label>
                                <Select
                                  value={logic.action}
                                  onValueChange={(value) => {
                                    const newLogic = [...(currentField.conditional_logic || [])];
                                    newLogic[index] = {
                                      ...logic,
                                      action: value as ConditionalLogic['action'],
                                    };
                                    updateField(currentField.id, { conditional_logic: newLogic });
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="show">表示</SelectItem>
                                    <SelectItem value="hide">非表示</SelectItem>
                                    <SelectItem value="require">必須化</SelectItem>
                                    <SelectItem value="disable">無効化</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="calculation" className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>計算設定</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setCalculationSettingsOpen(true)}
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          計算設定
                        </Button>
                      </div>

                      {currentField.calculation_config ? (
                        <div className="border rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                              計算タイプ: {currentField.calculation_config.type}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-red-600"
                              onClick={() =>
                                updateField(currentField.id, { calculation_config: undefined })
                              }
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <p className="text-sm text-gray-600">
                            対象フィールド:{' '}
                            {currentField.calculation_config.target_fields.join(', ')}
                          </p>
                          <p className="text-sm text-gray-600">
                            結果フィールド: {currentField.calculation_config.result_field}
                          </p>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <p>計算設定がありません</p>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>

                  {/* 操作ボタン */}
                  <div className="flex justify-end space-x-2 pt-4 border-t">
                    <Button variant="outline" onClick={() => setFieldSettingsOpen(false)}>
                      キャンセル
                    </Button>
                    <Button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // 必須フィールドのバリデーション
                        if (!currentField?.name.trim()) {
                          alert('フィールド名を入力してください');
                          return;
                        }
                        if (!currentField?.label.trim()) {
                          alert('ラベルを入力してください');
                          return;
                        }
                        setFieldSettingsOpen(false);
                        setSelectedField(null);
                      }}
                      disabled={!currentField?.name.trim() || !currentField?.label.trim()}
                    >
                      保存
                    </Button>
                  </div>
                </>
              );
            })()}
        </DialogContent>
      </Dialog>

      {/* 計算設定ダイアログ */}
      <Dialog open={calculationSettingsOpen} onOpenChange={setCalculationSettingsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>計算設定</DialogTitle>
            <DialogDescription>フィールドの計算設定を行います。</DialogDescription>
          </DialogHeader>

          {selectedField && (
            <div className="space-y-4">
              <div>
                <Label>計算タイプ</Label>
                <Select
                  value={selectedField.calculation_config?.type || 'sum'}
                  onValueChange={(value) => {
                    const newConfig: CalculationConfig = {
                      type: value as CalculationConfig['type'],
                      target_fields: selectedField.calculation_config?.target_fields || [],
                      result_field: selectedField.calculation_config?.result_field || '',
                    };
                    updateField(selectedField.id, { calculation_config: newConfig });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sum">合計</SelectItem>
                    <SelectItem value="multiply">乗算</SelectItem>
                    <SelectItem value="divide">除算</SelectItem>
                    <SelectItem value="subtract">減算</SelectItem>
                    <SelectItem value="date_diff">日数差</SelectItem>
                    <SelectItem value="time_diff">時間差</SelectItem>
                    <SelectItem value="custom">カスタム</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>対象フィールド</Label>
                <Select
                  value=""
                  onValueChange={(value) => {
                    const currentConfig = selectedField.calculation_config;
                    if (currentConfig) {
                      const newTargetFields = [...currentConfig.target_fields, value];
                      updateField(selectedField.id, {
                        calculation_config: { ...currentConfig, target_fields: newTargetFields },
                      });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="フィールドを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {formConfig
                      .filter((f) => f.type === 'number' && f.id !== selectedField.id)
                      .map((field) => (
                        <SelectItem key={field.id} value={field.id}>
                          {field.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {selectedField.calculation_config?.target_fields.map((fieldId, index) => {
                  const field = formConfig.find((f) => f.id === fieldId);
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between mt-2 p-2 bg-gray-50 rounded"
                    >
                      <span className="text-sm">{field?.label}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const currentConfig = selectedField.calculation_config;
                          if (currentConfig) {
                            const newTargetFields = currentConfig.target_fields.filter(
                              (_, i) => i !== index
                            );
                            updateField(selectedField.id, {
                              calculation_config: {
                                ...currentConfig,
                                target_fields: newTargetFields,
                              },
                            });
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>

              <div>
                <Label>結果フィールド</Label>
                <Select
                  value={selectedField.calculation_config?.result_field || ''}
                  onValueChange={(value) => {
                    const currentConfig = selectedField.calculation_config;
                    if (currentConfig) {
                      updateField(selectedField.id, {
                        calculation_config: { ...currentConfig, result_field: value },
                      });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="結果を格納するフィールド" />
                  </SelectTrigger>
                  <SelectContent>
                    {formConfig
                      .filter((f) => f.type === 'number' && f.id !== selectedField.id)
                      .map((field) => (
                        <SelectItem key={field.id} value={field.id}>
                          {field.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedField.calculation_config?.type === 'custom' && (
                <div>
                  <Label>計算式</Label>
                  <Textarea
                    value={selectedField.calculation_config?.formula || ''}
                    onChange={(e) => {
                      const currentConfig = selectedField.calculation_config;
                      if (currentConfig) {
                        updateField(selectedField.id, {
                          calculation_config: { ...currentConfig, formula: e.target.value },
                        });
                      }
                    }}
                    placeholder="例: field1 + field2 * 0.1"
                    rows={3}
                  />
                </div>
              )}
            </div>
          )}

          {/* 操作ボタン */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setCalculationSettingsOpen(false)}>
              キャンセル
            </Button>
            <Button type="button" onClick={() => setCalculationSettingsOpen(false)}>
              保存
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
