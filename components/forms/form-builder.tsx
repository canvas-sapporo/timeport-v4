'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { FormField, ValidationRules, RequestType } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Plus, Settings, Trash2, Eye } from 'lucide-react';
import DynamicForm from './dynamic-form';

interface FormBuilderProps {
  initialData?: RequestType;
  onSaveAction: (data: RequestType) => void;
  onCancelAction: () => void;
  isLoading?: boolean;
}

const fieldTypeOptions = [
  { value: 'text', label: '一行テキスト' },
  { value: 'textarea', label: '複数行テキスト' },
  { value: 'number', label: '数値' },
  { value: 'date', label: '日付' },
  { value: 'time', label: '時刻' },
  { value: 'datetime-local', label: '日時' },
  { value: 'email', label: 'メールアドレス' },
  { value: 'tel', label: '電話番号' },
  { value: 'select', label: 'ドロップダウン選択' },
  { value: 'radio', label: 'ラジオボタン' },
  { value: 'checkbox', label: 'チェックボックス' },
  { value: 'file', label: 'ファイルアップロード' },
];

interface ValidationModalProps {
  field: FormField;
  isOpen: boolean;
  onClose: () => void;
  onSave: (fieldId: string, validationRules: ValidationRules, options?: string[]) => void;
}

const ValidationModal = ({ field, isOpen, onClose, onSave }: ValidationModalProps) => {
  const [validationRules, setValidationRules] = useState<ValidationRules>(field.validationRules || {});
  const [options, setOptions] = useState<string[]>(field.options || []);
  const [optionsText, setOptionsText] = useState(field.options?.join('\n') || '');

  const handleSave = () => {
    const updatedOptions = (field.type === 'select' || field.type === 'radio') 
      ? optionsText.split('\n').filter(option => option.trim() !== '')
      : undefined;
    
    onSave(field.id, validationRules, updatedOptions);
    onClose();
  };

  const isTextType = (type: string) => ['text', 'textarea', 'email', 'tel'].includes(type);
  const isSelectType = (type: string) => ['select', 'radio'].includes(type);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>入力規則設定: {field.label}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {/* 必須設定 */}
          <div className="flex items-center space-x-2">
            <Checkbox 
              checked={field.required} 
              disabled
            />
            <Label>必須項目</Label>
          </div>

          {/* テキスト系の設定 */}
          {isTextType(field.type) && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>最小文字数</Label>
                  <Input 
                    type="number" 
                    value={validationRules.minLength || ''}
                    onChange={(e) => setValidationRules(prev => ({
                      ...prev,
                      min_length: e.target.value ? parseInt(e.target.value) : undefined
                    }))}
                  />
                </div>
                <div>
                  <Label>最大文字数</Label>
                  <Input 
                    type="number" 
                    value={validationRules.maxLength || ''}
                    onChange={(e) => setValidationRules(prev => ({
                      ...prev,
                      max_length: e.target.value ? parseInt(e.target.value) : undefined
                    }))}
                  />
                </div>
              </div>
              
              <div>
                <Label>正規表現パターン</Label>
                <Input 
                  value={validationRules.pattern || ''}
                  placeholder="例: ^[0-9]+$"
                  onChange={(e) => setValidationRules(prev => ({
                    ...prev,
                    pattern: e.target.value || undefined
                  }))}
                />
              </div>
            </>
          )}

          {/* 数値系の設定 */}
          {field.type === 'number' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>最小値</Label>
                <Input 
                  type="number" 
                  value={validationRules.minValue || ''}
                  onChange={(e) => setValidationRules(prev => ({
                    ...prev,
                    min_value: e.target.value ? parseInt(e.target.value) : undefined
                  }))}
                />
              </div>
              <div>
                <Label>最大値</Label>
                <Input 
                  type="number" 
                  value={validationRules.maxValue || ''}
                  onChange={(e) => setValidationRules(prev => ({
                    ...prev,
                    max_value: e.target.value ? parseInt(e.target.value) : undefined
                  }))}
                />
              </div>
            </div>
          )}

          {/* 選択肢系の設定 */}
          {isSelectType(field.type) && (
            <div>
              <Label>選択肢（1行につき1つ）</Label>
              <Textarea 
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                placeholder="選択肢1&#10;選択肢2&#10;選択肢3"
                rows={5}
              />
            </div>
          )}

          {/* カスタムエラーメッセージ */}
          <div>
            <Label>カスタムエラーメッセージ</Label>
            <Input 
              value={validationRules.customMessage || ''}
              placeholder="エラー時に表示するメッセージ"
              onChange={(e) => setValidationRules(prev => ({
                ...prev,
                custom_message: e.target.value || undefined
              }))}
            />
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>キャンセル</Button>
          <Button onClick={handleSave}>保存</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default function FormBuilder({ initialData, onSaveAction, onCancelAction, isLoading }: FormBuilderProps) {
  const [formData, setFormData] = useState<RequestType>(
    initialData || {
      id: '', // または一時的なユニークID
      name: '',
      description: '',
      code: '',
      formFields: [],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: undefined,
    }
  );
  const [selectedField, setSelectedField] = useState<FormField | null>(null);
  const [validationModalOpen, setValidationModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  const addField = () => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      name: `field_${formData.formFields.length + 1}`,
      type: 'text',
      label: '',
      placeholder: '',
      required: false,
      validationRules: {
        id: '',
        createdAt: '',
        updatedAt: '',
        deletedAt: '',
      },
      options: [],
      order: formData.formFields.length + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: '',
    };

    setFormData(prev => ({
      ...prev,
      formFields: [...prev.formFields, newField]
    }));
  };

  const updateField = (fieldId: string, key: keyof FormField, value: any) => {
    setFormData(prev => ({
      ...prev,
      formFields: prev.formFields.map(field => 
        field.id === fieldId ? { ...field, [key]: value } : field
      )
    }));
  };

  const removeField = (fieldId: string) => {
    setFormData(prev => ({
      ...prev,
      formFields: prev.formFields.filter(field => field.id !== fieldId)
    }));
  };

  const openValidationModal = (fieldId: string) => {
    const field = formData.formFields.find(f => f.id === fieldId);
    if (field) {
      setSelectedField(field);
      setValidationModalOpen(true);
    }
  };

  const saveValidationRules = (fieldId: string, validationRules: ValidationRules, options?: string[]) => {
    setFormData(prev => ({
      ...prev,
      formFields: prev.formFields.map(field => 
        field.id === fieldId 
          ? { 
              ...field, 
              validationRules: validationRules,
              options: options || field.options
            } 
          : field
      )
    }));
  };

  const handleSave = () => {
    // バリデーション
    if (!formData.name.trim()) {
      alert('申請名を入力してください');
      return;
    }

    if (!formData.code.trim()) {
      alert('申請コードを入力してください');
      return;
    }

    if (formData.formFields.length === 0) {
      alert('少なくとも1つの項目を追加してください');
      return;
    }

    // 項目名の重複チェック
    const fieldNames = formData.formFields.map(f => f.name);
    const duplicateNames = fieldNames.filter((name, index) => fieldNames.indexOf(name) !== index);
    if (duplicateNames.length > 0) {
      alert('項目名が重複しています');
      return;
    }

    onSaveAction(formData);
  };

  const previewRequestType = {
    id: 'preview',
    code: formData.code,
    name: formData.name,
    description: formData.description,
    formFields: formData.formFields,
    isActive: formData.isActive,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return (
    <div className="space-y-6">
      {/* 基本情報 */}
      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">申請名 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="例：休暇申請"
              />
            </div>
            <div>
              <Label htmlFor="code">申請コード *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                placeholder="例：vacation"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="description">説明</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="申請の説明を入力してください"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* 項目管理 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            フォーム項目設定
            <Button onClick={addField} size="sm" variant="timeport-primary">
              <Plus className="w-4 h-4 mr-2" />
              項目追加
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {formData.formFields.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              項目を追加してください
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>項目名</TableHead>
                  <TableHead>入力タイプ</TableHead>
                  <TableHead>必須</TableHead>
                  <TableHead>入力規則</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formData.formFields.map((field) => (
                  <TableRow key={field.id}>
                    <TableCell>
                      <Input
                        value={field.label}
                        onChange={(e) => {
                          updateField(field.id, 'label', e.target.value);
                          updateField(field.id, 'name', e.target.value.toLowerCase().replace(/\s+/g, '_'));
                        }}
                        placeholder="項目名を入力"
                        className="min-w-32"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={field.type}
                        onValueChange={(value) => updateField(field.id, 'type', value)}
                      >
                        <SelectTrigger className="min-w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {fieldTypeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Checkbox
                        checked={field.required}
                        onCheckedChange={(checked) => updateField(field.id, 'required', checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openValidationModal(field.id)}
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeField(field.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* プレビュー */}
      {formData.formFields.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              プレビュー
              <Dialog open={previewModalOpen} onOpenChange={setPreviewModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Eye className="w-4 h-4 mr-2" />
                    フルプレビュー
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>フォームプレビュー</DialogTitle>
                  </DialogHeader>
                  <DynamicForm
                    requestType={previewRequestType}
                    onSubmitAction={(data) => {
                      console.log('Preview form data:', data);
                      alert('プレビューモードです');
                    }}
                  />
                </DialogContent>
              </Dialog>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-4 bg-gray-50">
              <h3 className="font-medium mb-4">{formData.name || '申請名'}</h3>
              <div className="space-y-3">
                {formData.formFields.slice(0, 3).map((field) => (
                  <div key={field.id}>
                    <Label>
                      {field.label || '項目名'}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    <div className="mt-1">
                      <Badge variant="outline">
                        {fieldTypeOptions.find(opt => opt.value === field.type)?.label}
                      </Badge>
                    </div>
                  </div>
                ))}
                {formData.formFields.length > 3 && (
                  <div className="text-sm text-gray-500">
                    他 {formData.formFields.length - 3} 項目...
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 保存・キャンセル */}
      <div className="flex justify-end space-x-4">
        <Button variant="outline" onClick={onCancelAction}>
          キャンセル
        </Button>
        <Button onClick={handleSave} disabled={isLoading} variant="timeport-primary">
          {isLoading ? '保存中...' : '保存'}
        </Button>
      </div>

      {/* バリデーション設定モーダル */}
      {selectedField && (
        <ValidationModal
          field={selectedField}
          isOpen={validationModalOpen}
          onClose={() => setValidationModalOpen(false)}
          onSave={saveValidationRules}
        />
      )}
    </div>
  );
}