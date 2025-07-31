'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Eye, FormInput, Plus, Edit, Trash2, Loader2 } from 'lucide-react';

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
import { getAdminRequests } from '@/lib/actions/requests';
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

export default function AdminRequestsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { users, updateRequest } = useData();
  const { toast } = useToast();
  const [requests, setRequests] = useState<unknown[]>([]);
  const [isRequestsLoading, setIsRequestsLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [activeTab, setActiveTab] = useState('requests');

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

  function handleApprove(requestId: string) {
    updateRequest(requestId, {
      status_id: 'approved',
      // approved_by, approved_atはRequest型に含まれていない場合は省略
    });
  }

  function handleReject(requestId: string) {
    updateRequest(requestId, {
      status_id: 'rejected',
      rejection_reason: rejectionReason || '管理者により却下されました',
    });
    setRejectionReason('');
  }

  function getStatusBadge(status: { name?: string; code?: string } | null | undefined) {
    if (!status) return <Badge variant="outline">-</Badge>;
    // statusesオブジェクトから情報を取得
    const statusName = status.name || '不明';
    // const statusColor = status.color || '#6B7280';
    let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'outline';
    if (status.code === 'pending') variant = 'secondary';
    else if (status.code === 'approved') variant = 'default';
    else if (status.code === 'rejected') variant = 'destructive';
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

          {/* デバッグ情報 */}
          <div className="bg-gray-100 p-4 rounded text-sm">
            <p>デバッグ情報:</p>
            <p>申請データ数: {requests.length}</p>
            <p>ユーザーデータ数: {users.length}</p>
            <p>申請フォーム数: {requestForms.length}</p>
            <p>フィルタリング後: {myApprovalRequests.length}</p>
            <p>ローディング中: {isRequestsLoading ? 'はい' : 'いいえ'}</p>
            <p>不足している申請フォームID: {missingRequestFormIds.join(', ') || 'なし'}</p>

            {requestForms.length === 0 && (
              <div className="mt-4 p-4 bg-yellow-100 rounded">
                <p className="font-bold text-yellow-800">申請フォームが存在しません</p>
                <p className="text-yellow-700">
                  申請フォームを作成してから申請データを確認してください。
                </p>
                <Button
                  onClick={() => setCreateFormDialogOpen(true)}
                  className="mt-2 bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  申請フォームを作成
                </Button>
              </div>
            )}

            {missingRequestFormIds.length > 0 && (
              <div className="mt-4 p-4 bg-red-100 rounded">
                <p className="font-bold text-red-800">不足している申請フォームがあります</p>
                <p className="text-red-700">以下のIDの申請フォームが存在しません:</p>
                <ul className="list-disc list-inside mt-2">
                  {missingRequestFormIds.map((id) => (
                    <li key={id} className="text-red-600">
                      {id}
                    </li>
                  ))}
                </ul>
              </div>
            )}
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
                        <TableRow key={`${request.id}-${index}`}>
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
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => handleApprove(request.id)}
                                disabled={request?.status_id === 'approved'}
                              >
                                承認
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleReject(request.id)}
                                disabled={request?.status_id === 'rejected'}
                              >
                                却下
                              </Button>
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>申請名</TableHead>
                      <TableHead>コード</TableHead>
                      <TableHead>説明</TableHead>
                      <TableHead>項目数</TableHead>
                      <TableHead>ステータス</TableHead>
                      <TableHead>編集日</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requestForms.map((form, index) => (
                      <TableRow key={`${form.id}-${index}`}>
                        <TableCell className="font-medium">{form.name}</TableCell>
                        <TableCell>
                          {form.code ? (
                            <Badge variant="outline">{form.code}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{form.description}</TableCell>
                        <TableCell>{form.form_config.length}項目</TableCell>
                        <TableCell>
                          <Badge variant={form.is_active ? 'default' : 'secondary'}>
                            {form.is_active ? '有効' : '無効'}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(form.updated_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
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
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
    </div>
  );
}
