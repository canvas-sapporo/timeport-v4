'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Plus, Eye, Edit, Send } from 'lucide-react';

import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getReports, getReportTemplates, createReport } from '@/lib/mock';
import { Report, ReportTemplate, FormField } from '@/types/report';

export default function MemberReportPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [report, setReport] = useState<Report[]>([]);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  // const [isDataLoading, setIsDataLoading] = useState(true);

  useEffect(() => {
    if (!user || (user.role !== 'member' && user.role !== 'admin')) {
      router.push('/login');
      return;
    }
  }, [user, router]);

  useEffect(() => {
    const loadData = async () => {
      if (user) {
        try {
          const [reportsData, templatesData] = await Promise.all([
            // getReport(user.id),
            getReports('user3'),
            getReportTemplates(),
          ]);
          setReport(reportsData);
          setTemplates(templatesData);
        } catch (error) {
          console.error('Error loading data:', error);
        }
      }
    };

    loadData();
  }, [user]);

  const handleTemplateSelect = (template: ReportTemplate) => {
    setSelectedTemplate(template);
    const initialData: Record<string, unknown> = {};
    template.form_fields.forEach((field) => {
      initialData[field.name] = '';
    });
    setFormData(initialData);
    setIsCreateOpen(true);
  };

  const handleCreateReport = async () => {
    if (!selectedTemplate) return;

    try {
      const result = await createReport(selectedTemplate.id, formData);
      if (result.success) {
        setReport((prev) => [...prev, result.data]);
        setIsCreateOpen(false);
        setSelectedTemplate(null);
        setFormData({});
      }
    } catch (error) {
      console.error('Error creating report:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      draft: 'bg-gray-500',
      submitted: 'bg-blue-500',
      reviewed: 'bg-green-500',
    };
    const labels = {
      draft: '下書き',
      submitted: '提出済み',
      reviewed: '確認済み',
    };
    return (
      <Badge className={`${colors[status as keyof typeof colors]} text-white`}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  const renderFormField = (field: FormField) => {
    const value = (formData[field.name] as string) || '';

    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            value={value}
            onChange={(e) => setFormData((prev) => ({ ...prev, [field.name]: e.target.value }))}
            placeholder={field.placeholder}
            rows={4}
            required={field.required}
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => setFormData((prev) => ({ ...prev, [field.name]: e.target.value }))}
            placeholder={field.placeholder}
            required={field.required}
            min={field.validation?.min}
            max={field.validation?.max}
          />
        );
      case 'date':
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => setFormData((prev) => ({ ...prev, [field.name]: e.target.value }))}
            required={field.required}
          />
        );
      case 'time':
        return (
          <Input
            type="time"
            value={value}
            onChange={(e) => setFormData((prev) => ({ ...prev, [field.name]: e.target.value }))}
            required={field.required}
          />
        );
      case 'select':
        return (
          <Select
            value={value}
            onValueChange={(val) => setFormData((prev) => ({ ...prev, [field.name]: val }))}
          >
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder} />
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
            value={value}
            onChange={(e) => setFormData((prev) => ({ ...prev, [field.name]: e.target.value }))}
            placeholder={field.placeholder}
            required={field.required}
            minLength={field.validation?.minLength}
            maxLength={field.validation?.maxLength}
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">レポート</h1>
          <p className="text-gray-600">日報や報告書を作成・管理できます</p>
        </div>
      </div>

      {/* Template Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plus className="w-5 h-5" />
            <span>新規レポート作成</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <div
                key={template.id}
                className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => handleTemplateSelect(template)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">{template.name}</h3>
                  <Badge variant="outline">{template.template_type}</Badge>
                </div>
                <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                <div className="text-xs text-gray-500">
                  {template.form_fields.length}項目のフォーム
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Report List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>レポート一覧</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>タイトル</TableHead>
                <TableHead>テンプレート</TableHead>
                <TableHead>レポート日</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>提出日</TableHead>
                <TableHead>確認者</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.map((report) => {
                const template = templates.find((t) => t.id === report.template_id);
                return (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">{report.title}</TableCell>
                    <TableCell>{template?.name}</TableCell>
                    <TableCell>
                      {new Date(report.report_date).toLocaleDateString('ja-JP')}
                    </TableCell>
                    <TableCell>{getStatusBadge(report.status)}</TableCell>
                    <TableCell>
                      {report.submitted_at
                        ? new Date(report.submitted_at).toLocaleDateString('ja-JP')
                        : '-'}
                    </TableCell>
                    <TableCell>{report.reviewed_by ? '確認済み' : '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        {report.status === 'draft' && (
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                        {report.status === 'draft' && (
                          <Button variant="ghost" size="sm">
                            <Send className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {report.length === 0 && (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">レポートがありません</p>
              <p className="text-gray-400 text-sm">上記のテンプレートから新規作成してください</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Report Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTemplate?.name} - 新規作成</DialogTitle>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              {selectedTemplate.form_fields
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
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  キャンセル
                </Button>
                <Button onClick={handleCreateReport}>下書き保存</Button>
                <Button onClick={handleCreateReport} className="bg-blue-600 hover:bg-blue-700">
                  提出
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
