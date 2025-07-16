'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useData } from '@/contexts/data-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, Plus, Edit, Trash2, Search, Filter, UserCheck, UserX } from 'lucide-react';

export default function AdminUsersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { users, groups } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    employeeId: '',
    name: '',
    email: '',
    role: 'user',
    groupId: '',
    hireDate: '',
    isActive: true
  });

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/login');
      return;
    }
  }, [user, router]);

  if (!user || user.role !== 'admin') {
    return null;
  }

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         u.employeeId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGroup = selectedGroup === 'all' || u.groupId === selectedGroup;
    const matchesStatus = selectedStatus === 'all' || 
                         (selectedStatus === 'active' && u.isActive) ||
                         (selectedStatus === 'inactive' && !u.isActive);
    
    return matchesSearch && matchesGroup && matchesStatus;
  });

  const handleCreateUser = () => {
    // In a real app, this would create a new user
    console.log('Creating user:', formData);
    setIsCreateDialogOpen(false);
    resetForm();
  };

  const handleEditUser = (userData: any) => {
    setEditingUser(userData);
    setFormData({
      employeeId: userData.employeeId,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      groupId: userData.groupId,
      hireDate: userData.hireDate,
      isActive: userData.isActive
    });
  };

  const handleUpdateUser = () => {
    // In a real app, this would update the user
    console.log('Updating user:', editingUser.id, formData);
    setEditingUser(null);
    resetForm();
  };

  const handleDeleteUser = (userId: string) => {
    // In a real app, this would delete the user
    console.log('Deleting user:', userId);
  };

  const resetForm = () => {
    setFormData({
      employeeId: '',
      name: '',
      email: '',
      role: 'user',
      groupId: '',
      hireDate: '',
      isActive: true
    });
  };

  const getUserGroup = (groupId: string) => {
    return groups.find(g => g.id === groupId);
  };

  const getGroupPath = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return '';
    
    const pathParts = group.path.split('/').filter(Boolean);
    return pathParts.map((id: string) => {
      const g = groups.find(gr => gr.id === id);
      return g?.name || '';
    }).join(' > ');
  };

  const activeUsers = users.filter(u => u.isActive).length;
  const inactiveUsers = users.filter(u => !u.isActive).length;
  const adminUsers = users.filter(u => u.role === 'admin').length;
  const regularUsers = users.filter(u => u.role === 'member').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ユーザー管理</h1>
          <p className="text-gray-600">システムユーザーの管理を行います</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="timeport-primary">
              <Plus className="w-4 h-4 mr-2" />
              新規ユーザー
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>新規ユーザー作成</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="employeeId">社員番号</Label>
                  <Input
                    id="employeeId"
                    value={formData.employeeId}
                    onChange={(e) => setFormData(prev => ({...prev, employeeId: e.target.value}))}
                    placeholder="A001"
                  />
                </div>
                <div>
                  <Label htmlFor="name">氏名</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
                    placeholder="山田太郎"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="email">メールアドレス</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))}
                  placeholder="yamada@timeport.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="role">権限</Label>
                  <Select value={formData.role} onValueChange={(value) => setFormData(prev => ({...prev, role: value}))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">一般ユーザー</SelectItem>
                      <SelectItem value="admin">管理者</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="group">グループ</Label>
                  <Select value={formData.groupId} onValueChange={(value) => setFormData(prev => ({...prev, groupId: value}))}>
                    <SelectTrigger>
                      <SelectValue placeholder="グループを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {getGroupPath(group.id)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="hireDate">入社日</Label>
                <Input
                  id="hireDate"
                  type="date"
                  value={formData.hireDate}
                  onChange={(e) => setFormData(prev => ({...prev, hireDate: e.target.value}))}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  キャンセル
                </Button>
                <Button onClick={handleCreateUser}>
                  作成
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">総ユーザー数</p>
                <p className="text-2xl font-bold text-gray-900">{users.length}</p>
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
                <p className="text-2xl font-bold text-green-600">{activeUsers}</p>
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
                <p className="text-2xl font-bold text-red-600">{inactiveUsers}</p>
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
                <p className="text-2xl font-bold text-purple-600">{adminUsers}</p>
              </div>
              <Users className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="w-5 h-5" />
            <span>フィルター</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="名前、メール、社員番号で検索"
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
                    {getGroupPath(group.id)}
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
            
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setSelectedGroup('all');
                setSelectedStatus('all');
              }}
            >
              リセット
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>ユーザー一覧</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>社員番号</TableHead>
                <TableHead>氏名</TableHead>
                <TableHead>メールアドレス</TableHead>
                <TableHead>グループ</TableHead>
                <TableHead>権限</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>入社日</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((userData) => {
                const userGroup = getUserGroup(userData.groupId);
                
                return (
                  <TableRow key={userData.id}>
                    <TableCell className="font-medium">{userData.employeeId}</TableCell>
                    <TableCell>{userData.name}</TableCell>
                    <TableCell>{userData.email}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {getGroupPath(userData.groupId) || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={userData.role === 'admin' ? 'default' : 'secondary'}>
                        {userData.role === 'admin' ? '管理者' : '一般ユーザー'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={userData.isActive ? 'default' : 'destructive'}>
                        {userData.isActive ? '有効' : '無効'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {userData.hireDate ? new Date(userData.hireDate).toLocaleDateString('ja-JP') : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditUser(userData)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>ユーザー編集</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor="edit-employeeId">社員番号</Label>
                                  <Input
                                    id="edit-employeeId"
                                    value={formData.employeeId}
                                    onChange={(e) => setFormData(prev => ({...prev, employeeId: e.target.value}))}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="edit-name">氏名</Label>
                                  <Input
                                    id="edit-name"
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
                                  />
                                </div>
                              </div>
                              
                              <div>
                                <Label htmlFor="edit-email">メールアドレス</Label>
                                <Input
                                  id="edit-email"
                                  type="email"
                                  value={formData.email}
                                  onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))}
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor="edit-role">権限</Label>
                                  <Select value={formData.role} onValueChange={(value) => setFormData(prev => ({...prev, role: value}))}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="user">一般ユーザー</SelectItem>
                                      <SelectItem value="admin">管理者</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label htmlFor="edit-group">グループ</Label>
                                  <Select value={formData.groupId} onValueChange={(value) => setFormData(prev => ({...prev, groupId: value}))}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {groups.map((group) => (
                                        <SelectItem key={group.id} value={group.id}>
                                          {getGroupPath(group.id)}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor="edit-hireDate">入社日</Label>
                                  <Input
                                    id="edit-hireDate"
                                    type="date"
                                    value={formData.hireDate}
                                    onChange={(e) => setFormData(prev => ({...prev, hireDate: e.target.value}))}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="edit-status">ステータス</Label>
                                  <Select 
                                    value={formData.isActive ? 'active' : 'inactive'} 
                                    onValueChange={(value) => setFormData(prev => ({...prev, isActive: value === 'active'}))}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="active">有効</SelectItem>
                                      <SelectItem value="inactive">無効</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              <div className="flex justify-end space-x-2">
                                <Button variant="outline" onClick={() => setEditingUser(null)}>
                                  キャンセル
                                </Button>
                                <Button onClick={handleUpdateUser}>
                                  更新
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteUser(userData.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
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