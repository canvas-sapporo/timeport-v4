'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useData } from '@/contexts/data-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FileText, Plus, Eye } from 'lucide-react';

export default function MemberRequestsPage() {
  const { user } = useAuth();
  const { requests, requestTypes, createRequest } = useData();
  const router = useRouter();
  const [selectedRequestType, setSelectedRequestType] = useState<string>('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!user || user.role !== 'member') {
      router.push('/login');
      return;
    }
  }, [user, router]);

  if (!user || user.role !== 'member') {
    return null;
  }

  const userRequests = requests.filter(r => r.userId === user.id);
  const activeRequestTypes = requestTypes.filter(rt => rt.isActive);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">承認待ち</Badge>;
      case 'approved':
        return <Badge variant="default">承認済み</Badge>;
      case 'rejected':
        return <Badge variant="destructive">却下</Badge>;
      default:
        return <Badge variant="outline">-</Badge>;
    }
  };

  const handleCreateRequest = () => {
    if (!selectedRequestType) return;

    const requestType = requestTypes.find(rt => rt.id === selectedRequestType);
    if (!requestType) return;

    createRequest({
      userId: user.id,
      requestTypeId: selectedRequestType,
      title: requestType.name,
      formData: formData,
      targetDate: formData.targetDate,
      startDate: formData.startDate,
      endDate: formData.endDate,
      status: 'pending'
    });

    setIsCreateDialogOpen(false);
    setSelectedRequestType('');
    setFormData({});
  };

  const renderFormField = (field: any) => {
    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            value={formData[field.name] || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, [field.name]: e.target.value }))}
            placeholder={field.placeholder}
            rows={3}
          />
        );
      case 'select':
        return (
          <Select
            value={formData[field.name] || ''}
            onValueChange={(value) => setFormData(prev => ({ ...prev, [field.name]: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder || `${field.label}を選択`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      default:
        return (
          <Input
            type={field.type}
            value={formData[field.name] || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, [field.name]: e.target.value }))}
            placeholder={field.placeholder}
          />
        );
    }
  };

  const selectedType = requestTypes.find(rt => rt.id === selectedRequestType);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">申請</h1>
          <p className="text-gray-600">各種申請の作成・確認ができます</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="timeport-primary">
              <Plus className="w-4 h-4 mr-2" />
              新規申請
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>新規申請作成</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="requestType">申請種別</Label>
                <Select value={selectedRequestType} onValueChange={setSelectedRequestType}>
                  <SelectTrigger>
                    <SelectValue placeholder="申請種別を選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeRequestTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedType && (
                <div className="space-y-4">
                  <h3 className="font-medium">{selectedType.name}</h3>
                  {selectedType.formFields
                    .sort((a, b) => a.order - b.order)
                    .map((field) => (
                      <div key={field.id}>
                        <Label htmlFor={field.name}>
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </Label>
                        {renderFormField(field)}
                      </div>
                    ))}
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  キャンセル
                </Button>
                <Button onClick={handleCreateRequest} disabled={!selectedRequestType}>
                  申請する
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>申請履歴</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>申請種別</TableHead>
                <TableHead>申請日</TableHead>
                <TableHead>対象日</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>承認者</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>{request.title}</TableCell>
                  <TableCell>
                    {new Date(request.createdAt).toLocaleDateString('ja-JP')}
                  </TableCell>
                  <TableCell>
                    {request.targetDate 
                      ? new Date(request.targetDate).toLocaleDateString('ja-JP')
                      : request.startDate 
                      ? `${new Date(request.startDate).toLocaleDateString('ja-JP')} - ${new Date(request.endDate || request.startDate).toLocaleDateString('ja-JP')}`
                      : '-'
                    }
                  </TableCell>
                  <TableCell>{getStatusBadge(request.status)}</TableCell>
                  <TableCell>
                    {request.approvedBy ? '管理者' : '-'}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {userRequests.length === 0 && (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">申請履歴がありません</p>
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="mt-4"
              >
                最初の申請を作成
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}