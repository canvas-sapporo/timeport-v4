'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormField, RequestType } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DynamicFormProps {
  requestType: RequestType;
  onSubmitAction: (data: Record<string, any>) => void;
  isLoading?: boolean;
}

// バリデーションルールからZodスキーマを生成
const createValidationSchema = (fields: FormField[]) => {
  const schemaFields: Record<string, z.ZodTypeAny> = {};

  fields.forEach((field) => {
    let fieldSchema: z.ZodTypeAny;

    switch (field.type) {
      case 'email':
        fieldSchema = z.string().email(field.validationRules.customMessage || '正しいメールアドレスを入力してください');
        break;
      case 'number':
        fieldSchema = z.coerce.number();
        if (field.validationRules.minValue !== undefined) {
          fieldSchema = (fieldSchema as z.ZodNumber).min(field.validationRules.minValue);
        }
        if (field.validationRules.maxValue !== undefined) {
          fieldSchema = (fieldSchema as z.ZodNumber).max(field.validationRules.maxValue);
        }
        break;
      case 'tel':
        let telSchema: z.ZodString = z.string();
        if (field.validationRules.pattern) {
          telSchema = telSchema.regex(
            new RegExp(field.validationRules.pattern),
            field.validationRules.customMessage || '正しい形式で入力してください'
          );
        }
        fieldSchema = telSchema;
        break;
      default:
        let strSchema: z.ZodString = z.string();
        if (field.validationRules.minLength) {
          strSchema = strSchema.min(field.validationRules.minLength);
        }
        if (field.validationRules.maxLength) {
          strSchema = strSchema.max(field.validationRules.maxLength);
        }
        if (field.validationRules.pattern) {
          strSchema = strSchema.regex(
            new RegExp(field.validationRules.pattern),
            field.validationRules.customMessage || '正しい形式で入力してください'
          );
        }
        fieldSchema = strSchema;
        break;
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
  watch 
}: { 
  field: FormField;
  register: any;
  errors: any;
  setValue: any;
  watch: any;
}) => {
  const error = errors[field.name];
  const value = watch(field.name);

  const renderField = () => {
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
          <Select
            value={value || ''}
            onValueChange={(val) => setValue(field.name, val)}
          >
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
            value={value || ''}
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
              checked={value || false}
              onCheckedChange={(checked) => setValue(field.name, checked)}
              id={field.name}
            />
            <Label htmlFor={field.name}>{field.label}</Label>
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
          {error.message || field.validationRules.customMessage || 'この項目は必須です'}
        </p>
      )}
    </div>
  );
};

export default function DynamicForm({ requestType, onSubmitAction, isLoading }: DynamicFormProps) {
  const sortedFields = [...requestType.formFields].sort((a, b) => a.order - b.order);
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

  const handleFormSubmit = (data: Record<string, any>) => {
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