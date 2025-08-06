'use client';
import { useState, useMemo } from 'react';
import {
  Pencil,
  Trash2,
  Plus,
  Building2,
  CheckCircle2,
  HelpCircle,
  Search,
  Filter,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Eye,
  Settings,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { ActionButton } from '@/components/ui/action-button';
import { StandardButton } from '@/components/ui/standard-button';
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
import type { Company } from '@/schemas/company';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';

import CompanyCreateDialog from './CompanyCreateDialog';
import CompanyEditDialog from './CompanyEditDialog';
import CompanyDeleteDialog from './CompanyDeleteDialog';
import CompanyPreviewDialog from './CompanyPreviewDialog';

export default function CompanyListTable({
  companies,
  activeCompanyCount,
  deletedCompanyCount,
}: {
  companies: Company[];
  activeCompanyCount: number;
  deletedCompanyCount: number;
}) {
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortField, setSortField] = useState<
    'created_at' | 'name' | 'code' | 'is_active' | 'updated_at'
  >('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const { toast } = useToast();
  const router = useRouter();

  // ダイアログの状態管理
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Company | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);

  // 認証コンテキストを取得
  const { user, isLoggingOut } = useAuth();

  // フィルタリングとソート
  const filteredCompanies = useMemo(() => {
    const filtered = companies.filter((company) => {
      const matchesSearch =
        search === '' ||
        company.name.toLowerCase().includes(search.toLowerCase()) ||
        company.code.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        selectedStatus === 'all' ||
        (selectedStatus === 'active' && company.is_active) ||
        (selectedStatus === 'inactive' && !company.is_active);

      return matchesSearch && matchesStatus;
    });

    // ソート
    filtered.sort((a, b) => {
      let aValue: string | boolean | Date;
      let bValue: string | boolean | Date;

      switch (sortField) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'code':
          aValue = a.code;
          bValue = b.code;
          break;
        case 'is_active':
          aValue = a.is_active;
          bValue = b.is_active;
          break;
        case 'created_at':
          aValue = new Date(a.created_at || '');
          bValue = new Date(b.created_at || '');
          break;
        case 'updated_at':
          aValue = new Date(a.updated_at || '');
          bValue = new Date(b.updated_at || '');
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [companies, search, selectedStatus, sortField, sortDirection]);

  const handleSort = (field: 'created_at' | 'name' | 'code' | 'is_active' | 'updated_at') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: 'created_at' | 'name' | 'code' | 'is_active' | 'updated_at') => {
    if (sortField !== field) {
      return <ChevronsUpDown className="w-4 h-4" />;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP');
  };

  const formatTime = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleReset = () => {
    setSearch('');
    setSelectedStatus('all');
    setSortField('created_at');
    setSortDirection('desc');
  };

  const handleEditClick = (company: Company) => {
    setEditTarget(company);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (company: Company) => {
    setDeleteTarget(company);
    setDeleteDialogOpen(true);
  };

  const handleFeaturesClick = (company: Company) => {
    router.push(`/system-admin/features?company=${company.id}`);
  };

  // ログアウト中またはユーザーが存在しない場合は何も表示しない
  if (isLoggingOut || !user) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総企業数</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{companies.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">アクティブ</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeCompanyCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">削除済み企業数</CardTitle>
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deletedCompanyCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* フィルター */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />▽ フィルター
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Q 企業名、コードで検索"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全てのステータス</SelectItem>
                  <SelectItem value="active">有効</SelectItem>
                  <SelectItem value="inactive">無効</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <StandardButton buttonType="reset" variant="outline" onClick={handleReset}>
              リセット
            </StandardButton>
          </div>
        </CardContent>
      </Card>

      {/* 企業一覧テーブル */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">企業一覧</h2>
          <StandardButton buttonType="create" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            新規企業作成
          </StandardButton>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-2 text-left font-medium">
                  <button
                    onClick={() => handleSort('name')}
                    className="flex items-center gap-1 hover:text-primary transition-colors"
                  >
                    企業名
                    {getSortIcon('name')}
                  </button>
                </th>
                <th className="px-4 py-2 text-left font-medium">
                  <button
                    onClick={() => handleSort('code')}
                    className="flex items-center gap-1 hover:text-primary transition-colors"
                  >
                    コード
                    {getSortIcon('code')}
                  </button>
                </th>
                <th className="px-4 py-2 text-center font-medium">
                  <button
                    onClick={() => handleSort('is_active')}
                    className="flex items-center gap-1 hover:text-primary transition-colors mx-auto"
                  >
                    ステータス
                    {getSortIcon('is_active')}
                  </button>
                </th>
                <th className="px-4 py-2 text-center font-medium">
                  <button
                    onClick={() => handleSort('created_at')}
                    className="flex items-center gap-1 hover:text-primary transition-colors mx-auto"
                  >
                    作成日時
                    {getSortIcon('created_at')}
                  </button>
                </th>
                <th className="px-4 py-2 text-center font-medium">
                  <button
                    onClick={() => handleSort('updated_at')}
                    className="flex items-center gap-1 hover:text-primary transition-colors mx-auto"
                  >
                    編集日時
                    {getSortIcon('updated_at')}
                  </button>
                </th>
                <th className="px-4 py-2 text-center font-medium">
                  <div className="flex items-center justify-center gap-1">
                    <Eye className="w-4 h-4" />
                    操作
                  </div>
                </th>
                <th className="px-4 py-2 text-center font-medium">
                  <div className="flex items-center justify-center gap-1">
                    <Settings className="w-4 h-4" />
                    機能管理
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredCompanies.length > 0 ? (
                filteredCompanies.map((company) => (
                  <tr key={company.id} className="border-b hover:bg-muted/40">
                    <td className="px-4 py-2 whitespace-nowrap">{company.name}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{company.code}</td>
                    <td className="px-4 py-2 text-center">
                      {company.is_active ? (
                        <Badge variant="default">有効</Badge>
                      ) : (
                        <Badge variant="secondary">無効</Badge>
                      )}
                    </td>
                    <td className="px-4 py-2 text-center whitespace-nowrap text-sm">
                      <div className="flex flex-col">
                        <div className="font-medium">{formatDate(company.created_at)}</div>
                        <div className="text-xs text-gray-500">
                          {formatTime(company.created_at)}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-center whitespace-nowrap text-sm">
                      <div className="flex flex-col">
                        <div className="font-medium">{formatDate(company.updated_at)}</div>
                        <div className="text-xs text-gray-500">
                          {formatTime(company.updated_at)}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <CompanyPreviewDialog company={company}>
                              <ActionButton action="view" />
                            </CompanyPreviewDialog>
                          </TooltipTrigger>
                          <TooltipContent>企業情報をプレビュー</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <ActionButton action="edit" onClick={() => handleEditClick(company)} />
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <ActionButton
                                action="delete"
                                onClick={() => handleDeleteClick(company)}
                                disabled={company.is_active}
                              />
                            </span>
                          </TooltipTrigger>
                          {company.is_active && (
                            <TooltipContent>無効化しないと削除できません</TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <StandardButton
                        buttonType="reset"
                        variant="outline"
                        size="sm"
                        onClick={() => handleFeaturesClick(company)}
                      >
                        <Settings className="w-4 h-4 mr-1" />
                        機能管理
                      </StandardButton>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-muted-foreground">
                    企業データがありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 分割済みダイアログコンポーネント */}
      <CompanyCreateDialog open={createDialogOpen} onOpenChangeAction={setCreateDialogOpen} />

      <CompanyEditDialog
        open={editDialogOpen}
        onOpenChangeAction={setEditDialogOpen}
        company={editTarget}
      />

      <CompanyDeleteDialog
        open={deleteDialogOpen}
        onOpenChangeAction={setDeleteDialogOpen}
        company={deleteTarget}
      />
    </div>
  );
}
