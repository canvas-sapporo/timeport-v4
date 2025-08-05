'use client';

import { useForm, FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useEffect } from 'react';

import { RequestForm, FormFieldConfig } from '@/schemas/request';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import ClockRecordsInput from './ClockRecordsInput';

interface DynamicFormProps {
  requestType: RequestForm;
  onSubmitAction: (data: Record<string, unknown>) => void;
  isLoading?: boolean;
  userId?: string;
}

// バリデーションルールからZodスキーマを生成
const createValidationSchema = (fields: FormFieldConfig[]) => {
  const schemaFields: Record<string, z.ZodTypeAny> = {};

  fields.forEach((field) => {
    let fieldSchema: z.ZodTypeAny;

    // バリデーションルールを抽出（fieldごとに）
    const minLengthRule = field.validation_rules.find((r) => r.type === 'minLength');
    const maxLengthRule = field.validation_rules.find((r) => r.type === 'maxLength');
    const patternRule = field.validation_rules.find((r) => r.type === 'pattern');
    const minValueRule = field.validation_rules.find((r) => r.type === 'min');
    const maxValueRule = field.validation_rules.find((r) => r.type === 'max');
    const emailRule = field.validation_rules.find((r) => r.type === 'email');

    switch (field.type) {
      case 'email':
        fieldSchema = z
          .string()
          .email(emailRule?.message || '正しいメールアドレスを入力してください');
        break;
      case 'number':
        fieldSchema = z.coerce.number();
        if (minValueRule) {
          fieldSchema = (fieldSchema as z.ZodNumber).min(
            Number(minValueRule.value),
            minValueRule.message
          );
        }
        if (maxValueRule) {
          fieldSchema = (fieldSchema as z.ZodNumber).max(
            Number(maxValueRule.value),
            maxValueRule.message
          );
        }
        break;
      case 'tel': {
        let telSchema: z.ZodString = z.string();
        if (patternRule) {
          telSchema = telSchema.regex(
            new RegExp(String(patternRule.value)),
            patternRule.message || '正しい形式で入力してください'
          );
        }
        fieldSchema = telSchema;
        break;
      }
      default: {
        let strSchema: z.ZodString = z.string();
        if (minLengthRule) {
          strSchema = strSchema.min(Number(minLengthRule.value), minLengthRule.message);
        }
        if (maxLengthRule) {
          strSchema = strSchema.max(Number(maxLengthRule.value), maxLengthRule.message);
        }
        if (patternRule) {
          strSchema = strSchema.regex(
            new RegExp(String(patternRule.value)),
            patternRule.message || '正しい形式で入力してください'
          );
        }
        fieldSchema = strSchema;
        break;
      }
    }

    if (!field.required) {
      fieldSchema = fieldSchema.optional();
    }

    schemaFields[field.name] = fieldSchema;
  });

  return z.object(schemaFields);
};

const DynamicFormField = ({
  field,
  register,
  errors,
  setValue,
  watch,
  userId,
}: {
  field: FormFieldConfig;
  register: (name: string) => Record<string, unknown>;
  errors: FieldErrors<Record<string, unknown>>;
  setValue: (name: string, value: unknown) => void;
  watch: (name: string) => unknown;
  userId?: string;
}) => {
  const [workDate, setWorkDate] = useState<string>('');
  const error = errors[field.name];
  const value = watch(field.name);

  // work_dateフィールドの値を監視してworkDateの状態を更新
  useEffect(() => {
    const workDateValue = watch('work_date') as string;
    if (workDateValue && workDateValue !== workDate) {
      setWorkDate(workDateValue);
    }
  }, [watch('work_date'), workDate]);

  const renderField = () => {
    // work_dateフィールドの値を取得
    const workDate = watch('work_date') as string;

    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            {...register(field.name)}
            placeholder={field.placeholder}
            rows={4}
            className={error ? 'border-red-500' : ''}
          />
        );

      case 'select':
        return (
          <Select value={String(value || '')} onValueChange={(val) => setValue(field.name, val)}>
            <SelectTrigger className={error ? 'border-red-500' : ''}>
              <SelectValue placeholder={field.placeholder || `${field.label}を選択`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'radio':
        return (
          <RadioGroup
            value={String(value || '')}
            onValueChange={(val) => setValue(field.name, val)}
            className="flex flex-col space-y-2"
          >
            {field.options?.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${field.name}-${option}`} />
                <Label htmlFor={`${field.name}-${option}`}>{option}</Label>
              </div>
            ))}
          </RadioGroup>
        );

      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={Boolean(value)}
              onCheckedChange={(checked) => setValue(field.name, checked)}
              id={field.name}
            />
            <Label htmlFor={field.name}>{field.label}</Label>
          </div>
        );

      case 'object':
        // デバッグ用：フィールドのメタデータをログ出力
        console.log('DynamicForm - オブジェクトフィールド処理:', {
          fieldName: field.name,
          fieldType: field.type,
          metadata: field.metadata,
          hasMetadata: !!field.metadata,
          isObject: typeof field.metadata === 'object',
          hasObjectType: field.metadata && 'object_type' in field.metadata,
          objectType:
            field.metadata && typeof field.metadata === 'object' && 'object_type' in field.metadata
              ? (field.metadata as { object_type: string }).object_type
              : 'undefined',
        });

        // オブジェクトタイプの処理
        if (
          field.metadata &&
          typeof field.metadata === 'object' &&
          'object_type' in field.metadata
        ) {
          const metadata = field.metadata as { object_type: string; field_type?: string };

          console.log('DynamicForm - メタデータ解析:', {
            metadata,
            objectType: metadata.object_type,
            isAttendance: metadata.object_type === 'attendance',
          });

          if (metadata.object_type === 'attendance') {
            console.log('DynamicForm - ClockRecordsInputを表示します');
            return (
              <ClockRecordsInput
                value={Array.isArray(value) ? value : []}
                onChangeAction={(newValue) => setValue(field.name, newValue)}
                error={error?.message}
                disabled={false}
                workDate={workDate}
                userId={userId}
                onWorkDateChange={(newWorkDate) => {
                  setWorkDate(newWorkDate);
                  setValue('work_date', newWorkDate);
                }}
              />
            );
          }
        }

        console.log('DynamicForm - フォールバック表示を使用します');
        return (
          <div className="p-4 border border-dashed rounded-lg text-center text-muted-foreground">
            オブジェクトタイプ:{' '}
            {field.metadata && typeof field.metadata === 'object' && 'object_type' in field.metadata
              ? (field.metadata as { object_type: string }).object_type
              : 'unknown'}
          </div>
        );

      default:
        return (
          <Input
            {...register(field.name)}
            type={field.type}
            placeholder={field.placeholder}
            className={error ? 'border-red-500' : ''}
          />
        );
    }
  };

  return (
    <div className="space-y-2">
      {field.type !== 'checkbox' && (
        <Label htmlFor={field.name}>
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      {renderField()}
      {error && (
        <p className="text-sm text-red-500">
          {error.message ||
            field.validation_rules.find((r) => r.type === 'required')?.message ||
            'この項目は必須です'}
        </p>
      )}
    </div>
  );
};

export default function DynamicForm({
  requestType,
  onSubmitAction,
  isLoading,
  userId,
}: DynamicFormProps) {
  console.log('DynamicForm - コンポーネント開始:', {
    requestTypeId: requestType.id,
    requestTypeName: requestType.name,
    formConfigLength: requestType.form_config?.length,
    userId: userId,
  });

  // 各フィールドの詳細情報もログ出力
  requestType.form_config?.forEach((field, index) => {
    console.log(`DynamicForm - フィールド${index + 1}詳細:`, {
      name: field.name,
      type: field.type,
      label: field.label,
      metadata: field.metadata,
      hasMetadata: !!field.metadata,
      metadataType: typeof field.metadata,
      isObjectType:
        field.metadata && typeof field.metadata === 'object' && 'object_type' in field.metadata,
      objectType:
        field.metadata && typeof field.metadata === 'object' && 'object_type' in field.metadata
          ? (field.metadata as { object_type: string }).object_type
          : 'undefined',
    });
  });

  const sortedFields = [...requestType.form_config].sort((a, b) => a.order - b.order);
  const validationSchema = createValidationSchema(sortedFields);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(validationSchema),
  });

  const handleFormSubmit = (data: Record<string, unknown>) => {
    onSubmitAction(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{requestType.name}</CardTitle>
        {requestType.description && (
          <p className="text-sm text-gray-600">{requestType.description}</p>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {sortedFields.map((field) => (
            <DynamicFormField
              key={field.id}
              field={field}
              register={register}
              errors={errors}
              setValue={setValue}
              watch={watch}
              userId={userId}
            />
          ))}

          <div className="flex justify-end space-x-4 pt-6">
            <Button type="button" variant="outline">
              キャンセル
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? '申請中...' : '申請する'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
