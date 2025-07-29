'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Edit, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { getReportTemplates, deleteReportTemplate } from '@/lib/actions/admin/report-templates';
import type { ReportTemplate } from '@/types/report';

export default function ReportTemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const { toast } = useToast();

  // テンプレート一覧を取得
  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      const result = await getReportTemplates();

      if (result.success && result.data) {
        setTemplates(result.data);
      } else {
        toast({
          title: 'エラー',
          description: result.error || 'テンプレートの取得に失敗しました',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('テンプレート取得エラー:', error);
      toast({
        title: 'エラー',
        description: 'テンプレートの取得に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // テンプレート削除
  const handleDelete = async (id: string) => {
    try {
      setIsDeleting(id);
      const result = await deleteReportTemplate(id);

      if (result.success) {
        toast({
          title: '成功',
          description: 'テンプレートを削除しました',
        });
        fetchTemplates(); // 一覧を再取得
      } else {
        toast({
          title: 'エラー',
          description: result.error || 'テンプレートの削除に失敗しました',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('テンプレート削除エラー:', error);
      toast({
        title: 'エラー',
        description: 'テンプレートの削除に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(null);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">読み込み中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">レポート管理</h1>
          <p className="text-muted-foreground mt-2">レポートテンプレートの作成・管理を行います</p>
        </div>
        <Button asChild>
          <a href="/admin/report-templates/create">
            <Plus className="mr-2 h-4 w-4" />
            新規テンプレート作成
          </a>
        </Button>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総テンプレート数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{templates.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">有効テンプレート</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{templates.filter((t) => t.is_active).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">無効テンプレート</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{templates.filter((t) => !t.is_active).length}</div>
          </CardContent>
        </Card>
      </div>

      {/* テンプレート一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>テンプレート一覧</CardTitle>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground mb-4">テンプレートがありません</div>
              <Button asChild>
                <a href="/admin/report-templates/create">
                  <Plus className="mr-2 h-4 w-4" />
                  最初のテンプレートを作成
                </a>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>テンプレート名</TableHead>
                  <TableHead>説明</TableHead>
                  <TableHead>グループ</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>作成日</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell>{template.description || '-'}</TableCell>
                    <TableCell>{template.group_id ? '特定グループ' : '全グループ'}</TableCell>
                    <TableCell>
                      <Badge variant={template.is_active ? 'default' : 'secondary'}>
                        {template.is_active ? '有効' : '無効'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(template.created_at).toLocaleDateString('ja-JP')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            router.push(`/admin/report-templates/${template.id}/preview`)
                          }
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/admin/report-templates/${template.id}/edit`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isDeleting === template.id}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>テンプレートを削除</AlertDialogTitle>
                              <AlertDialogDescription>
                                「{template.name}」を削除しますか？ この操作は取り消せません。
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>キャンセル</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(template.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                削除
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
