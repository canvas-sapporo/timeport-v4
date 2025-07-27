'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Settings } from 'lucide-react';

import { useAuth } from '@/contexts/auth-context';
import { getAttendanceStatuses } from '@/lib/actions/attendance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { AttendanceStatusEntity } from '@/types/attendance';
import AttendanceStatusListTable from '@/components/admin/attendance-statuses/AttendanceStatusListTable';
import AttendanceStatusCreateDialog from '@/components/admin/attendance-statuses/AttendanceStatusCreateDialog';
import AttendanceStatusEditDialog from '@/components/admin/attendance-statuses/AttendanceStatusEditDialog';
import AttendanceStatusDeleteDialog from '@/components/admin/attendance-statuses/AttendanceStatusDeleteDialog';

export default function AdminAttendanceStatusesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [statuses, setStatuses] = useState<AttendanceStatusEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ダイアログの状態
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatusEntity | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/login');
      return;
    }
  }, [user, router]);

  useEffect(() => {
    if (user?.company_id) {
      fetchStatuses().then(() => {});
    }
  }, [user]);

  const fetchStatuses = async () => {
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
  };

  const handleCreate = () => {
    setCreateDialogOpen(true);
  };

  const handleEdit = (status: AttendanceStatusEntity) => {
    setSelectedStatus(status);
    setEditDialogOpen(true);
  };

  const handleDelete = (status: AttendanceStatusEntity) => {
    setSelectedStatus(status);
    setDeleteDialogOpen(true);
  };

  const handleOperationSuccess = () => {
    fetchStatuses();
    toast({
      title: '操作完了',
      description: '勤怠ステータスが正常に更新されました',
    });
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <p className="text-red-600">{error}</p>
          <Button onClick={fetchStatuses} className="mt-4">
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
        </div>
      </div>

      {/* 統計情報 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">総ステータス数</p>
                <p className="text-2xl font-bold text-gray-900">{statuses.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Badge className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">有効ステータス</p>
                <p className="text-2xl font-bold text-gray-900">
                  {statuses.filter((s) => s.is_active).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Badge className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">必須ステータス</p>
                <p className="text-2xl font-bold text-gray-900">
                  {statuses.filter((s) => s.is_required).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <Badge className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">カスタムステータス</p>
                <p className="text-2xl font-bold text-gray-900">
                  {statuses.filter((s) => !s.is_required).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Badge className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ステータス一覧 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Badge className="w-5 h-5" />
            <span>勤怠ステータス一覧</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AttendanceStatusListTable
            statuses={statuses}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onCreate={handleCreate}
          />
        </CardContent>
      </Card>

      {/* 作成ダイアログ */}
      <AttendanceStatusCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        companyId={user.company_id || ''}
        onSuccess={handleOperationSuccess}
      />

      {/* 編集ダイアログ */}
      <AttendanceStatusEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        status={selectedStatus}
        onSuccess={handleOperationSuccess}
      />

      {/* 削除ダイアログ */}
      <AttendanceStatusDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        status={selectedStatus}
        onSuccess={handleOperationSuccess}
      />
    </div>
  );
}
