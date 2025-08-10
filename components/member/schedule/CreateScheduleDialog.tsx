'use client';

import { useState } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { createSchedule } from '@/lib/mock';
import type { Schedule, CreateScheduleInput } from '@/schemas/schedule';

export default function CreateScheduleDialog({
  isOpen,
  onOpenChange,
  onCreated,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (newSchedule: Schedule) => void;
}) {
  const [form, setForm] = useState<CreateScheduleInput>({
    title: '',
    description: '',
    start_datetime: '',
    end_datetime: '',
    location: '',
    url: '',
    is_all_day: false,
    recurrence_type: 'none',
    is_private: false,
    color: '#3B82F6',
  });

  async function handleCreate() {
    try {
      const result = await createSchedule(form);
      if (result.success) {
        onCreated(result.data);
        onOpenChange(false);
        setForm({
          title: '',
          description: '',
          start_datetime: '',
          end_datetime: '',
          location: '',
          url: '',
          is_all_day: false,
          recurrence_type: 'none',
          is_private: false,
          color: '#3B82F6',
        });
      }
    } catch (e) {
      // noop
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="w-4 h-4 mr-2" />
          スケジュール追加
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>新規スケジュール作成</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">タイトル</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="description">説明</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_datetime">開始日時</Label>
              <Input
                id="start_datetime"
                type="datetime-local"
                value={form.start_datetime}
                onChange={(e) => setForm((p) => ({ ...p, start_datetime: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="end_datetime">終了日時</Label>
              <Input
                id="end_datetime"
                type="datetime-local"
                value={form.end_datetime}
                onChange={(e) => setForm((p) => ({ ...p, end_datetime: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="location">場所</Label>
              <Input
                id="location"
                value={form.location}
                onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                value={form.url}
                onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={form.is_all_day}
                onCheckedChange={(checked) => setForm((p) => ({ ...p, is_all_day: checked }))}
              />
              <Label>終日</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={form.is_private}
                onCheckedChange={(checked) => setForm((p) => ({ ...p, is_private: checked }))}
              />
              <Label>プライベート</Label>
            </div>
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
