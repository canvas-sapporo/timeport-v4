'use client';

import { useState, useEffect } from 'react';

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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import type { ObjectMetadata } from '@/types/request';
import { getObjectTypeOptions, getAttendanceObjectFields } from '@/lib/utils/request-type-utils';

interface ObjectTypeSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metadata: ObjectMetadata | null;
  onMetadataChange: (metadata: ObjectMetadata | null) => void;
}

export default function ObjectTypeSettingsDialog({
  open,
  onOpenChange,
  metadata,
  onMetadataChange,
}: ObjectTypeSettingsDialogProps) {
  const [objectType, setObjectType] = useState<string>('');
  const [editableFields, setEditableFields] = useState<string[]>([]);
  const [requiredFields, setRequiredFields] = useState<string[]>([]);

  const objectTypeOptions = getObjectTypeOptions();

  useEffect(() => {
    if (metadata) {
      setObjectType(metadata.object_type);
      setEditableFields(metadata.editable_fields);
      setRequiredFields(metadata.required_fields);
    } else {
      setObjectType('');
      setEditableFields([]);
      setRequiredFields([]);
    }
  }, [metadata]);

  const handleObjectTypeChange = (type: string) => {
    setObjectType(type);

    if (type === 'attendance') {
      const attendanceFields = getAttendanceObjectFields();
      const fieldNames = Object.keys(attendanceFields);
      setEditableFields(fieldNames);
      setRequiredFields(['work_date']);
    } else {
      setEditableFields([]);
      setRequiredFields([]);
    }
  };

  const handleEditableFieldChange = (field: string, checked: boolean) => {
    if (checked) {
      setEditableFields([...editableFields, field]);
    } else {
      setEditableFields(editableFields.filter((f) => f !== field));
      setRequiredFields(requiredFields.filter((f) => f !== field));
    }
  };

  const handleRequiredFieldChange = (field: string, checked: boolean) => {
    if (checked) {
      setRequiredFields([...requiredFields, field]);
    } else {
      setRequiredFields(requiredFields.filter((f) => f !== field));
    }
  };

  const handleSave = () => {
    if (!objectType) return;

    let newMetadata: ObjectMetadata;

    switch (objectType) {
      case 'attendance':
        newMetadata = {
          object_type: 'attendance',
          editable_fields: editableFields,
          required_fields: requiredFields,
          excluded_fields: [
            'id',
            'created_at',
            'updated_at',
            'deleted_at',
            'user_id',
            'work_type_id',
            'actual_work_minutes',
            'overtime_minutes',
            'description',
            'approved_by',
            'approved_at',
            'source_id',
            'edit_reason',
            'edited_by',
          ],
          validation_rules: [
            {
              type: 'date_past_only',
              message: '過去の日付のみ入力可能です',
            },
            {
              type: 'clock_records_valid',
              message: '打刻記録の形式が正しくありません',
            },
            {
              type: 'required_field',
              target_field: 'work_date',
              message: '勤務日は必須です',
            },
          ],
          field_settings: getAttendanceObjectFields(),
        };
        break;
      default:
        return;
    }

    onMetadataChange(newMetadata);
    onOpenChange(false);
  };

  const getFieldSettings = () => {
    switch (objectType) {
      case 'attendance':
        return getAttendanceObjectFields();
      default:
        return {};
    }
  };

  const fieldSettings = getFieldSettings();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>オブジェクトタイプ設定</DialogTitle>
          <DialogDescription>
            オブジェクトタイプと編集可能なフィールドを設定してください
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* オブジェクトタイプ選択 */}
          <div className="space-y-3">
            <Label>オブジェクトタイプ</Label>
            <Select value={objectType} onValueChange={handleObjectTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="オブジェクトタイプを選択" />
              </SelectTrigger>
              <SelectContent>
                {objectTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {objectType && (
            <>
              <Separator />

              {/* フィールド設定 */}
              <div className="space-y-4">
                <Label>フィールド設定</Label>
                <div className="space-y-3">
                  {Object.entries(fieldSettings).map(([fieldName, fieldConfig]) => (
                    <Card key={fieldName}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center justify-between">
                          <span>{fieldConfig.label}</span>
                          <Badge variant="outline">{fieldConfig.type}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {fieldConfig.description && (
                          <p className="text-sm text-muted-foreground">{fieldConfig.description}</p>
                        )}

                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`editable_${fieldName}`}
                              checked={editableFields.includes(fieldName)}
                              onCheckedChange={(checked) =>
                                handleEditableFieldChange(fieldName, checked as boolean)
                              }
                            />
                            <Label htmlFor={`editable_${fieldName}`} className="text-sm">
                              編集可能
                            </Label>
                          </div>

                          {editableFields.includes(fieldName) && (
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`required_${fieldName}`}
                                checked={requiredFields.includes(fieldName)}
                                onCheckedChange={(checked) =>
                                  handleRequiredFieldChange(fieldName, checked as boolean)
                                }
                              />
                              <Label htmlFor={`required_${fieldName}`} className="text-sm">
                                必須
                              </Label>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <Separator />

              {/* プレビュー */}
              <div className="space-y-3">
                <Label>設定プレビュー</Label>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">編集可能フィールド:</span>
                    {editableFields.length > 0 ? (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {editableFields.map((field) => (
                          <Badge key={field} variant="secondary">
                            {fieldSettings[field]?.label || field}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground ml-2">なし</span>
                    )}
                  </div>
                  <div>
                    <span className="font-medium">必須フィールド:</span>
                    {requiredFields.length > 0 ? (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {requiredFields.map((field) => (
                          <Badge key={field} variant="destructive">
                            {fieldSettings[field]?.label || field}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground ml-2">なし</span>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button onClick={handleSave} disabled={!objectType}>
            保存
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
