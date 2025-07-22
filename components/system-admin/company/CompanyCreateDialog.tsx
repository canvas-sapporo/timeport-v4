'use client';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { createCompany } from '@/lib/actions/system-admin/company';
import type { CreateCompanyFormData } from '@/types/company';
import { AppError } from '@/lib/utils/error-handling';

const steps = [{ label: '企業情報' }, { label: 'グループ情報' }, { label: '管理者ユーザー情報' }];

export default function CompanyCreateDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [step, setStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState<CreateCompanyFormData>({
    name: '',
    code: '',
    address: '',
    phone: '',
    is_active: true,
    admin_code: '',
    admin_family_name: '',
    admin_first_name: '',
    admin_family_name_kana: '',
    admin_first_name_kana: '',
    admin_email: '',
    admin_password: '',
    group_name: '初期設定グループ',
  });

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFormError(null);
    setFieldErrors({});

    try {
      const result = await createCompany(form);

      if (result.success) {
        onOpenChange(false);
        setStep(0);
        setForm({
          name: '',
          code: '',
          address: '',
          phone: '',
          is_active: true,
          admin_code: '',
          admin_family_name: '',
          admin_first_name: '',
          admin_family_name_kana: '',
          admin_first_name_kana: '',
          admin_email: '',
          admin_password: '',
          group_name: '初期設定グループ',
        });
      } else {
        // エラーハンドリング
        console.error('Server action error:', result.error);
        const error = result.error;

        if (error.validationErrors && error.validationErrors.length > 0) {
          // フィールド別エラーを設定
          const fieldErrorsMap: Record<string, string> = {};
          error.validationErrors.forEach((validationError) => {
            fieldErrorsMap[validationError.field] = validationError.message;
          });
          setFieldErrors(fieldErrorsMap);
        } else {
          // 一般的なエラー
          setFormError(error.message || 'サーバーエラーが発生しました');
        }
      }
    } catch (err) {
      console.error('Unexpected error in createCompany:', err);
      setFormError(
        `予期しないエラーが発生しました: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    } finally {
      setLoading(false);
    }
  };

  const getFieldError = (fieldName: keyof CreateCompanyFormData): string | undefined => {
    return fieldErrors[fieldName];
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <>
            <Label htmlFor="company-name">
              企業名<span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              id="company-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              className={getFieldError('name') ? 'border-red-500' : ''}
            />
            {getFieldError('name') && (
              <div className="text-red-500 text-sm">{getFieldError('name')}</div>
            )}

            <Label htmlFor="company-code">
              企業コード<span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              id="company-code"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              required
              className={getFieldError('code') ? 'border-red-500' : ''}
            />
            {getFieldError('code') && (
              <div className="text-red-500 text-sm">{getFieldError('code')}</div>
            )}

            <Label htmlFor="company-address">住所</Label>
            <Input
              id="company-address"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            />

            <Label htmlFor="company-phone">電話番号</Label>
            <Input
              id="company-phone"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />

            <div className="flex items-center gap-2 mt-2">
              <Switch
                id="company-active"
                checked={form.is_active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
              />
              <Label htmlFor="company-active">有効</Label>
            </div>
          </>
        );
      case 1:
        return (
          <>
            <Label htmlFor="group-name">
              初期グループ名<span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              id="group-name"
              value={form.group_name}
              onChange={(e) => setForm((f) => ({ ...f, group_name: e.target.value }))}
              required
              className={getFieldError('group_name') ? 'border-red-500' : ''}
            />
            {getFieldError('group_name') && (
              <div className="text-red-500 text-sm">{getFieldError('group_name')}</div>
            )}
          </>
        );
      case 2:
        return (
          <>
            <Label htmlFor="admin-code">
              管理者メンバー番号<span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              id="admin-code"
              value={form.admin_code}
              onChange={(e) => setForm((f) => ({ ...f, admin_code: e.target.value }))}
              required
              className={getFieldError('admin_code') ? 'border-red-500' : ''}
            />
            {getFieldError('admin_code') && (
              <div className="text-red-500 text-sm">{getFieldError('admin_code')}</div>
            )}

            <Label htmlFor="admin-family-name">
              管理者姓<span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              id="admin-family-name"
              value={form.admin_family_name}
              onChange={(e) => setForm((f) => ({ ...f, admin_family_name: e.target.value }))}
              required
              autoComplete="family-name"
              className={getFieldError('admin_family_name') ? 'border-red-500' : ''}
            />
            {getFieldError('admin_family_name') && (
              <div className="text-red-500 text-sm">{getFieldError('admin_family_name')}</div>
            )}

            <Label htmlFor="admin-family-name-kana">
              管理者姓カナ<span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              id="admin-family-name-kana"
              value={form.admin_family_name_kana}
              onChange={(e) => setForm((f) => ({ ...f, admin_family_name_kana: e.target.value }))}
              required
              className={getFieldError('admin_family_name_kana') ? 'border-red-500' : ''}
            />
            {getFieldError('admin_family_name_kana') && (
              <div className="text-red-500 text-sm">{getFieldError('admin_family_name_kana')}</div>
            )}

            <Label htmlFor="admin-first-name">
              管理者名<span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              id="admin-first-name"
              value={form.admin_first_name}
              onChange={(e) => setForm((f) => ({ ...f, admin_first_name: e.target.value }))}
              required
              autoComplete="given-name"
              className={getFieldError('admin_first_name') ? 'border-red-500' : ''}
            />
            {getFieldError('admin_first_name') && (
              <div className="text-red-500 text-sm">{getFieldError('admin_first_name')}</div>
            )}

            <Label htmlFor="admin-first-name-kana">
              管理者名カナ<span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              id="admin-first-name-kana"
              value={form.admin_first_name_kana}
              onChange={(e) => setForm((f) => ({ ...f, admin_first_name_kana: e.target.value }))}
              required
              className={getFieldError('admin_first_name_kana') ? 'border-red-500' : ''}
            />
            {getFieldError('admin_first_name_kana') && (
              <div className="text-red-500 text-sm">{getFieldError('admin_first_name_kana')}</div>
            )}

            <Label htmlFor="admin-email">
              管理者メールアドレス<span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              id="admin-email"
              type="email"
              value={form.admin_email}
              onChange={(e) => setForm((f) => ({ ...f, admin_email: e.target.value }))}
              required
              autoComplete="email"
              className={getFieldError('admin_email') ? 'border-red-500' : ''}
            />
            {getFieldError('admin_email') && (
              <div className="text-red-500 text-sm">{getFieldError('admin_email')}</div>
            )}

            <Label htmlFor="admin-password">
              管理者パスワード<span className="text-red-500 ml-1">*</span>
            </Label>
            <div className="relative">
              <Input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                value={form.admin_password}
                onChange={(e) => setForm((f) => ({ ...f, admin_password: e.target.value }))}
                required
                minLength={8}
                autoComplete="new-password"
                className={getFieldError('admin_password') ? 'border-red-500' : ''}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {getFieldError('admin_password') && (
              <div className="text-red-500 text-sm">{getFieldError('admin_password')}</div>
            )}
          </>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dialog-scrollbar">
        <DialogHeader>
          <DialogTitle>企業追加</DialogTitle>
          <DialogDescription>新しい企業情報を入力してください。</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* Stepper表示 */}
          <div className="flex mb-4">
            {steps.map((s, i) => (
              <div key={i} className={`flex-1 text-center ${i === step ? 'font-bold' : ''}`}>
                {s.label}
              </div>
            ))}
          </div>
          {/* ステップごとのフォーム */}
          {renderStep()}
          {formError && <div className="text-destructive text-sm">{formError}</div>}
          <div className="flex justify-between mt-6">
            {step > 0 && (
              <Button type="button" onClick={() => setStep(step - 1)} className="w-32">
                戻る
              </Button>
            )}
            <div className="flex-1" />
            {step < steps.length - 1 ? (
              <Button type="button" onClick={() => setStep(step + 1)} className="w-32 ml-auto">
                次へ
              </Button>
            ) : (
              <Button
                type="submit"
                variant="timeport-primary"
                className="w-32 ml-auto"
                disabled={loading}
              >
                {loading ? '追加中...' : '追加'}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
