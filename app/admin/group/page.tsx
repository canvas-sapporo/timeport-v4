'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useData } from '@/contexts/data-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Building, Users, Plus, Edit, Trash2, ChevronRight, FolderTree } from 'lucide-react';

interface HierarchicalGroup {
  id: string;
  parentId?: string;
  name: string;
  description?: string;
  level: number;
  path: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  children?: HierarchicalGroup[];
}

export default function AdminGroupManagementPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { groups, users } = useData();
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [selectedParentGroup, setSelectedParentGroup] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parentId: ''
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

  // グループの階層構造を構築
  const buildGroupHierarchy = (): HierarchicalGroup[] => {
    const rootGroups = groups.filter(g => !g.parentId);
    
    const buildChildren = (parentId: string): HierarchicalGroup[] => {
      return groups
        .filter(g => g.parentId === parentId)
        .map(group => ({
          ...group,
          children: buildChildren(group.id)
        }));
    };

    return rootGroups.map(group => ({
      ...group,
      children: buildChildren(group.id)
    }));
  };

  const getGroupUsers = (groupId: string) => {
    return users.filter(u => u.groupId === groupId);
  };

  const getGroupPath = (group: any) => {
    const pathParts = (group.path || '').split('/').filter(Boolean);
    return pathParts.map((id: string) => {
      const g = groups.find(gr => gr.id === id);
      return g?.name || '';
    }).join(' > ');
  };

  const handleCreateGroup = () => {
    console.log('Creating group:', formData);
    setIsCreateGroupOpen(false);
    setFormData({ name: '', description: '', parentId: '' });
  };

  const renderGroupTree = (groupList: HierarchicalGroup[], level = 0): React.ReactNode[] => {
    const result: React.ReactNode[] = [];
    
    groupList.forEach((group) => {
      result.push(
        <TableRow key={group.id}>
          <TableCell className="w-1/3">
            <div className="flex items-center" style={{ paddingLeft: `${level * 20}px` }}>
              {level > 0 && <ChevronRight className="w-4 h-4 text-gray-400 mr-1 flex-shrink-0" />}
              <FolderTree className="w-4 h-4 text-blue-600 mr-2 flex-shrink-0" />
              <span className="font-medium truncate">{group.name}</span>
            </div>
          </TableCell>
          <TableCell className="w-20 text-center">
            <Badge variant="outline" className="text-xs">レベル {group.level}</Badge>
          </TableCell>
          <TableCell className="w-1/3">
            <div className="text-sm text-gray-600 truncate" title={group.description || '-'}>
              {group.description || '-'}
            </div>
          </TableCell>
          <TableCell className="w-20 text-center">
            <Badge variant="secondary" className="text-xs">{getGroupUsers(group.id).length}名</Badge>
          </TableCell>
          <TableCell className="w-24">
            <div className="flex items-center justify-center space-x-1">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Edit className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:text-red-700">
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
      );
      
      if (group.children && group.children.length > 0) {
        result.push(...renderGroupTree(group.children, level + 1));
      }
    });
    
    return result;
  };

  const hierarchicalGroups = buildGroupHierarchy();
  const totalGroups = groups.length;
  const totalUsers = users.filter(u => u.isActive).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">グループ管理</h1>
          <p className="text-gray-600">階層構造でグループを管理できます</p>
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
                <Input
                  id="groupName"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="グループ名を入力"
                />
              </div>
              <div>
                <Label htmlFor="groupDescription">説明</Label>
                <Textarea
                  id="groupDescription"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="グループの説明を入力"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="parentGroup">親グループ</Label>
                <Select
                  value={formData.parentId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, parentId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="親グループを選択（任意）" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">ルートレベル</SelectItem>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {getGroupPath(group)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateGroupOpen(false)}>
                  キャンセル
                </Button>
                <Button onClick={handleCreateGroup}>
                  作成
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総グループ数</CardTitle>
            <FolderTree className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalGroups}</div>
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
            <div className="text-2xl font-bold">{totalUsers}</div>
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

      {/* Group Hierarchy Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FolderTree className="w-5 h-5" />
            <span>グループ階層</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/3">グループ名</TableHead>
                  <TableHead className="w-20 text-center">レベル</TableHead>
                  <TableHead className="w-1/3">説明</TableHead>
                  <TableHead className="w-20 text-center">メンバー数</TableHead>
                  <TableHead className="w-24 text-center">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {renderGroupTree(hierarchicalGroups)}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Group Details */}
      <Card>
        <CardHeader>
          <CardTitle>グループ詳細</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {hierarchicalGroups.map((rootGroup) => (
              <div key={rootGroup.id} className="border rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-4">
                  <FolderTree className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-lg">{rootGroup.name}</h3>
                  <Badge variant="outline">レベル {rootGroup.level}</Badge>
                </div>
                
                {rootGroup.description && (
                  <p className="text-sm text-gray-600 mb-4">{rootGroup.description}</p>
                )}

                <div className="space-y-3">
                  {/* Root group members */}
                  {getGroupUsers(rootGroup.id).length > 0 && (
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="font-medium text-sm mb-2">直属メンバー ({getGroupUsers(rootGroup.id).length}名)</div>
                      <div className="flex flex-wrap gap-2">
                        {getGroupUsers(rootGroup.id).map((user) => (
                          <Badge key={user.id} variant="secondary">
                            {user.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Child groups */}
                  {rootGroup.children && rootGroup.children.length > 0 && (
                    <div className="ml-4 space-y-3">
                      {rootGroup.children.map((childGroup) => (
                        <div key={childGroup.id} className="border-l-2 border-gray-200 pl-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <FolderTree className="w-4 h-4 text-green-600" />
                            <span className="font-medium">{childGroup.name}</span>
                            <Badge variant="outline">レベル {childGroup.level}</Badge>
                          </div>
                          
                          {childGroup.description && (
                            <p className="text-xs text-gray-600 mb-2">{childGroup.description}</p>
                          )}

                          {getGroupUsers(childGroup.id).length > 0 && (
                            <div className="bg-green-50 p-2 rounded text-sm">
                              <div className="font-medium mb-1">メンバー ({getGroupUsers(childGroup.id).length}名)</div>
                              <div className="flex flex-wrap gap-1">
                                {getGroupUsers(childGroup.id).map((user) => (
                                  <Badge key={user.id} variant="secondary" className="text-xs">
                                    {user.name}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Grandchild groups */}
                          {childGroup.children && childGroup.children.length > 0 && (
                            <div className="ml-4 mt-2 space-y-2">
                              {childGroup.children.map((grandchildGroup) => (
                                <div key={grandchildGroup.id} className="border-l-2 border-gray-100 pl-3">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <FolderTree className="w-3 h-3 text-purple-600" />
                                    <span className="text-sm font-medium">{grandchildGroup.name}</span>
                                    <Badge variant="outline" className="text-xs">レベル {grandchildGroup.level}</Badge>
                                  </div>
                                  
                                  {getGroupUsers(grandchildGroup.id).length > 0 && (
                                    <div className="bg-purple-50 p-2 rounded text-xs">
                                      <div className="font-medium mb-1">メンバー ({getGroupUsers(grandchildGroup.id).length}名)</div>
                                      <div className="flex flex-wrap gap-1">
                                        {getGroupUsers(grandchildGroup.id).map((user) => (
                                          <Badge key={user.id} variant="secondary" className="text-xs">
                                            {user.name}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}