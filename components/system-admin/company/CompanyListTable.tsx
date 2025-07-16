 "use client";
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Pencil, Trash2, Plus, Building2, CheckCircle2, HelpCircle, Search, Filter } from 'lucide-react';
import type { Company } from '@/types/company';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { addCompany } from '@/lib/actions/system-admin/company';
import { useRouter } from 'next/navigation';

export default function CompanyListTable({ companies, activeCompanyCount }: { companies: Company[]; activeCompanyCount: number }) {
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [open, setOpen] = useState(false); // 追加ダイアログの開閉状態
  const [loading, setLoading] = useState(false);

  // 追加フォームの状態
  const [form, setForm] = useState({
    name: '',
    code: '',
    address: '',
    phone: '',
    is_active: true,
  });

  const router = useRouter();

  // ステータスでフィルタリング
  const filteredCompanies = useMemo(() => {
    let result = companies;
    if (selectedStatus === 'active') {
      result = result.filter(c => c.is_active);
    } else if (selectedStatus === 'inactive') {
      result = result.filter(c => !c.is_active);
    }
    if (!search) return result;
    const lower = search.toLowerCase();
    return result.filter(c =>
      (c.name && c.name.toLowerCase().includes(lower)) ||
      (c.code && c.code.toLowerCase().includes(lower)) ||
      (c.address && c.address.toLowerCase().includes(lower)) ||
      (c.phone && c.phone.toLowerCase().includes(lower))
    );
  }, [companies, search, selectedStatus]);

  const handleReset = () => {
    setSearch('');
    setSelectedStatus('all');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addCompany(form);
      setOpen(false);
      router.refresh(); // ← ここでリフレッシュ
    } catch (err) {
      alert('企業の追加に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      {/* タイトル・追加ボタン */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">企業管理</h1>
          <p className="text-muted-foreground text-sm mt-1">全社の企業情報を管理します</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="timeport-primary" size="sm">
              <Plus className="w-4 h-4 mr-2" />追加
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>企業追加</DialogTitle>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <Label htmlFor="company-name">企業名<span className="text-red-500 ml-1">*</span></Label>
                <Input id="company-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div>
                <Label htmlFor="company-code">企業コード<span className="text-red-500 ml-1">*</span></Label>
                <Input id="company-code" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} required />
              </div>
              <div>
                <Label htmlFor="company-address">住所</Label>
                <Input id="company-address" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="company-phone">電話番号</Label>
                <Input id="company-phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="flex items-center gap-2">
                <Switch id="company-active" checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
                <Label htmlFor="company-active">有効</Label>
              </div>
              <Button type="submit" variant="timeport-primary" className="w-full" disabled={loading}>
                {loading ? '追加中...' : '追加'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* 上部カード（画像風デザイン） */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* 総企業数カード */}
        <Card className="relative p-4 flex flex-col gap-1 bg-blue-50 shadow rounded-xl overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-500">
              <Building2 className="text-white w-5 h-5" />
            </div>
          </div>
          <div className="text-sm text-gray-600">総企業数</div>
          <div className="text-2xl font-bold text-gray-800 mb-1">{companies.length}</div>
          <div className="absolute left-0 right-0 bottom-0 h-2" style={{background: 'linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)'}} />
        </Card>
        {/* アクティブカード */}
        <Card className="relative p-4 flex flex-col gap-1 bg-green-50 shadow rounded-xl overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-green-500">
              <CheckCircle2 className="text-white w-5 h-5" />
            </div>
          </div>
          <div className="text-sm text-gray-600">アクティブ</div>
          <div className="text-2xl font-bold text-gray-800 mb-1">{activeCompanyCount}</div>
          <div className="absolute left-0 right-0 bottom-0 h-2" style={{background: 'linear-gradient(90deg, #22c55e 0%, #4ade80 100%)'}} />
        </Card>
        {/* ダミー項目カード */}
        <Card className="relative p-4 flex flex-col gap-1 bg-purple-50 shadow rounded-xl overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-purple-500">
              <HelpCircle className="text-white w-5 h-5" />
            </div>
          </div>
          <div className="text-sm text-gray-600">ダミー項目</div>
          <div className="text-2xl font-bold text-gray-800 mb-1">-</div>
          <div className="absolute left-0 right-0 bottom-0 h-2" style={{background: 'linear-gradient(90deg, #a78bfa 0%, #c4b5fd 100%)'}} />
        </Card>
      </div>

      {/* フィルターカード */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="w-5 h-5" />
            <span>フィルター</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-2 w-full">
            <div className="flex flex-1 gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="企業名、コード、住所、電話番号で検索"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-full md:w-56">
                  <SelectValue placeholder="ステータスで絞り込み" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全てのステータス</SelectItem>
                  <SelectItem value="active">有効</SelectItem>
                  <SelectItem value="inactive">無効</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={handleReset} className="w-full md:w-32">リセット</Button>
          </div>
        </CardContent>
      </Card>

      {/* 企業一覧テーブル */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold mb-4">企業一覧</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-2 text-left font-medium">企業名</th>
                <th className="px-4 py-2 text-left font-medium">企業コード</th>
                <th className="px-4 py-2 text-left font-medium">住所</th>
                <th className="px-4 py-2 text-left font-medium">電話番号</th>
                <th className="px-4 py-2 text-center font-medium">ステータス</th>
                <th className="px-4 py-2 text-center font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredCompanies.length > 0 ? (
                filteredCompanies.map((company) => (
                  <tr key={company.id} className="border-b hover:bg-muted/40">
                    <td className="px-4 py-2 whitespace-nowrap">{company.name}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{company.code}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{company.address || '-'} </td>
                    <td className="px-4 py-2 whitespace-nowrap">{company.phone || '-'}</td>
                    <td className="px-4 py-2 text-center">
                      {company.is_active ? (
                        <Badge variant="default">有効</Badge>
                      ) : (
                        <Badge variant="secondary">無効</Badge>
                      )}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <Button variant="ghost" size="icon" className="mr-2">
                        <Pencil size={16} />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Trash2 size={16} className="text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-muted-foreground">企業データがありません</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 