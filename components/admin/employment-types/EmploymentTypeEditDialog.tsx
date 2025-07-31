'use client';

import { useState, useEffect } from 'react';
import { Pencil, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import {
  updateEmploymentType,
  toggleEmploymentTypeStatus,
} from '@/lib/actions/admin/employment-types';
import type { EmploymentType, EditEmploymentTypeFormData } from '@/schemas/employment-type';

interface EmploymentTypeEditDialogProps {
  open: boolean;
  onOpenChangeAction: (open: boolean) => void;
  employmentType: EmploymentType | null;
  onSuccess?: () => void;
}

export default function EmploymentTypeEditDialog({
  open,
  onOpenChangeAction,
  employmentType,
  onSuccess,
}: EmploymentTypeEditDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const [form, setForm] = useState<EditEmploymentTypeFormData>({
    code: '',
    name: '',
    description: '',
  });
  const [isStatusLoading, setIsStatusLoading] = useState(false);
  const [localIsActive, setLocalIsActive] = useState(false);

  // 雇用形態が変更されたときにフォームを更新
  useEffect(() => {
    if (employmentType) {
      setForm({
        code: employmentType.code || '',
        name: employmentType.name || '',
        description: employmentType.description || '',
      });
      setLocalIsActive(employmentType.is_active);
    }
  }, [employmentType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employmentType) return;

    // ユーザーの企業IDを直接使用
    if (!user?.company_id) {
      toast({
        title: 'エラー',
        description: '企業情報が見つかりません',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await updateEmploymentType(employmentType.id, form, user.company_id);
      if (result.success) {
        toast({
          title: '成功',
          description: '雇用形態が正常に更新されました',
        });
        onOpenChangeAction(false);
        onSuccess?.();
      } else {
        toast({
          title: 'エラー',
          description: result.error.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'エラー',
        description: '雇用形態の更新に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof EditEmploymentTypeFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleStatusToggle = async () => {
    if (!employmentType || !user?.company_id) return;

    setIsStatusLoading(true);
    try {
      const result = await toggleEmploymentTypeStatus(employmentType.id, user.company_id);
      if (result.success) {
        setLocalIsActive(result.data.is_active);
        toast({
          title: '成功',
          description: `雇用形態を${result.data.is_active ? '有効' : '無効'}にしました`,
        });
        onSuccess?.();
      } else {
        toast({
          title: 'エラー',
          description: result.error.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'エラー',
        description: 'ステータスの切り替えに失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsStatusLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChangeAction}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Pencil className="w-5 h-5" />
            <span>雇用形態編集</span>
          </DialogTitle>
          <DialogDescription>
            雇用形態情報を編集します。雇用形態名とコードは必須項目です。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="code">雇用形態コード *</Label>
              <Input
                id="code"
                value={form.code}
                onChange={(e) => handleInputChange('code', e.target.value)}
                placeholder="例: REGULAR"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">雇用形態名 *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="例: 正メンバー"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">説明</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="雇用形態の説明を入力してください"
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>ステータス</Label>
                <p className="text-sm text-gray-500">雇用形態の有効/無効を切り替え</p>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant={localIsActive ? 'default' : 'secondary'}>
                  {localIsActive ? '有効' : '無効'}
                </Badge>
                <Switch
                  checked={localIsActive}
                  onCheckedChange={handleStatusToggle}
                  disabled={isStatusLoading}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChangeAction(false)}
              disabled={isLoading}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={isLoading} variant="timeport-primary">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  更新中...
                </>
              ) : (
                <>
                  <Pencil className="w-4 h-4 mr-2" />
                  更新
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
