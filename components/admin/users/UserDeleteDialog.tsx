'use client';

import { useState } from 'react';
import { Trash2, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { deleteUser } from '@/lib/actions/admin/users';
import type { UserProfile } from '@/types/user_profiles';

interface UserDeleteDialogProps {
  user: UserProfile;
  onSuccess?: () => void;
}

export default function UserDeleteDialog({ user, onSuccess }: UserDeleteDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await deleteUser(user.id);

      toast({
        title: 'ユーザー削除完了',
        description: 'ユーザーが正常に削除されました',
      });

      setIsOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error('ユーザー削除エラー:', error);
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : 'ユーザー削除に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700"
                disabled={user.is_active}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          {user.is_active && (
            <TooltipContent>
              <p>無効化しないと削除できません</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
      <DialogContent className="dialog-scrollbar">
        <DialogHeader>
          <DialogTitle>ユーザー削除</DialogTitle>
          <DialogDescription>
            このユーザーを削除しますか？この操作は元に戻すことができません。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border p-4">
            <h4 className="font-medium">削除対象ユーザー</h4>
            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
              <p>メンバー番号: {user.code}</p>
              <p>
                氏名: {user.family_name} {user.first_name}
              </p>
              <p>メールアドレス: {user.email}</p>
              <p>権限: {user.role === 'admin' ? '管理者' : 'メンバー'}</p>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              キャンセル
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              削除
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
