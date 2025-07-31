'use client';

import { useState } from 'react';
import { Trash2, Loader2, AlertTriangle, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { deleteEmploymentType } from '@/lib/actions/admin/employment-types';
import type { EmploymentType } from '@/schemas/employment-type';

interface EmploymentTypeDeleteDialogProps {
  open: boolean;
  onOpenChangeAction: (open: boolean) => void;
  employmentType: EmploymentType | null;
  onSuccess?: () => void;
}

export default function EmploymentTypeDeleteDialog({
  open,
  onOpenChangeAction,
  employmentType,
  onSuccess,
}: EmploymentTypeDeleteDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // 有効な雇用形態は削除できない
  const isActive = employmentType?.is_active ?? false;
  const canDelete = !isActive;

  const handleDelete = async () => {
    if (!employmentType || !user?.company_id || !canDelete) return;

    setIsLoading(true);
    try {
      const result = await deleteEmploymentType(employmentType.id, user.company_id);
      if (result.success) {
        toast({
          title: '成功',
          description: '雇用形態が正常に削除されました',
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
        description: '雇用形態の削除に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChangeAction}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-red-600">
            <Trash2 className="w-5 h-5" />
            <span>雇用形態削除</span>
          </DialogTitle>
          <DialogDescription>
            {canDelete
              ? 'この雇用形態を削除します。この操作は取り消すことができません。'
              : '有効な雇用形態は削除できません。先に無効にしてから削除してください。'}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="flex items-center space-x-2 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <div>
              <p className="font-medium text-red-800">削除対象: {employmentType?.name}</p>
              <p className="text-sm text-red-600">コード: {employmentType?.code}</p>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-sm text-red-600">ステータス:</span>
                <Badge variant={isActive ? 'default' : 'secondary'}>
                  {isActive ? '有効' : '無効'}
                </Badge>
              </div>
              {employmentType?.description && (
                <p className="text-sm text-red-600 mt-1">説明: {employmentType.description}</p>
              )}
            </div>
          </div>

          {!canDelete && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <XCircle className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">削除できません</p>
                  <p className="text-sm text-yellow-700 mt-1">
                    有効な雇用形態は削除できません。先に「無効」に変更してから削除してください。
                  </p>
                </div>
              </div>
            </div>
          )}

          {canDelete && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>注意:</strong>{' '}
                この雇用形態が既にユーザーに割り当てられている場合は削除できません。
                削除する前に、該当するユーザーの雇用形態を変更してください。
              </p>
            </div>
          )}
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
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading || !canDelete}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                削除中...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                削除
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
