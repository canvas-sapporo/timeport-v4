'use client';

import { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';

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
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { createEmploymentType } from '@/lib/actions/admin/employment-types';
import type { CreateEmploymentTypeFormData } from '@/schemas/employment-type';

interface EmploymentTypeCreateDialogProps {
  open: boolean;
  onOpenChangeAction: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function EmploymentTypeCreateDialog({
  open,
  onOpenChangeAction,
  onSuccess,
}: EmploymentTypeCreateDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const [form, setForm] = useState<CreateEmploymentTypeFormData>({
    code: '',
    name: '',
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      const result = await createEmploymentType(form, user.company_id);
      if (result.success) {
        toast({
          title: '成功',
          description: '雇用形態が正常に作成されました',
        });
        onOpenChangeAction(false);
        setForm({ code: '', name: '', description: '' });
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
        description: '雇用形態の作成に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof CreateEmploymentTypeFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChangeAction}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Plus className="w-5 h-5" />
            <span>雇用形態作成</span>
          </DialogTitle>
          <DialogDescription>
            新しい雇用形態を作成します。雇用形態名とコードは必須項目です。
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
                  作成中...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  作成
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
