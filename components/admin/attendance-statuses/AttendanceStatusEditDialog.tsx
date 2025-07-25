'use client';

import { useState, useEffect } from 'react';
import { Edit } from 'lucide-react';

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
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { updateAttendanceStatus } from '@/lib/actions/attendance';
import type { AttendanceStatusEntity } from '@/types/attendance';

interface AttendanceStatusEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: AttendanceStatusEntity | null;
  onSuccess?: () => void;
}

export default function AttendanceStatusEditDialog({
  open,
  onOpenChange,
  status,
  onSuccess,
}: AttendanceStatusEditDialogProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    display_name: '',
    color: 'default',
    font_color: '#000000',
    background_color: '#ffffff',
    sort_order: 0,
    is_active: true,
    description: '',
    logic: '',
  });

  useEffect(() => {
    if (status) {
      setFormData({
        display_name: status.display_name,
        color: status.color,
        font_color: status.font_color,
        background_color: status.background_color,
        sort_order: status.sort_order,
        is_active: status.is_active,
        description: status.description || '',
        logic: status.logic || '',
      });
    }
  }, [status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!status || !formData.display_name) {
      toast({
        title: 'エラー',
        description: '必須項目を入力してください',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      const result = await updateAttendanceStatus(status.id, {
        display_name: formData.display_name,
        color: formData.color,
        font_color: formData.font_color,
        background_color: formData.background_color,
        sort_order: formData.sort_order,
        is_active: formData.is_active,
        description: formData.description || undefined,
        logic: formData.logic || undefined,
      });

      if (result.success) {
        toast({
          title: '更新完了',
          description: '勤怠ステータスが正常に更新されました',
        });
        onSuccess?.();
        onOpenChange(false);
      } else {
        toast({
          title: '更新失敗',
          description: result.error || '勤怠ステータスの更新に失敗しました',
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

  if (!status) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5" />
            勤怠ステータス編集
          </DialogTitle>
          <DialogDescription>「{status.display_name}」の設定を編集します</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="system_name">システム名</Label>
            <Input id="system_name" value={status.name} disabled className="bg-gray-50" />
            <p className="text-xs text-gray-500 mt-1">システム名は変更できません</p>
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

          <div className="flex items-center justify-between">
            <Label htmlFor="is_active">有効</Label>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
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
                    not_equalsv
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
              {isSaving ? '更新中...' : '更新'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
