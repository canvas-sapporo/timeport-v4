'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Download, Trash2, MessageSquare, Check, X } from 'lucide-react';

import { useAuth } from '@/contexts/auth-context';
import { useData } from '@/contexts/data-context';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from '@/components/ui/select';
import { RequestDetail, RequestComment, RequestAttachment, ApprovalStep } from '@/schemas/request';
import { supabase } from '@/lib/supabase';

// コメント投稿スキーマ
const commentSchema = z.object({
  content: z.string().min(1, 'コメントを入力してください'),
});

type CommentFormData = z.infer<typeof commentSchema>;

// 承認・却下スキーマ
const approvalSchema = z.object({
  action: z.enum(['approve', 'reject', 'return']),
  comment: z.string().optional(),
});

type ApprovalFormData = z.infer<typeof approvalSchema>;

export default function RequestDetailPage() {
  const { user } = useAuth();
  const { requests, requestForms, updateRequest } = useData();
  const router = useRouter();
  const params = useParams();
  const requestId = params.id as string;

  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [comments, setComments] = useState<RequestComment[]>([]);
  const [attachments, setAttachments] = useState<RequestAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCommentDialogOpen, setIsCommentDialogOpen] = useState(false);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register: registerComment,
    handleSubmit: handleCommentSubmitForm,
    formState: { errors: commentErrors },
    reset: resetComment,
  } = useForm<CommentFormData>({
    resolver: zodResolver(commentSchema),
  });

  const {
    register: registerApproval,
    handleSubmit: handleApprovalSubmitForm,
    formState: { errors: approvalErrors },
    reset: resetApproval,
  } = useForm<ApprovalFormData>({
    resolver: zodResolver(approvalSchema),
  });

  useEffect(() => {
    if (!user || (user.role !== 'member' && user.role !== 'admin')) {
      router.push('/login');
      return;
    }

    loadRequestDetail();
  }, [user, router, requestId]);

  async function loadRequestDetail() {
    if (!user) return;

    try {
      setIsLoading(true);

      // リクエスト情報を取得
      const requestData = requests.find((r) => r.id === requestId);
      if (!requestData) {
        setError('リクエストが見つかりません');
        return;
      }

      // リクエストタイプ情報を取得
      const requestForm = requestForms.find((rf) => rf.id === requestData.request_form_id);
      if (!requestForm) {
        setError('リクエストフォームが見つかりません');
        return;
      }

      // 添付ファイルを取得
      const { data: attachmentData } = await supabase
        .from('request_attachments')
        .select('*')
        .eq('request_id', requestId);

      // コメントを取得
      const { data: commentData } = await supabase
        .from('request_comments')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: true });

      const requestDetail: RequestDetail = {
        ...requestData,
        request_form: {
          id: requestForm.id,
          name: requestForm.name,
          category: requestForm.category,
          form_config: requestForm.form_config,
          approval_flow: requestForm.approval_flow,
        },
        applicant: {
          id: user.id,
          full_name: user.full_name || '',
          employee_code: user.employee_id || '',
          group_name: '',
        },
        status: {
          id: '1',
          name: '承認待ち',
          code: 'pending',
          color: '#f59e0b',
          settings: {
            is_initial: false,
            is_final: false,
            is_approved: false,
            is_rejected: false,
            is_editable: true,
            is_withdrawable: true,
            is_active: true,
          },
        },
        approval_history: [],
        next_approver: undefined,
      };

      setRequest(requestDetail);
      setAttachments(attachmentData || []);
      setComments(commentData || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'リクエストの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCommentSubmit(data: CommentFormData) {
    if (!request || !user) return;

    setIsSubmitting(true);
    try {
      const newComment: RequestComment = {
        id: Date.now().toString(),
        user_id: user.id,
        user_name: user.full_name || '',
        content: data.content,
        type: 'reply',
        created_at: new Date().toISOString(),
      };

      // コメントを保存
      await supabase.from('request_comments').insert({
        request_id: request.id,
        user_id: user.id,
        user_name: user.full_name || '',
        content: data.content,
        type: 'reply',
      });

      setComments((prev) => [...prev, newComment]);
      setIsCommentDialogOpen(false);
      resetComment();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'コメントの投稿に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleApprovalSubmit(data: ApprovalFormData) {
    if (!request || !user) return;

    setIsSubmitting(true);
    try {
      const newStatus =
        data.action === 'approve' ? 'approved' : data.action === 'reject' ? 'rejected' : 'pending';

      // リクエストステータスを更新
      updateRequest(request.id, {
        status_id: newStatus,
        current_approval_step:
          data.action === 'approve'
            ? request.current_approval_step + 1
            : request.current_approval_step,
      });

      // 承認履歴を記録
      await supabase.from('request_approval_history').insert({
        request_id: request.id,
        step_number: request.current_approval_step,
        approver_id: user.id,
        approver_name: user.full_name || '',
        action: data.action,
        comment: data.comment || '',
        processed_at: new Date().toISOString(),
      });

      // コメントを追加
      if (data.comment) {
        await supabase.from('request_comments').insert({
          request_id: request.id,
          user_id: user.id,
          user_name: user.full_name || '',
          content: data.comment,
          type: data.action === 'approve' ? 'approval' : 'rejection',
        });
      }

      setIsApprovalDialogOpen(false);
      resetApproval();
      loadRequestDetail(); // ページを再読み込み
    } catch (err) {
      setError(err instanceof Error ? err.message : '承認処理に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteAttachment(attachmentId: string) {
    if (!request || !user) return;

    // 権限チェック（アップロード者または管理者のみ削除可能）
    const attachment = attachments.find((a) => a.id === attachmentId);
    if (!attachment || (attachment.uploaded_by !== user.id && user.role !== 'admin')) {
      setError('削除権限がありません');
      return;
    }

    try {
      // ファイルを削除
      await supabase.storage.from('request-attachments').remove([attachment.path]);

      // データベースから削除
      await supabase.from('request_attachments').delete().eq('id', attachmentId);

      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ファイルの削除に失敗しました');
    }
  }

  function getStatusBadge(status: string) {
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
  }

  if (!user || (user.role !== 'member' && user.role !== 'admin')) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertDescription>{error || 'リクエストが見つかりません'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const canApprove =
    user.role === 'admin' ||
    request.request_form.approval_flow.some(
      (step: ApprovalStep) =>
        step.approver_id === user.id && step.step === request.current_approval_step
    );

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          戻る
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{request.title}</h1>
          <p className="text-muted-foreground">
            {request.request_form.name} - {getStatusBadge(request.status.code)}
          </p>
        </div>
      </div>

      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">詳細</TabsTrigger>
          <TabsTrigger value="comments">コメント</TabsTrigger>
          <TabsTrigger value="attachments">添付ファイル</TabsTrigger>
          <TabsTrigger value="history">承認履歴</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>基本情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>申請者</Label>
                  <p className="text-sm">{request.applicant.full_name}</p>
                </div>
                <div>
                  <Label>申請日</Label>
                  <p className="text-sm">
                    {new Date(request.created_at).toLocaleDateString('ja-JP')}
                  </p>
                </div>
                <div>
                  <Label>対象日</Label>
                  <p className="text-sm">{request.target_date}</p>
                </div>
                <div>
                  <Label>ステータス</Label>
                  <div className="mt-1">{getStatusBadge(request.status.code)}</div>
                </div>
              </div>

              {request.submission_comment && (
                <div>
                  <Label>申請コメント</Label>
                  <p className="text-sm mt-1 p-3 bg-muted rounded">{request.submission_comment}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>フォームデータ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(request.form_data).map(([key, value]) => (
                  <div key={key}>
                    <Label className="text-sm font-medium">{key}</Label>
                    <p className="text-sm mt-1 p-2 bg-muted rounded">
                      {Array.isArray(value) ? value.join(', ') : String(value)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {canApprove && request.status.code === 'pending' && (
            <Card>
              <CardHeader>
                <CardTitle>承認操作</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="default" className="flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        承認
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>承認</DialogTitle>
                      </DialogHeader>
                      <form
                        onSubmit={handleApprovalSubmitForm((data) => {
                          handleApprovalSubmit({ ...data, action: 'approve' });
                        })}
                      >
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="approval-comment">コメント（任意）</Label>
                            <Textarea
                              id="approval-comment"
                              {...registerApproval('comment')}
                              placeholder="承認コメントを入力"
                              rows={3}
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setIsApprovalDialogOpen(false)}
                            >
                              キャンセル
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                              {isSubmitting ? '処理中...' : '承認'}
                            </Button>
                          </div>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="destructive" className="flex items-center gap-2">
                        <X className="w-4 h-4" />
                        却下
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>却下</DialogTitle>
                      </DialogHeader>
                      <form
                        onSubmit={handleApprovalSubmitForm((data) => {
                          handleApprovalSubmit({ ...data, action: 'reject' });
                        })}
                      >
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="rejection-comment">却下理由</Label>
                            <Textarea
                              id="rejection-comment"
                              {...registerApproval('comment')}
                              placeholder="却下理由を入力"
                              rows={3}
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setIsApprovalDialogOpen(false)}
                            >
                              キャンセル
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                              {isSubmitting ? '処理中...' : '却下'}
                            </Button>
                          </div>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="comments" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>コメント</CardTitle>
                <Dialog open={isCommentDialogOpen} onOpenChange={setIsCommentDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      コメント追加
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>コメント追加</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCommentSubmitForm(handleCommentSubmit)}>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="comment-content">コメント</Label>
                          <Textarea
                            id="comment-content"
                            {...registerComment('content')}
                            placeholder="コメントを入力"
                            rows={3}
                          />
                          {commentErrors.content && (
                            <p className="text-sm text-destructive mt-1">
                              {commentErrors.content.message}
                            </p>
                          )}
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsCommentDialogOpen(false)}
                          >
                            キャンセル
                          </Button>
                          <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? '投稿中...' : '投稿'}
                          </Button>
                        </div>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {comments.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">コメントはありません</p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="border-b pb-4 last:border-b-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-sm">{comment.user_name}</span>
                            <Badge variant="outline" className="text-xs">
                              {comment.type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(comment.created_at).toLocaleString('ja-JP')}
                            </span>
                          </div>
                          <p className="text-sm">{comment.content}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attachments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>添付ファイル</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {attachments.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">添付ファイルはありません</p>
                ) : (
                  attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        <span className="text-sm">{attachment.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {(attachment.size / 1024 / 1024).toFixed(2)} MB
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(attachment.path, '_blank')}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        {(attachment.uploaded_by === user.id || user.role === 'admin') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteAttachment(attachment.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>承認履歴</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {request.approval_history.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">承認履歴はありません</p>
                ) : (
                  request.approval_history.map((history, index) => (
                    <div key={index} className="border-b pb-4 last:border-b-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{history.approver_name}</span>
                          <Badge variant="outline" className="text-xs">
                            {history.action}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(history.processed_at).toLocaleString('ja-JP')}
                        </span>
                      </div>
                      {history.comment && (
                        <p className="text-sm text-muted-foreground">{history.comment}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
