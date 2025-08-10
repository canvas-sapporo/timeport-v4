'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Eye, FormInput, Plus, Edit, Trash2, Loader2, Check, X } from 'lucide-react';

import { useAuth } from '@/contexts/auth-context';
import { useData } from '@/contexts/data-context';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ActionButton } from '@/components/ui/action-button';
import { StandardButton } from '@/components/ui/standard-button';
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
import {
  getAdminRequests,
  updateRequestStatus,
  approveRequest,
  getCurrentAttendance,
} from '@/lib/actions/requests';
import type { RequestForm } from '@/schemas/request';
import type { ClockRecord, ClockBreakRecord } from '@/schemas/attendance';

// 管理者画面用の拡張された申請データ型
interface AdminRequestData {
  id: string;
  title: string;
  status: string;
  created_at: string;
  status_id: string;
  statuses?: {
    name?: string;
    code?: string;
    color?: string;
  };
  user_id: string;
  request_form_id: string;
  current_approval_step: number;
  target_date?: string;
  start_date?: string;
  end_date?: string;
  updated_at?: string;
  submission_comment?: string;
  form_data?: Record<string, string | number | boolean | string[] | Date>;
  form?: RequestForm;
  request_forms?: RequestForm;
}
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

// リクエストデータの型定義
interface RequestData {
  id: string;
  title: string;
  status: string;
  created_at: string;
  [key: string]: unknown;
}

export default function AdminRequestsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { users, updateRequest } = useData();
  const { toast } = useToast();
  const [requests, setRequests] = useState<AdminRequestData[]>([]);
  const [isRequestsLoading, setIsRequestsLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [activeTab, setActiveTab] = useState('requests');

  // 承認・却下ダイアログ用の状態
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<AdminRequestData | null>(null);
  const [rejectionAction, setRejectionAction] = useState<'reject' | 'withdraw'>('reject');
  const [currentAttendance, setCurrentAttendance] = useState<{
    clock_records: {
      in_time?: string;
      out_time?: string;
      breaks?: { break_start?: string; break_end?: string }[];
    }[];
  } | null>(null);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);

  // 詳細確認ダイアログ用の状態
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedDetailRequest, setSelectedDetailRequest] = useState<AdminRequestData | null>(null);

  // 承認ダイアログオープン時に現在の勤怠を取得
  useEffect(() => {
    (async () => {
      if (!approvalDialogOpen || !selectedRequest) {
        setCurrentAttendance(null);
        return;
      }
      try {
        setIsLoadingAttendance(true);
        const workDate = String(
          selectedRequest.form_data?.work_date || selectedRequest.target_date || ''
        );
        if (!selectedRequest.user_id || !workDate) {
          setCurrentAttendance(null);
          return;
        }
        const result = await getCurrentAttendance(selectedRequest.user_id, workDate);
        if (result.success && !result.notFound && result.data) {
          setCurrentAttendance({ clock_records: result.data.clock_records as any });
        } else {
          setCurrentAttendance(null);
        }
      } catch (e) {
        setCurrentAttendance(null);
      } finally {
        setIsLoadingAttendance(false);
      }
    })();
  }, [approvalDialogOpen, selectedRequest]);

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

      if (result?.success && result.data) {
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
      } else if (result === undefined) {
        console.warn('fetchRequestForms: APIレスポンスがundefinedです');
      } else {
        console.error('申請フォーム取得失敗:', result?.error);
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

      if (result?.success && result.data) {
        console.log('fetchAdminRequests: データ設定', result.data);

        // 重複を除去（IDでフィルタリング）
        const uniqueRequests = result.data.filter(
          (request, index, self) => index === self.findIndex((r) => r.id === request.id)
        );

        console.log('管理者申請データ重複除去結果:', {
          total: result.data.length,
          unique: uniqueRequests.length,
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setRequests(uniqueRequests as any);
      } else if (result === undefined) {
        console.warn('fetchAdminRequests: APIレスポンスがundefinedです');
      } else {
        console.error('管理者申請データ取得失敗:', result?.error);
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
      // fetchRequestForms(); // getAdminRequestsでrequest_formsも取得するため不要
    }
  }, [user]);

  // 申請フォームタブがアクティブになったときにデータを取得
  useEffect(() => {
    if (activeTab === 'forms') {
      fetchRequestForms(); // 申請フォーム管理タブでは別途取得が必要
    }
  }, [activeTab]);

  if (!user || user.role !== 'admin') {
    return null;
  }

  async function handleApprove(requestId: string) {
    try {
      const result = await approveRequest(requestId, user?.id || '', '管理者により承認されました');
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
    setSelectedRequest(null);
  }

  async function handleReject(requestId: string, action: 'reject' | 'withdraw') {
    try {
      const statusCode = action === 'reject' ? 'rejected' : 'withdrawn';
      const reason =
        action === 'reject'
          ? rejectionReason || '管理者により却下されました'
          : rejectionReason || '管理者により取り下げられました';

      const result = await updateRequestStatus(requestId, statusCode, reason, user?.id);
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
    setSelectedRequest(null);
    setRejectionAction('reject');
  }

  function openApprovalDialog(requestId: string) {
    const request = requests.find((r) => r.id === requestId) as AdminRequestData | undefined;
    setSelectedRequestId(requestId);
    setSelectedRequest(request || null);
    setApprovalDialogOpen(true);
  }

  function openRejectionDialog(requestId: string) {
    const request = requests.find((r) => r.id === requestId);
    if (request) {
      setSelectedRequest(request);
      setSelectedRequestId(requestId);
      setRejectionDialogOpen(true);
    }
  }

  function openDetailDialog(requestId: string) {
    const request = requests.find((r) => r.id === requestId);
    if (request) {
      setSelectedDetailRequest(request);
      setDetailDialogOpen(true);
    }
  }

  // statusesテーブルのsettingsフィールドを活用してボタンの表示制御を行う
  function canApprove(request: AdminRequestData): boolean {
    if (!request?.statuses?.code) return false;

    // 承認待ち状態または取り下げ状態のみ承認可能
    return request.statuses.code === 'pending' || request.statuses.code === 'withdrawn';
  }

  function canReject(request: AdminRequestData): boolean {
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
      const request = req as AdminRequestData;
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
      const request = req as AdminRequestData;
      return request.statuses?.code === 'approved';
    }).length;

    const rejected = requests.filter((req) => {
      const request = req as AdminRequestData;
      return request.statuses?.code === 'rejected';
    }).length;

    const pending = requests.filter((req) => {
      const request = req as AdminRequestData;
      return request.statuses?.code === 'pending';
    }).length;

    const draft = requests.filter((req) => {
      const request = req as AdminRequestData;
      return request.statuses?.code === 'draft';
    }).length;

    const withdrawn = requests.filter((req) => {
      const request = req as AdminRequestData;
      return request.statuses?.code === 'withdrawn';
    }).length;

    const expired = requests.filter((req) => {
      const request = req as AdminRequestData;
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
          const request = req as AdminRequestData;
          return request.statuses?.code === 'approved';
        }),
        rejected: requests.filter((req) => {
          const request = req as AdminRequestData;
          return request.statuses?.code === 'rejected';
        }),
        pending: requests.filter((req) => {
          const request = req as AdminRequestData;
          return request.statuses?.code === 'pending';
        }),
        draft: requests.filter((req) => {
          const request = req as AdminRequestData;
          return request.statuses?.code === 'draft';
        }),
        withdrawn: requests.filter((req) => {
          const request = req as AdminRequestData;
          return request.statuses?.code === 'withdrawn';
        }),
        expired: requests.filter((req) => {
          const request = req as AdminRequestData;
          return request.statuses?.code === 'expired';
        }),
      },
    });

    return { total, approved, rejected, pending, draft, withdrawn, expired };
  }

  // デバッグ: データの状態をログ出力
  console.log('AdminRequestsPage: 現在の状態', {
    requestsCount: requests.length,
    requests: requests.map((req) => ({
      id: req.id,
      request_form_id: req.request_form_id,
      hasRequestForms: !!req.request_forms,
      requestFormsName: req.request_forms?.name,
    })),
    usersCount: users.length,
    requestFormsCount: requestForms.length,
    isRequestsLoading,
    user: user?.id,
  });

  // 申請データのrequest_form_idを確認（getAdminRequestsで取得したデータを使用）
  const requestsWithMissingForms = requests.filter((req) => !req.request_forms);
  console.log('AdminRequestsPage: request_formsデータが不足している申請', requestsWithMissingForms);

  // 「自分が承認者の申請」だけ抽出
  const myApprovalRequests = requests
    .map((req) => {
      const request = req as AdminRequestData;

      console.log('AdminRequestsPage: 申請データ処理', {
        requestId: request.id,
        requestFormId: request.request_form_id,
        currentStep: request.current_approval_step,
        userId: request.user_id,
        title: request.title,
        hasRequestForms: !!request.request_forms,
        requestFormsName: request.request_forms?.name,
      });

      // getAdminRequestsで取得したrequest_formsデータを使用
      if (!request.request_forms) {
        console.log('AdminRequestsPage: 申請フォームデータがありません', request.request_form_id);
        return null;
      }

      // request_formsのform_configとapproval_flowを取得
      const formConfig = request.request_forms.form_config;
      const approvalFlow = request.request_forms.approval_flow;

      if (!approvalFlow || !Array.isArray(approvalFlow)) {
        console.log('AdminRequestsPage: 承認フローがありません', {
          requestFormId: request.request_form_id,
          approvalFlow,
        });
        return null;
      }

      const step = approvalFlow.find((s) => s.step === request.current_approval_step);
      if (!step) {
        console.log('AdminRequestsPage: 承認ステップが見つかりません', {
          step: request.current_approval_step,
          approvalFlow,
        });
        return null;
      }

      return {
        ...request,
        approver_id: step.approver_id,
        form: request.request_forms,
      };
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
                      {/* <TableHead>対象日</TableHead> */}
                      <TableHead>ステータス</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myApprovalRequests.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-gray-400">
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
                          {/* 対象日 列は非表示 */}
                          <TableCell>{getStatusBadge(request.statuses)}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {/* 承認待ちの場合のみ承認・却下ボタンを表示 */}
                              {request.statuses?.code === 'pending' ? (
                                <>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <ActionButton
                                          action="approve"
                                          onClick={() => openApprovalDialog(request.id)}
                                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                          disabled={!canApprove(request as any)}
                                        />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>承認</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <ActionButton
                                          action="reject"
                                          onClick={() => openRejectionDialog(request.id)}
                                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                          disabled={!canReject(request as any)}
                                        />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>却下</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </>
                              ) : (
                                /* 承認待ち以外の場合は詳細確認ボタンを表示 */
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <ActionButton
                                        action="view"
                                        onClick={() => openDetailDialog(request.id)}
                                      />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>詳細確認</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
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
                          <ActionButton
                            action="edit"
                            onClick={() => {
                              setSelectedForm(form);
                              setEditFormDialogOpen(true);
                            }}
                          />
                          <ActionButton
                            action="delete"
                            onClick={() => {
                              if (!form.is_active) {
                                setDeleteTargetForm(form);
                                setDeleteDialogOpen(true);
                              }
                            }}
                            disabled={form.is_active}
                          />
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>申請を承認しますか？</DialogTitle>
            <DialogDescription>
              この申請を承認します。承認後は取り消すことができません。
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50/30">
                <h4 className="font-medium text-blue-800 mb-3">申請詳細</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="font-medium">申請者</Label>
                    <div className="text-gray-700">
                      {(() => {
                        console.log('申請者デバッグ:', {
                          user_id: selectedRequest?.user_id,
                          users_count: users.length,
                          users: users.map((u) => ({
                            id: u.id,
                            name: `${u.family_name} ${u.first_name}`,
                          })),
                        });
                        const applicantUser = users.find((u) => u.id === selectedRequest?.user_id);
                        console.log('申請者検索結果:', applicantUser);
                        if (applicantUser) {
                          const fullName =
                            `${applicantUser.family_name || ''} ${applicantUser.first_name || ''}`.trim();
                          console.log('申請者氏名:', fullName);
                          return fullName || selectedRequest?.user_id || '-';
                        }
                        return selectedRequest?.user_id || '-';
                      })()}
                    </div>
                  </div>
                  <div>
                    <Label className="font-medium">申請種別</Label>
                    <p className="text-gray-700">{selectedRequest?.request_forms?.name || '-'}</p>
                  </div>
                  <div>
                    <Label className="font-medium">申請日</Label>
                    <p className="text-gray-700">{formatDate(selectedRequest.created_at)}</p>
                  </div>
                  {/* 対象日は非表示に変更 */}
                  {selectedRequest.form_data &&
                    Object.keys(selectedRequest.form_data).length > 0 && (
                      <div className="col-span-2">
                        <Label className="font-medium">申請内容</Label>
                        <div className="mt-1 space-y-2">
                          {Object.entries(selectedRequest.form_data).map(([key, value]) => {
                            // フォーム設定からフィールドのラベルを取得
                            const formConfig = selectedRequest?.form?.form_config;
                            const fieldConfig = formConfig?.find(
                              (field: { name: string; label?: string }) => field.name === key
                            );
                            const fieldLabel = fieldConfig?.label || key;

                            // デバッグ用ログ
                            console.log('form_data フィールド処理:', {
                              key,
                              value,
                              value_type: typeof value,
                              is_object: typeof value === 'object',
                              is_array: Array.isArray(value),
                            });

                            // 既存の打刻修正/clock_records の個別表示は
                            // 下部の比較ブロックに統合したため非表示にする
                            if (key === 'attendance_correction' || key === 'clock_records') {
                              return null;
                            }

                            // attendance_correction オブジェクトの特別処理
                            if (
                              key === 'attendance_correction' &&
                              typeof value === 'object' &&
                              value !== null
                            ) {
                              // デバッグ用ログ
                              console.log('attendance_correction データ:', {
                                key,
                                value,
                                value_type: typeof value,
                                is_array: Array.isArray(value),
                              });

                              // attendance_correction が配列の場合の処理
                              if (Array.isArray(value)) {
                                return (
                                  <div key={key} className="space-y-4">
                                    {/* セクションタイトル */}
                                    <div className="border-b border-gray-200 pb-2">
                                      <h4 className="text-blue-600 font-medium">打刻修正</h4>
                                    </div>

                                    {/* 勤務セッション */}
                                    <div className="space-y-3">
                                      <div className="flex items-center justify-between">
                                        <Label className="text-sm font-medium text-gray-700">
                                          勤務セッション
                                        </Label>
                                      </div>

                                      {(value as unknown as ClockRecord[]).map(
                                        (record: ClockRecord, index: number) => (
                                          <div
                                            key={index}
                                            className="border border-blue-200 rounded-lg p-4 bg-blue-50/30"
                                          >
                                            <div className="text-sm font-medium text-blue-800 mb-3">
                                              セッション {index + 1}
                                            </div>

                                            <div className="space-y-3">
                                              {/* 出勤時刻 */}
                                              {record.in_time && (
                                                <div className="space-y-1">
                                                  <Label className="text-sm font-medium text-gray-700">
                                                    出勤時刻
                                                  </Label>
                                                  <div className="p-2 bg-white rounded border">
                                                    <span className="text-gray-800">
                                                      {new Date(record.in_time).toLocaleString(
                                                        'ja-JP',
                                                        {
                                                          year: 'numeric',
                                                          month: '2-digit',
                                                          day: '2-digit',
                                                          hour: '2-digit',
                                                          minute: '2-digit',
                                                        }
                                                      )}
                                                    </span>
                                                  </div>
                                                </div>
                                              )}

                                              {/* 退勤時刻 */}
                                              {record.out_time && (
                                                <div className="space-y-1">
                                                  <Label className="text-sm font-medium text-gray-700">
                                                    退勤時刻
                                                  </Label>
                                                  <div className="p-2 bg-white rounded border">
                                                    <span className="text-gray-800">
                                                      {new Date(record.out_time).toLocaleString(
                                                        'ja-JP',
                                                        {
                                                          year: 'numeric',
                                                          month: '2-digit',
                                                          day: '2-digit',
                                                          hour: '2-digit',
                                                          minute: '2-digit',
                                                        }
                                                      )}
                                                    </span>
                                                  </div>
                                                </div>
                                              )}

                                              {/* 休憩記録 */}
                                              <div className="space-y-2">
                                                <Label className="text-sm font-medium text-gray-700">
                                                  休憩記録
                                                </Label>
                                                {record.breaks &&
                                                Array.isArray(record.breaks) &&
                                                record.breaks.length > 0 ? (
                                                  <div className="space-y-2">
                                                    {record.breaks.map(
                                                      (
                                                        breakRecord: ClockBreakRecord,
                                                        breakIndex: number
                                                      ) => (
                                                        <div
                                                          key={breakIndex}
                                                          className="border border-gray-200 rounded p-3 bg-white"
                                                        >
                                                          <div className="grid grid-cols-2 gap-3">
                                                            {breakRecord.break_start && (
                                                              <div className="space-y-1">
                                                                <Label className="text-xs font-medium text-gray-600">
                                                                  休憩開始
                                                                </Label>
                                                                <div className="p-2 bg-gray-50 rounded border">
                                                                  <span className="text-sm text-gray-800">
                                                                    {new Date(
                                                                      breakRecord.break_start
                                                                    ).toLocaleString('ja-JP', {
                                                                      hour: '2-digit',
                                                                      minute: '2-digit',
                                                                    })}
                                                                  </span>
                                                                </div>
                                                              </div>
                                                            )}
                                                            {breakRecord.break_end && (
                                                              <div className="space-y-1">
                                                                <Label className="text-xs font-medium text-gray-600">
                                                                  休憩終了
                                                                </Label>
                                                                <div className="p-2 bg-gray-50 rounded border">
                                                                  <span className="text-sm text-gray-800">
                                                                    {new Date(
                                                                      breakRecord.break_end
                                                                    ).toLocaleString('ja-JP', {
                                                                      hour: '2-digit',
                                                                      minute: '2-digit',
                                                                    })}
                                                                  </span>
                                                                </div>
                                                              </div>
                                                            )}
                                                          </div>
                                                        </div>
                                                      )
                                                    )}
                                                  </div>
                                                ) : (
                                                  <div className="p-2 bg-gray-50 rounded border">
                                                    <span className="text-sm text-gray-600">
                                                      休憩記録なし
                                                    </span>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        )
                                      )}
                                    </div>
                                  </div>
                                );
                              }

                              // 従来のオブジェクト形式の処理（後方互換性のため）
                              const correctionData = value as {
                                work_date?: string;
                                clock_records?: ClockRecord[];
                              };

                              const comparison = (
                                <div key={key} className="space-y-4">
                                  {/* セクションタイトル */}
                                  <div className="border-b border-gray-200 pb-2">
                                    <h4 className="text-blue-600 font-medium">打刻修正</h4>
                                  </div>

                                  {/* 勤務日 */}
                                  {correctionData.work_date && (
                                    <div className="space-y-2">
                                      <Label className="text-sm font-medium text-gray-700">
                                        勤務日
                                      </Label>
                                      <div className="p-3 bg-gray-50 rounded-md border">
                                        <span className="text-gray-800">
                                          {new Date(correctionData.work_date).toLocaleDateString(
                                            'ja-JP',
                                            {
                                              year: 'numeric',
                                              month: '2-digit',
                                              day: '2-digit',
                                            }
                                          )}
                                        </span>
                                      </div>
                                    </div>
                                  )}

                                  {/* 勤務セッション */}
                                  {correctionData.clock_records &&
                                    Array.isArray(correctionData.clock_records) && (
                                      <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                          <Label className="text-sm font-medium text-gray-700">
                                            勤務セッション
                                          </Label>
                                        </div>

                                        {correctionData.clock_records.map(
                                          (record: ClockRecord, index: number) => (
                                            <div
                                              key={index}
                                              className="border border-blue-200 rounded-lg p-4 bg-blue-50/30"
                                            >
                                              <div className="text-sm font-medium text-blue-800 mb-3">
                                                セッション {index + 1}
                                              </div>

                                              <div className="space-y-3">
                                                {/* 出勤時刻 */}
                                                {record.in_time && (
                                                  <div className="space-y-1">
                                                    <Label className="text-sm font-medium text-gray-700">
                                                      出勤時刻
                                                    </Label>
                                                    <div className="p-2 bg-white rounded border">
                                                      <span className="text-gray-800">
                                                        {new Date(record.in_time).toLocaleString(
                                                          'ja-JP',
                                                          {
                                                            year: 'numeric',
                                                            month: '2-digit',
                                                            day: '2-digit',
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                          }
                                                        )}
                                                      </span>
                                                    </div>
                                                  </div>
                                                )}

                                                {/* 退勤時刻 */}
                                                {record.out_time && (
                                                  <div className="space-y-1">
                                                    <Label className="text-sm font-medium text-gray-700">
                                                      退勤時刻
                                                    </Label>
                                                    <div className="p-2 bg-white rounded border">
                                                      <span className="text-gray-800">
                                                        {new Date(record.out_time).toLocaleString(
                                                          'ja-JP',
                                                          {
                                                            year: 'numeric',
                                                            month: '2-digit',
                                                            day: '2-digit',
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                          }
                                                        )}
                                                      </span>
                                                    </div>
                                                  </div>
                                                )}

                                                {/* 休憩記録 */}
                                                <div className="space-y-2">
                                                  <Label className="text-sm font-medium text-gray-700">
                                                    休憩記録
                                                  </Label>
                                                  {record.breaks &&
                                                  Array.isArray(record.breaks) &&
                                                  record.breaks.length > 0 ? (
                                                    <div className="space-y-2">
                                                      {record.breaks.map(
                                                        (
                                                          breakRecord: ClockBreakRecord,
                                                          breakIndex: number
                                                        ) => (
                                                          <div
                                                            key={breakIndex}
                                                            className="border border-gray-200 rounded p-3 bg-white"
                                                          >
                                                            <div className="grid grid-cols-2 gap-3">
                                                              {breakRecord.break_start && (
                                                                <div className="space-y-1">
                                                                  <Label className="text-xs font-medium text-gray-600">
                                                                    休憩開始
                                                                  </Label>
                                                                  <div className="p-2 bg-gray-50 rounded border">
                                                                    <span className="text-sm text-gray-800">
                                                                      {new Date(
                                                                        breakRecord.break_start
                                                                      ).toLocaleString('ja-JP', {
                                                                        hour: '2-digit',
                                                                        minute: '2-digit',
                                                                      })}
                                                                    </span>
                                                                  </div>
                                                                </div>
                                                              )}
                                                              {breakRecord.break_end && (
                                                                <div className="space-y-1">
                                                                  <Label className="text-xs font-medium text-gray-600">
                                                                    休憩終了
                                                                  </Label>
                                                                  <div className="p-2 bg-gray-50 rounded border">
                                                                    <span className="text-sm text-gray-800">
                                                                      {new Date(
                                                                        breakRecord.break_end
                                                                      ).toLocaleString('ja-JP', {
                                                                        hour: '2-digit',
                                                                        minute: '2-digit',
                                                                      })}
                                                                    </span>
                                                                  </div>
                                                                </div>
                                                              )}
                                                            </div>
                                                          </div>
                                                        )
                                                      )}
                                                    </div>
                                                  ) : (
                                                    <div className="p-2 bg-gray-50 rounded border">
                                                      <span className="text-sm text-gray-600">
                                                        休憩記録なし
                                                      </span>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          )
                                        )}
                                      </div>
                                    )}
                                </div>
                              );
                            }

                            // attendance_correction が文字列の場合の処理
                            if (key === 'attendance_correction' && typeof value === 'string') {
                              try {
                                const parsedValue = JSON.parse(value);
                                console.log('attendance_correction 文字列解析結果:', parsedValue);

                                if (typeof parsedValue === 'object' && parsedValue !== null) {
                                  const correctionData = parsedValue as {
                                    work_date?: string;
                                    clock_records?: ClockRecord[];
                                  };

                                  return (
                                    <div key={key} className="space-y-4">
                                      {/* セクションタイトル */}
                                      <div className="border-b border-gray-200 pb-2">
                                        <h4 className="text-blue-600 font-medium">打刻修正</h4>
                                      </div>

                                      {/* 勤務日 */}
                                      {correctionData.work_date && (
                                        <div className="space-y-2">
                                          <Label className="text-sm font-medium text-gray-700">
                                            勤務日
                                          </Label>
                                          <div className="p-3 bg-gray-50 rounded-md border">
                                            <span className="text-gray-800">
                                              {new Date(
                                                correctionData.work_date
                                              ).toLocaleDateString('ja-JP', {
                                                year: 'numeric',
                                                month: '2-digit',
                                                day: '2-digit',
                                              })}
                                            </span>
                                          </div>
                                        </div>
                                      )}

                                      {/* 勤務セッション */}
                                      {correctionData.clock_records &&
                                        Array.isArray(correctionData.clock_records) && (
                                          <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                              <Label className="text-sm font-medium text-gray-700">
                                                勤務セッション
                                              </Label>
                                            </div>

                                            {correctionData.clock_records.map(
                                              (record: ClockRecord, index: number) => (
                                                <div
                                                  key={index}
                                                  className="border border-blue-200 rounded-lg p-4 bg-blue-50/30"
                                                >
                                                  <div className="text-sm font-medium text-blue-800 mb-3">
                                                    セッション {index + 1}
                                                  </div>

                                                  <div className="space-y-3">
                                                    {/* 出勤時刻 */}
                                                    {record.in_time && (
                                                      <div className="space-y-1">
                                                        <Label className="text-sm font-medium text-gray-700">
                                                          出勤時刻
                                                        </Label>
                                                        <div className="p-2 bg-white rounded border">
                                                          <span className="text-gray-800">
                                                            {new Date(
                                                              record.in_time
                                                            ).toLocaleString('ja-JP', {
                                                              year: 'numeric',
                                                              month: '2-digit',
                                                              day: '2-digit',
                                                              hour: '2-digit',
                                                              minute: '2-digit',
                                                            })}
                                                          </span>
                                                        </div>
                                                      </div>
                                                    )}

                                                    {/* 退勤時刻 */}
                                                    {record.out_time && (
                                                      <div className="space-y-1">
                                                        <Label className="text-sm font-medium text-gray-700">
                                                          退勤時刻
                                                        </Label>
                                                        <div className="p-2 bg-white rounded border">
                                                          <span className="text-gray-800">
                                                            {new Date(
                                                              record.out_time
                                                            ).toLocaleString('ja-JP', {
                                                              year: 'numeric',
                                                              month: '2-digit',
                                                              day: '2-digit',
                                                              hour: '2-digit',
                                                              minute: '2-digit',
                                                            })}
                                                          </span>
                                                        </div>
                                                      </div>
                                                    )}

                                                    {/* 休憩記録 */}
                                                    {record.breaks &&
                                                      Array.isArray(record.breaks) &&
                                                      record.breaks.length > 0 && (
                                                        <div className="space-y-2">
                                                          <Label className="text-sm font-medium text-gray-700">
                                                            休憩記録
                                                          </Label>
                                                          <div className="space-y-2">
                                                            {record.breaks.map(
                                                              (
                                                                breakRecord: ClockBreakRecord,
                                                                breakIndex: number
                                                              ) => (
                                                                <div
                                                                  key={breakIndex}
                                                                  className="border border-gray-200 rounded p-3 bg-white"
                                                                >
                                                                  <div className="grid grid-cols-2 gap-3">
                                                                    {breakRecord.break_start && (
                                                                      <div className="space-y-1">
                                                                        <Label className="text-xs font-medium text-gray-600">
                                                                          休憩開始
                                                                        </Label>
                                                                        <div className="p-2 bg-gray-50 rounded border">
                                                                          <span className="text-sm text-gray-800">
                                                                            {new Date(
                                                                              breakRecord.break_start
                                                                            ).toLocaleString(
                                                                              'ja-JP',
                                                                              {
                                                                                hour: '2-digit',
                                                                                minute: '2-digit',
                                                                              }
                                                                            )}
                                                                          </span>
                                                                        </div>
                                                                      </div>
                                                                    )}
                                                                    {breakRecord.break_end && (
                                                                      <div className="space-y-1">
                                                                        <Label className="text-xs font-medium text-gray-600">
                                                                          休憩終了
                                                                        </Label>
                                                                        <div className="p-2 bg-gray-50 rounded border">
                                                                          <span className="text-sm text-gray-800">
                                                                            {new Date(
                                                                              breakRecord.break_end
                                                                            ).toLocaleString(
                                                                              'ja-JP',
                                                                              {
                                                                                hour: '2-digit',
                                                                                minute: '2-digit',
                                                                              }
                                                                            )}
                                                                          </span>
                                                                        </div>
                                                                      </div>
                                                                    )}
                                                                  </div>
                                                                </div>
                                                              )
                                                            )}
                                                          </div>
                                                        </div>
                                                      )}
                                                  </div>
                                                </div>
                                              )
                                            )}
                                          </div>
                                        )}
                                    </div>
                                  );
                                }
                              } catch (error) {
                                console.error('attendance_correction 文字列解析エラー:', error);
                              }
                            }

                            // work_date フィールドの特別処理（attendance_correction とは別）
                            if (key === 'work_date' && typeof value === 'string') {
                              return (
                                <div key={key} className="space-y-2">
                                  <Label className="text-sm font-medium text-gray-700">
                                    勤務日
                                  </Label>
                                  <div className="p-3 bg-gray-50 rounded-md border">
                                    <span className="text-gray-800">
                                      {new Date(value).toLocaleDateString('ja-JP', {
                                        year: 'numeric',
                                        month: '2-digit',
                                        day: '2-digit',
                                      })}
                                    </span>
                                  </div>
                                </div>
                              );
                            }

                            // clock_records フィールドの特別処理（attendance_correction とは別）
                            if (
                              key === 'clock_records' &&
                              Array.isArray(value) &&
                              value.length > 0
                            ) {
                              try {
                                const clockRecords = value as unknown as ClockRecord[];
                                return (
                                  <div key={key} className="space-y-3">
                                    <Label className="text-sm font-medium text-gray-700">
                                      勤務セッション
                                    </Label>
                                    <div className="space-y-2">
                                      {clockRecords.map((record: ClockRecord, index: number) => (
                                        <div
                                          key={index}
                                          className="border border-blue-200 rounded-lg p-4 bg-blue-50/30"
                                        >
                                          <div className="text-sm font-medium text-blue-800 mb-3">
                                            セッション {index + 1}
                                          </div>
                                          <div className="space-y-3">
                                            {/* 出勤時刻 */}
                                            {record.in_time && (
                                              <div className="space-y-1">
                                                <Label className="text-sm font-medium text-gray-700">
                                                  出勤時刻
                                                </Label>
                                                <div className="p-2 bg-white rounded border">
                                                  <span className="text-gray-800">
                                                    {new Date(record.in_time).toLocaleString(
                                                      'ja-JP',
                                                      {
                                                        year: 'numeric',
                                                        month: '2-digit',
                                                        day: '2-digit',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                      }
                                                    )}
                                                  </span>
                                                </div>
                                              </div>
                                            )}
                                            {/* 退勤時刻 */}
                                            {record.out_time && (
                                              <div className="space-y-1">
                                                <Label className="text-sm font-medium text-gray-700">
                                                  退勤時刻
                                                </Label>
                                                <div className="p-2 bg-white rounded border">
                                                  <span className="text-gray-800">
                                                    {new Date(record.out_time).toLocaleString(
                                                      'ja-JP',
                                                      {
                                                        year: 'numeric',
                                                        month: '2-digit',
                                                        day: '2-digit',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                      }
                                                    )}
                                                  </span>
                                                </div>
                                              </div>
                                            )}
                                            {/* 休憩記録 */}
                                            {record.breaks &&
                                              Array.isArray(record.breaks) &&
                                              record.breaks.length > 0 && (
                                                <div className="space-y-2">
                                                  <Label className="text-sm font-medium text-gray-700">
                                                    休憩記録
                                                  </Label>
                                                  <div className="space-y-2">
                                                    {record.breaks.map(
                                                      (
                                                        breakRecord: ClockBreakRecord,
                                                        breakIndex: number
                                                      ) => (
                                                        <div
                                                          key={breakIndex}
                                                          className="border border-gray-200 rounded p-3 bg-white"
                                                        >
                                                          <div className="grid grid-cols-2 gap-3">
                                                            {breakRecord.break_start && (
                                                              <div className="space-y-1">
                                                                <Label className="text-xs font-medium text-gray-600">
                                                                  休憩開始
                                                                </Label>
                                                                <div className="p-2 bg-gray-50 rounded border">
                                                                  <span className="text-sm text-gray-800">
                                                                    {new Date(
                                                                      breakRecord.break_start
                                                                    ).toLocaleString('ja-JP', {
                                                                      hour: '2-digit',
                                                                      minute: '2-digit',
                                                                    })}
                                                                  </span>
                                                                </div>
                                                              </div>
                                                            )}
                                                            {breakRecord.break_end && (
                                                              <div className="space-y-1">
                                                                <Label className="text-xs font-medium text-gray-600">
                                                                  休憩終了
                                                                </Label>
                                                                <div className="p-2 bg-gray-50 rounded border">
                                                                  <span className="text-sm text-gray-800">
                                                                    {new Date(
                                                                      breakRecord.break_end
                                                                    ).toLocaleString('ja-JP', {
                                                                      hour: '2-digit',
                                                                      minute: '2-digit',
                                                                    })}
                                                                  </span>
                                                                </div>
                                                              </div>
                                                            )}
                                                          </div>
                                                        </div>
                                                      )
                                                    )}
                                                  </div>
                                                </div>
                                              )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              } catch (error) {
                                console.error('clock_records の処理エラー:', error);
                                return (
                                  <div
                                    key={key}
                                    className="p-2 bg-red-50 rounded border border-red-200"
                                  >
                                    <span className="text-red-600">データの表示に失敗しました</span>
                                  </div>
                                );
                              }
                            }

                            return (
                              <div
                                key={key}
                                className="flex justify-between items-start p-2 bg-gray-50 rounded border"
                              >
                                <span className="font-medium text-gray-700 min-w-0 flex-1">
                                  {fieldLabel}
                                </span>
                                <span className="text-gray-600 ml-4 text-right break-words">
                                  {value ? String(value) : '-'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  {selectedRequest.submission_comment && (
                    <div className="col-span-2">
                      <Label className="font-medium">コメント</Label>
                      <div className="text-gray-700 mt-1">{selectedRequest.submission_comment}</div>
                    </div>
                  )}
                  {/* 勤怠比較セクション（打刻修正系のみ表示） */}
                  {(() => {
                    const formData = (selectedRequest.form_data || {}) as Record<
                      string,
                      unknown
                    > & {
                      attendance_correction?: unknown;
                      clock_records?: unknown;
                      work_date?: unknown;
                    };
                    const isAttendanceCorrection =
                      selectedRequest.request_forms?.category === 'attendance_correction' ||
                      typeof formData.attendance_correction !== 'undefined' ||
                      typeof formData.clock_records !== 'undefined';

                    if (!isAttendanceCorrection) return null;

                    const proposedRecords: any[] = Array.isArray(formData.attendance_correction)
                      ? (formData.attendance_correction as any[])
                      : Array.isArray(formData.clock_records)
                        ? (formData.clock_records as any[])
                        : [];

                    return (
                      <div className="col-span-2 border rounded-lg p-4 bg-blue-50/30 mt-2">
                        <h4 className="font-medium text-gray-800 mb-3">勤務セッション</h4>
                        {(() => {
                          const currentSessions = (currentAttendance?.clock_records || []) as any[];
                          const proposedSessions = (proposedRecords || []) as any[];
                          const maxSessions = Math.max(
                            currentSessions.length,
                            proposedSessions.length,
                            1
                          );

                          if (isLoadingAttendance)
                            return <div className="text-gray-500">読み込み中...</div>;

                          return (
                            <div className="space-y-6">
                              {Array.from({ length: maxSessions }).map((_, i) => {
                                const cur = currentSessions[i];
                                const prop = proposedSessions[i];
                                return (
                                  <div key={i} className="border rounded-md">
                                    <div className="px-4 py-2 border-b text-sm text-gray-700">
                                      セッション {i + 1}
                                    </div>
                                    <div className="p-4 grid grid-cols-2 gap-4">
                                      <div className="rounded-md p-4">
                                        <div className="font-medium mb-3 text-gray-800">
                                          現在の勤怠
                                        </div>
                                        <div className="grid grid-cols-1 gap-3">
                                          <div>
                                            <Label className="text-xs text-gray-600">
                                              出勤時刻
                                            </Label>
                                            <div className="p-2 bg-white rounded border">
                                              <span className="text-sm text-gray-800">
                                                {cur?.in_time
                                                  ? new Date(cur.in_time).toLocaleString('ja-JP', {
                                                      year: 'numeric',
                                                      month: '2-digit',
                                                      day: '2-digit',
                                                      hour: '2-digit',
                                                      minute: '2-digit',
                                                    })
                                                  : '-'}
                                              </span>
                                            </div>
                                          </div>
                                          <div>
                                            <Label className="text-xs text-gray-600">
                                              退勤時刻
                                            </Label>
                                            <div className="p-2 bg-white rounded border">
                                              <span className="text-sm text-gray-800">
                                                {cur?.out_time
                                                  ? new Date(cur.out_time).toLocaleString('ja-JP', {
                                                      year: 'numeric',
                                                      month: '2-digit',
                                                      day: '2-digit',
                                                      hour: '2-digit',
                                                      minute: '2-digit',
                                                    })
                                                  : '-'}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="mt-4">
                                          <Label className="text-xs text-gray-600">休憩記録</Label>
                                          {Array.isArray(cur?.breaks) && cur.breaks.length > 0 ? (
                                            <div className="mt-2 space-y-2">
                                              {cur.breaks.map((br: any, bidx: number) => (
                                                <div key={bidx} className="grid grid-cols-2 gap-3">
                                                  <div>
                                                    <Label className="text-xs text-gray-600">
                                                      休憩開始
                                                    </Label>
                                                    <div className="p-2 bg-white rounded border">
                                                      <span className="text-sm text-gray-800">
                                                        {br?.break_start
                                                          ? new Date(
                                                              br.break_start
                                                            ).toLocaleTimeString('ja-JP', {
                                                              hour: '2-digit',
                                                              minute: '2-digit',
                                                            })
                                                          : '-'}
                                                      </span>
                                                    </div>
                                                  </div>
                                                  <div>
                                                    <Label className="text-xs text-gray-600">
                                                      休憩終了
                                                    </Label>
                                                    <div className="p-2 bg-white rounded border">
                                                      <span className="text-sm text-gray-800">
                                                        {br?.break_end
                                                          ? new Date(
                                                              br.break_end
                                                            ).toLocaleTimeString('ja-JP', {
                                                              hour: '2-digit',
                                                              minute: '2-digit',
                                                            })
                                                          : '-'}
                                                      </span>
                                                    </div>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <div className="mt-2 text-sm text-gray-600">
                                              休憩記録なし
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      <div className="rounded-md p-4">
                                        <div className="font-medium mb-3 text-gray-800">
                                          申請の内容
                                        </div>
                                        <div className="grid grid-cols-1 gap-3">
                                          <div>
                                            <Label className="text-xs text-gray-600">
                                              出勤時刻
                                            </Label>
                                            <div className="p-2 bg-white rounded border">
                                              <span className="text-sm text-gray-800">
                                                {prop?.in_time
                                                  ? new Date(prop.in_time).toLocaleString('ja-JP', {
                                                      year: 'numeric',
                                                      month: '2-digit',
                                                      day: '2-digit',
                                                      hour: '2-digit',
                                                      minute: '2-digit',
                                                    })
                                                  : '-'}
                                              </span>
                                            </div>
                                          </div>
                                          <div>
                                            <Label className="text-xs text-gray-600">
                                              退勤時刻
                                            </Label>
                                            <div className="p-2 bg-white rounded border">
                                              <span className="text-sm text-gray-800">
                                                {prop?.out_time
                                                  ? new Date(prop.out_time).toLocaleString(
                                                      'ja-JP',
                                                      {
                                                        year: 'numeric',
                                                        month: '2-digit',
                                                        day: '2-digit',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                      }
                                                    )
                                                  : '-'}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="mt-4">
                                          <Label className="text-xs text-gray-600">休憩記録</Label>
                                          {Array.isArray(prop?.breaks) && prop.breaks.length > 0 ? (
                                            <div className="mt-2 space-y-2">
                                              {prop.breaks.map((br: any, bidx: number) => (
                                                <div key={bidx} className="grid grid-cols-2 gap-3">
                                                  <div>
                                                    <Label className="text-xs text-gray-600">
                                                      休憩開始
                                                    </Label>
                                                    <div className="p-2 bg-white rounded border">
                                                      <span className="text-sm text-gray-800">
                                                        {br?.break_start
                                                          ? new Date(
                                                              br.break_start
                                                            ).toLocaleTimeString('ja-JP', {
                                                              hour: '2-digit',
                                                              minute: '2-digit',
                                                            })
                                                          : '-'}
                                                      </span>
                                                    </div>
                                                  </div>
                                                  <div>
                                                    <Label className="text-xs text-gray-600">
                                                      休憩終了
                                                    </Label>
                                                    <div className="p-2 bg-white rounded border">
                                                      <span className="text-sm text-gray-800">
                                                        {br?.break_end
                                                          ? new Date(
                                                              br.break_end
                                                            ).toLocaleTimeString('ja-JP', {
                                                              hour: '2-digit',
                                                              minute: '2-digit',
                                                            })
                                                          : '-'}
                                                      </span>
                                                    </div>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <div className="mt-2 text-sm text-gray-600">
                                              休憩記録なし
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                        {!isLoadingAttendance &&
                          !currentAttendance?.clock_records?.length &&
                          !proposedRecords?.length && (
                            <div className="text-gray-500">比較できる勤怠データがありません</div>
                          )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>申請の処理</DialogTitle>
            <DialogDescription>この申請を却下または取り下げします。</DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="border-2 border-red-200 rounded-lg p-4 bg-red-50/30">
                <h4 className="font-medium text-red-800 mb-3">申請詳細</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="font-medium">申請者</Label>
                    <p className="text-gray-700">{selectedRequest?.user_id || '-'}</p>
                  </div>
                  <div>
                    <Label className="font-medium">申請種別</Label>
                    <p className="text-gray-700">{selectedRequest?.request_forms?.name || '-'}</p>
                  </div>
                  <div>
                    <Label className="font-medium">申請日</Label>
                    <p className="text-gray-700">{formatDate(selectedRequest.created_at)}</p>
                  </div>
                  {/* 対象日は非表示に変更 */}
                  {selectedRequest.form_data &&
                    Object.keys(selectedRequest.form_data).length > 0 && (
                      <div className="col-span-2">
                        <Label className="font-medium">申請内容</Label>
                        <div className="mt-1 space-y-2">
                          {Object.entries(selectedRequest.form_data).map(([key, value]) => {
                            // フォーム設定からフィールドのラベルを取得
                            const formConfig = selectedRequest?.form?.form_config;
                            const fieldConfig = formConfig?.find(
                              (field: { name: string; label?: string }) => field.name === key
                            );
                            const fieldLabel = fieldConfig?.label || key;

                            return (
                              <div
                                key={key}
                                className="flex justify-between items-start p-2 bg-gray-50 rounded border"
                              >
                                <span className="font-medium text-gray-700 min-w-0 flex-1">
                                  {fieldLabel}
                                </span>
                                <span className="text-gray-600 ml-4 text-right break-words">
                                  {value ? String(value) : '-'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  {selectedRequest.submission_comment && (
                    <div className="col-span-2">
                      <Label className="font-medium">コメント</Label>
                      <p className="text-gray-700 mt-1">{selectedRequest.submission_comment}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

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

      {/* 詳細確認ダイアログ */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>申請詳細</DialogTitle>
            <DialogDescription>申請の詳細内容を確認できます。</DialogDescription>
          </DialogHeader>

          {selectedDetailRequest && (
            <div className="space-y-4 py-4">
              <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50/30">
                <h4 className="font-medium text-blue-800 mb-3">申請詳細</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="font-medium">申請者</Label>
                    <p className="text-gray-700">
                      {(() => {
                        console.log('申請者デバッグ:', {
                          user_id: selectedDetailRequest?.user_id,
                          users_count: users.length,
                          users: users.map((u) => ({
                            id: u.id,
                            name: `${u.family_name} ${u.first_name}`,
                          })),
                        });
                        const applicantUser = users.find(
                          (u) => u.id === selectedDetailRequest?.user_id
                        );
                        console.log('申請者検索結果:', applicantUser);
                        if (applicantUser) {
                          const fullName =
                            `${applicantUser.family_name || ''} ${applicantUser.first_name || ''}`.trim();
                          console.log('申請者氏名:', fullName);
                          return fullName || selectedDetailRequest?.user_id || '-';
                        }
                        return selectedDetailRequest?.user_id || '-';
                      })()}
                    </p>
                  </div>
                  <div>
                    <Label className="font-medium">申請種別</Label>
                    <div className="text-gray-700">
                      {selectedDetailRequest?.request_forms?.name || '-'}
                    </div>
                  </div>
                  <div>
                    <Label className="font-medium">申請日</Label>
                    <div className="text-gray-700">
                      {formatDate(selectedDetailRequest.created_at)}
                    </div>
                  </div>
                  {/* 対象日は非表示 */}
                  <div>
                    <Label className="font-medium">ステータス</Label>
                    <div className="text-gray-700">
                      {getStatusBadge(selectedDetailRequest.statuses)}
                    </div>
                  </div>
                  {selectedDetailRequest.form_data &&
                    Object.keys(selectedDetailRequest.form_data).length > 0 && (
                      <div className="col-span-2">
                        <Label className="font-medium">申請内容</Label>
                        <div className="mt-1 space-y-2">
                          {Object.entries(selectedDetailRequest.form_data).map(([key, value]) => {
                            // フォーム設定からフィールドのラベルを取得
                            const formConfig = selectedDetailRequest?.form?.form_config;
                            const fieldConfig = formConfig?.find(
                              (field: { name: string; label?: string }) => field.name === key
                            );
                            const fieldLabel = fieldConfig?.label || key;

                            // デバッグ用ログ
                            console.log('form_data フィールド処理:', {
                              key,
                              value,
                              value_type: typeof value,
                              is_object: typeof value === 'object',
                              is_array: Array.isArray(value),
                            });

                            // attendance_correction オブジェクトの特別処理
                            if (
                              key === 'attendance_correction' &&
                              typeof value === 'object' &&
                              value !== null
                            ) {
                              // デバッグ用ログ
                              console.log('attendance_correction データ:', {
                                key,
                                value,
                                value_type: typeof value,
                                is_array: Array.isArray(value),
                              });

                              // attendance_correction が配列の場合の処理
                              if (Array.isArray(value)) {
                                return (
                                  <div key={key} className="space-y-4">
                                    {/* セクションタイトル */}
                                    <div className="border-b border-gray-200 pb-2">
                                      <h4 className="text-blue-600 font-medium">打刻修正</h4>
                                    </div>

                                    {/* 勤務セッション */}
                                    <div className="space-y-3">
                                      <div className="flex items-center justify-between">
                                        <Label className="text-sm font-medium text-gray-700">
                                          勤務セッション
                                        </Label>
                                      </div>

                                      {(value as unknown as ClockRecord[]).map(
                                        (record: ClockRecord, index: number) => (
                                          <div
                                            key={index}
                                            className="border border-blue-200 rounded-lg p-4 bg-blue-50/30"
                                          >
                                            <div className="text-sm font-medium text-blue-800 mb-3">
                                              セッション {index + 1}
                                            </div>

                                            <div className="space-y-3">
                                              {/* 出勤時刻 */}
                                              {record.in_time && (
                                                <div className="space-y-1">
                                                  <Label className="text-sm font-medium text-gray-700">
                                                    出勤時刻
                                                  </Label>
                                                  <div className="p-2 bg-white rounded border">
                                                    <span className="text-gray-800">
                                                      {new Date(record.in_time).toLocaleString(
                                                        'ja-JP',
                                                        {
                                                          year: 'numeric',
                                                          month: '2-digit',
                                                          day: '2-digit',
                                                          hour: '2-digit',
                                                          minute: '2-digit',
                                                        }
                                                      )}
                                                    </span>
                                                  </div>
                                                </div>
                                              )}

                                              {/* 退勤時刻 */}
                                              {record.out_time && (
                                                <div className="space-y-1">
                                                  <Label className="text-sm font-medium text-gray-700">
                                                    退勤時刻
                                                  </Label>
                                                  <div className="p-2 bg-white rounded border">
                                                    <span className="text-gray-800">
                                                      {new Date(record.out_time).toLocaleString(
                                                        'ja-JP',
                                                        {
                                                          year: 'numeric',
                                                          month: '2-digit',
                                                          day: '2-digit',
                                                          hour: '2-digit',
                                                          minute: '2-digit',
                                                        }
                                                      )}
                                                    </span>
                                                  </div>
                                                </div>
                                              )}

                                              {/* 休憩記録 */}
                                              <div className="space-y-2">
                                                <Label className="text-sm font-medium text-gray-700">
                                                  休憩記録
                                                </Label>
                                                {record.breaks &&
                                                Array.isArray(record.breaks) &&
                                                record.breaks.length > 0 ? (
                                                  <div className="space-y-2">
                                                    {record.breaks.map(
                                                      (
                                                        breakRecord: ClockBreakRecord,
                                                        breakIndex: number
                                                      ) => (
                                                        <div
                                                          key={breakIndex}
                                                          className="border border-gray-200 rounded p-3 bg-white"
                                                        >
                                                          <div className="grid grid-cols-2 gap-3">
                                                            {breakRecord.break_start && (
                                                              <div className="space-y-1">
                                                                <Label className="text-xs font-medium text-gray-600">
                                                                  休憩開始
                                                                </Label>
                                                                <div className="p-2 bg-gray-50 rounded border">
                                                                  <span className="text-sm text-gray-800">
                                                                    {new Date(
                                                                      breakRecord.break_start
                                                                    ).toLocaleString('ja-JP', {
                                                                      hour: '2-digit',
                                                                      minute: '2-digit',
                                                                    })}
                                                                  </span>
                                                                </div>
                                                              </div>
                                                            )}
                                                            {breakRecord.break_end && (
                                                              <div className="space-y-1">
                                                                <Label className="text-xs font-medium text-gray-600">
                                                                  休憩終了
                                                                </Label>
                                                                <div className="p-2 bg-gray-50 rounded border">
                                                                  <span className="text-sm text-gray-800">
                                                                    {new Date(
                                                                      breakRecord.break_end
                                                                    ).toLocaleString('ja-JP', {
                                                                      hour: '2-digit',
                                                                      minute: '2-digit',
                                                                    })}
                                                                  </span>
                                                                </div>
                                                              </div>
                                                            )}
                                                          </div>
                                                        </div>
                                                      )
                                                    )}
                                                  </div>
                                                ) : (
                                                  <div className="p-2 bg-gray-50 rounded border">
                                                    <span className="text-sm text-gray-600">
                                                      休憩記録なし
                                                    </span>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        )
                                      )}
                                    </div>
                                  </div>
                                );
                              }

                              // 従来のオブジェクト形式の処理（後方互換性のため）
                              const correctionData = value as {
                                work_date?: string;
                                clock_records?: ClockRecord[];
                              };

                              return (
                                <div key={key} className="space-y-4">
                                  {/* セクションタイトル */}
                                  <div className="border-b border-gray-200 pb-2">
                                    <h4 className="text-blue-600 font-medium">打刻修正</h4>
                                  </div>

                                  {/* 勤務日 */}
                                  {correctionData.work_date && (
                                    <div className="space-y-2">
                                      <Label className="text-sm font-medium text-gray-700">
                                        勤務日
                                      </Label>
                                      <div className="p-3 bg-gray-50 rounded-md border">
                                        <span className="text-gray-800">
                                          {new Date(correctionData.work_date).toLocaleDateString(
                                            'ja-JP',
                                            {
                                              year: 'numeric',
                                              month: '2-digit',
                                              day: '2-digit',
                                            }
                                          )}
                                        </span>
                                      </div>
                                    </div>
                                  )}

                                  {/* 勤務セッション */}
                                  {correctionData.clock_records &&
                                    Array.isArray(correctionData.clock_records) && (
                                      <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                          <Label className="text-sm font-medium text-gray-700">
                                            勤務セッション
                                          </Label>
                                        </div>

                                        {correctionData.clock_records.map(
                                          (record: ClockRecord, index: number) => (
                                            <div
                                              key={index}
                                              className="border border-blue-200 rounded-lg p-4 bg-blue-50/30"
                                            >
                                              <div className="text-sm font-medium text-blue-800 mb-3">
                                                セッション {index + 1}
                                              </div>

                                              <div className="space-y-3">
                                                {/* 出勤時刻 */}
                                                {record.in_time && (
                                                  <div className="space-y-1">
                                                    <Label className="text-sm font-medium text-gray-700">
                                                      出勤時刻
                                                    </Label>
                                                    <div className="p-2 bg-white rounded border">
                                                      <span className="text-gray-800">
                                                        {new Date(record.in_time).toLocaleString(
                                                          'ja-JP',
                                                          {
                                                            year: 'numeric',
                                                            month: '2-digit',
                                                            day: '2-digit',
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                          }
                                                        )}
                                                      </span>
                                                    </div>
                                                  </div>
                                                )}

                                                {/* 退勤時刻 */}
                                                {record.out_time && (
                                                  <div className="space-y-1">
                                                    <Label className="text-sm font-medium text-gray-700">
                                                      退勤時刻
                                                    </Label>
                                                    <div className="p-2 bg-white rounded border">
                                                      <span className="text-gray-800">
                                                        {new Date(record.out_time).toLocaleString(
                                                          'ja-JP',
                                                          {
                                                            year: 'numeric',
                                                            month: '2-digit',
                                                            day: '2-digit',
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                          }
                                                        )}
                                                      </span>
                                                    </div>
                                                  </div>
                                                )}

                                                {/* 休憩記録 */}
                                                <div className="space-y-2">
                                                  <Label className="text-sm font-medium text-gray-700">
                                                    休憩記録
                                                  </Label>
                                                  {record.breaks &&
                                                  Array.isArray(record.breaks) &&
                                                  record.breaks.length > 0 ? (
                                                    <div className="space-y-2">
                                                      {record.breaks.map(
                                                        (
                                                          breakRecord: ClockBreakRecord,
                                                          breakIndex: number
                                                        ) => (
                                                          <div
                                                            key={breakIndex}
                                                            className="border border-gray-200 rounded p-3 bg-white"
                                                          >
                                                            <div className="grid grid-cols-2 gap-3">
                                                              {breakRecord.break_start && (
                                                                <div className="space-y-1">
                                                                  <Label className="text-xs font-medium text-gray-600">
                                                                    休憩開始
                                                                  </Label>
                                                                  <div className="p-2 bg-gray-50 rounded border">
                                                                    <span className="text-sm text-gray-800">
                                                                      {new Date(
                                                                        breakRecord.break_start
                                                                      ).toLocaleString('ja-JP', {
                                                                        hour: '2-digit',
                                                                        minute: '2-digit',
                                                                      })}
                                                                    </span>
                                                                  </div>
                                                                </div>
                                                              )}
                                                              {breakRecord.break_end && (
                                                                <div className="space-y-1">
                                                                  <Label className="text-xs font-medium text-gray-600">
                                                                    休憩終了
                                                                  </Label>
                                                                  <div className="p-2 bg-gray-50 rounded border">
                                                                    <span className="text-sm text-gray-800">
                                                                      {new Date(
                                                                        breakRecord.break_end
                                                                      ).toLocaleString('ja-JP', {
                                                                        hour: '2-digit',
                                                                        minute: '2-digit',
                                                                      })}
                                                                    </span>
                                                                  </div>
                                                                </div>
                                                              )}
                                                            </div>
                                                          </div>
                                                        )
                                                      )}
                                                    </div>
                                                  ) : (
                                                    <div className="p-2 bg-gray-50 rounded border">
                                                      <span className="text-sm text-gray-600">
                                                        休憩記録なし
                                                      </span>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          )
                                        )}
                                      </div>
                                    )}
                                </div>
                              );
                            }

                            // attendance_correction が文字列の場合の処理
                            if (key === 'attendance_correction' && typeof value === 'string') {
                              try {
                                const parsedValue = JSON.parse(value);
                                console.log('attendance_correction 文字列解析結果:', parsedValue);

                                if (typeof parsedValue === 'object' && parsedValue !== null) {
                                  const correctionData = parsedValue as {
                                    work_date?: string;
                                    clock_records?: ClockRecord[];
                                  };

                                  return (
                                    <div key={key} className="space-y-4">
                                      {/* セクションタイトル */}
                                      <div className="border-b border-gray-200 pb-2">
                                        <h4 className="text-blue-600 font-medium">打刻修正</h4>
                                      </div>

                                      {/* 勤務日 */}
                                      {correctionData.work_date && (
                                        <div className="space-y-2">
                                          <Label className="text-sm font-medium text-gray-700">
                                            勤務日
                                          </Label>
                                          <div className="p-3 bg-gray-50 rounded-md border">
                                            <span className="text-gray-800">
                                              {new Date(
                                                correctionData.work_date
                                              ).toLocaleDateString('ja-JP', {
                                                year: 'numeric',
                                                month: '2-digit',
                                                day: '2-digit',
                                              })}
                                            </span>
                                          </div>
                                        </div>
                                      )}

                                      {/* 勤務セッション */}
                                      {correctionData.clock_records &&
                                        Array.isArray(correctionData.clock_records) && (
                                          <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                              <Label className="text-sm font-medium text-gray-700">
                                                勤務セッション
                                              </Label>
                                            </div>

                                            {correctionData.clock_records.map(
                                              (record: ClockRecord, index: number) => (
                                                <div
                                                  key={index}
                                                  className="border border-blue-200 rounded-lg p-4 bg-blue-50/30"
                                                >
                                                  <div className="text-sm font-medium text-blue-800 mb-3">
                                                    セッション {index + 1}
                                                  </div>

                                                  <div className="space-y-3">
                                                    {/* 出勤時刻 */}
                                                    {record.in_time && (
                                                      <div className="space-y-1">
                                                        <Label className="text-sm font-medium text-gray-700">
                                                          出勤時刻
                                                        </Label>
                                                        <div className="p-2 bg-white rounded border">
                                                          <span className="text-gray-800">
                                                            {new Date(
                                                              record.in_time
                                                            ).toLocaleString('ja-JP', {
                                                              year: 'numeric',
                                                              month: '2-digit',
                                                              day: '2-digit',
                                                              hour: '2-digit',
                                                              minute: '2-digit',
                                                            })}
                                                          </span>
                                                        </div>
                                                      </div>
                                                    )}

                                                    {/* 退勤時刻 */}
                                                    {record.out_time && (
                                                      <div className="space-y-1">
                                                        <Label className="text-sm font-medium text-gray-700">
                                                          退勤時刻
                                                        </Label>
                                                        <div className="p-2 bg-white rounded border">
                                                          <span className="text-gray-800">
                                                            {new Date(
                                                              record.out_time
                                                            ).toLocaleString('ja-JP', {
                                                              year: 'numeric',
                                                              month: '2-digit',
                                                              day: '2-digit',
                                                              hour: '2-digit',
                                                              minute: '2-digit',
                                                            })}
                                                          </span>
                                                        </div>
                                                      </div>
                                                    )}

                                                    {/* 休憩記録 */}
                                                    {record.breaks &&
                                                      Array.isArray(record.breaks) &&
                                                      record.breaks.length > 0 && (
                                                        <div className="space-y-2">
                                                          <Label className="text-sm font-medium text-gray-700">
                                                            休憩記録
                                                          </Label>
                                                          <div className="space-y-2">
                                                            {record.breaks.map(
                                                              (
                                                                breakRecord: ClockBreakRecord,
                                                                breakIndex: number
                                                              ) => (
                                                                <div
                                                                  key={breakIndex}
                                                                  className="border border-gray-200 rounded p-3 bg-white"
                                                                >
                                                                  <div className="grid grid-cols-2 gap-3">
                                                                    {breakRecord.break_start && (
                                                                      <div className="space-y-1">
                                                                        <Label className="text-xs font-medium text-gray-600">
                                                                          休憩開始
                                                                        </Label>
                                                                        <div className="p-2 bg-gray-50 rounded border">
                                                                          <span className="text-sm text-gray-800">
                                                                            {new Date(
                                                                              breakRecord.break_start
                                                                            ).toLocaleString(
                                                                              'ja-JP',
                                                                              {
                                                                                hour: '2-digit',
                                                                                minute: '2-digit',
                                                                              }
                                                                            )}
                                                                          </span>
                                                                        </div>
                                                                      </div>
                                                                    )}
                                                                    {breakRecord.break_end && (
                                                                      <div className="space-y-1">
                                                                        <Label className="text-xs font-medium text-gray-600">
                                                                          休憩終了
                                                                        </Label>
                                                                        <div className="p-2 bg-gray-50 rounded border">
                                                                          <span className="text-sm text-gray-800">
                                                                            {new Date(
                                                                              breakRecord.break_end
                                                                            ).toLocaleString(
                                                                              'ja-JP',
                                                                              {
                                                                                hour: '2-digit',
                                                                                minute: '2-digit',
                                                                              }
                                                                            )}
                                                                          </span>
                                                                        </div>
                                                                      </div>
                                                                    )}
                                                                  </div>
                                                                </div>
                                                              )
                                                            )}
                                                          </div>
                                                        </div>
                                                      )}
                                                  </div>
                                                </div>
                                              )
                                            )}
                                          </div>
                                        )}
                                    </div>
                                  );
                                }
                              } catch (error) {
                                console.error('attendance_correction 文字列解析エラー:', error);
                              }
                            }

                            // work_date フィールドの特別処理（attendance_correction とは別）
                            if (key === 'work_date' && typeof value === 'string') {
                              return (
                                <div key={key} className="space-y-2">
                                  <Label className="text-sm font-medium text-gray-700">
                                    勤務日
                                  </Label>
                                  <div className="p-3 bg-gray-50 rounded-md border">
                                    <span className="text-gray-800">
                                      {new Date(value).toLocaleDateString('ja-JP', {
                                        year: 'numeric',
                                        month: '2-digit',
                                        day: '2-digit',
                                      })}
                                    </span>
                                  </div>
                                </div>
                              );
                            }

                            // clock_records フィールドの特別処理（attendance_correction とは別）
                            if (
                              key === 'clock_records' &&
                              Array.isArray(value) &&
                              value.length > 0
                            ) {
                              try {
                                const clockRecords = value as unknown as ClockRecord[];
                                return (
                                  <div key={key} className="space-y-3">
                                    <Label className="text-sm font-medium text-gray-700">
                                      勤務セッション
                                    </Label>
                                    <div className="space-y-2">
                                      {clockRecords.map((record: ClockRecord, index: number) => (
                                        <div
                                          key={index}
                                          className="border border-blue-200 rounded-lg p-4 bg-blue-50/30"
                                        >
                                          <div className="text-sm font-medium text-blue-800 mb-3">
                                            セッション {index + 1}
                                          </div>
                                          <div className="space-y-3">
                                            {/* 出勤時刻 */}
                                            {record.in_time && (
                                              <div className="space-y-1">
                                                <Label className="text-sm font-medium text-gray-700">
                                                  出勤時刻
                                                </Label>
                                                <div className="p-2 bg-white rounded border">
                                                  <span className="text-gray-800">
                                                    {new Date(record.in_time).toLocaleString(
                                                      'ja-JP',
                                                      {
                                                        year: 'numeric',
                                                        month: '2-digit',
                                                        day: '2-digit',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                      }
                                                    )}
                                                  </span>
                                                </div>
                                              </div>
                                            )}
                                            {/* 退勤時刻 */}
                                            {record.out_time && (
                                              <div className="space-y-1">
                                                <Label className="text-sm font-medium text-gray-700">
                                                  退勤時刻
                                                </Label>
                                                <div className="p-2 bg-white rounded border">
                                                  <span className="text-gray-800">
                                                    {new Date(record.out_time).toLocaleString(
                                                      'ja-JP',
                                                      {
                                                        year: 'numeric',
                                                        month: '2-digit',
                                                        day: '2-digit',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                      }
                                                    )}
                                                  </span>
                                                </div>
                                              </div>
                                            )}
                                            {/* 休憩記録 */}
                                            {record.breaks &&
                                              Array.isArray(record.breaks) &&
                                              record.breaks.length > 0 && (
                                                <div className="space-y-2">
                                                  <Label className="text-sm font-medium text-gray-700">
                                                    休憩記録
                                                  </Label>
                                                  <div className="space-y-2">
                                                    {record.breaks.map(
                                                      (
                                                        breakRecord: ClockBreakRecord,
                                                        breakIndex: number
                                                      ) => (
                                                        <div
                                                          key={breakIndex}
                                                          className="border border-gray-200 rounded p-3 bg-white"
                                                        >
                                                          <div className="grid grid-cols-2 gap-3">
                                                            {breakRecord.break_start && (
                                                              <div className="space-y-1">
                                                                <Label className="text-xs font-medium text-gray-600">
                                                                  休憩開始
                                                                </Label>
                                                                <div className="p-2 bg-gray-50 rounded border">
                                                                  <span className="text-sm text-gray-800">
                                                                    {new Date(
                                                                      breakRecord.break_start
                                                                    ).toLocaleString('ja-JP', {
                                                                      hour: '2-digit',
                                                                      minute: '2-digit',
                                                                    })}
                                                                  </span>
                                                                </div>
                                                              </div>
                                                            )}
                                                            {breakRecord.break_end && (
                                                              <div className="space-y-1">
                                                                <Label className="text-xs font-medium text-gray-600">
                                                                  休憩終了
                                                                </Label>
                                                                <div className="p-2 bg-gray-50 rounded border">
                                                                  <span className="text-sm text-gray-800">
                                                                    {new Date(
                                                                      breakRecord.break_end
                                                                    ).toLocaleString('ja-JP', {
                                                                      hour: '2-digit',
                                                                      minute: '2-digit',
                                                                    })}
                                                                  </span>
                                                                </div>
                                                              </div>
                                                            )}
                                                          </div>
                                                        </div>
                                                      )
                                                    )}
                                                  </div>
                                                </div>
                                              )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              } catch (error) {
                                console.error('clock_records の処理エラー:', error);
                                return (
                                  <div
                                    key={key}
                                    className="p-2 bg-red-50 rounded border border-red-200"
                                  >
                                    <span className="text-red-600">データの表示に失敗しました</span>
                                  </div>
                                );
                              }
                            }

                            return (
                              <div
                                key={key}
                                className="flex justify-between items-start p-2 bg-gray-50 rounded border"
                              >
                                <span className="font-medium text-gray-700 min-w-0 flex-1">
                                  {fieldLabel}
                                </span>
                                <span className="text-gray-600 ml-4 text-right break-words">
                                  {value ? String(value) : '-'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  {selectedDetailRequest.submission_comment && (
                    <div className="col-span-2">
                      <Label className="font-medium">コメント</Label>
                      <div className="text-gray-700 mt-1">
                        {selectedDetailRequest.submission_comment}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
              閉じる
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
