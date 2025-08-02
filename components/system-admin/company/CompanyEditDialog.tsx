'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/contexts/auth-context';
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
import { Company } from '@/schemas/company';
import { updateCompany } from '@/lib/actions/system-admin/company';
import type { EditCompanyFormData } from '@/schemas/company';

export default function CompanyEditDialog({
  open,
  onOpenChangeAction,
  company,
}: {
  open: boolean;
  onOpenChangeAction: (open: boolean) => void;
  company: Company | null;
}) {
  const [editForm, setEditForm] = useState<EditCompanyFormData>({
    name: '',
    code: '',
    address: '',
    phone: '',
    is_active: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const router = useRouter();
  const { user: currentUser } = useAuth();

  // 会社データが変更されたときにフォームを更新
  useEffect(() => {
    if (company) {
      setEditForm({
        name: company.name,
        code: company.code,
        address: company.address || '',
        phone: company.phone || '',
        is_active: company.is_active,
      });
    }
  }, [company]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);

    try {
      if (company) {
        const result = await updateCompany(company.id, editForm, currentUser?.id);

        if (result.success) {
          onOpenChangeAction(false);
        } else {
          // エラーハンドリング
          const appError = result.error;

          if (appError.validationErrors && appError.validationErrors.length > 0) {
            // フィールド別エラーを設定
            const fieldErrorsMap: Record<string, string> = {};
            appError.validationErrors.forEach((validationError) => {
              fieldErrorsMap[validationError.field] = validationError.message;
            });
            setFieldErrors(fieldErrorsMap);
          } else {
            // 一般的なエラー
            setError(appError.message);
          }
        }
      }
    } catch (err) {
      setError('予期しないエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const getFieldError = (fieldName: keyof EditCompanyFormData): string | undefined => {
    return fieldErrors[fieldName];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChangeAction}>
      <DialogContent className="dialog-scrollbar">
        <DialogHeader>
          <DialogTitle>企業編集</DialogTitle>
          <DialogDescription>企業情報を変更できます。</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <Label htmlFor="edit-company-name">
              企業名<span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              id="edit-company-name"
              value={editForm.name}
              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              required
              className={getFieldError('name') ? 'border-red-500' : ''}
            />
            {getFieldError('name') && (
              <div className="text-red-500 text-sm">{getFieldError('name')}</div>
            )}
          </div>
          <div>
            <Label htmlFor="edit-company-code">
              コード<span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              id="edit-company-code"
              value={editForm.code}
              onChange={(e) => setEditForm((f) => ({ ...f, code: e.target.value }))}
              required
              className={getFieldError('code') ? 'border-red-500' : ''}
            />
            {getFieldError('code') && (
              <div className="text-red-500 text-sm">{getFieldError('code')}</div>
            )}
          </div>
          <div>
            <Label htmlFor="edit-company-address">住所</Label>
            <Input
              id="edit-company-address"
              value={editForm.address}
              onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="edit-company-phone">電話番号</Label>
            <Input
              id="edit-company-phone"
              type="tel"
              value={editForm.phone}
              onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="edit-company-active"
              checked={editForm.is_active}
              onCheckedChange={(v) => setEditForm((f) => ({ ...f, is_active: v }))}
            />
            <Label htmlFor="edit-company-active">有効</Label>
          </div>
          {error && <div className="text-destructive text-sm">{error}</div>}
          <Button type="submit" variant="timeport-primary" className="w-full" disabled={loading}>
            {loading ? '更新中...' : '更新'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
