'use client';
import { useState, useMemo, useEffect } from 'react';
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
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import type { Company } from '@/schemas/company';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { getAllCompanyFeatures, toggleFeature } from '@/lib/actions/system-admin/features';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { clearFeatureCache, triggerFeatureUpdate } from '@/hooks/use-company-features';

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
  const [companyFeatures, setCompanyFeatures] = useState<
    Record<string, { chat: boolean; report: boolean; schedule: boolean }>
  >({});
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  // ダイアログの状態管理
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Company | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);

  // 認証コンテキストを取得
  const { user, isLoggingOut } = useAuth();

  // 企業機能データを取得
  useEffect(() => {
    // ログアウト中またはユーザーが存在しない場合は機能取得をスキップ
    if (isLoggingOut || !user) {
      return;
    }
    const fetchCompanyFeatures = async () => {
      try {
        // サーバーアクションとして呼び出し
        const result = await getAllCompanyFeatures();
        if (result.success) {
          const featuresMap: Record<string, { chat: boolean; report: boolean; schedule: boolean }> =
            {};
          result.data.forEach((company) => {
            featuresMap[company.company_id] = company.features;
          });
          setCompanyFeatures(featuresMap);
        } else {
          console.error('企業機能取得エラー:', result.error);
          toast({
            title: 'エラー',
            description: '企業機能の取得に失敗しました',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('企業機能取得エラー:', error);
        toast({
          title: 'エラー',
          description: '企業機能の取得に失敗しました',
          variant: 'destructive',
        });
      }
    };

    fetchCompanyFeatures();
  }, [toast, user, isLoggingOut]);

  // 機能切り替えハンドラー
  const handleFeatureToggle = async (companyId: string, featureCode: string, enabled: boolean) => {
    // ログアウト中またはユーザーが存在しない場合は処理をスキップ
    if (isLoggingOut || !user) {
      return;
    }

    const loadingKey = `${companyId}-${featureCode}`;

    // 少し遅延してからローディング状態を開始（一瞬の禁止マーク表示を防ぐ）
    const loadingTimeout = setTimeout(() => {
      setLoadingStates((prev) => ({ ...prev, [loadingKey]: true }));
    }, 100);

    try {
      console.log('機能切り替え開始:', { companyId, featureCode, enabled });

      const result = await toggleFeature({
        company_id: companyId,
        feature_code: featureCode,
        is_active: enabled,
      });

      if (result.success) {
        // ローカル状態を更新
        setCompanyFeatures((prev) => ({
          ...prev,
          [companyId]: {
            ...prev[companyId],
            [featureCode]: enabled,
          },
        }));

        // 少し遅延してからキャッシュをクリアして機能更新イベントを発火
        setTimeout(() => {
          clearFeatureCache(companyId);
          triggerFeatureUpdate(companyId);
        }, 1000); // 1秒遅延

        toast({
          title: '成功',
          description: `${featureCode === 'chat' ? 'チャット' : featureCode === 'report' ? 'レポート' : 'スケジュール'}機能を${enabled ? '有効' : '無効'}にしました`,
        });

        console.log('機能切り替え成功:', { companyId, featureCode, enabled });
      } else {
        console.error('機能切り替えエラー:', result.error);
        toast({
          title: 'エラー',
          description: '機能の切り替えに失敗しました',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('機能切り替えエラー:', error);
      toast({
        title: 'エラー',
        description: '機能の切り替えに失敗しました',
        variant: 'destructive',
      });
    } finally {
      clearTimeout(loadingTimeout);
      setLoadingStates((prev) => ({ ...prev, [loadingKey]: false }));
    }
  };

  // 並び替え関数
  const handleSort = (field: 'created_at' | 'name' | 'code' | 'is_active' | 'updated_at') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // 並び替えアイコンを取得
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

  // 日時フォーマット関数
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '--';
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const formatTime = (dateString: string | null | undefined) => {
    if (!dateString) return '--';
    const date = new Date(dateString);
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // フィルタリングと並び替え
  const filteredCompanies = useMemo(() => {
    let result = companies;

    // ステータスでフィルタリング
    if (selectedStatus === 'active') {
      result = result.filter((c) => c.is_active);
    } else if (selectedStatus === 'inactive') {
      result = result.filter((c) => !c.is_active);
    }

    // 検索でフィルタリング
    if (search) {
      const lower = search.toLowerCase();
      result = result.filter(
        (c) =>
          (c.name && c.name.toLowerCase().includes(lower)) ||
          (c.code && c.code.toLowerCase().includes(lower)) ||
          (c.address && c.address.toLowerCase().includes(lower)) ||
          (c.phone && c.phone.toLowerCase().includes(lower))
      );
    }

    // 並び替え
    return [...result].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case 'created_at':
          aValue = a.created_at ? new Date(a.created_at).getTime() : 0;
          bValue = b.created_at ? new Date(b.created_at).getTime() : 0;
          break;
        case 'name':
          aValue = a.name || '';
          bValue = b.name || '';
          break;
        case 'code':
          aValue = a.code || '';
          bValue = b.code || '';
          break;
        case 'is_active':
          aValue = a.is_active ? 1 : 0;
          bValue = b.is_active ? 1 : 0;
          break;
        case 'updated_at':
          aValue = a.updated_at ? new Date(a.updated_at).getTime() : 0;
          bValue = b.updated_at ? new Date(b.updated_at).getTime() : 0;
          break;
        default:
          return 0;
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
  }, [companies, search, selectedStatus, sortField, sortDirection]);

  const handleReset = () => {
    setSearch('');
    setSelectedStatus('all');
    setSortField('created_at');
    setSortDirection('desc');
  };

  // 編集ボタン押下時
  const handleEditClick = (company: Company) => {
    setEditTarget(company);
    setEditDialogOpen(true);
  };

  // 削除ボタン押下時
  const handleDeleteClick = (company: Company) => {
    setDeleteTarget(company);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="p-6">
      {/* タイトル・追加ボタン */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">企業管理</h1>
          <p className="text-muted-foreground text-sm mt-1">全社の企業情報を管理します</p>
        </div>
        <Button variant="timeport-primary" size="sm" onClick={() => setCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          追加
        </Button>
      </div>

      {/* 上部カード（画像風デザイン） */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* 総企業数カード */}
        <Card className="relative p-4 flex flex-col gap-1 bg-blue-50 shadow rounded-xl overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-500">
              <Building2 className="text-white w-5 h-5" />
            </div>
          </div>
          <div className="text-sm text-gray-600">総企業数</div>
          <div className="text-2xl font-bold text-gray-800 mb-1">{companies.length}</div>
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
          <div className="text-2xl font-bold text-gray-800 mb-1">{activeCompanyCount}</div>
          <div
            className="absolute left-0 right-0 bottom-0 h-2"
            style={{ background: 'linear-gradient(90deg, #22c55e 0%, #4ade80 100%)' }}
          />
        </Card>
        {/* 削除済み企業数カード */}
        <Card className="relative p-4 flex flex-col gap-1 bg-purple-50 shadow rounded-xl overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-purple-500">
              <HelpCircle className="text-white w-5 h-5" />
            </div>
          </div>
          <div className="text-sm text-gray-600">削除済み企業数</div>
          <div className="text-2xl font-bold text-gray-800 mb-1">{deletedCompanyCount}</div>
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
                  placeholder="企業名、コードで検索"
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

      {/* 企業一覧テーブル */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold mb-4">企業一覧</h2>
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
                <th className="px-4 py-2 text-center font-medium">機能</th>
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
              </tr>
            </thead>
            <tbody>
              {filteredCompanies.length > 0 ? (
                filteredCompanies.map((company) => {
                  const features = companyFeatures[company.id] || {
                    chat: false,
                    report: false,
                    schedule: false,
                  };

                  return (
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
                      <td className="px-4 py-2 text-center">
                        <div className="flex items-center justify-center gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">スケジュール</span>
                            <div className="relative">
                              <Switch
                                checked={features.schedule}
                                onCheckedChange={(checked) =>
                                  handleFeatureToggle(company.id, 'schedule', checked)
                                }
                                disabled={loadingStates[`${company.id}-schedule`]}
                              />
                              {loadingStates[`${company.id}-schedule`] && (
                                <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
                                  <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">レポート</span>
                            <div className="relative">
                              <Switch
                                checked={features.report}
                                onCheckedChange={(checked) =>
                                  handleFeatureToggle(company.id, 'report', checked)
                                }
                                disabled={loadingStates[`${company.id}-report`]}
                              />
                              {loadingStates[`${company.id}-report`] && (
                                <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
                                  <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">チャット</span>
                            <div className="relative">
                              <Switch
                                checked={features.chat}
                                onCheckedChange={(checked) =>
                                  handleFeatureToggle(company.id, 'chat', checked)
                                }
                                disabled={loadingStates[`${company.id}-chat`]}
                              />
                              {loadingStates[`${company.id}-chat`] && (
                                <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
                                  <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
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
                                <Button variant="ghost" size="icon" className="mr-2">
                                  <Eye size={16} />
                                </Button>
                              </CompanyPreviewDialog>
                            </TooltipTrigger>
                            <TooltipContent>企業情報をプレビュー</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="mr-2"
                          onClick={() => handleEditClick(company)}
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
                                  onClick={() => handleDeleteClick(company)}
                                  disabled={company.is_active}
                                >
                                  <Trash2 size={16} className="text-destructive" />
                                </Button>
                              </span>
                            </TooltipTrigger>
                            {company.is_active && (
                              <TooltipContent>無効化しないと削除できません</TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="text-center py-6 text-muted-foreground">
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
