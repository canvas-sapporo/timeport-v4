'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Settings, Save, Building, FileText, Search, Filter } from 'lucide-react';

import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getAllCompanyFeatures, toggleFeature } from '@/lib/actions/system-admin/features';
import { getCompanies } from '@/lib/actions/system-admin/company';
import type { Company } from '@/schemas/company';

interface CompanyFeature {
  company_id: string;
  company_name: string;
  features: {
    chat: boolean;
    report: boolean;
    schedule: boolean;
  };
}

export default function SuperAdminFeaturesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyFeatures, setCompanyFeatures] = useState<CompanyFeature[]>([]);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  // URLパラメータから企業IDを取得
  const selectedCompanyId = searchParams.get('company');

  useEffect(() => {
    if (!user || user.role !== 'system-admin') {
      router.push('/login');
      return;
    }
  }, [user, router]);

  // 企業データと機能データを取得
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 企業データを取得
        const companiesResult = await getCompanies();
        if (companiesResult.success) {
          setCompanies(companiesResult.data.companies);
        }

        // 企業機能データを取得
        const featuresResult = await getAllCompanyFeatures();
        if (featuresResult.success) {
          setCompanyFeatures(featuresResult.data);
        }
      } catch (error) {
        console.error('データ取得エラー:', error);
        toast({
          title: 'エラー',
          description: 'データの取得に失敗しました',
          variant: 'destructive',
        });
      }
    };

    fetchData();
  }, [toast]);

  // フィルタリングされた企業
  const filteredCompanies = useMemo(() => {
    if (!search) return companies;

    return companies.filter(
      (company) =>
        company.name.toLowerCase().includes(search.toLowerCase()) ||
        company.code.toLowerCase().includes(search.toLowerCase())
    );
  }, [companies, search]);

  // 機能定義
  const featureDefinitions = [
    {
      key: 'schedule',
      name: 'スケジュール',
      description: 'スケジュール管理機能',
    },
    {
      key: 'report',
      name: 'レポート',
      description: 'レポート作成・管理機能',
    },
    {
      key: 'chat',
      name: 'チャット',
      description: 'チャット機能',
    },
  ];

  // 機能切り替えハンドラー
  const handleFeatureToggle = async (companyId: string, featureCode: string, enabled: boolean) => {
    const loadingKey = `${companyId}-${featureCode}`;

    // 少し遅延してからローディング状態を開始
    const loadingTimeout = setTimeout(() => {
      setLoadingStates((prev) => ({ ...prev, [loadingKey]: true }));
    }, 100);

    try {
      const result = await toggleFeature({
        company_id: companyId,
        feature_code: featureCode,
        is_active: enabled,
      });

      if (result.success) {
        // ローカル状態を更新
        setCompanyFeatures((prev) =>
          prev.map((company) =>
            company.company_id === companyId
              ? {
                  ...company,
                  features: {
                    ...company.features,
                    [featureCode]: enabled,
                  },
                }
              : company
          )
        );

        toast({
          title: '成功',
          description: `${featureCode === 'chat' ? 'チャット' : featureCode === 'report' ? 'レポート' : 'スケジュール'}機能を${enabled ? '有効' : '無効'}にしました`,
        });
      } else {
        toast({
          title: 'エラー',
          description: '機能の切り替えに失敗しました',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('機能切り替えエラー:', error);
      toast({
        title: 'エラー',
        description: '機能の切り替えに失敗しました',
        variant: 'destructive',
      });
    } finally {
      clearTimeout(loadingTimeout);
      setLoadingStates((prev) => ({ ...prev, [loadingKey]: false }));
    }
  };

  // 企業の機能データを取得
  const getCompanyFeatures = (companyId: string) => {
    const companyFeature = companyFeatures.find((cf) => cf.company_id === companyId);
    return companyFeature?.features || { chat: false, report: false, schedule: false };
  };

  // 選択された企業のみを表示するかどうか
  const displayCompanies = selectedCompanyId
    ? filteredCompanies.filter((company) => company.id === selectedCompanyId)
    : filteredCompanies;

  if (!user || user.role !== 'system-admin') {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">機能管理</h1>
          <p className="text-gray-600">各企業の機能利用設定を管理します</p>
        </div>
        {selectedCompanyId && (
          <Button variant="outline" onClick={() => router.push('/system-admin/features')}>
            全企業表示
          </Button>
        )}
      </div>

      {/* 企業検索フィルタ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            企業検索
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="企業名、コードで検索"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {displayCompanies.map((company) => {
        const features = getCompanyFeatures(company.id);
        const companyFeature = companyFeatures.find((cf) => cf.company_id === company.id);

        return (
          <Card key={company.id}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building className="w-5 h-5" />
                <span>{company.name}</span>
                <Badge variant={company.is_active ? 'default' : 'secondary'}>
                  {company.is_active ? '有効' : '無効'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>機能名</TableHead>
                    <TableHead>説明</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>設定</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {featureDefinitions.map((feature) => {
                    const isEnabled = features[feature.key as keyof typeof features];
                    const isLoading = loadingStates[`${company.id}-${feature.key}`];

                    return (
                      <TableRow key={feature.key}>
                        <TableCell className="font-medium">{feature.name}</TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {feature.description}
                        </TableCell>
                        <TableCell>
                          <Badge variant={isEnabled ? 'default' : 'secondary'}>
                            {isEnabled ? '有効' : '無効'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="relative">
                            <Switch
                              checked={isEnabled}
                              onCheckedChange={(checked) =>
                                handleFeatureToggle(company.id, feature.key, checked)
                              }
                              disabled={isLoading || !company.is_active}
                            />
                            {isLoading && (
                              <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
                                <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}

      {displayCompanies.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">
              {search ? '検索条件に一致する企業が見つかりません' : '企業データがありません'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* 機能利用状況サマリー */}
      {!selectedCompanyId && companyFeatures.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="w-5 h-5" />
              <span>機能利用状況</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {featureDefinitions.map((feature) => {
                const enabledCount = companyFeatures.reduce(
                  (count, company) =>
                    count +
                    (company.features[feature.key as keyof typeof company.features] ? 1 : 0),
                  0
                );
                const totalCount = companyFeatures.length;
                const percentage = Math.round((enabledCount / totalCount) * 100);

                return (
                  <div key={feature.key} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{feature.name}</h3>
                      <Badge variant="outline">{percentage}%</Badge>
                    </div>
                    <div className="text-sm text-gray-600">
                      {enabledCount}/{totalCount} 企業で利用中
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
