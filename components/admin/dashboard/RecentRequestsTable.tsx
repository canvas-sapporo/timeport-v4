'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

type Request = {
  id: string;
  user_id: string;
  title: string;
  status_id: 'pending' | 'approved' | 'rejected';
};
type User = { id: string; family_name: string; first_name: string };

export default function RecentRequestsTable({
  requests,
  users,
}: {
  requests: Request[];
  users: User[];
}) {
  const recentRequests = useMemo(() => requests.slice(0, 5), [requests]);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="w-5 h-5" />
          <span>最近の申請</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>申請者</TableHead>
              <TableHead>種別</TableHead>
              <TableHead>ステータス</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentRequests.map((request) => {
              const requestant = users.find((u) => u.id === request.user_id);
              return (
                <TableRow key={request.id}>
                  <TableCell>
                    {requestant ? `${requestant.family_name} ${requestant.first_name}` : '-'}
                  </TableCell>
                  <TableCell>{request.title}</TableCell>
                  <TableCell>
                    {request.status_id === 'pending' && <Badge variant="secondary">承認待ち</Badge>}
                    {request.status_id === 'approved' && <Badge variant="default">承認済み</Badge>}
                    {request.status_id === 'rejected' && <Badge variant="destructive">却下</Badge>}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
