'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { updateGroup, toggleGroupStatus } from '@/lib/actions/admin/groups';
import type { Group, EditGroupFormData } from '@/types/groups';

interface GroupEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: Group | null;
  onSuccess?: () => void;
}

export default function GroupEditDialog({
  open,
  onOpenChange,
  group,
  onSuccess,
}: GroupEditDialogProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const [form, setForm] = useState<EditGroupFormData>({
    name: '',
    code: '',
    description: '',
  });
  const [isStatusLoading, setIsStatusLoading] = useState(false);
  const [localIsActive, setLocalIsActive] = useState(false);

  // グループが変更されたときにフォームを更新
  useEffect(() => {
    if (group) {
      setForm({
        name: group.name || '',
        code: group.code || '',
        description: group.description || '',
      });
      setLocalIsActive(group.is_active);
    }
  }, [group]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!group) return;

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
      const result = await updateGroup(group.id, form, user.company_id);
      if (result.success) {
        toast({
          title: '成功',
          description: 'グループが正常に更新されました',
        });
        onOpenChange(false);
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
        description: 'グループの更新に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof EditGroupFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleStatusToggle = async () => {
    if (!group || !user?.company_id) return;

    setIsStatusLoading(true);
    try {
      const result = await toggleGroupStatus(group.id, user.company_id);
      if (result.success) {
        setLocalIsActive(result.data.is_active);
        toast({
          title: '成功',
          description: `グループが${result.data.is_active ? '有効' : '無効'}になりました`,
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] dialog-scrollbar">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Pencil className="w-5 h-5" />
            <span>グループ編集</span>
          </DialogTitle>
          <DialogDescription>
            グループ情報を編集します。グループ名は必須項目です。
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
            <div className="grid gap-2">
              <Label>ステータス</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={localIsActive}
                  onCheckedChange={handleStatusToggle}
                  disabled={isStatusLoading}
                />
                <span className="text-sm">
                  {localIsActive ? (
                    <Badge variant="default">有効</Badge>
                  ) : (
                    <Badge variant="secondary">無効</Badge>
                  )}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={isLoading || !form.name.trim()}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              更新
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
