'use client';

import { useState } from 'react';
import { Search, Filter, UserCheck, UserX, Users } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import { Button } from '@/components/ui/button';
import UserCreateDialog from './UserCreateDialog';
import UserEditDialog from './UserEditDialog';
import UserDeleteDialog from './UserDeleteDialog';
import type { UserProfile } from '@/types/user_profiles';
import type { Group } from '@/types/groups';
import type { UUID } from '@/types/common';

interface UserListTableProps {
  users: (UserProfile & { groups: Group[] })[];
  groups: Group[];
  companyId: UUID;
  stats: {
    total: number;
    active: number;
    inactive: number;
    admin: number;
    member: number;
  };
  onRefresh: () => void;
}

export default function UserListTable({
  users,
  groups,
  companyId,
  stats,
  onRefresh,
}: UserListTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedRole, setSelectedRole] = useState('all');

  // フィルタリング
  const filteredUsers = users.filter((user) => {
    const fullName = `${user.family_name} ${user.first_name}`;
    const fullNameKana = `${user.family_name_kana} ${user.first_name_kana}`;
    const matchesSearch =
      fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fullNameKana.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.phone && user.phone.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesGroup = selectedGroup === 'all' || user.groups.some((g) => g.id === selectedGroup);

    const matchesStatus =
      selectedStatus === 'all' ||
      (selectedStatus === 'active' && user.is_active) ||
      (selectedStatus === 'inactive' && !user.is_active);

    const matchesRole =
      selectedRole === 'all' ||
      (selectedRole === 'admin' && user.role === 'admin') ||
      (selectedRole === 'member' && user.role === 'member');

    return matchesSearch && matchesGroup && matchesStatus && matchesRole;
  });

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedGroup('all');
    setSelectedStatus('all');
    setSelectedRole('all');
  };

  return (
    <div className="space-y-6">
      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">総ユーザー数</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">有効ユーザー</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <UserCheck className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">無効ユーザー</p>
                <p className="text-2xl font-bold text-red-600">{stats.inactive}</p>
              </div>
              <UserX className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">管理者</p>
                <p className="text-2xl font-bold text-purple-600">{stats.admin}</p>
              </div>
              <Users className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">メンバー</p>
                <p className="text-2xl font-bold text-orange-600">{stats.member}</p>
              </div>
              <Users className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* フィルター */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="w-5 h-5" />
            <span>フィルター</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="名前、カナ、メール、メンバー番号、電話番号で検索"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={selectedGroup} onValueChange={setSelectedGroup}>
              <SelectTrigger>
                <SelectValue placeholder="グループで絞り込み" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全てのグループ</SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.code} - {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="ステータスで絞り込み" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全てのステータス</SelectItem>
                <SelectItem value="active">有効</SelectItem>
                <SelectItem value="inactive">無効</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger>
                <SelectValue placeholder="権限で絞り込み" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全ての権限</SelectItem>
                <SelectItem value="admin">管理者</SelectItem>
                <SelectItem value="member">メンバー</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={resetFilters}>
              リセット
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ユーザー一覧 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>ユーザー一覧</span>
          </CardTitle>
          <UserCreateDialog companyId={companyId} groups={groups} onSuccess={onRefresh} />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>メンバー番号</TableHead>
                <TableHead>氏名</TableHead>
                <TableHead>メールアドレス</TableHead>
                <TableHead>所属グループ</TableHead>
                <TableHead>権限</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.code}</TableCell>
                  <TableCell>{`${user.family_name} ${user.first_name}`}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {user.groups.map((group) => (
                        <Badge key={group.id} variant="outline" className="text-xs">
                          <div className="flex items-center space-x-1">
                            <Users className="w-3 h-3" />
                            <span>{group.name}</span>
                            {group.code && <span className="text-gray-500">({group.code})</span>}
                          </div>
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                      {user.role === 'admin' ? '管理者' : 'メンバー'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.is_active ? 'default' : 'destructive'}>
                      {user.is_active ? '有効' : '無効'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <UserEditDialog
                        user={user}
                        groups={groups}
                        companyId={companyId}
                        onSuccess={onRefresh}
                      />
                      <UserDeleteDialog user={user} onSuccess={onRefresh} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">条件に一致するユーザーが見つかりません</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
