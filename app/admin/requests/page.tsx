'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useData } from '@/contexts/data-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Check, X, Eye } from 'lucide-react';
import { useState } from 'react';

export default function AdminRequestsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { requests, users, updateRequest } = useData();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/login');
      return;
    }
  }, [user, router]);

  if (!user || user.role !== 'admin') {
    return null;
  }

  const handleApprove = (requestId: string) => {
    updateRequest(requestId, {
      status: 'approved',
      approved_by: user.id,
      approved_at: new Date().toISOString()
    });
  };

  const handleReject = (requestId: string) => {
    updateRequest(requestId, {
      status: 'rejected',
      rejection_reason: rejectionReason || '管理者により却下されました'
    });
    setRejectionReason('');
  };

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

  const formatDate = (date?: string) => (typeof date === 'string' ? new Date(date).toLocaleDateString('ja-JP') : '-');

  const pendingRequests = requests.filter(a => a.status === 'pending');
  const allRequests = requests.sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
    return bTime - aTime;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">申請管理</h1>
        <p className="text-gray-600">社員からの申請を確認・承認できます</p>
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>承認待ち申請 ({pendingRequests.length}件)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>申請者</TableHead>
                  <TableHead>種別</TableHead>
                  <TableHead>申請日</TableHead>
                  <TableHead>対象日</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRequests.map((request) => {
                  const requestant = users.find(u => u.id === request.user_id);
                  return (
                    <TableRow key={request.id}>
                      <TableCell>{requestant?.name}</TableCell>
                      <TableCell>{request.title}</TableCell>
                      <TableCell>
                        {formatDate(request.created_at)}
                      </TableCell>
                      <TableCell>
                        {request.target_date
                          ? formatDate(request.target_date)
                          : request.start_date && request.end_date
                            ? `${formatDate(request.start_date)} - ${formatDate(request.end_date)}`
                            : request.start_date
                              ? formatDate(request.start_date)
                              : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedRequest(request)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>申請詳細</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <div className="font-medium">申請者</div>
                                  <div className="text-sm text-gray-600">{requestant?.name}</div>
                                </div>
                                <div>
                                  <div className="font-medium">申請種別</div>
                                  <div className="text-sm text-gray-600">{request.title}</div>
                                </div>
                                <div>
                                  <div className="font-medium">申請内容</div>
                                  <div className="text-sm text-gray-600 space-y-1">
                                    {request.form_data
                                      ? Object.entries(request.form_data).map(([key, value]) => (
                                          <div key={key}>
                                            <span className="font-medium">{key}:</span> {value as string}
                                          </div>
                                        ))
                                      : <div className="text-gray-400">申請内容なし</div>
                                    }
                                  </div>
                                </div>
                                <div className="flex space-x-2">
                                  <Button
                                    onClick={() => handleApprove(request.id)}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    <Check className="w-4 h-4 mr-2" />
                                    承認
                                  </Button>
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button variant="destructive">
                                        <X className="w-4 h-4 mr-2" />
                                        却下
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>申請却下</DialogTitle>
                                      </DialogHeader>
                                      <div className="space-y-4">
                                        <div>
                                          <label className="block text-sm font-medium mb-2">却下理由</label>
                                          <Textarea
                                            value={rejectionReason}
                                            onChange={(e) => setRejectionReason(e.target.value)}
                                            placeholder="却下理由を入力してください"
                                            rows={3}
                                          />
                                        </div>
                                        <div className="flex justify-end space-x-2">
                                          <Button variant="outline">キャンセル</Button>
                                          <Button
                                            variant="destructive"
                                            onClick={() => handleReject(request.id)}
                                          >
                                            却下する
                                          </Button>
                                        </div>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* All Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>全申請履歴</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>申請者</TableHead>
                <TableHead>種別</TableHead>
                <TableHead>申請日</TableHead>
                <TableHead>対象日</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>承認者</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allRequests.map((request) => {
                const requestant = users.find(u => u.id === request.user_id);
                const approver = request.approved_by ? users.find(u => u.id === request.approved_by) : null;
                
                return (
                  <TableRow key={request.id}>
                    <TableCell>{requestant?.name}</TableCell>
                    <TableCell>{request.title}</TableCell>
                    <TableCell>
                      {formatDate(request.created_at)}
                    </TableCell>
                    <TableCell>
                      {request.target_date
                        ? formatDate(request.target_date)
                        : request.start_date && request.end_date
                          ? `${formatDate(request.start_date)} - ${formatDate(request.end_date)}`
                          : request.start_date
                            ? formatDate(request.start_date)
                            : '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(request.status ?? '-')}</TableCell>
                    <TableCell>{approver?.name || '-'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}