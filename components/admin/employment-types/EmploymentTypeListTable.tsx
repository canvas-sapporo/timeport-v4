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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { EmploymentType } from '@/types/employment_type';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';

import EmploymentTypeCreateDialog from './EmploymentTypeCreateDialog';
import EmploymentTypeEditDialog from './EmploymentTypeEditDialog';
import EmploymentTypeDeleteDialog from './EmploymentTypeDeleteDialog';

export default function EmploymentTypeListTable({
  employmentTypes,
  activeEmploymentTypeCount,
  inactiveEmploymentTypeCount,
  onDataChange,
}: {
  employmentTypes: EmploymentType[];
  activeEmploymentTypeCount: number;
  inactiveEmploymentTypeCount: number;
  onDataChange?: () => void;
}) {
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // ダイアログの状態管理
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EmploymentType | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EmploymentType | null>(null);

  // 検索・ステータスフィルタリング
  const filteredEmploymentTypes = useMemo(() => {
    let result = employmentTypes;

    // ステータスでフィルタリング
    if (selectedStatus === 'active') {
      result = result.filter((et) => et.is_active);
    } else if (selectedStatus === 'inactive') {
      result = result.filter((et) => !et.is_active);
    }

    if (!search)
      return [...result].sort((a, b) => {
        if (!a.updated_at || !b.updated_at) return 0;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });
    const lower = search.toLowerCase();
    return result
      .filter(
        (et) =>
          (et.name && et.name.toLowerCase().includes(lower)) ||
          (et.code && et.code.toLowerCase().includes(lower)) ||
          (et.description && et.description.toLowerCase().includes(lower))
      )
      .sort((a, b) => {
        if (!a.updated_at || !b.updated_at) return 0;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });
  }, [employmentTypes, search, selectedStatus]);

  const handleReset = () => {
    setSearch('');
    setSelectedStatus('all');
  };

  // 編集ボタン押下時
  const handleEditClick = (employmentType: EmploymentType) => {
    setEditTarget(employmentType);
    setEditDialogOpen(true);
  };

  // 削除ボタン押下時
  const handleDeleteClick = (employmentType: EmploymentType) => {
    setDeleteTarget(employmentType);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="p-6">
      {/* タイトル・追加ボタン */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">雇用形態管理</h1>
          <p className="text-muted-foreground text-sm mt-1">企業内の雇用形態情報を管理します</p>
        </div>
        <Button variant="timeport-primary" size="sm" onClick={() => setCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          追加
        </Button>
      </div>

      {/* 上部カード（統計情報） */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総雇用形態数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employmentTypes.length}</div>
            <p className="text-xs text-muted-foreground">企業内の雇用形態総数</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">有効</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeEmploymentTypeCount}</div>
            <p className="text-xs text-muted-foreground">現在利用可能な雇用形態</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">無効</CardTitle>
            <HelpCircle className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-400">{inactiveEmploymentTypeCount}</div>
            <p className="text-xs text-muted-foreground">現在利用停止中の雇用形態</p>
          </CardContent>
        </Card>
      </div>

      {/* 検索・フィルター */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="w-5 h-5" />
            <span>検索・フィルター</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">キーワード検索</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="雇用形態名、コード、説明で検索..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">ステータス</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="active">有効のみ</SelectItem>
                  <SelectItem value="inactive">無効のみ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={handleReset} className="w-full">
                リセット
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 雇用形態一覧テーブル */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>雇用形態一覧</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>雇用形態名</TableHead>
                <TableHead>コード</TableHead>
                <TableHead>説明</TableHead>
                <TableHead>表示順序</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>編集日</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmploymentTypes.map((employmentType) => (
                <TableRow key={employmentType.id}>
                  <TableCell className="font-medium">{employmentType.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{employmentType.code}</Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">{employmentType.description || '-'}</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">{employmentType.description || '説明なし'}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell>{employmentType.display_order}</TableCell>
                  <TableCell>
                    <Badge variant={employmentType.is_active ? 'default' : 'secondary'}>
                      {employmentType.is_active ? '有効' : '無効'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {employmentType.updated_at
                      ? new Date(employmentType.updated_at).toLocaleDateString('ja-JP')
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(employmentType)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`${employmentType.is_active ? 'text-gray-400 cursor-not-allowed' : 'text-red-600'}`}
                                onClick={() =>
                                  !employmentType.is_active && handleDeleteClick(employmentType)
                                }
                                disabled={employmentType.is_active}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {employmentType.is_active
                              ? '有効な雇用形態は削除できません。先に無効にしてから削除してください。'
                              : '雇用形態を削除'}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredEmploymentTypes.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">条件に一致する雇用形態が見つかりません</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ダイアログ */}
      <EmploymentTypeCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={onDataChange}
      />
      <EmploymentTypeEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        employmentType={editTarget}
        onSuccess={onDataChange}
      />
      <EmploymentTypeDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        employmentType={deleteTarget}
        onSuccess={onDataChange}
      />
    </div>
  );
}
