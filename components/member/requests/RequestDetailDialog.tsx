'use client';

import { memo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

function getStatusBadge(status?: { name?: string; color?: string; code?: string } | null) {
  if (!status) return <Badge variant="outline">-</Badge>;
  const statusName = status.name || '不明';
  const statusColor = status.color || '#6B7280';
  let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'outline';
  if (statusColor === '#10B981') variant = 'default';
  else if (statusColor === '#F59E0B') variant = 'secondary';
  else if (statusColor === '#EF4444') variant = 'destructive';
  return (
    <Badge variant={variant} style={{ backgroundColor: statusColor, color: 'white' }}>
      {statusName}
    </Badge>
  );
}

export const RequestDetailDialog = memo(function RequestDetailDialog({
  isOpen,
  onOpenChange,
  request,
  requestForms,
  renderDetailField,
  users,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  request:
    | ({
        id: string;
        title?: string;
        created_at?: string;
        target_date?: string;
        statuses?: { name?: string; color?: string; code?: string };
        form_data?: Record<string, unknown>;
        submission_comment?: string;
        request_form_id?: string;
        current_approval_step?: number;
      } | null)
    | null;
  requestForms: Array<{
    id: string;
    approval_flow?: Array<{
      step: number;
      name?: string;
      approver_id?: string;
      description?: string;
    }>;
    form_config?: Array<any>;
  }>;
  renderDetailField: (field: any, formData: Record<string, unknown>) => JSX.Element;
  users: Array<{ id: string; family_name: string; first_name: string; role: string }>;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto dialog-scrollbar">
        <DialogHeader>
          <DialogTitle>申請詳細</DialogTitle>
          <DialogDescription>申請の詳細情報を確認できます。</DialogDescription>
        </DialogHeader>
        {request && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="font-medium">申請種別</Label>
                <p className="text-sm text-gray-600">{request.title}</p>
              </div>
              <div>
                <Label className="font-medium">申請日</Label>
                <p className="text-sm text-gray-600">
                  {request.created_at
                    ? new Date(request.created_at).toLocaleDateString('ja-JP')
                    : '-'}
                </p>
              </div>
              <div>
                <Label className="font-medium">対象日</Label>
                <p className="text-sm text-gray-600">
                  {request.target_date
                    ? new Date(request.target_date).toLocaleDateString('ja-JP')
                    : '-'}
                </p>
              </div>
              <div>
                <Label className="font-medium">ステータス</Label>
                <div className="mt-1">{getStatusBadge(request.statuses)}</div>
              </div>
            </div>

            {request.form_data && Object.keys(request.form_data).length > 0 && (
              <div>
                <Label className="font-medium">申請内容</Label>
                <div className="mt-2 space-y-4">
                  {(() => {
                    const requestForm = requestForms.find((f) => f.id === request.request_form_id);
                    if (!requestForm || !requestForm.form_config) {
                      return (
                        <div className="p-3 bg-gray-50 rounded-md">
                          <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                            {JSON.stringify(request.form_data, null, 2)}
                          </pre>
                        </div>
                      );
                    }
                    return requestForm.form_config
                      .sort((a: { order: number }, b: { order: number }) => a.order - b.order)
                      .map((field: any) => (
                        <div key={field.id}>
                          <Label className="text-sm font-medium text-gray-700">{field.label}</Label>
                          {renderDetailField(field, request.form_data || {})}
                        </div>
                      ));
                  })()}
                </div>
              </div>
            )}

            {request.submission_comment && (
              <div>
                <Label className="font-medium">申請コメント</Label>
                <p className="text-sm text-gray-600 mt-1">{request.submission_comment}</p>
              </div>
            )}

            <div>
              <Label className="font-medium">承認フロー</Label>
              <div className="mt-2 space-y-2">
                {(() => {
                  const requestForm = requestForms.find((f) => f.id === request.request_form_id);
                  if (!requestForm?.approval_flow || requestForm.approval_flow.length === 0) {
                    return (
                      <div className="p-3 bg-gray-50 rounded-md">
                        <p className="text-sm text-gray-600">承認フローが設定されていません</p>
                      </div>
                    );
                  }
                  return requestForm.approval_flow.map((step) => {
                    const currentStep = request.current_approval_step || 0;
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
                                  if (step.approver_id) {
                                    const approver = users.find((u) => u.id === step.approver_id);
                                    return approver
                                      ? `${approver.family_name} ${approver.first_name}`
                                      : step.name || `承認者 ${step.step}`;
                                  }
                                  return step.name || `承認者 ${step.step}`;
                                })()}
                              </p>
                              <p className="text-xs text-gray-500">
                                {(() => {
                                  if (step.approver_id) {
                                    const approver = users.find((u) => u.id === step.approver_id);
                                    return approver?.role === 'admin' ? '管理者' : '承認者';
                                  }
                                  return step.description || '承認者';
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
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
});

export default RequestDetailDialog;
