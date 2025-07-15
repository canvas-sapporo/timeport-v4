'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useData } from '@/contexts/data-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Building, MapPin, Users, Plus, Edit, Trash2, Settings } from 'lucide-react';

export default function SuperAdminOrganizationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { groups, users } = useData();
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'super_admin') {
      router.push('/login');
      return;
    }
  }, [user, router]);

  if (!user || user.role !== 'super_admin') {
    return null;
  }

  const getChildGroups = (parent_id: string) => {
    return groups.filter(g => g.parentId === parent_id);
  };

  const getUsersByGroup = (groupId: string) => {
    return users.filter(u => u.groupId === groupId && u.isActive);
  };

  const getGroupPath = (group: any) => {
    const pathParts = group.path.split('/').filter(Boolean);
    return pathParts.map((id: string) => {
      const g = groups.find(gr => gr.id === id);
      return g?.name || '';
    }).join(' > ');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">グループ管理</h1>
          <p className="text-gray-600">全社のグループ構造を管理します</p>
        </div>
        <Dialog open={isCreateGroupOpen} onOpenChange={setIsCreateGroupOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              グループ追加
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新規グループ作成</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="groupName">グループ名</Label>
                <Input id="groupName" placeholder="グループ名を入力" />
              </div>
              <div>
                <Label htmlFor="groupDescription">説明</Label>
                <Input id="groupDescription" placeholder="説明を入力" />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateGroupOpen(false)}>
                  キャンセル
                </Button>
                <Button onClick={() => setIsCreateGroupOpen(false)}>
                  作成
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Group Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総グループ数</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{groups.length}</div>
            <p className="text-xs text-muted-foreground">
              階層構造で管理
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総従業員数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.filter(u => u.isActive).length}</div>
            <p className="text-xs text-muted-foreground">
              アクティブユーザー
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">最大階層レベル</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.max(...groups.map(g => g.level))}</div>
            <p className="text-xs text-muted-foreground">
              階層の深さ
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Groups Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building className="w-5 h-5" />
            <span>グループ一覧</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>グループ名</TableHead>
                <TableHead>階層パス</TableHead>
                <TableHead>レベル</TableHead>
                <TableHead>従業員数</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((group) => {
                const groupUsers = getUsersByGroup(group.id);
                
                return (
                  <TableRow key={group.id}>
                    <TableCell className="font-medium">{group.name}</TableCell>
                    <TableCell className="text-sm text-gray-600">{getGroupPath(group)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">レベル {group.level}</Badge>
                    </TableCell>
                    <TableCell>{groupUsers.length}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Group Hierarchy Chart */}
      <Card>
        <CardHeader>
          <CardTitle>グループ階層図</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {groups.filter(g => g.level === 1).map((rootGroup) => {
              const childGroups = getChildGroups(rootGroup.id);
              
              return (
                <div key={rootGroup.id} className="border rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <Building className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-lg">{rootGroup.name}</h3>
                    <Badge variant="outline">レベル {rootGroup.level}</Badge>
                    {rootGroup.description && (
                      <span className="text-sm text-gray-500">- {rootGroup.description}</span>
                    )}
                  </div>
                  
                  {/* Root group members */}
                  {getUsersByGroup(rootGroup.id).length > 0 && (
                    <div className="mb-4 p-3 bg-blue-50 rounded">
                      <div className="font-medium text-sm mb-2">直属メンバー ({getUsersByGroup(rootGroup.id).length}名)</div>
                      <div className="flex flex-wrap gap-2">
                        {getUsersByGroup(rootGroup.id).map((user) => (
                          <Badge key={user.id} variant="secondary">
                            {user.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ml-6">
                    {childGroups.map((childGroup) => {
                      const childUsers = getUsersByGroup(childGroup.id);
                      const grandchildGroups = getChildGroups(childGroup.id);
                      
                      return (
                        <div key={childGroup.id} className="border rounded p-3 bg-gray-50">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <Users className="w-4 h-4 text-green-600" />
                              <span className="font-medium">{childGroup.name}</span>
                            </div>
                            <Badge variant="secondary">レベル {childGroup.level}</Badge>
                          </div>
                          
                          {childGroup.description && (
                            <p className="text-xs text-gray-600 mb-2">{childGroup.description}</p>
                          )}
                          
                          <div className="text-sm text-gray-600">
                            <p>従業員数: {childUsers.length}名</p>
                            {childUsers.length > 0 && (
                              <div className="mt-2">
                                <p className="font-medium">メンバー:</p>
                                <ul className="list-disc list-inside text-xs">
                                  {childUsers.slice(0, 3).map((user) => (
                                    <li key={user.id}>
                                      {user.name} 
                                      <span className="ml-1 text-gray-500">
                                        ({user.role === 'admin' ? '管理者' : user.role === 'super_admin' ? 'システム管理者' : 'メンバー'})
                                      </span>
                                    </li>
                                  ))}
                                  {childUsers.length > 3 && (
                                    <li>他{childUsers.length - 3}名</li>
                                  )}
                                </ul>
                              </div>
                            )}
                            
                            {/* Grandchild groups */}
                            {grandchildGroups.length > 0 && (
                              <div className="mt-3 space-y-2">
                                <p className="font-medium text-xs">サブグループ:</p>
                                {grandchildGroups.map((grandchild) => {
                                  const grandchildUsers = getUsersByGroup(grandchild.id);
                                  return (
                                    <div key={grandchild.id} className="bg-white p-2 rounded border-l-2 border-purple-300">
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium">{grandchild.name}</span>
                                        <Badge variant="outline" className="text-xs">レベル {grandchild.level}</Badge>
                                      </div>
                                      {grandchildUsers.length > 0 && (
                                        <div className="mt-1">
                                          <span className="text-xs text-gray-500">{grandchildUsers.length}名: </span>
                                          <span className="text-xs">
                                            {grandchildUsers.map(u => u.name).join(', ')}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}