'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { deleteRequestForm } from '@/lib/actions/admin/request-forms';
import type { RequestForm } from '@/types/request';

interface RequestFormDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestForm: RequestForm | null;
  onSuccess: () => void;
}

export default function RequestFormDeleteDialog({
  open,
  onOpenChange,
  requestForm,
  onSuccess,
}: RequestFormDeleteDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    if (!requestForm) return;

    console.log('削除処理開始:', requestForm.id);
    setIsLoading(true);
    try {
      const result = await deleteRequestForm(requestForm.id);
      console.log('削除結果:', result);

      if (result.success) {
        console.log('成功トースト呼び出し');
        toast({
          title: '申請フォームを削除しました',
          description: `${requestForm.name}が正常に削除されました`,
        });
        // トーストが表示されるまで少し待ってからダイアログを閉じる
        setTimeout(() => {
          onOpenChange(false);
          onSuccess();
        }, 100);
      } else {
        console.log('エラートースト呼び出し:', result.error);
        toast({
          title: 'エラー',
          description: result.error || '申請フォームの削除に失敗しました',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('申請フォーム削除エラー:', error);
      console.log('例外トースト呼び出し');
      toast({
        title: 'エラー',
        description: '申請フォームの削除中にエラーが発生しました',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  if (!requestForm) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span>申請フォームの削除</span>
          </DialogTitle>
          <DialogDescription>
            以下の申請フォームを削除しますか？この操作は取り消すことができません。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900">{requestForm.name}</h4>

            <p className="text-sm text-gray-600">カテゴリ: {requestForm.category}</p>
            <p className="text-sm text-gray-600">
              フォーム項目: {requestForm.form_config.length}項目
            </p>
            <p className="text-sm text-gray-600">
              承認フロー: {requestForm.approval_flow.length}ステップ
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>注意:</strong> この申請フォームに関連する申請データがある場合、
              それらも削除される可能性があります。
            </p>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            キャンセル
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
            {isLoading ? '削除中...' : '削除'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
