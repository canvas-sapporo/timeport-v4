'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Check, X, Eye, FormInput, Plus, Edit, Trash2, Loader2 } from 'lucide-react';

import { useAuth } from '@/contexts/auth-context';
import { useData } from '@/contexts/data-context';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getRequestForms } from '@/lib/actions/admin/request-forms';
import type { RequestForm } from '@/types/request';
import RequestFormEditDialog from '@/components/admin/request-forms/RequestFormEditDialog';
import RequestFormCreateDialog from '@/components/admin/request-forms/RequestFormCreateDialog';
import RequestFormPreviewDialog from '@/components/admin/request-forms/RequestFormPreviewDialog';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { deleteRequestForm } from '@/lib/actions/admin/request-forms';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

export default function AdminRequestsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { requests, users, updateRequest } = useData();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
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
  const fetchRequestForms = async () => {
    setIsRequestFormsLoading(true);
    try {
      const result = await getRequestForms();
      if (result.success && result.data) {
        setRequestForms(result.data);
      } else {
        console.error('申請フォーム取得失敗:', result.error);
      }
    } catch (error) {
      console.error('申請フォームデータ取得エラー:', error);
    } finally {
      setIsRequestFormsLoading(false);
    }
  };

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/login');
      return;
    }
  }, [user, router]);

  // 申請フォームタブがアクティブになったときにデータを取得
  useEffect(() => {
    if (activeTab === 'forms') {
      fetchRequestForms();
    }
  }, [activeTab]);

  if (!user || user.role !== 'admin') {
    return null;
  }

  const handleApprove = (requestId: string) => {
    updateRequest(requestId, {
      status_id: 'approved',
      // approved_by, approved_atはRequest型に含まれていない場合は省略
    });
  };

  const handleReject = (requestId: string) => {
    updateRequest(requestId, {
      status_id: 'rejected',
      rejection_reason: rejectionReason || '管理者により却下されました',
    });
    setRejectionReason('');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">承認待ち</Badge>;
      case 'approved':
        return <Badge variant="default">承認済み</Badge>;
      case 'rejected':
        return <Badge variant="destructive">却下</Badge>;
      default:
        return <Badge variant="outline">-</Badge>;
    }
  };

  const formatDate = (date?: string) =>
    typeof date === 'string' ? new Date(date).toLocaleDateString('ja-JP') : '-';

  // 申請フォーム統計情報を計算
  const getRequestFormStats = () => {
    const total = requestForms.length;
    const active = requestForms.filter((form) => form.is_active).length;
    const inactive = total - active;
    return { total, active, inactive };
  };

  const pendingRequests = requests.filter((a) => a.status_id === 'pending');
  // 「自分が承認者の申請」だけ抽出
  const myApprovalRequests = requests
    .map((req) => {
      const form = requestForms.find((f) => f.id === req.request_form_id);
      if (!form) return null;
      const step = form.approval_flow.find((s) => s.step === req.current_approval_step);
      if (!step) return null;
      return { ...req, approver_id: step.approver_id, form };
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
          {/* 自分が承認者の申請一覧 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="w-5 h-5" />
                <span>自分が承認者の申請</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
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
                  {myApprovalRequests.map((request) => {
                    if (!request) return null;
                    const requestant = users.find((u) => u.id === request.user_id);
                    return (
                      <TableRow key={request.id}>
                        <TableCell>
                          {requestant ? `${requestant.family_name} ${requestant.first_name}` : '-'}
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
                        <TableCell>
                          <Select
                            value={request.status_id ?? 'pending'}
                            onValueChange={(value) => {
                              updateRequest(request.id, { status_id: value });
                            }}
                          >
                            <SelectTrigger className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">未承認</SelectItem>
                              <SelectItem value="approved">承認</SelectItem>
                              <SelectItem value="rejected">却下</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
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
                      <TableHead>更新日</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requestForms.map((form) => (
                      <TableRow key={form.id}>
                        <TableCell className="font-medium">{form.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{form.code}</Badge>
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
          onOpenChange={setEditFormDialogOpen}
          requestForm={selectedForm}
          onSuccess={() => {
            setEditFormDialogOpen(false);
            setSelectedForm(null);
            fetchRequestForms(); // データを再取得
          }}
        />
      )}

      {/* 申請フォーム新規作成ダイアログ */}
      <RequestFormCreateDialog
        open={createFormDialogOpen}
        onOpenChange={setCreateFormDialogOpen}
        onSuccess={() => {
          setCreateFormDialogOpen(false);
          fetchRequestForms(); // データを再取得
        }}
      />

      {/* 申請フォームプレビューダイアログ */}
      <RequestFormPreviewDialog
        open={previewFormDialogOpen}
        onOpenChange={setPreviewFormDialogOpen}
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
                      setDeleteDialogOpen(false);
                      setDeleteTargetForm(null);
                      fetchRequestForms();
                    } else {
                      console.error('削除失敗:', result.error);
                      alert(`削除に失敗しました: ${result.error}`);
                    }
                  } catch (error) {
                    console.error('削除処理エラー:', error);
                    alert(`削除処理でエラーが発生しました: ${error}`);
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
