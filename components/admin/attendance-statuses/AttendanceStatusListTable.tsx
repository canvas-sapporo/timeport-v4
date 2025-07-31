'use client';

import { Edit, Trash2, Plus, Lock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { AttendanceStatusData } from '@/schemas/attendance';

interface AttendanceStatusListTableProps {
  statuses: AttendanceStatusData[];
  onEditAction: (status: AttendanceStatusData) => void;
  onDeleteAction: (status: AttendanceStatusData) => void;
  onCreateAction: () => void;
}

export default function AttendanceStatusListTable({
  statuses,
  onEditAction,
  onDeleteAction,
  onCreateAction,
}: AttendanceStatusListTableProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">勤怠ステータス一覧</h3>
        <Button onClick={onCreateAction} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          新規作成
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">表示名</TableHead>
              <TableHead className="w-[100px]">システム名</TableHead>
              <TableHead className="w-[80px]">色</TableHead>
              <TableHead className="w-[60px]">順序</TableHead>
              <TableHead className="w-[80px]">状態</TableHead>
              <TableHead className="w-[80px]">必須</TableHead>
              <TableHead className="w-[200px]">説明</TableHead>
              <TableHead className="w-[100px]">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {statuses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                  勤怠ステータスが登録されていません
                </TableCell>
              </TableRow>
            ) : (
              statuses.map((status) => (
                <TableRow key={status.id}>
                  <TableCell>
                    <Badge
                      variant={
                        status.color as
                          | 'default'
                          | 'destructive'
                          | 'outline'
                          | 'secondary'
                          | null
                          | undefined
                      }
                      style={{
                        color: status.font_color,
                        backgroundColor: status.background_color,
                      }}
                    >
                      {status.display_name}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{status.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-4 h-4 rounded border"
                        style={{ backgroundColor: status.background_color }}
                      />
                      <span className="text-sm">{status.color}</span>
                    </div>
                  </TableCell>
                  <TableCell>{status.sort_order}</TableCell>
                  <TableCell>
                    <Badge variant={status.is_active ? 'default' : 'secondary'}>
                      {status.is_active ? '有効' : '無効'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {status.is_required ? (
                      <div className="flex items-center space-x-1">
                        <Lock className="w-3 h-3 text-orange-500" />
                        <span className="text-xs text-orange-600">必須</span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {status.description || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditAction(status)}
                        title="編集"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      {!status.is_required && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteAction(status)}
                          title="削除"
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
