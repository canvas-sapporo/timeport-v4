'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { createAttendanceStatus } from '@/lib/actions/attendance';

interface AttendanceStatusCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onSuccess?: () => void;
}

export default function AttendanceStatusCreateDialog({
  open,
  onOpenChange,
  companyId,
  onSuccess,
}: AttendanceStatusCreateDialogProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    color: 'default',
    font_color: '#000000',
    background_color: '#ffffff',
    sort_order: 0,
    description: '',
    logic: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.display_name) {
      toast({
        title: 'エラー',
        description: '必須項目を入力してください',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      const result = await createAttendanceStatus(companyId, {
        name: formData.name,
        display_name: formData.display_name,
        color: formData.color,
        font_color: formData.font_color,
        background_color: formData.background_color,
        sort_order: formData.sort_order,
        description: formData.description || undefined,
        logic: formData.logic || undefined,
      });

      if (result.success) {
        toast({
          title: '作成完了',
          description: '勤怠ステータスが正常に作成されました',
        });
        onSuccess?.();
        onOpenChange(false);
        resetForm();
      } else {
        toast({
          title: '作成失敗',
          description: result.error || '勤怠ステータスの作成に失敗しました',
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: 'エラー',
        description: '予期しないエラーが発生しました',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      display_name: '',
      color: 'default',
      font_color: '#000000',
      background_color: '#ffffff',
      sort_order: 0,
      description: '',
      logic: '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            勤怠ステータス作成
          </DialogTitle>
          <DialogDescription>新しい勤怠ステータスを作成します</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">システム名 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="normal"
                required
              />
              <p className="text-xs text-gray-500 mt-1">英数字、アンダースコアのみ使用可能</p>
            </div>
            <div>
              <Label htmlFor="display_name">表示名 *</Label>
              <Input
                id="display_name"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                placeholder="正常"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="color">バッジ色</Label>
              <Select
                value={formData.color}
                onValueChange={(value) => setFormData({ ...formData, color: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">デフォルト</SelectItem>
                  <SelectItem value="destructive">エラー</SelectItem>
                  <SelectItem value="secondary">セカンダリ</SelectItem>
                  <SelectItem value="outline">アウトライン</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="font_color">フォント色</Label>
              <Input
                id="font_color"
                type="color"
                value={formData.font_color}
                onChange={(e) => setFormData({ ...formData, font_color: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="background_color">背景色</Label>
              <Input
                id="background_color"
                type="color"
                value={formData.background_color}
                onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="sort_order">表示順序</Label>
            <Input
              id="sort_order"
              type="number"
              value={formData.sort_order}
              onChange={(e) =>
                setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })
              }
              min="0"
            />
          </div>

          <div>
            <Label htmlFor="logic">ステータス判定ロジック</Label>
            <div className="space-y-2">
              <Textarea
                id="logic"
                value={formData.logic}
                onChange={(e) => setFormData({ ...formData, logic: e.target.value })}
                placeholder='{"type": "function", "name": "isNormal", "conditions": [{"field": "clock_records", "operator": "has_sessions", "value": true}]}'
                rows={4}
                className="font-mono text-sm"
              />
              <div className="text-xs text-gray-500 space-y-1">
                <p>
                  <div>
                    <strong>利用可能なフィールド:</strong>
                  </div>
                  <div>clock_records, late_minutes, early_leave_minutes</div>
                </p>
                <p>
                  <div>
                    <strong>利用可能な演算子:</strong>
                  </div>
                  <div>
                    has_sessions, has_completed_sessions, empty, greater_than, less_than, equals,
                    not_equals
                  </div>
                </p>
                <p>
                  <div>
                    <strong>例:</strong> 正常ステータス:{' '}
                  </div>
                  <div>
                    {
                      '{"type": "function", "name": "isNormal", "conditions": [{"field": "clock_records", "operator": "has_sessions", "value": true}]}'
                    }
                  </div>
                </p>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="description">説明</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="ステータスの説明を入力してください"
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? '作成中...' : '作成'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
