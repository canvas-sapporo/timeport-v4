'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useData } from '@/contexts/data-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FormInput, Plus, Edit, Trash2, Eye, ToggleLeft, ToggleRight } from 'lucide-react';
import Link from 'next/link';

export default function AdminRequestTypesPage() {
  const { user } = useAuth();
  const { requestTypes } = useData();

  if (!user || user.role !== 'admin') {
    return <div>アクセス権限がありません</div>;
  }

  const handleToggleStatus = (typeId: string, currentStatus: boolean) => {
    // In a real app, this would update the status
    console.log(`Toggle status for ${typeId}: ${!currentStatus}`);
  };

  const handleDelete = (typeId: string, typeName: string) => {
    if (confirm(`申請種別「${typeName}」を削除しますか？`)) {
      console.log('Delete request type:', typeId);
      // 実際の削除処理はここに実装
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">申請フォーム管理</h1>
          <p className="text-gray-600">申請フォームの作成・編集・管理を行います</p>
        </div>
        <Link href="/admin/request-types/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            新規フォーム作成
          </Button>
        </Link>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">総申請種別数</p>
                <p className="text-2xl font-bold text-gray-900">{requestTypes.length}</p>
              </div>
              <FormInput className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">有効な申請種別</p>
                <p className="text-2xl font-bold text-green-600">
                  {requestTypes.filter(t => t.isActive).length}
                </p>
              </div>
              <ToggleRight className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">無効な申請種別</p>
                <p className="text-2xl font-bold text-gray-600">
                  {requestTypes.filter(t => !t.isActive).length}
                </p>
              </div>
              <ToggleLeft className="w-8 h-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Request Types Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FormInput className="w-5 h-5" />
            <span>申請フォーム一覧</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
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
              {requestTypes.map((type) => (
                <TableRow key={type.id}>
                  <TableCell className="font-medium">{type.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{type.code}</Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {type.description || '-'}
                  </TableCell>
                  <TableCell>{type.formFields.length}項目</TableCell>
                  <TableCell>
                    <Badge variant={type.isActive ? "default" : "secondary"}>
                      {type.isActive ? '有効' : '無効'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(type.updatedAt).toLocaleDateString('ja-JP')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Link href={`/admin/request-types/${type.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Link href={`/admin/request-types/${type.id}/edit`}>
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleStatus(type.id, type.isActive)}
                      >
                        {type.isActive ? (
                          <ToggleRight className="w-4 h-4 text-green-600" />
                        ) : (
                          <ToggleLeft className="w-4 h-4 text-gray-600" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600"
                        onClick={() => handleDelete(type.id, type.name)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {requestTypes.length === 0 && (
            <div className="text-center py-8">
              <FormInput className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">申請フォームがありません</p>
              <Link href="/admin/request-types/new">
                <Button className="mt-4">
                  最初のフォームを作成
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}