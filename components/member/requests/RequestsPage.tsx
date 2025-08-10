'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { FileText } from 'lucide-react';
import dynamic from 'next/dynamic';

import { useAuth } from '@/contexts/auth-context';
import { useData } from '@/contexts/data-context';
import { updateRequestStatus, deleteRequest } from '@/lib/actions/requests';
import { useToast } from '@/hooks/use-toast';
import { getJSTDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import ClockRecordsInput from '@/components/forms/ClockRecordsInput';
import { RequestEditDialog } from '@/components/member/request/RequestEditDialog';
import type { RequestRecord } from '@/components/member/requests/RequestHistoryTable';

const RequestHistoryTable = dynamic(() => import('./RequestHistoryTable'), {
  ssr: false,
  loading: () => (
    <div className="border rounded-md p-6 text-center text-gray-600">履歴を読み込んでいます...</div>
  ),
});

const CreateRequestDialog = dynamic(() => import('./CreateRequestDialog'), {
  ssr: false,
});

const RequestDetailDialog = dynamic(() => import('./RequestDetailDialog'), {
  ssr: false,
});

export default function RequestsPage() {
  const { user } = useAuth();
  const { requests, requestForms, createRequest, users, refreshRequests } = useData();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequestType, setSelectedRequestType] = useState<string>('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RequestRecord | null>(null);
  const [requestToSubmit, setRequestToSubmit] = useState<{ id: string; title?: string } | null>(
    null
  );
  const [requestToEdit, setRequestToEdit] = useState<any | null>(null);
  const [requestToDelete, setRequestToDelete] = useState<any | null>(null);
  const [formData, setFormData] = useState<
    Record<string, string | number | boolean | Date | string[]>
  >({});
  const { toast } = useToast();

  // 初期化
  useEffect(() => {
    if (!user || (user.role !== 'member' && user.role !== 'admin')) {
      router.push('/login');
      return;
    }
  }, [user, router]);

  useEffect(() => {
    if (requests.length > 0 || requestForms.length > 0) {
      setIsLoading(false);
    }
  }, [requests, requestForms]);

  // 申請種別が選択された時にwork_dateフィールドを初期化
  useEffect(() => {
    if (selectedRequestType) {
      const requestForm = requestForms.find((rf) => rf.id === selectedRequestType);
      if (requestForm) {
        const workDateField = requestForm.form_config?.find(
          (field: any) => field.name === 'work_date'
        );
        if (workDateField) {
          const currentDate = getJSTDate();
          setFormData((prev) => ({ ...prev, work_date: currentDate }));
        }
      }
    }
  }, [selectedRequestType, requestForms]);

  if (!user || (user.role !== 'member' && user.role !== 'admin')) {
    return null;
  }

  const userRequests: RequestRecord[] = useMemo(
    () =>
      requests
        .filter((r) => r.user_id === user.id)
        .map((r) => ({
          id: r.id,
          title: r.title,
          created_at: r.created_at,
          request_form_id: r.request_form_id,
          current_approval_step: r.current_approval_step,
          statuses: (r as any).statuses,
        })),
    [requests, user.id]
  );

  const activeRequestForms = useMemo(
    () => requestForms.filter((rf) => rf.is_active && !rf.deleted_at),
    [requestForms]
  );

  const handleClockRecordsChange = useCallback(
    (fieldName: string) =>
      (
        newValue: Array<{
          in_time: string;
          breaks: { break_start: string; break_end: string }[];
          out_time?: string;
        }>
      ) => {
        setFormData(
          (prev) =>
            ({ ...prev, [fieldName]: newValue }) as Record<
              string,
              string | number | boolean | Date | string[]
            >
        );
      },
    []
  );

  const handleWorkDateChange = useCallback((newWorkDate: string) => {
    setFormData((prev) => ({ ...prev, work_date: newWorkDate }));
  }, []);

  // Create
  async function handleCreateRequest(statusCode: 'draft' | 'pending' = 'draft') {
    if (!user) return;
    if (!selectedRequestType) return;
    const requestForm = requestForms.find((rf) => rf.id === selectedRequestType);
    if (!requestForm) return;
    let statusId: string | null = null;
    try {
      const { getDefaultStatus } = await import('@/lib/supabase-provider');
      statusId = await getDefaultStatus('request', statusCode);
    } catch {}
    function validateAndCleanDate(dateValue: unknown): string | null {
      if (!dateValue) return null;
      const dateStr = String(dateValue);
      const parsedDate = new Date(dateStr);
      if (isNaN(parsedDate.getTime())) return null;
      return getJSTDate(parsedDate);
    }
    const cleanedFormData: Record<string, string | number | boolean | Date | string[]> = {};
    Object.keys(formData).forEach((key) => {
      const value = formData[key];
      if (value !== null && value !== undefined && value !== '') {
        if (key.includes('date') || key.includes('Date')) {
          const cleanedDate = validateAndCleanDate(value);
          if (cleanedDate) cleanedFormData[key] = cleanedDate;
        } else {
          cleanedFormData[key] = value as any;
        }
      }
    });
    try {
      await createRequest({
        user_id: user.id,
        request_form_id: selectedRequestType,
        title: requestForm.name,
        form_data: cleanedFormData,
        target_date: getJSTDate(),
        start_date: (cleanedFormData.start_date as string) || getJSTDate(),
        end_date: (cleanedFormData.end_date as string) || getJSTDate(),
        submission_comment: '',
        current_approval_step: 1,
        comments: [],
        attachments: [],
        status_code: statusCode,
        status_id: statusId,
      });
      toast({
        title: statusCode === 'pending' ? '申請完了' : '下書き保存',
        description:
          statusCode === 'pending'
            ? '申請が正常に提出されました。承認者の承認をお待ちください。'
            : '下書きが正常に保存されました。',
      });
      setFormData({});
      setSelectedRequestType('');
      setIsCreateDialogOpen(false);
      await refreshRequests();
    } catch (error) {
      toast({
        title: 'エラー',
        description: 'リクエストの作成に失敗しました。',
        variant: 'destructive',
      });
    }
  }

  // View/Edit/Delete handlers
  function handleViewRequest(request: RequestRecord) {
    setSelectedRequest(request);
    setIsDetailDialogOpen(true);
  }

  function handleEditRequest(request: any) {
    setRequestToEdit(request);
    setIsEditDialogOpen(true);
  }

  function handleSubmitRequest(request: { id: string; title?: string }) {
    setRequestToSubmit(request);
    setIsSubmitDialogOpen(true);
  }

  function handleDeleteRequest(request: any) {
    setRequestToDelete(request);
    setIsDeleteDialogOpen(true);
  }

  async function confirmSubmitRequest() {
    if (!requestToSubmit) return;
    try {
      const result = await updateRequestStatus(requestToSubmit.id, 'pending');
      if (result.success) {
        toast({ title: '申請完了', description: '申請が正常に送信されました。' });
        setIsSubmitDialogOpen(false);
        setRequestToSubmit(null);
        await refreshRequests();
      } else {
        toast({
          title: 'エラー',
          description: result.error || '申請の送信に失敗しました。',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({ title: 'エラー', description: '申請の送信に失敗しました。', variant: 'destructive' });
    }
  }

  async function confirmDeleteRequest() {
    if (!requestToDelete) return;
    try {
      const result = await deleteRequest(requestToDelete.id, user?.id);
      if (result.success) {
        toast({ title: '削除完了', description: '申請を削除しました。' });
        setIsDeleteDialogOpen(false);
        setRequestToDelete(null);
        await refreshRequests();
      } else {
        toast({
          title: 'エラー',
          description: result.error || '申請の削除に失敗しました。',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({ title: 'エラー', description: '申請の削除に失敗しました。', variant: 'destructive' });
    }
  }

  function renderDetailField(
    field: {
      id: string;
      name: string;
      type?: string;
      label: string;
      required?: boolean;
      placeholder?: string;
      options?: Array<{ value: string; label: string } | string>;
      metadata?: { object_type?: string; field_type?: string };
    },
    formDataObj: Record<string, unknown>
  ) {
    const fieldType = field.type || 'text';
    const fieldValue = formDataObj[field.name];
    function formatValue(value: unknown): string {
      if (value === null || value === undefined || value === '') return '-';
      if (typeof value === 'string') {
        if (value.match(/^\d{4}-\d{2}-\d{2}/)) return new Date(value).toLocaleDateString('ja-JP');
        if (value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/))
          return new Date(value).toLocaleString('ja-JP');
        return value;
      }
      if (Array.isArray(value)) {
        if (value.length === 0) return '-';
        if (typeof value[0] === 'object' && value[0] !== null) return `${value.length}件のレコード`;
        return (value as Array<unknown>).join(', ');
      }
      return String(value);
    }
    switch (fieldType) {
      case 'object':
        if (
          field.metadata &&
          typeof field.metadata === 'object' &&
          'object_type' in field.metadata
        ) {
          const metadata = field.metadata as { object_type: string; field_type?: string };
          if (metadata.object_type === 'attendance') {
            const workDate = (formData.work_date as string) || getJSTDate();
            return (
              <ClockRecordsInput
                value={
                  (fieldValue as unknown as Array<{
                    in_time: string;
                    breaks: { break_start: string; break_end: string }[];
                    out_time?: string;
                  }>) || []
                }
                onChangeAction={handleClockRecordsChange(field.name)}
                error={undefined}
                disabled={false}
                workDate={workDate}
                userId={user?.id}
                onWorkDateChange={handleWorkDateChange}
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
          <div className="p-3 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-600">{formatValue(fieldValue)}</p>
          </div>
        );
    }
  }

  function renderFormField(field: {
    id: string;
    name: string;
    type?: string;
    label: string;
    required?: boolean;
    placeholder?: string;
    options?: Array<{ value: string; label: string } | string>;
    metadata?: { object_type?: string; field_type?: string };
  }) {
    const fieldType = field.type || 'text';
    const fieldValue = formData[field.name] || '';
    switch (fieldType) {
      case 'text':
        return (
          <input
            className="w-full border rounded-md px-3 py-2"
            placeholder={field.label}
            value={String(fieldValue)}
            onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
          />
        );
      case 'textarea':
        return (
          <textarea
            className="w-full border rounded-md px-3 py-2"
            placeholder={field.label}
            value={String(fieldValue)}
            onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
          />
        );
      case 'date':
        return (
          <input
            className="w-full border rounded-md px-3 py-2"
            type="date"
            value={String(fieldValue)}
            onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
          />
        );
      case 'select':
        return (
          <Select
            value={String(fieldValue)}
            onValueChange={(value) => setFormData({ ...formData, [field.name]: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder={`${field.label}を選択してください`} />
            </SelectTrigger>
            <SelectContent>
              {(() => {
                const normalizedOptions =
                  field.options?.map((option) =>
                    typeof option === 'string' ? { value: option, label: option } : option
                  ) || [];
                return normalizedOptions
                  .filter((option) => option.value && option.value.trim() !== '')
                  .map((option, index) => (
                    <SelectItem key={`${field.id}-${option.value}`} value={option.value}>
                      {option.label || `選択肢${index + 1}`}
                    </SelectItem>
                  ));
              })()}
            </SelectContent>
          </Select>
        );
      case 'object':
        if (
          field.metadata &&
          typeof field.metadata === 'object' &&
          'object_type' in field.metadata
        ) {
          const metadata = field.metadata as { object_type: string; field_type?: string };
          if (metadata.object_type === 'attendance') {
            const workDate = (formData.work_date as string) || getJSTDate();
            return (
              <ClockRecordsInput
                value={
                  (fieldValue as unknown as Array<{
                    in_time: string;
                    breaks: { break_start: string; break_end: string }[];
                    out_time?: string;
                  }>) || []
                }
                onChangeAction={handleClockRecordsChange(field.name)}
                error={undefined}
                disabled={false}
                workDate={workDate}
                userId={user?.id}
                onWorkDateChange={handleWorkDateChange}
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
          <input
            className="w-full border rounded-md px-3 py-2"
            placeholder={field.label}
            value={String(fieldValue)}
            onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
          />
        );
    }
  }

  const selectedType = requestForms.find((rf) => rf.id === selectedRequestType) as any;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">申請</h1>
          <p className="text-gray-600">各種申請の作成・確認ができます</p>
        </div>

        <CreateRequestDialog
          isOpen={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          activeRequestForms={activeRequestForms as any}
          selectedRequestType={selectedRequestType}
          setSelectedRequestType={setSelectedRequestType}
          formFields={selectedType}
          renderFormField={(field) => renderFormField(field as any)}
          onDraft={() => handleCreateRequest('draft')}
          onSubmit={() => handleCreateRequest('pending')}
        />

        {/* 申請確認ダイアログ */}
        <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
          <div />
        </Dialog>

        {/* 削除確認ダイアログ */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <div />
        </Dialog>
      </div>

      {/* 申請編集ダイアログ */}
      <RequestEditDialog
        isOpen={isEditDialogOpen}
        onCloseAction={() => {
          setIsEditDialogOpen(false);
          setRequestToEdit(null);
        }}
        request={requestToEdit!}
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
          <RequestHistoryTable
            isLoading={isLoading}
            userRequests={userRequests}
            requestForms={requestForms as any}
            onView={(req) => handleViewRequest(req)}
            onEdit={(req) => handleEditRequest(req)}
            onSubmit={(req) => handleSubmitRequest(req)}
            onDelete={(req) => handleDeleteRequest(req)}
          />

          {!isLoading && userRequests.length === 0 && (
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

      <RequestDetailDialog
        isOpen={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
        request={selectedRequest as any}
        requestForms={requestForms as any}
        renderDetailField={(field, data) => renderDetailField(field as any, data)}
        users={users as any}
      />
    </div>
  );
}
