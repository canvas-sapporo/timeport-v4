'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Loader2, AlertTriangle, Users, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { deleteGroup, checkGroupDeletionSafety } from '@/lib/actions/admin/groups';
import type { Group } from '@/schemas/group';

interface GroupDeleteDialogProps {
  open: boolean;
  onOpenChangeAction: (open: boolean) => void;
  group: Group | null;
  onSuccess?: () => void;
}

export default function GroupDeleteDialog({
  open,
  onOpenChangeAction,
  group,
  onSuccess,
}: GroupDeleteDialogProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [affectedUsers, setAffectedUsers] = useState<
    Array<{ id: string; full_name: string; email: string }>
  >([]);
  const [showWarning, setShowWarning] = useState(false);

  const handleDelete = async () => {
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

    // 削除前の安全性チェック
    setIsChecking(true);
    try {
      const safetyResult = await checkGroupDeletionSafety(group.id, user.company_id);
      if (safetyResult.success) {
        if (safetyResult.data.canDelete) {
          // 削除可能な場合は削除を実行
          await performDelete();
        } else {
          // 削除できない場合は警告を表示
          setAffectedUsers(safetyResult.data.affectedUsers);
          setShowWarning(true);
        }
      } else {
        toast({
          title: 'エラー',
          description: safetyResult.error.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'エラー',
        description: '削除前のチェックに失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsChecking(false);
    }
  };

  const performDelete = async () => {
    if (!group || !user?.company_id) return;

    setIsLoading(true);
    try {
      const result = await deleteGroup(group.id, user.company_id, user.id);
      if (result.success) {
        toast({
          title: '成功',
          description: 'グループが正常に削除されました',
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
        description: 'グループの削除に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ダイアログが閉じられたときに状態をリセット
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setShowWarning(false);
      setAffectedUsers([]);
    }
    onOpenChangeAction(newOpen);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[425px] dialog-scrollbar">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              <span>グループ削除</span>
            </DialogTitle>
            <DialogDescription>
              このグループを削除します。この操作は取り消すことができません。
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <div>
                <div className="font-medium text-sm text-yellow-800">削除対象</div>
                <div className="text-sm text-yellow-700">
                  {group?.name} {group?.code && `(${group.code})`}
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-4">
              このグループに所属するユーザーがいる場合、削除前にユーザーの所属を変更してください。
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChangeAction(false)}
              disabled={isLoading || isChecking}
            >
              キャンセル
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isLoading || isChecking}
            >
              {(isLoading || isChecking) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isChecking ? 'チェック中...' : '削除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 警告ダイアログ */}
      <Dialog open={showWarning} onOpenChange={setShowWarning}>
        <DialogContent className="sm:max-w-[500px] dialog-scrollbar">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span>削除できません</span>
            </DialogTitle>
            <DialogDescription>
              このグループを削除すると、所属するグループがなくなるユーザーがいます。
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center space-x-3 p-3 bg-red-50 rounded-lg mb-4">
              <Users className="w-5 h-5 text-red-600" />
              <div>
                <div className="font-medium text-sm text-red-800">影響を受けるユーザー</div>
                <div className="text-sm text-red-700">
                  {affectedUsers.length}人のユーザーが所属するグループを失います
                </div>
              </div>
            </div>

            <div className="max-h-40 overflow-y-auto">
              <div className="space-y-2">
                {affectedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <div>
                      <div className="font-medium text-sm">{user.full_name}</div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-sm text-gray-600 mt-4">
              これらのユーザーを他のグループに所属させてから、再度削除を試してください。
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowWarning(false)}>
              閉じる
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
