'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Plus, Eye, Send, Edit } from 'lucide-react';

import { useAuth } from '@/contexts/auth-context';
import { useData } from '@/contexts/data-context';
import { updateRequestStatus } from '@/lib/actions/requests';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import ClockRecordsInput from '@/components/forms/clock-records-input';
import { RequestEditDialog } from '@/components/member/RequestEditDialog';

export default function MemberRequestsPage() {
  const { user } = useAuth();
  const { requests, requestForms, createRequest, users, refreshRequests } = useData();
  const router = useRouter();
  const [selectedRequestType, setSelectedRequestType] = useState<string>('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<{
    id: string;
    title?: string;
    created_at?: string;
    target_date?: string;
    statuses?: { name?: string; color?: string; code?: string };
    form_data?: Record<string, unknown>;
    submission_comment?: string;
    request_form_id?: string;
    current_approval_step?: number;
  } | null>(null);
  const [requestToSubmit, setRequestToSubmit] = useState<{
    id: string;
    title?: string;
  } | null>(null);
  const [requestToEdit, setRequestToEdit] = useState<{
    id: string;
    created_at: string;
    updated_at: string;
    request_form_id: string;
    user_id: string;
    form_data: Record<string, string | number | boolean | Date | string[]>;
    target_date: string;
    start_date: string;
    end_date: string;
    submission_comment: string;
    current_approval_step: number;
    comments: unknown[];
    attachments: unknown[];
    status_id?: string;
  } | null>(null);
  const [formData, setFormData] = useState<
    Record<string, string | number | boolean | Date | string[]>
  >({});
  // const [filter, setFilter] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    if (!user || (user.role !== 'member' && user.role !== 'admin')) {
      router.push('/login');
      return;
    }
  }, [user, router]);

  if (!user || (user.role !== 'member' && user.role !== 'admin')) {
    return null;
  }

  console.log('MemberRequestsPage: デバッグ情報', {
    user: user,
    userId: user?.id,
    requestsCount: requests.length,
    requests: requests,
    requestFormsCount: requestForms.length,
  });

  const userRequests = requests.filter((r) => {
    console.log('フィルタリング比較:', {
      requestUserId: r.user_id,
      currentUserId: user.id,
      isMatch: r.user_id === user.id,
      requestUserIdType: typeof r.user_id,
      currentUserIdType: typeof user.id,
    });
    return r.user_id === user.id;
  });

  console.log('フィルタリング結果:', {
    userRequestsCount: userRequests.length,
    userRequests: userRequests,
  });

  const activeRequestForms = requestForms.filter((rf) => rf.is_active && !rf.deleted_at);

  function getStatusBadge(
    status: { name?: string; color?: string; code?: string } | null | undefined
  ) {
    if (!status) {
      return <Badge variant="outline">-</Badge>;
    }
    // ステータスオブジェクトから情報を取得
    const statusName = status.name || '不明';
    const statusColor = status.color || '#6B7280';
    // 色に基づいてBadgeのvariantを決定
    let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'outline';
    if (statusColor === '#10B981') {
      variant = 'default'; // 緑色（承認済み）
    } else if (statusColor === '#F59E0B') {
      variant = 'secondary'; // 黄色（承認待ち）
    } else if (statusColor === '#EF4444') {
      variant = 'destructive'; // 赤色（却下）
    }
    return (
      <Badge variant={variant} style={{ backgroundColor: statusColor, color: 'white' }}>
        {statusName}
      </Badge>
    );
  }

  async function handleCreateRequest(statusCode: 'draft' | 'pending' = 'draft') {
    if (!user) return;

    console.log('handleCreateRequest: 開始', { statusCode, selectedRequestType, formData });
    if (!selectedRequestType) {
      console.log('handleCreateRequest: selectedRequestTypeが未選択');
      return;
    }
    console.log('handleCreateRequest: selectedRequestType:', selectedRequestType);
    const requestForm = requestForms.find((rf) => rf.id === selectedRequestType);
    if (!requestForm) {
      console.log('handleCreateRequest: requestFormが見つかりません');
      return;
    }
    console.log('handleCreateRequest: requestForm:', requestForm);
    // 指定されたステータスを取得
    let statusId = null;
    try {
      const { getDefaultStatus } = await import('@/lib/supabase-provider');
      statusId = await getDefaultStatus('request', statusCode);
    } catch (error) {
      console.warn('ステータスの取得に失敗:', error);
    }
    // 日付データのバリデーションとクリーンアップ
    function validateAndCleanDate(dateValue: unknown): string | null {
      if (!dateValue) return null;
      const dateStr = String(dateValue);
      // 空文字列や無効な文字列の場合はnullを返す
      if (!dateStr.trim() || dateStr === 'aaa' || dateStr === 'undefined' || dateStr === 'null') {
        return null;
      }
      // 日付として解析可能かチェック
      const parsedDate = new Date(dateStr);
      if (isNaN(parsedDate.getTime())) {
        return null;
      }
      // YYYY-MM-DD形式で返す
      return parsedDate.toISOString().split('T')[0];
    }
    // フォームデータのバリデーションとクリーンアップ
    const cleanedFormData: Record<string, string | number | boolean | Date | string[]> = {};
    Object.keys(formData).forEach((key) => {
      const value = formData[key];
      if (value !== null && value !== undefined && value !== '') {
        // 日付フィールドの場合は特別な処理
        if (key.includes('date') || key.includes('Date')) {
          const cleanedDate = validateAndCleanDate(value);
          if (cleanedDate) {
            cleanedFormData[key] = cleanedDate;
          }
        } else {
          cleanedFormData[key] = value as string | number | boolean | Date | string[];
        }
      }
    });
    console.log('handleCreateRequest: クリーンアップ後のフォームデータ:', cleanedFormData);
    try {
      const newRequest = await createRequest({
        user_id: user.id,
        request_form_id: selectedRequestType,
        title: requestForm.name,
        form_data: cleanedFormData,
        target_date: new Date().toISOString().split('T')[0],
        start_date:
          (cleanedFormData.start_date as string) || new Date().toISOString().split('T')[0],
        end_date: (cleanedFormData.end_date as string) || new Date().toISOString().split('T')[0],
        submission_comment: '',
        current_approval_step: 1,
        comments: [],
        attachments: [],
      });
      console.log('handleCreateRequest: リクエスト作成成功:', newRequest);
      // フォームをリセット
      setFormData({});
      setSelectedRequestType('');
      setIsCreateDialogOpen(false);
      // リクエストリストを更新
      await refreshRequests();
    } catch (error) {
      console.error('handleCreateRequest: エラー:', error);
      toast({
        title: 'エラー',
        description: 'リクエストの作成に失敗しました。',
        variant: 'destructive',
      });
    }
  }

  function handleViewRequest(request: {
    id: string;
    title?: string;
    created_at?: string;
    target_date?: string;
    statuses?: { name?: string; color?: string; code?: string };
    form_data?: Record<string, unknown>;
    submission_comment?: string;
    request_form_id?: string;
    current_approval_step?: number;
  }) {
    console.log('handleViewRequest: 開始', request);
    setSelectedRequest(request);
    setIsDetailDialogOpen(true);
  }

  function handleSubmitRequest(request: { id: string; title?: string }) {
    console.log('handleSubmitRequest: 開始', request);
    setRequestToSubmit(request);
    setIsSubmitDialogOpen(true);
  }

  function handleEditRequest(request: {
    id: string;
    created_at: string;
    updated_at: string;
    request_form_id: string;
    user_id: string;
    form_data: Record<string, string | number | boolean | Date | string[]>;
    target_date: string;
    start_date?: string;
    end_date?: string;
    submission_comment?: string;
    current_approval_step: number;
    comments: unknown[];
    attachments: unknown[];
    status_id?: string;
  }) {
    console.log('handleEditRequest: 開始', request);
    setRequestToEdit(
      request as {
        id: string;
        created_at: string;
        updated_at: string;
        request_form_id: string;
        user_id: string;
        form_data: Record<string, string | number | boolean | Date | string[]>;
        target_date: string;
        start_date: string;
        end_date: string;
        submission_comment: string;
        current_approval_step: number;
        comments: Array<unknown>;
        attachments: Array<unknown>;
        status_id?: string;
      }
    );
    setIsEditDialogOpen(true);
  }

  async function confirmSubmitRequest() {
    if (!requestToSubmit) return;
    console.log('confirmSubmitRequest: 開始', requestToSubmit);
    try {
      // 「承認待ち」ステータスコードを渡す
      const result = await updateRequestStatus(requestToSubmit.id, 'pending');

      if (result.success) {
        toast({
          title: '申請完了',
          description: '申請が正常に送信されました。',
        });
        setIsSubmitDialogOpen(false);
        setRequestToSubmit(null);
        // 申請履歴を最新データに更新
        await refreshRequests();
      } else {
        toast({
          title: 'エラー',
          description: result.error || '申請の送信に失敗しました。',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('confirmSubmitRequest: エラー', error);
      toast({
        title: 'エラー',
        description: '申請の送信に失敗しました。',
        variant: 'destructive',
      });
    }
  }

  function renderFormField(field: {
    name: string;
    type?: string;
    label: string;
    required?: boolean;
    placeholder?: string;
    options?: Array<{ value: string; label: string }>;
    metadata?: { object_type?: string; field_type?: string };
  }) {
    const fieldType = field.type || 'text';
    const fieldValue = formData[field.name] || '';
    switch (fieldType) {
      case 'text':
        return (
          <Input
            key={field.name}
            placeholder={field.label}
            value={String(fieldValue)}
            onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
          />
        );
      case 'textarea':
        return (
          <Textarea
            key={field.name}
            placeholder={field.label}
            value={String(fieldValue)}
            onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
          />
        );
      case 'date':
        return (
          <Input
            key={field.name}
            type="date"
            value={String(fieldValue)}
            onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
          />
        );
      case 'select':
        return (
          <Select
            key={field.name}
            value={String(fieldValue)}
            onValueChange={(value) => setFormData({ ...formData, [field.name]: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder={field.label} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'object':
        // オブジェクトタイプの処理
        if (
          field.metadata &&
          typeof field.metadata === 'object' &&
          'object_type' in field.metadata
        ) {
          const metadata = field.metadata as { object_type: string; field_type?: string };

          if (metadata.object_type === 'attendance' && metadata.field_type === 'clock_records') {
            return (
              <ClockRecordsInput
                value={
                  (fieldValue as unknown as Array<{
                    in_time: string;
                    breaks: { break_start: string; break_end: string }[];
                    out_time?: string;
                  }>) || []
                }
                onChangeAction={(newValue) =>
                  setFormData(
                    (prev) =>
                      ({ ...prev, [field.name]: newValue }) as Record<
                        string,
                        string | number | boolean | Date | string[]
                      >
                  )
                }
                error={undefined}
                disabled={false}
              />
            );
          }
        }
        return (
          <div className="p-4 border border-dashed rounded-lg text-center text-muted-foreground">
            オブジェクトタイプ:{' '}
            {field.metadata && typeof field.metadata === 'object' && 'object_type' in field.metadata
              ? (field.metadata as { object_type: string }).object_type
              : 'unknown'}
          </div>
        );
      default:
        return (
          <Input
            key={field.name}
            placeholder={field.label}
            value={String(fieldValue)}
            onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
          />
        );
    }
  }

  const selectedType = requestForms.find((rf) => rf.id === selectedRequestType);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">申請</h1>
          <p className="text-gray-600">各種申請の作成・確認ができます</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="timeport-primary">
              <Plus className="w-4 h-4 mr-2" />
              新規申請
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto dialog-scrollbar">
            <DialogHeader>
              <DialogTitle>新規申請作成</DialogTitle>
              <DialogDescription>
                申請種別を選択し、必要な情報を入力して申請を作成してください。
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="requestType">申請種別</Label>
                <Select value={selectedRequestType} onValueChange={setSelectedRequestType}>
                  <SelectTrigger>
                    <SelectValue placeholder="申請種別を選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeRequestForms.map((form) => (
                      <SelectItem key={form.id} value={form.id}>
                        {form.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedType && (
                <div className="space-y-4">
                  <h3 className="font-medium">{selectedType.name}</h3>
                  {selectedType.form_config
                    .sort((a: { order: number }, b: { order: number }) => a.order - b.order)
                    .map((field) => (
                      <div key={field.id}>
                        <Label htmlFor={field.name}>
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </Label>
                        {renderFormField(
                          field as {
                            id: string;
                            name: string;
                            type?: string;
                            label: string;
                            required?: boolean;
                            placeholder?: string;
                            options?: Array<{ value: string; label: string }>;
                            metadata?: { object_type?: string; field_type?: string };
                          }
                        )}
                      </div>
                    ))}
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  キャンセル
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleCreateRequest('draft')}
                  disabled={!selectedRequestType}
                >
                  下書き
                </Button>
                <Button
                  onClick={() => handleCreateRequest('pending')}
                  disabled={!selectedRequestType}
                >
                  申請する
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 申請詳細ダイアログ */}
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto dialog-scrollbar">
            <DialogHeader>
              <DialogTitle>申請詳細</DialogTitle>
              <DialogDescription>申請の詳細情報を確認できます。</DialogDescription>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-medium">申請種別</Label>
                    <p className="text-sm text-gray-600">{selectedRequest.title}</p>
                  </div>
                  <div>
                    <Label className="font-medium">申請日</Label>
                    <p className="text-sm text-gray-600">
                      {selectedRequest.created_at
                        ? new Date(selectedRequest.created_at).toLocaleDateString('ja-JP')
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <Label className="font-medium">対象日</Label>
                    <p className="text-sm text-gray-600">
                      {selectedRequest.target_date
                        ? new Date(selectedRequest.target_date).toLocaleDateString('ja-JP')
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <Label className="font-medium">ステータス</Label>
                    <div className="mt-1">{getStatusBadge(selectedRequest.statuses)}</div>
                  </div>
                </div>

                {selectedRequest.form_data && Object.keys(selectedRequest.form_data).length > 0 && (
                  <div>
                    <Label className="font-medium">申請内容</Label>
                    <div className="mt-2 p-3 bg-gray-50 rounded-md">
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                        {JSON.stringify(selectedRequest.form_data, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {selectedRequest.submission_comment && (
                  <div>
                    <Label className="font-medium">申請コメント</Label>
                    <p className="text-sm text-gray-600 mt-1">
                      {selectedRequest.submission_comment}
                    </p>
                  </div>
                )}

                {/* 承認フロー表示 */}
                <div>
                  <Label className="font-medium">承認フロー</Label>
                  <div className="mt-2 space-y-2">
                    {(() => {
                      const requestForm = requestForms.find(
                        (f) => f.id === selectedRequest.request_form_id
                      );
                      if (
                        !requestForm ||
                        !requestForm.approval_flow ||
                        requestForm.approval_flow.length === 0
                      ) {
                        return (
                          <div className="p-3 bg-gray-50 rounded-md">
                            <p className="text-sm text-gray-600">承認フローが設定されていません</p>
                          </div>
                        );
                      }

                      return requestForm.approval_flow.map((step, _index) => {
                        const currentStep = selectedRequest.current_approval_step || 0;
                        const isCurrentStep = step.step === currentStep;
                        const isCompleted = currentStep > step.step;

                        return (
                          <div
                            key={step.step}
                            className={`p-3 rounded-md border ${
                              isCurrentStep
                                ? 'bg-blue-50 border-blue-200'
                                : isCompleted
                                  ? 'bg-green-50 border-green-200'
                                  : 'bg-gray-50 border-gray-200'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <div
                                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                                    isCurrentStep
                                      ? 'bg-blue-500 text-white'
                                      : isCompleted
                                        ? 'bg-green-500 text-white'
                                        : 'bg-gray-300 text-gray-600'
                                  }`}
                                >
                                  {step.step}
                                </div>
                                <div>
                                  <p className="text-sm font-medium">
                                    {(() => {
                                      const approver = users.find((u) => u.id === step.approver_id);
                                      return approver
                                        ? `${approver.family_name} ${approver.first_name}`
                                        : `承認者 ${step.step}`;
                                    })()}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {(() => {
                                      const approver = users.find((u) => u.id === step.approver_id);
                                      return approver?.role === 'admin' ? '管理者' : '承認者';
                                    })()}
                                  </p>
                                </div>
                              </div>
                              <div className="text-xs">
                                {isCurrentStep && (
                                  <span className="text-blue-600 font-medium">承認待ち</span>
                                )}
                                {isCompleted && (
                                  <span className="text-green-600 font-medium">承認済み</span>
                                )}
                                {!isCurrentStep && !isCompleted && (
                                  <span className="text-gray-500">未処理</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
                    閉じる
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* 申請確認ダイアログ */}
        <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>申請確認</DialogTitle>
              <DialogDescription>{requestToSubmit?.title}を申請しますか？</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-md">
                <p className="text-sm text-blue-700">
                  申請を送信すると、承認者の承認を待つ状態になります。
                </p>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsSubmitDialogOpen(false)}>
                  キャンセル
                </Button>
                <Button onClick={confirmSubmitRequest} className="bg-blue-600 hover:bg-blue-700">
                  申請する
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 申請編集ダイアログ */}
      <RequestEditDialog
        isOpen={isEditDialogOpen}
        onCloseAction={() => {
          setIsEditDialogOpen(false);
          setRequestToEdit(null);
        }}
        request={
          requestToEdit! as {
            id: string;
            created_at: string;
            updated_at: string;
            request_form_id: string;
            user_id: string;
            form_data: Record<string, string | number | boolean | Date | string[]>;
            target_date: string;
            start_date: string;
            end_date: string;
            submission_comment: string;
            current_approval_step: number;
            comments: Array<{
              id: string;
              user_id: string;
              type:
                | 'submission'
                | 'approval'
                | 'rejection'
                | 'modification'
                | 'withdrawal'
                | 'reply';
              user_name: string;
              content: string;
              created_at: string;
              parent_id?: string;
              updated_at?: string;
              attachments?: Array<{
                id: string;
                name: string;
                url: string;
                size: number;
              }>;
              replies?: Array<unknown>;
            }>;
            attachments: Array<{
              path: string;
              id: string;
              name: string;
              size: number;
              mime_type: string;
              uploaded_by: string;
              uploaded_at: string;
            }>;
            status_id?: string;
          }
        }
        requestForms={requestForms}
        onSuccessAction={() => {
          refreshRequests();
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>申請履歴</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>申請種別</TableHead>
                <TableHead>申請日</TableHead>
                <TableHead>対象日</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>承認者</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>{request.title}</TableCell>
                  <TableCell>
                    {request.created_at
                      ? new Date(request.created_at).toLocaleDateString('ja-JP')
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {request.target_date
                      ? new Date(request.target_date).toLocaleDateString('ja-JP')
                      : request.start_date && request.end_date
                        ? `${new Date(request.start_date).toLocaleDateString('ja-JP')} - ${new Date(request.end_date).toLocaleDateString('ja-JP')}`
                        : request.start_date
                          ? new Date(request.start_date).toLocaleDateString('ja-JP')
                          : '-'}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(
                      (request as { statuses?: { name?: string; color?: string; code?: string } })
                        .statuses
                    )}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      // 承認フローから現在の承認者を取得
                      if (
                        (
                          request as {
                            request_forms?: {
                              approval_flow?: Array<{ step: number; approver_id: string }>;
                            };
                          }
                        ).request_forms?.approval_flow &&
                        request.current_approval_step
                      ) {
                        const currentStep = (
                          request as {
                            request_forms?: {
                              approval_flow?: Array<{ step: number; approver_id: string }>;
                            };
                          }
                        ).request_forms?.approval_flow?.find(
                          (step: { step: number; approver_id: string }) =>
                            step.step === request.current_approval_step
                        );
                        if (currentStep) {
                          // 承認者IDからユーザー情報を取得
                          const approver = users.find(
                            (u: { id: string; family_name: string; first_name: string }) =>
                              u.id === currentStep.approver_id
                          );
                          if (approver) {
                            return `${approver.family_name} ${approver.first_name}`;
                          }
                        }
                      }
                      return '-';
                    })()}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="sm" onClick={() => handleViewRequest(request)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      {/* 下書き状態の場合のみ編集ボタンと申請ボタンを表示 */}
                      {(request as { statuses?: { code?: string } }).statuses?.code === 'draft' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditRequest(request)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSubmitRequest(request)}
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {userRequests.length === 0 && (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">申請履歴がありません</p>
              <Button onClick={() => setIsCreateDialogOpen(true)} className="mt-4">
                最初の申請を作成
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
