'use client';
import { useState, useMemo } from 'react';
import {
  Pencil,
  Trash2,
  Plus,
  Users,
  CheckCircle2,
  HelpCircle,
  Search,
  Filter,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import type { Group } from '@/schemas/group';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';

import GroupCreateDialog from './GroupCreateDialog';
import GroupEditDialog from './GroupEditDialog';
import GroupDeleteDialog from './GroupDeleteDialog';

export default function GroupListTable({
  groups,
  activeGroupCount,
  inactiveGroupCount,
  onDataChange,
}: {
  groups: Group[];
  activeGroupCount: number;
  inactiveGroupCount: number;
  onDataChange?: () => void;
}) {
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // ダイアログの状態管理
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Group | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Group | null>(null);

  // 検索・ステータスフィルタリング
  const filteredGroups = useMemo(() => {
    let result = groups;

    // ステータスでフィルタリング
    if (selectedStatus === 'active') {
      result = result.filter((g) => g.is_active);
    } else if (selectedStatus === 'inactive') {
      result = result.filter((g) => !g.is_active);
    }

    if (!search)
      return [...result].sort((a, b) => {
        if (!a.updated_at || !b.updated_at) return 0;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });
    const lower = search.toLowerCase();
    return result
      .filter(
        (g) =>
          (g.name && g.name.toLowerCase().includes(lower)) ||
          (g.code && g.code.toLowerCase().includes(lower)) ||
          (g.description && g.description.toLowerCase().includes(lower))
      )
      .sort((a, b) => {
        if (!a.updated_at || !b.updated_at) return 0;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });
  }, [groups, search, selectedStatus]);

  const handleReset = () => {
    setSearch('');
    setSelectedStatus('all');
  };

  // 編集ボタン押下時
  const handleEditClick = (group: Group) => {
    setEditTarget(group);
    setEditDialogOpen(true);
  };

  // 削除ボタン押下時
  const handleDeleteClick = (group: Group) => {
    setDeleteTarget(group);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="p-6">
      {/* タイトル・追加ボタン */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">グループ管理</h1>
          <p className="text-muted-foreground text-sm mt-1">企業内のグループ情報を管理します</p>
        </div>
        <Button variant="timeport-primary" size="sm" onClick={() => setCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          追加
        </Button>
      </div>

      {/* 上部カード（画像風デザイン） */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* 総グループ数カード */}
        <Card className="relative p-4 flex flex-col gap-1 bg-blue-50 shadow rounded-xl overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-500">
              <Users className="text-white w-5 h-5" />
            </div>
          </div>
          <div className="text-sm text-gray-600">総グループ数</div>
          <div className="text-2xl font-bold text-gray-800 mb-1">{groups.length}</div>
          <div
            className="absolute left-0 right-0 bottom-0 h-2"
            style={{ background: 'linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)' }}
          />
        </Card>
        {/* アクティブカード */}
        <Card className="relative p-4 flex flex-col gap-1 bg-green-50 shadow rounded-xl overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-green-500">
              <CheckCircle2 className="text-white w-5 h-5" />
            </div>
          </div>
          <div className="text-sm text-gray-600">アクティブ</div>
          <div className="text-2xl font-bold text-gray-800 mb-1">{activeGroupCount}</div>
          <div
            className="absolute left-0 right-0 bottom-0 h-2"
            style={{ background: 'linear-gradient(90deg, #22c55e 0%, #4ade80 100%)' }}
          />
        </Card>
        {/* 削除済みグループ数カード */}
        <Card className="relative p-4 flex flex-col gap-1 bg-purple-50 shadow rounded-xl overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-purple-500">
              <HelpCircle className="text-white w-5 h-5" />
            </div>
          </div>
          <div className="text-sm text-gray-600">無効グループ数</div>
          <div className="text-2xl font-bold text-gray-800 mb-1">{inactiveGroupCount}</div>
          <div
            className="absolute left-0 right-0 bottom-0 h-2"
            style={{ background: 'linear-gradient(90deg, #a78bfa 0%, #c4b5fd 100%)' }}
          />
        </Card>
      </div>

      {/* フィルターカード */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="w-5 h-5" />
            <span>フィルター</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-2 w-full">
            <div className="flex flex-1 gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="グループ名、コード、説明で検索"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-full md:w-56">
                  <SelectValue placeholder="ステータスで絞り込み" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全てのステータス</SelectItem>
                  <SelectItem value="active">有効</SelectItem>
                  <SelectItem value="inactive">無効</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={handleReset} className="w-full md:w-32">
              リセット
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* グループ一覧テーブル */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold mb-4">グループ一覧</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-2 text-left font-medium">グループ名</th>
                <th className="px-4 py-2 text-left font-medium">グループコード</th>
                <th className="px-4 py-2 text-left font-medium">説明</th>
                <th className="px-4 py-2 text-center font-medium">ステータス</th>
                <th className="px-4 py-2 text-center font-medium">作成日</th>
                <th className="px-4 py-2 text-center font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredGroups.length > 0 ? (
                filteredGroups.map((group) => (
                  <tr key={group.id} className="border-b hover:bg-muted/40">
                    <td className="px-4 py-2 whitespace-nowrap">{group.name}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{group.code || '-'}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{group.description || '-'}</td>
                    <td className="px-4 py-2 text-center">
                      {group.is_active ? (
                        <Badge variant="default">有効</Badge>
                      ) : (
                        <Badge variant="secondary">無効</Badge>
                      )}
                    </td>
                    <td className="px-4 py-2 text-center whitespace-nowrap">
                      {group.created_at
                        ? new Date(group.created_at).toLocaleDateString('ja-JP')
                        : '-'}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="mr-2"
                        onClick={() => handleEditClick(group)}
                      >
                        <Pencil size={16} />
                      </Button>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteClick(group)}
                                disabled={group.is_active}
                              >
                                <Trash2 size={16} className="text-destructive" />
                              </Button>
                            </span>
                          </TooltipTrigger>
                          {group.is_active && (
                            <TooltipContent>無効化しないと削除できません</TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    グループが見つかりません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ダイアログ */}
      <GroupCreateDialog
        open={createDialogOpen}
        onOpenChangeAction={setCreateDialogOpen}
        onSuccess={onDataChange}
      />
      <GroupEditDialog
        open={editDialogOpen}
        onOpenChangeAction={setEditDialogOpen}
        group={editTarget}
        onSuccess={onDataChange}
      />
      <GroupDeleteDialog
        open={deleteDialogOpen}
        onOpenChangeAction={setDeleteDialogOpen}
        group={deleteTarget}
        onSuccess={onDataChange}
      />
    </div>
  );
}
