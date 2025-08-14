'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import type { ObjectMetadata, LeaveObjectMetadata } from '@/schemas/request';
import { getObjectTypeOptions, getAttendanceObjectFields } from '@/lib/utils/request-type-utils';
// supabase client imported above
import { Input } from '@/components/ui/input';

// オブジェクトフィールドの型定義
interface ObjectField {
  id: string;
  type: string;
  label: string;
  name: string;
  metadata?: ObjectMetadata;
  [key: string]: unknown;
}

interface ObjectTypeSettingsDialogProps {
  open: boolean;
  onOpenChangeAction: (open: boolean) => void;
  metadata: ObjectMetadata | null;
  onMetadataChangeAction: (metadata: ObjectMetadata | null) => void;
  onSaveObjectField?: (field: ObjectField) => void;
  tempField?: ObjectField;
}

export default function ObjectTypeSettingsDialog({
  open,
  onOpenChangeAction,
  metadata,
  onMetadataChangeAction,
  onSaveObjectField,
  tempField,
}: ObjectTypeSettingsDialogProps) {
  const [objectType, setObjectType] = useState<string>('');
  const [editableFields, setEditableFields] = useState<string[]>([]);
  const [requiredFields, setRequiredFields] = useState<string[]>([]);
  // leave用のUI設定
  const [leaveConfig, setLeaveConfig] = useState<LeaveObjectMetadata | null>(null);
  const [leaveTypes, setLeaveTypes] = useState<Array<{ id: string; name: string; code?: string }>>(
    []
  );

  const objectTypeOptions = getObjectTypeOptions();
  type NonEmptyUnits = LeaveObjectMetadata['allowed_units'];
  const toNonEmptyUnits = (arr: Array<'day' | 'half' | 'hour'>): NonEmptyUnits => {
    const list = arr.length > 0 ? arr : (['day'] as Array<'day' | 'half' | 'hour'>);
    return [list[0], ...list.slice(1)] as unknown as NonEmptyUnits;
  };

  useEffect(() => {
    if (metadata) {
      setObjectType(metadata.object_type);
      if (metadata.object_type === 'attendance') {
        const m = metadata as unknown as {
          editable_fields?: string[];
          required_fields?: string[];
        };
        setEditableFields(m.editable_fields || []);
        setRequiredFields(m.required_fields || []);
        setLeaveConfig(null);
      }
      if (metadata.object_type === 'leave') {
        setEditableFields([]);
        setRequiredFields([]);
        setLeaveConfig(metadata as LeaveObjectMetadata);
      }
    } else {
      setObjectType('');
      setEditableFields([]);
      setRequiredFields([]);
      setLeaveConfig(null);
    }
  }, [metadata]);

  // 休暇種別の取得（RLSにより自社のみが返る想定）
  useEffect(() => {
    const fetchLeaveTypes = async () => {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const { data } = await supabase
          .from('leave_types')
          .select('id, name, code')
          .is('deleted_at', null)
          .eq('is_active', true)
          .order('display_order', { ascending: true });
        setLeaveTypes((data as Array<{ id: string; name: string; code?: string }>) || []);
      } catch {
        setLeaveTypes([]);
      }
    };
    if (open && objectType === 'leave') {
      fetchLeaveTypes();
    }
  }, [open, objectType]);

  const handleObjectTypeChange = (type: string) => {
    setObjectType(type);

    if (type === 'attendance') {
      const attendanceFields = getAttendanceObjectFields();
      const fieldNames = Object.keys(attendanceFields);
      setEditableFields(fieldNames);
      setRequiredFields(['work_date']);
      setLeaveConfig(null);
    } else {
      setEditableFields([]);
      setRequiredFields([]);
      if (type === 'leave') {
        setLeaveConfig({
          object_type: 'leave',
          leave_type_id: '',
          allowed_units: toNonEmptyUnits(['day', 'half', 'hour']),
          min_booking_unit_minutes: 60,
          rounding_minutes: 15,
          half_day_mode: 'fixed_hours',
          allow_multi_day: true,
          require_reason: false,
          require_attachment: false,
          show_balance: true,
        });
      } else {
        setLeaveConfig(null);
      }
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
      case 'leave':
        if (!leaveConfig) return;
        newMetadata = leaveConfig as unknown as ObjectMetadata;
        break;
      default:
        return;
    }

    // メタデータを更新
    onMetadataChangeAction(newMetadata);

    // フィールドを保存
    if (onSaveObjectField && tempField) {
      const fieldToSave = {
        ...tempField,
        metadata: newMetadata,
        label: '打刻修正', // デフォルトラベル
        name: 'attendance_correction', // デフォルト名
      };
      onSaveObjectField(fieldToSave);
    } else {
      onOpenChangeAction(false);
    }
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
    <Dialog open={open} onOpenChange={onOpenChangeAction}>
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
                {objectTypeOptions.map(
                  (option: { value: string; label: string; description: string }) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex flex-col">
                        <span>{option.label}</span>
                        <span className="text-xs text-muted-foreground">{option.description}</span>
                      </div>
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          {objectType && (
            <>
              <Separator />

              {/* 設定UI */}
              {objectType === 'attendance' && (
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
                            <p className="text-sm text-muted-foreground">
                              {fieldConfig.description}
                            </p>
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
              )}

              {objectType === 'leave' && leaveConfig && (
                <div className="space-y-4">
                  <Label>休暇設定</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>休暇種別</Label>
                      <Select
                        value={leaveConfig.leave_type_id}
                        onValueChange={(v) => setLeaveConfig({ ...leaveConfig, leave_type_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="休暇種別を選択" />
                        </SelectTrigger>
                        <SelectContent>
                          {leaveTypes.map((lt) => (
                            <SelectItem key={lt.id} value={lt.id}>
                              {lt.name} {lt.code ? `(${lt.code})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>許可単位</Label>
                      <div className="flex items-center gap-3 mt-2">
                        {(['day', 'half', 'hour'] as ('day' | 'half' | 'hour')[]).map((u) => (
                          <div key={u} className="flex items-center space-x-2">
                            <Checkbox
                              id={`unit_${u}`}
                              checked={leaveConfig.allowed_units.includes(u)}
                              onCheckedChange={(checked) => {
                                const set = new Set(leaveConfig.allowed_units);
                                if (checked) set.add(u);
                                else set.delete(u);
                                const updated = Array.from(set) as Array<'day' | 'half' | 'hour'>;
                                setLeaveConfig({
                                  ...leaveConfig,
                                  allowed_units: toNonEmptyUnits(updated),
                                });
                              }}
                            />
                            <Label htmlFor={`unit_${u}`} className="text-sm">
                              {u}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label>最小単位（分）</Label>
                      <Input
                        type="number"
                        value={leaveConfig.min_booking_unit_minutes}
                        onChange={(e) =>
                          setLeaveConfig({
                            ...leaveConfig,
                            min_booking_unit_minutes: Number(e.target.value || 0),
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>丸め（分）</Label>
                      <Input
                        type="number"
                        value={leaveConfig.rounding_minutes}
                        onChange={(e) =>
                          setLeaveConfig({
                            ...leaveConfig,
                            rounding_minutes: Number(e.target.value || 0),
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>半休モード</Label>
                      <Select
                        value={leaveConfig.half_day_mode}
                        onValueChange={(v) =>
                          setLeaveConfig({
                            ...leaveConfig,
                            half_day_mode: v as 'fixed_hours' | 'am_pm',
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="選択" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fixed_hours">固定時間（1日の半分）</SelectItem>
                          <SelectItem value="am_pm">AM/PM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="allow_multi_day"
                          checked={leaveConfig.allow_multi_day}
                          onCheckedChange={(c) =>
                            setLeaveConfig({ ...leaveConfig, allow_multi_day: Boolean(c) })
                          }
                        />
                        <Label htmlFor="allow_multi_day" className="text-sm">
                          複数日申請を許可
                        </Label>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <Label>UIフラグ</Label>
                      <div className="flex items-center gap-6 mt-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="require_reason"
                            checked={leaveConfig.require_reason}
                            onCheckedChange={(c) =>
                              setLeaveConfig({ ...leaveConfig, require_reason: Boolean(c) })
                            }
                          />
                          <Label htmlFor="require_reason" className="text-sm">
                            理由必須
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="require_attachment"
                            checked={leaveConfig.require_attachment}
                            onCheckedChange={(c) =>
                              setLeaveConfig({ ...leaveConfig, require_attachment: Boolean(c) })
                            }
                          />
                          <Label htmlFor="require_attachment" className="text-sm">
                            添付必須
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="show_balance"
                            checked={leaveConfig.show_balance}
                            onCheckedChange={(c) =>
                              setLeaveConfig({ ...leaveConfig, show_balance: Boolean(c) })
                            }
                          />
                          <Label htmlFor="show_balance" className="text-sm">
                            残高を表示
                          </Label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

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
          <Button variant="outline" onClick={() => onOpenChangeAction(false)}>
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
