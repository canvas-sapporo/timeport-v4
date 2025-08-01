'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Eye, FormInput, Plus, Edit, Trash2, Loader2, Check, X } from 'lucide-react';

import { useAuth } from '@/contexts/auth-context';
import { useData } from '@/contexts/data-context';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getRequestForms, deleteRequestForm } from '@/lib/actions/admin/request-forms';
import { getAdminRequests, updateRequestStatus } from '@/lib/actions/requests';
import type { RequestForm } from '@/schemas/request';
import RequestFormEditDialog from '@/components/admin/request-forms/RequestFormEditDialog';
import RequestFormCreateDialog from '@/components/admin/request-forms/RequestFormCreateDialog';
import RequestFormPreviewDialog from '@/components/admin/request-forms/RequestFormPreviewDialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function AdminRequestsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { users, updateRequest } = useData();
  const { toast } = useToast();
  const [requests, setRequests] = useState<unknown[]>([]);
  const [isRequestsLoading, setIsRequestsLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [activeTab, setActiveTab] = useState('requests');

  // 承認・却下ダイアログ用の状態
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [rejectionAction, setRejectionAction] = useState<'reject' | 'withdraw'>('reject');

  // 申請フォーム管理用の状態
  const [requestForms, setRequestForms] = useState<RequestForm[]>([]);
  const [isRequestFormsLoading, setIsRequestFormsLoading] = useState(false);
  const [editFormDialogOpen, setEditFormDialogOpen] = useState(false);
  const [createFormDialogOpen, setCreateFormDialogOpen] = useState(false);
  const [previewFormDialogOpen, setPreviewFormDialogOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<RequestForm | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetForm, setDeleteTargetForm] = useState<RequestForm | null>(null);

  // 検索・フィルタ用state
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // 申請フォーム取得関数
  async function fetchRequestForms() {
    setIsRequestFormsLoading(true);
    try {
      console.log('fetchRequestForms: 開始');
      const result = await getRequestForms();
      console.log('fetchRequestForms: 結果', result);

      if (result.success && result.data) {
        console.log('fetchRequestForms: データ設定', result.data);

        // 重複チェック
        const formIds = result.data.map((form) => form.id);
        const uniqueIds = new Set(formIds);
        if (formIds.length !== uniqueIds.size) {
          console.warn('申請フォームに重複があります:', {
            total: formIds.length,
            unique: uniqueIds.size,
            duplicates: formIds.filter((id, index) => formIds.indexOf(id) !== index),
          });
        }

        setRequestForms(result.data);
      } else {
        console.error('申請フォーム取得失敗:', result.error);
      }
    } catch (error) {
      console.error('申請フォームデータ取得エラー:', error);
    } finally {
      setIsRequestFormsLoading(false);
    }
  }

  // 管理者用申請データ取得関数
  async function fetchAdminRequests() {
    setIsRequestsLoading(true);
    try {
      console.log('fetchAdminRequests: 開始');
      const result = await getAdminRequests();
      console.log('fetchAdminRequests: 結果', result);

      if (result.success && result.data) {
        console.log('fetchAdminRequests: データ設定', result.data);

        // 重複を除去（IDでフィルタリング）
        const uniqueRequests = result.data.filter(
          (request, index, self) => index === self.findIndex((r) => r.id === request.id)
        );

        console.log('管理者申請データ重複除去結果:', {
          total: result.data.length,
          unique: uniqueRequests.length,
        });

        setRequests(uniqueRequests);
      } else {
        console.error('管理者申請データ取得失敗:', result.error);
      }
    } catch (error) {
      console.error('管理者申請データ取得エラー:', error);
    } finally {
      setIsRequestsLoading(false);
    }
  }

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/login');
      return;
    }
  }, [user, router]);

  // 管理者用申請データを取得
  useEffect(() => {
    if (user && user.role === 'admin') {
      console.log('AdminRequestsPage: 管理者ユーザー確認、データ取得開始');
      fetchAdminRequests();
      fetchRequestForms(); // 申請フォームも取得
    }
  }, [user]);

  // 申請フォームタブがアクティブになったときにデータを取得
  useEffect(() => {
    if (activeTab === 'forms') {
      fetchRequestForms();
    }
  }, [activeTab]);

  if (!user || user.role !== 'admin') {
    return null;
  }

  async function handleApprove(requestId: string) {
    try {
      const result = await updateRequestStatus(requestId, 'approved', '管理者により承認されました');
      if (result.success) {
        toast({
          title: '承認完了',
          description: '申請が承認されました',
        });
        fetchAdminRequests(); // データを再取得
      } else {
        toast({
          title: 'エラー',
          description: result.error || '承認に失敗しました',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('承認エラー:', error);
      toast({
        title: 'エラー',
        description: '承認処理中にエラーが発生しました',
        variant: 'destructive',
      });
    }
    setApprovalDialogOpen(false);
    setSelectedRequestId(null);
  }

  async function handleReject(requestId: string, action: 'reject' | 'withdraw') {
    try {
      const statusCode = action === 'reject' ? 'rejected' : 'withdrawn';
      const reason =
        action === 'reject'
          ? rejectionReason || '管理者により却下されました'
          : rejectionReason || '管理者により取り下げられました';

      const result = await updateRequestStatus(requestId, statusCode, reason);
      if (result.success) {
        toast({
          title: action === 'reject' ? '却下完了' : '取り下げ完了',
          description: action === 'reject' ? '申請が却下されました' : '申請が取り下げられました',
        });
        fetchAdminRequests(); // データを再取得
      } else {
        toast({
          title: 'エラー',
          description: result.error || `${action === 'reject' ? '却下' : '取り下げ'}に失敗しました`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error(`${action === 'reject' ? '却下' : '取り下げ'}エラー:`, error);
      toast({
        title: 'エラー',
        description: `${action === 'reject' ? '却下' : '取り下げ'}処理中にエラーが発生しました`,
        variant: 'destructive',
      });
    }
    setRejectionReason('');
    setRejectionDialogOpen(false);
    setSelectedRequestId(null);
    setRejectionAction('reject');
  }

  function openApprovalDialog(requestId: string) {
    setSelectedRequestId(requestId);
    setApprovalDialogOpen(true);
  }

  function openRejectionDialog(requestId: string) {
    setSelectedRequestId(requestId);
    setRejectionDialogOpen(true);
  }

  // statusesテーブルのsettingsフィールドを活用してボタンの表示制御を行う
  function canApprove(request: any): boolean {
    if (!request?.statuses?.code) return false;

    // 承認待ち状態または取り下げ状態のみ承認可能
    return request.statuses.code === 'pending' || request.statuses.code === 'withdrawn';
  }

  function canReject(request: any): boolean {
    if (!request?.statuses?.code) return false;

    // 承認待ち状態または取り下げ状態のみ却下可能
    return request.statuses.code === 'pending' || request.statuses.code === 'withdrawn';
  }

  function getStatusBadge(
    status: { name?: string; code?: string; color?: string } | null | undefined
  ) {
    if (!status) return <Badge variant="outline">-</Badge>;

    const statusName = status.name || '不明';
    const statusColor = status.color || '#6B7280';

    // statusesテーブルのcodeフィールドに基づいてvariantを決定
    let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'outline';
    if (status.code === 'pending') variant = 'secondary';
    else if (status.code === 'approved') variant = 'default';
    else if (status.code === 'rejected') variant = 'destructive';
    else if (status.code === 'draft') variant = 'outline';
    else if (status.code === 'withdrawn') variant = 'outline';
    else if (status.code === 'expired') variant = 'outline';

    // カスタムカラーを使用する場合は、styleで直接指定
    if (statusColor && statusColor !== '#6B7280') {
      return (
        <Badge
          variant="outline"
          style={{
            backgroundColor: statusColor + '20', // 透明度20%の背景色
            color: statusColor,
            borderColor: statusColor + '40', // 透明度40%のボーダー色
          }}
        >
          {statusName}
        </Badge>
      );
    }

    return <Badge variant={variant}>{statusName}</Badge>;
  }

  function formatDate(date?: string) {
    return typeof date === 'string' ? new Date(date).toLocaleDateString('ja-JP') : '-';
  }

  // 申請フォーム統計情報を計算
  function getRequestFormStats() {
    const total = requestForms.length;
    const active = requestForms.filter((form) => form.is_active).length;
    const inactive = total - active;
    return { total, active, inactive };
  }

  // 申請データ統計情報を計算
  function getRequestStats() {
    const total = requests.length;

    // 各申請のステータス情報を詳細にログ出力
    const statusDetails = requests.map((req) => {
      const request = req as any;
      return {
        id: request.id,
        status_id: request.status_id,
        statuses: request.statuses,
        status_name: request.statuses?.name,
        status_code: request.statuses?.code,
      };
    });
    console.log('AdminRequestsPage: ステータス詳細', statusDetails);

    // statusesテーブルのcodeフィールドを活用して統計を計算
    const approved = requests.filter((req) => {
      const request = req as any;
      return request.statuses?.code === 'approved';
    }).length;

    const rejected = requests.filter((req) => {
      const request = req as any;
      return request.statuses?.code === 'rejected';
    }).length;

    const pending = requests.filter((req) => {
      const request = req as any;
      return request.statuses?.code === 'pending';
    }).length;

    const draft = requests.filter((req) => {
      const request = req as any;
      return request.statuses?.code === 'draft';
    }).length;

    const withdrawn = requests.filter((req) => {
      const request = req as any;
      return request.statuses?.code === 'withdrawn';
    }).length;

    const expired = requests.filter((req) => {
      const request = req as any;
      return request.statuses?.code === 'expired';
    }).length;

    // デバッグ: 統計情報をログ出力
    console.log('AdminRequestsPage: 申請統計', {
      total,
      approved,
      rejected,
      pending,
      draft,
      withdrawn,
      expired,
      statusDetails,
      statusBreakdown: {
        approved: requests.filter((req) => {
          const request = req as any;
          return request.statuses?.code === 'approved';
        }),
        rejected: requests.filter((req) => {
          const request = req as any;
          return request.statuses?.code === 'rejected';
        }),
        pending: requests.filter((req) => {
          const request = req as any;
          return request.statuses?.code === 'pending';
        }),
        draft: requests.filter((req) => {
          const request = req as any;
          return request.statuses?.code === 'draft';
        }),
        withdrawn: requests.filter((req) => {
          const request = req as any;
          return request.statuses?.code === 'withdrawn';
        }),
        expired: requests.filter((req) => {
          const request = req as any;
          return request.statuses?.code === 'expired';
        }),
      },
    });

    return { total, approved, rejected, pending, draft, withdrawn, expired };
  }

  // デバッグ: データの状態をログ出力
  console.log('AdminRequestsPage: 現在の状態', {
    requestsCount: requests.length,
    requests: requests,
    usersCount: users.length,
    requestFormsCount: requestForms.length,
    isRequestsLoading,
    user: user?.id,
  });

  // 申請データのrequest_form_idを確認
  const missingRequestFormIds = requests
    .map((req) => (req as { request_form_id: string }).request_form_id)
    .filter((formId) => !requestForms.find((form) => form.id === formId));

  console.log('AdminRequestsPage: 不足している申請フォームID', missingRequestFormIds);

  // 「自分が承認者の申請」だけ抽出
  const myApprovalRequests = requests
    .map((req) => {
      const request = req as {
        id: string;
        request_form_id: string;
        current_approval_step: number;
        user_id: string;
        title?: string;
        status_id: string;
        statuses?: { name?: string; code?: string };
        created_at?: string;
        target_date?: string;
        start_date?: string;
        end_date?: string;
        updated_at?: string;
      };

      console.log('AdminRequestsPage: 申請データ処理', {
        requestId: request.id,
        requestFormId: request.request_form_id,
        currentStep: request.current_approval_step,
        userId: request.user_id,
        title: request.title,
      });

      const form = requestForms.find((f) => f.id === request.request_form_id);
      if (!form) {
        console.log('AdminRequestsPage: 申請フォームが見つかりません', request.request_form_id);
        return null;
      }

      const step = form.approval_flow.find((s) => s.step === request.current_approval_step);
      if (!step) {
        console.log('AdminRequestsPage: 承認ステップが見つかりません', {
          step: request.current_approval_step,
          approvalFlow: form.approval_flow,
        });
        return null;
      }

      return { ...request, approver_id: step.approver_id, form };
    })
    .filter(
      (req) =>
        req &&
        // req.approver_id === user.id && // ← 一時的にコメントアウト
        (!searchText ||
          req.title?.includes(searchText) ||
          users.find((u) => u.id === req.user_id)?.family_name?.includes(searchText) ||
          users.find((u) => u.id === req.user_id)?.first_name?.includes(searchText)) &&
        (statusFilter === 'all' || req.status_id === statusFilter)
    )
    .sort((a, b) => {
      if (!a || !b) return 0;
      return new Date(b.updated_at ?? '').getTime() - new Date(a.updated_at ?? '').getTime();
    });

  console.log('AdminRequestsPage: フィルタリング後の申請', {
    myApprovalRequestsCount: myApprovalRequests.length,
    myApprovalRequests: myApprovalRequests,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">申請管理</h1>
        <p className="text-gray-600">メンバーからの申請を確認・承認できます</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="requests">申請履歴</TabsTrigger>
          <TabsTrigger value="forms">申請フォーム</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-6">
          {/* 検索・フィルタUI */}
          <div className="flex flex-wrap gap-2 items-center mb-2">
            <Input
              placeholder="申請者名・種別で検索"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-48"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="all">全ステータス</option>
              <option value="pending">未承認</option>
              <option value="approved">承認</option>
              <option value="rejected">却下</option>
            </select>
          </div>

          {/* 申請データ統計情報カード */}
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">総申請数</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{getRequestStats().total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">下書き</CardTitle>
                <div className="h-4 w-4 rounded-full bg-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-600">{getRequestStats().draft}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">承認待ち</CardTitle>
                <div className="h-4 w-4 rounded-full bg-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {getRequestStats().pending}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">承認済み</CardTitle>
                <div className="h-4 w-4 rounded-full bg-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {getRequestStats().approved}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">却下</CardTitle>
                <div className="h-4 w-4 rounded-full bg-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{getRequestStats().rejected}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">取り下げ</CardTitle>
                <div className="h-4 w-4 rounded-full bg-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-500">
                  {getRequestStats().withdrawn}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">期限切れ</CardTitle>
                <div className="h-4 w-4 rounded-full bg-gray-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-700">{getRequestStats().expired}</div>
              </CardContent>
            </Card>
          </div>

          {/* 自分が承認者の申請一覧 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="w-5 h-5" />
                <span>自分が承認者の申請</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isRequestsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>データを読み込み中...</span>
                  </div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>申請者</TableHead>
                      <TableHead>種別</TableHead>
                      <TableHead>申請日</TableHead>
                      <TableHead>対象日</TableHead>
                      <TableHead>ステータス</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myApprovalRequests.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-gray-400">
                          該当する申請はありません
                        </TableCell>
                      </TableRow>
                    )}
                    {myApprovalRequests.map((request, index) => {
                      if (!request) return null;
                      const requestant = users.find((u) => u.id === request.user_id);
                      return (
                        <TableRow key={`request-${request.id}-${index}`}>
                          <TableCell>
                            {requestant
                              ? `${requestant.family_name} ${requestant.first_name}`
                              : '-'}
                          </TableCell>
                          <TableCell>{request.title}</TableCell>
                          <TableCell>{formatDate(request.created_at)}</TableCell>
                          <TableCell>
                            {request.target_date
                              ? formatDate(request.target_date)
                              : request.start_date && request.end_date
                                ? `${formatDate(request.start_date)} - ${formatDate(request.end_date)}`
                                : request.start_date
                                  ? formatDate(request.start_date)
                                  : '-'}
                          </TableCell>
                          <TableCell>{getStatusBadge(request.statuses)}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                      onClick={() => openApprovalDialog(request.id)}
                                      disabled={!canApprove(request)}
                                    >
                                      <Check className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>承認</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                      onClick={() => openRejectionDialog(request.id)}
                                      disabled={!canReject(request)}
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>却下</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forms" className="space-y-6">
          {/* 統計情報カード */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">総申請フォーム数</CardTitle>
                <FormInput className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{getRequestFormStats().total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">有効な申請フォーム</CardTitle>
                <div className="h-4 w-4 rounded-full bg-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {getRequestFormStats().active}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">無効な申請フォーム</CardTitle>
                <div className="h-4 w-4 rounded-full bg-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-600">
                  {getRequestFormStats().inactive}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FormInput className="w-5 h-5" />
                  <span>申請フォーム</span>
                </div>
                <Button onClick={() => setCreateFormDialogOpen(true)} variant="timeport-primary">
                  <Plus className="w-4 h-4 mr-2" />
                  新規フォーム作成
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isRequestFormsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>データを読み込み中...</span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {requestForms.map((form, index) => (
                    <Card
                      key={`form-${form.id}-${index}`}
                      className="hover:shadow-md transition-shadow"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg font-semibold line-clamp-2">
                              {form.name}
                            </CardTitle>
                            {form.code && (
                              <Badge variant="outline" className="mt-2">
                                {form.code}
                              </Badge>
                            )}
                          </div>
                          <Badge
                            variant={form.is_active ? 'default' : 'secondary'}
                            className="ml-2"
                          >
                            {form.is_active ? '有効' : '無効'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        {form.description && (
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                            {form.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                          <span>{form.form_config.length}項目</span>
                          <span>{new Date(form.updated_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedForm(form);
                              setPreviewFormDialogOpen(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedForm(form);
                              setEditFormDialogOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600"
                            onClick={() => {
                              setDeleteTargetForm(form);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              {!isRequestFormsLoading && requestForms.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">申請フォームが登録されていません</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 申請フォーム編集ダイアログ */}
      {selectedForm && (
        <RequestFormEditDialog
          open={editFormDialogOpen}
          onOpenChangeAction={setEditFormDialogOpen}
          requestForm={selectedForm}
          onSuccessAction={() => {
            setEditFormDialogOpen(false);
            setSelectedForm(null);
            fetchRequestForms(); // データを再取得
          }}
        />
      )}

      {/* 申請フォーム新規作成ダイアログ */}
      <RequestFormCreateDialog
        open={createFormDialogOpen}
        onOpenChangeAction={setCreateFormDialogOpen}
        onSuccessAction={() => {
          setCreateFormDialogOpen(false);
          fetchRequestForms(); // データを再取得
        }}
      />

      {/* 申請フォームプレビューダイアログ */}
      <RequestFormPreviewDialog
        open={previewFormDialogOpen}
        onOpenChangeAction={setPreviewFormDialogOpen}
        requestForm={selectedForm}
      />

      {/* 削除確認ダイアログ */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この申請フォーム「{deleteTargetForm?.name}」を削除します。元に戻せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deleteTargetForm) {
                  try {
                    console.log('削除開始:', deleteTargetForm.id, deleteTargetForm.name);
                    const result = await deleteRequestForm(deleteTargetForm.id);
                    console.log('削除結果:', result);

                    if (result.success) {
                      console.log('削除成功');
                      toast({
                        title: '申請フォームを削除しました',
                        description: `${deleteTargetForm.name}が正常に削除されました`,
                      });
                      setDeleteDialogOpen(false);
                      setDeleteTargetForm(null);
                      fetchRequestForms();
                    } else {
                      console.error('削除失敗:', result.error);
                      toast({
                        title: 'エラー',
                        description: result.error || '申請フォームの削除に失敗しました',
                        variant: 'destructive',
                      });
                    }
                  } catch (error) {
                    console.error('削除処理エラー:', error);
                    toast({
                      title: 'エラー',
                      description: '申請フォームの削除中にエラーが発生しました',
                      variant: 'destructive',
                    });
                  }
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 承認確認ダイアログ */}
      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>申請を承認しますか？</DialogTitle>
            <DialogDescription>
              この申請を承認します。承認後は取り消すことができません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalDialogOpen(false)}>
              キャンセル
            </Button>
            <Button
              onClick={async () => selectedRequestId && (await handleApprove(selectedRequestId))}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              承認する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 却下・取り下げ確認ダイアログ */}
      <Dialog open={rejectionDialogOpen} onOpenChange={setRejectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>申請の処理</DialogTitle>
            <DialogDescription>この申請を却下または取り下げします。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>処理内容</Label>
              <div className="flex space-x-4 mt-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="reject"
                    checked={rejectionAction === 'reject'}
                    onChange={(e) => setRejectionAction(e.target.value as 'reject' | 'withdraw')}
                    className="text-red-600"
                  />
                  <span>却下</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="withdraw"
                    checked={rejectionAction === 'withdraw'}
                    onChange={(e) => setRejectionAction(e.target.value as 'reject' | 'withdraw')}
                    className="text-gray-600"
                  />
                  <span>取り下げ（再申請可能）</span>
                </label>
              </div>
            </div>
            <div>
              <Label htmlFor="rejection-reason">
                {rejectionAction === 'reject' ? '却下理由' : '取り下げ理由'}
              </Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={
                  rejectionAction === 'reject'
                    ? '却下理由を入力してください'
                    : '取り下げ理由を入力してください'
                }
                rows={3}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectionDialogOpen(false)}>
              キャンセル
            </Button>
            <Button
              onClick={async () =>
                selectedRequestId && (await handleReject(selectedRequestId, rejectionAction))
              }
              className={
                rejectionAction === 'reject'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-gray-600 hover:bg-gray-700 text-white'
              }
            >
              {rejectionAction === 'reject' ? '却下する' : '取り下げる'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
