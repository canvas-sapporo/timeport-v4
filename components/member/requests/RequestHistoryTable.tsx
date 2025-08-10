'use client';

import { memo } from 'react';
import { FileText } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ActionButton } from '@/components/ui/action-button';

type Status = { name?: string; color?: string; code?: string } | null | undefined;

function getStatusBadge(status: Status) {
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

export type RequestRecord = {
  id: string;
  title?: string;
  created_at?: string;
  request_form_id?: string;
  current_approval_step?: number;
  statuses?: { name?: string; color?: string; code?: string };
};

type ApprovalStep = { step: number; name?: string };
type RequestForm = { id: string; approval_flow?: ApprovalStep[] };

export const RequestHistoryTable = memo(function RequestHistoryTable({
  isLoading,
  userRequests,
  requestForms,
  onView,
  onEdit,
  onSubmit,
  onDelete,
}: {
  isLoading: boolean;
  userRequests: RequestRecord[];
  requestForms: RequestForm[];
  onView: (req: RequestRecord) => void;
  onEdit: (req: RequestRecord) => void;
  onSubmit: (req: RequestRecord) => void;
  onDelete: (req: RequestRecord) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>申請種別</TableHead>
          <TableHead>申請日</TableHead>
          <TableHead>ステータス</TableHead>
          <TableHead>承認者</TableHead>
          <TableHead>操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center py-8">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <span className="text-gray-500">データを読み込み中...</span>
              </div>
            </TableCell>
          </TableRow>
        ) : (
          userRequests.map((request) => (
            <TableRow key={request.id}>
              <TableCell>{request.title}</TableCell>
              <TableCell>
                {request.created_at
                  ? new Date(request.created_at).toLocaleDateString('ja-JP')
                  : '-'}
              </TableCell>
              <TableCell>{getStatusBadge(request.statuses)}</TableCell>
              <TableCell>
                {(() => {
                  const form = requestForms.find((rf) => rf.id === request.request_form_id);
                  if (form?.approval_flow?.length && request.current_approval_step) {
                    const currentStep = form.approval_flow.find(
                      (s) => s.step === request.current_approval_step
                    );
                    return currentStep?.name || '-';
                  }
                  return '-';
                })()}
              </TableCell>
              <TableCell>
                <TooltipProvider>
                  <div className="flex space-x-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <ActionButton action="view" onClick={() => onView(request)} />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>プレビュー</p>
                      </TooltipContent>
                    </Tooltip>
                    {request.statuses?.code === 'draft' && (
                      <>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <ActionButton action="edit" onClick={() => onEdit(request)} />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>編集</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <ActionButton action="submit" onClick={() => onSubmit(request)} />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>申請</p>
                          </TooltipContent>
                        </Tooltip>
                      </>
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <ActionButton
                          action="delete"
                          onClick={() => onDelete(request)}
                          disabled={
                            request.statuses?.code === 'approved' ||
                            request.statuses?.code === 'rejected'
                          }
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>削除</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
});

export default RequestHistoryTable;
