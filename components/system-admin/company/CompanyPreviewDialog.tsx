'use client';
import { useState, useEffect } from 'react';
import {
  Eye,
  Building2,
  MapPin,
  Phone,
  Calendar,
  CheckCircle2,
  XCircle,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { Company } from '@/schemas/company';
import type { CompanyFeatures } from '@/schemas/features';
import type { UserProfile } from '@/schemas/users';
import { getAllCompanyFeatures } from '@/lib/actions/system-admin/features';
import { getAdminUsers } from '@/lib/actions/admin/users';

interface CompanyPreviewDialogProps {
  company: Company;
  children: React.ReactNode;
}

export default function CompanyPreviewDialog({ company, children }: CompanyPreviewDialogProps) {
  const [open, setOpen] = useState(false);
  const [features, setFeatures] = useState<CompanyFeatures['features'] | null>(null);
  const [adminUsers, setAdminUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);

  // 企業機能データと管理者ユーザーデータを取得
  useEffect(() => {
    if (open && company) {
      // 企業機能データを取得
      setLoading(true);
      getAllCompanyFeatures()
        .then((result) => {
          if (result.success) {
            const companyFeature = result.data.find((cf) => cf.company_id === company.id);
            if (companyFeature) {
              setFeatures(companyFeature.features);
            }
          }
        })
        .catch((error) => {
          console.error('企業機能取得エラー:', error);
        })
        .finally(() => {
          setLoading(false);
        });

      // 管理者ユーザーデータを取得
      setUsersLoading(true);
      getAdminUsers(company.id, { role: 'admin' })
        .then((result) => {
          if (result.success) {
            setAdminUsers(result.data);
          }
        })
        .catch((error) => {
          console.error('管理者ユーザー取得エラー:', error);
        })
        .finally(() => {
          setUsersLoading(false);
        });
    }
  }, [open, company]);

  // 日時フォーマット関数
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '--';
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const formatTime = (dateString: string | null | undefined) => {
    if (!dateString) return '--';
    const date = new Date(dateString);
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            企業情報プレビュー
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 企業基本情報 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                基本情報
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">企業名</label>
                  <p className="text-lg font-semibold">{company.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">企業コード</label>
                  <p className="text-lg font-mono">{company.code}</p>
                </div>
              </div>

              {company.address && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    住所
                  </label>
                  <p className="text-base">{company.address}</p>
                </div>
              )}

              {company.phone && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Phone className="w-4 h-4" />
                    電話番号
                  </label>
                  <p className="text-base">{company.phone}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-muted-foreground">ステータス</label>
                <div className="mt-1">
                  {company.is_active ? (
                    <Badge variant="default" className="flex items-center gap-1 w-fit">
                      <CheckCircle2 className="w-4 h-4" />
                      有効
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                      <XCircle className="w-4 h-4" />
                      無効
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 機能設定 */}
          <Card>
            <CardHeader>
              <CardTitle>機能設定</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : features ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="font-medium">スケジュール</span>
                    {features.schedule ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="font-medium">レポート</span>
                    {features.report ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="font-medium">チャット</span>
                    {features.chat ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  機能情報を取得できませんでした
                </p>
              )}
            </CardContent>
          </Card>

          {/* 管理者ユーザー */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                管理者ユーザー
              </CardTitle>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : adminUsers.length > 0 ? (
                <div className="space-y-3">
                  {adminUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-medium">
                          {user.family_name} {user.first_name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {user.family_name_kana} {user.first_name_kana}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-mono">{user.code}</div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  管理者ユーザーが見つかりませんでした
                </p>
              )}
            </CardContent>
          </Card>

          {/* 日時情報 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                日時情報
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">作成日時</label>
                  <div className="mt-1">
                    <p className="font-medium">{formatDate(company.created_at)}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatTime(company.created_at)}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">更新日時</label>
                  <div className="mt-1">
                    <p className="font-medium">{formatDate(company.updated_at)}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatTime(company.updated_at)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            閉じる
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
