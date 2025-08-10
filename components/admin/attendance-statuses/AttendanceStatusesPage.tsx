'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Settings } from 'lucide-react';

import { useAuth } from '@/contexts/auth-context';
import { getAttendanceStatuses } from '@/lib/actions/attendance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { AttendanceStatusData } from '@/schemas/attendance';
import AttendanceStatusListTable from '@/components/admin/attendance-statuses/AttendanceStatusListTable';
import StatusesStats from '@/components/admin/attendance-statuses/StatusesStats';

const AttendanceStatusCreateDialog = dynamic(
  () => import('@/components/admin/attendance-statuses/AttendanceStatusCreateDialog'),
  { ssr: false }
);
const AttendanceStatusEditDialog = dynamic(
  () => import('@/components/admin/attendance-statuses/AttendanceStatusEditDialog'),
  { ssr: false }
);
const AttendanceStatusDeleteDialog = dynamic(
  () => import('@/components/admin/attendance-statuses/AttendanceStatusDeleteDialog'),
  { ssr: false }
);

export default function AttendanceStatusesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [statuses, setStatuses] = useState<AttendanceStatusData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatusData | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/login');
      return;
    }
  }, [user, router]);

  useEffect(() => {
    if (user?.company_id) {
      void fetchStatuses();
    }
  }, [user?.company_id]);

  async function fetchStatuses() {
    if (!user?.company_id) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await getAttendanceStatuses(user.company_id);
      if (result.success && result.statuses) {
        setStatuses(result.statuses);
      } else {
        setError(result.error || '勤怠ステータスの取得に失敗しました');
      }
    } catch (err) {
      setError('予期しないエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  }

  function handleCreate() {
    setCreateDialogOpen(true);
  }
  function handleEdit(status: AttendanceStatusData) {
    setSelectedStatus(status);
    setEditDialogOpen(true);
  }
  function handleDelete(status: AttendanceStatusData) {
    setSelectedStatus(status);
    setDeleteDialogOpen(true);
  }
  function handleOperationSuccess() {
    void fetchStatuses();
    toast({ title: '操作完了', description: '勤怠ステータスが正常に更新されました' });
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <p className="text-red-600">{error}</p>
          <Button onClick={() => fetchStatuses()} className="mt-4">
            再試行
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">勤怠ステータス管理</h1>
          <p className="text-gray-600">勤怠ステータスの種類を管理できます</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            設定
          </Button>
          <Button size="sm" onClick={handleCreate}>
            新規作成
          </Button>
        </div>
      </div>

      <StatusesStats statuses={statuses} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span className="inline-flex w-5 h-5 items-center justify-center">
              {/* decorative dot */}
              <span className="w-2 h-2 rounded-full bg-blue-600" />
            </span>
            <span>勤怠ステータス一覧</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AttendanceStatusListTable
            statuses={statuses}
            onEditAction={handleEdit}
            onDeleteAction={handleDelete}
            onCreateAction={handleCreate}
          />
        </CardContent>
      </Card>

      <AttendanceStatusCreateDialog
        open={createDialogOpen}
        onOpenChangeAction={setCreateDialogOpen}
        companyId={user.company_id || ''}
        onSuccess={handleOperationSuccess}
      />

      <AttendanceStatusEditDialog
        open={editDialogOpen}
        onOpenChangeAction={setEditDialogOpen}
        status={selectedStatus}
        onSuccess={handleOperationSuccess}
      />

      <AttendanceStatusDeleteDialog
        open={deleteDialogOpen}
        onOpenChangeAction={setDeleteDialogOpen}
        status={selectedStatus}
        onSuccess={handleOperationSuccess}
      />
    </div>
  );
}
