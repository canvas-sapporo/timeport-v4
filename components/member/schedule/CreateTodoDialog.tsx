'use client';

import { Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { createTodo } from '@/lib/mock';
import type { Todo, CreateTodoInput } from '@/schemas/schedule';
import { useState } from 'react';

export default function CreateTodoDialog({
  isOpen,
  onOpenChange,
  onCreated,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (newTodo: Todo) => void;
}) {
  const [form, setForm] = useState<CreateTodoInput>({
    title: '',
    description: '',
    due_date: '',
    due_time: '',
    priority: 'medium',
    category: '',
    tags: [],
    is_private: false,
  });

  async function handleCreate() {
    try {
      const result = await createTodo(form);
      if (result.success) {
        onCreated(result.data);
        onOpenChange(false);
        setForm({
          title: '',
          description: '',
          due_date: '',
          due_time: '',
          priority: 'medium',
          category: '',
          tags: [],
          is_private: false,
        });
      }
    } catch (e) {
      // noop
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="w-4 h-4 mr-2" />
          Todo追加
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新規Todo作成</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="todo_title">タイトル</Label>
            <Input
              id="todo_title"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="todo_description">説明</Label>
            <Textarea
              id="todo_description"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="due_date">期日</Label>
              <Input
                id="due_date"
                type="date"
                value={form.due_date}
                onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="due_time">期限時刻</Label>
              <Input
                id="due_time"
                type="time"
                value={form.due_time}
                onChange={(e) => setForm((p) => ({ ...p, due_time: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priority">優先度</Label>
              <Select
                value={form.priority}
                onValueChange={(value) => setForm((p) => ({ ...p, priority: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">低</SelectItem>
                  <SelectItem value="medium">中</SelectItem>
                  <SelectItem value="high">高</SelectItem>
                  <SelectItem value="urgent">緊急</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="category">カテゴリ</Label>
              <Input
                id="category"
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              checked={form.is_private}
              onCheckedChange={(checked) => setForm((p) => ({ ...p, is_private: checked }))}
            />
            <Label>プライベート</Label>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              キャンセル
            </Button>
            <Button onClick={handleCreate}>作成</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
