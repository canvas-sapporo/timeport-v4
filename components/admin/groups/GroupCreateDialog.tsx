'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { createGroup } from '@/lib/actions/admin/groups';
import type { CreateGroupFormData } from '@/schemas/group';

interface GroupCreateDialogProps {
  open: boolean;
  onOpenChangeAction: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function GroupCreateDialog({
  open,
  onOpenChangeAction,
  onSuccess,
}: GroupCreateDialogProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const [form, setForm] = useState<CreateGroupFormData>({
    name: '',
    code: '',
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
      const result = await createGroup(form, user.company_id, user.id);
      if (result.success) {
        toast({
          title: '成功',
          description: 'グループが正常に作成されました',
        });
        onOpenChangeAction(false);
        setForm({ name: '', code: '', description: '' });
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
        description: 'グループの作成に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof CreateGroupFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChangeAction}>
      <DialogContent className="sm:max-w-[425px] dialog-scrollbar">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Plus className="w-5 h-5" />
            <span>グループ作成</span>
          </DialogTitle>
          <DialogDescription>
            新しいグループを作成します。グループ名は必須項目です。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">グループ名 *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="例: 開発チーム"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="code">グループコード</Label>
              <Input
                id="code"
                value={form.code}
                onChange={(e) => handleInputChange('code', e.target.value)}
                placeholder="例: DEV"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">説明</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="グループの説明を入力してください"
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
            <Button type="submit" disabled={isLoading || !form.name.trim()}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              作成
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
