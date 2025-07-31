'use client';

import { Trash2, AlertTriangle, Lock } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { deleteAttendanceStatus } from '@/lib/actions/attendance';
import type { AttendanceStatusData } from '@/schemas/attendance';

interface AttendanceStatusDeleteDialogProps {
  open: boolean;
  onOpenChangeAction: (open: boolean) => void;
  status: AttendanceStatusData | null;
  onSuccess?: () => void;
}

export default function AttendanceStatusDeleteDialog({
  open,
  onOpenChangeAction,
  status,
  onSuccess,
}: AttendanceStatusDeleteDialogProps) {
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!status) return;

    try {
      const result = await deleteAttendanceStatus(status.id);

      if (result.success) {
        toast({
          title: '削除完了',
          description: '勤怠ステータスが正常に削除されました',
        });
        onSuccess?.();
        onOpenChangeAction(false);
      } else {
        toast({
          title: '削除失敗',
          description: result.error || '勤怠ステータスの削除に失敗しました',
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: 'エラー',
        description: '予期しないエラーが発生しました',
        variant: 'destructive',
      });
    }
  };

  if (!status) {
    return null;
  }

  // 必須ステータスの場合は削除不可
  if (status.is_required) {
    return (
      <Dialog open={open} onOpenChange={onOpenChangeAction}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <Lock className="w-5 h-5" />
              削除不可
            </DialogTitle>
            <DialogDescription>必須の勤怠ステータスは削除できません</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center space-x-2 p-4 bg-orange-50 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <div>
                <p className="font-medium text-orange-800">
                  「{status.display_name}」は必須ステータスです
                </p>
                <p className="text-sm text-orange-700">
                  システムの動作に必要なため、削除することはできません。
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => onOpenChangeAction(false)}>閉じる</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChangeAction}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="w-5 h-5" />
            勤怠ステータス削除
          </DialogTitle>
          <DialogDescription>この操作は取り消すことができません</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center space-x-2 p-4 bg-red-50 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <div>
              <p className="font-medium text-red-800">「{status.display_name}」を削除しますか？</p>
              <p className="text-sm text-red-700">
                このステータスを使用している勤怠記録がある場合、表示に影響する可能性があります。
              </p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">システム名:</span>
              <span className="font-mono">{status.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">表示名:</span>
              <span>{status.display_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">説明:</span>
              <span>{status.description || '-'}</span>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChangeAction(false)}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              削除
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
