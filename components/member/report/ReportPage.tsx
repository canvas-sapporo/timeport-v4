'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Plus } from 'lucide-react';
import dynamic from 'next/dynamic';

import { useAuth } from '@/contexts/auth-context';
import { useCompanyFeatures } from '@/hooks/use-company-features';
import { getJSTDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ActionButton } from '@/components/ui/action-button';
import { StandardButton } from '@/components/ui/standard-button';
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
import { getReports, createReport, submitReport, deleteReport } from '@/lib/actions/reports';
import {
  getAvailableReportTemplates,
  getReportTemplateForMember,
} from '@/lib/actions/report-templates';
import type { ReportListItem, ReportTemplate, ReportFieldConfig } from '@/schemas/report';

type ExtendedReportTemplate = ReportTemplate & {
  approval_flow: {
    type: 'static' | 'dynamic';
    confirmers: { type: 'user' | 'group'; group_id?: string; user_id?: string }[];
  };
};

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

export default function ReportPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const { features, isLoading: featuresLoading } = useCompanyFeatures(user?.company_id);
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [templates, setTemplates] = useState<ExtendedReportTemplate[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ExtendedReportTemplate | null>(null);
  const [formData, setFormData] = useState<Record<string, string | number | boolean | string[]>>(
    {}
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user || (user.role !== 'member' && user.role !== 'admin')) {
      router.push('/login');
      return;
    }
  }, [user, router]);

  useEffect(() => {
    if (!featuresLoading && features && !features.report) {
      router.push('/member/feature-disabled');
      return;
    }
  }, [features, featuresLoading, router]);

  useEffect(() => {
    async function loadData() {
      if (user) {
        try {
          setIsLoading(true);
          const [reportsResult, templatesResult] = await Promise.all([
            getReports(),
            getAvailableReportTemplates(),
          ]);

          if (reportsResult.success && reportsResult.data) {
            setReports(reportsResult.data);
          }

          if (templatesResult.success && templatesResult.data) {
            const templatesWithApprovalFlow = templatesResult.data.map((template) => ({
              ...template,
              approval_flow: template.confirmation_flow,
            }));
            setTemplates(templatesWithApprovalFlow as unknown as ExtendedReportTemplate[]);
          }
        } catch (error) {
          console.error('Error loading data:', error);
          toast({
            title: 'エラー',
            description: 'データの読み込みに失敗しました',
            variant: 'destructive',
          });
        } finally {
          setIsLoading(false);
        }
      }
    }

    loadData();
  }, [user, toast]);

  async function handleTemplateSelect(template: ReportTemplate) {
    try {
      const result = await getReportTemplateForMember(template.id);
      if (result.success && result.data) {
        const templateWithApprovalFlow = {
          ...result.data,
          approval_flow: result.data.confirmation_flow,
        };
        setSelectedTemplate(templateWithApprovalFlow as unknown as ExtendedReportTemplate);
        const initialData: Record<string, string | number | boolean | string[]> = {};
        result.data.form_config.forEach((field) => {
          if (field.default_value !== undefined) {
            initialData[field.id] = field.default_value;
          } else {
            switch (field.type) {
              case 'textarea':
              case 'text':
              case 'email':
              case 'phone':
              case 'url':
                initialData[field.id] = '';
                break;
              case 'number':
                initialData[field.id] = 0;
                break;
              case 'checkbox':
                initialData[field.id] = false;
                break;
              case 'select':
              case 'radio':
                initialData[field.id] = '';
                break;
              case 'file':
                initialData[field.id] = [];
                break;
              default:
                initialData[field.id] = '';
            }
          }
        });
        setFormData(initialData);
        setIsCreateOpen(true);
      }
    } catch (error) {
      console.error('Error loading template:', error);
      toast({
        title: 'エラー',
        description: 'テンプレートの読み込みに失敗しました',
        variant: 'destructive',
      });
    }
  }

  async function handleCreateReport(action: 'draft' | 'submit') {
    if (!selectedTemplate) return;

    try {
      setIsSubmitting(true);
      const formDataObj = new FormData();
      formDataObj.append('template_id', selectedTemplate.id as string);
      formDataObj.append('title', `レポート - ${new Date().toLocaleDateString('ja-JP')}`);
      formDataObj.append('content', JSON.stringify(formData));
      formDataObj.append('report_date', getJSTDate() || '');

      const result = await createReport(formDataObj);
      if (result.success && result.data) {
        if (action === 'submit') {
          const submitResult = await submitReport(result.data.id);
          if (submitResult.success) {
            toast({ title: '成功', description: 'レポートを提出しました' });
          }
        } else {
          toast({ title: '成功', description: 'レポートを下書き保存しました' });
        }

        const reportsResult = await getReports();
        if (reportsResult.success && reportsResult.data) {
          setReports(reportsResult.data);
        }

        setIsCreateOpen(false);
        setSelectedTemplate(null);
        setFormData({});
      } else {
        toast({
          title: 'エラー',
          description: result.error || 'レポートの作成に失敗しました',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error creating report:', error);
      toast({
        title: 'エラー',
        description: 'レポートの作成に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteReport(reportId: string) {
    try {
      const result = await deleteReport(reportId);
      if (result.success) {
        toast({ title: '成功', description: 'レポートを削除しました' });
        const reportsResult = await getReports();
        if (reportsResult.success && reportsResult.data) {
          setReports(reportsResult.data);
        }
      } else {
        toast({
          title: 'エラー',
          description: result.error || 'レポートの削除に失敗しました',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting report:', error);
      toast({
        title: 'エラー',
        description: 'レポートの削除に失敗しました',
        variant: 'destructive',
      });
    }
  }

  function renderFormField(field: ReportFieldConfig) {
    const value = formData[field.id];

    switch (field.type) {
      case 'textarea':
        if (field.options?.markdown) {
          return (
            <div data-color-mode="light">
              <MDEditor
                value={String(value || '')}
                onChange={(val) => setFormData((prev) => ({ ...prev, [field.id]: val || '' }))}
                placeholder={field.placeholder}
                preview={field.options.preview ? 'live' : 'edit'}
                height={field.options.rows ? field.options.rows * 20 : 200}
              />
            </div>
          );
        }
        return (
          <Textarea
            value={String(value || '')}
            onChange={(e) => setFormData((prev) => ({ ...prev, [field.id]: e.target.value }))}
            placeholder={field.placeholder}
            rows={field.options?.rows || 4}
            required={field.required}
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            value={String(value || '')}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, [field.id]: Number(e.target.value) }))
            }
            placeholder={field.placeholder}
            required={field.required}
            min={field.options?.min}
            max={field.options?.max}
            step={field.options?.step}
          />
        );
      case 'date':
        return (
          <Input
            type="date"
            value={String(value || '')}
            onChange={(e) => setFormData((prev) => ({ ...prev, [field.id]: e.target.value }))}
            required={field.required}
          />
        );
      case 'time':
        return (
          <Input
            type="time"
            value={String(value || '')}
            onChange={(e) => setFormData((prev) => ({ ...prev, [field.id]: e.target.value }))}
            required={field.required}
          />
        );
      case 'datetime':
        return (
          <Input
            type="datetime-local"
            value={String(value || '')}
            onChange={(e) => setFormData((prev) => ({ ...prev, [field.id]: e.target.value }))}
            required={field.required}
          />
        );
      case 'email':
        return (
          <Input
            type="email"
            value={String(value || '')}
            onChange={(e) => setFormData((prev) => ({ ...prev, [field.id]: e.target.value }))}
            placeholder={field.placeholder}
            required={field.required}
          />
        );
      case 'phone':
        return (
          <Input
            type="tel"
            value={String(value || '')}
            onChange={(e) => setFormData((prev) => ({ ...prev, [field.id]: e.target.value }))}
            placeholder={field.placeholder}
            required={field.required}
          />
        );
      case 'url':
        return (
          <Input
            type="url"
            value={String(value || '')}
            onChange={(e) => setFormData((prev) => ({ ...prev, [field.id]: e.target.value }))}
            placeholder={field.placeholder}
            required={field.required}
          />
        );
      case 'select':
        return (
          <Select
            value={String(value || '')}
            onValueChange={(val) => setFormData((prev) => ({ ...prev, [field.id]: val }))}
          >
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.options?.map((option) => (
                <SelectItem key={option.value} value={String(option.value)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.options?.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <input
                  type="radio"
                  id={`${field.id}-${option.value}`}
                  name={field.id}
                  value={String(option.value)}
                  checked={String(value) === String(option.value)}
                  onChange={(e) => setFormData((prev) => ({ ...prev, [field.id]: e.target.value }))}
                  required={field.required}
                />
                <Label htmlFor={`${field.id}-${option.value}`}>{option.label}</Label>
              </div>
            ))}
          </div>
        );
      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id={field.id}
              checked={Boolean(value)}
              onChange={(e) => setFormData((prev) => ({ ...prev, [field.id]: e.target.checked }))}
              required={field.required}
            />
            <Label htmlFor={field.id}>{field.label}</Label>
          </div>
        );
      case 'file':
        return (
          <Input
            type="file"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              setFormData((prev) => ({ ...prev, [field.id]: files.map((f) => f.name) }));
            }}
            multiple={field.options?.multiple}
            accept={field.options?.accept}
            required={field.required}
          />
        );
      case 'hidden':
        return null;
      default:
        return (
          <Input
            value={String(value || '')}
            onChange={(e) => setFormData((prev) => ({ ...prev, [field.id]: e.target.value }))}
            placeholder={field.placeholder}
            required={field.required}
          />
        );
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">レポート</h1>
          <p className="text-gray-600">日報や報告書を作成・管理できます</p>
        </div>
      </div>

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
                  <Badge variant="outline">{template.group_id ? 'グループ限定' : '全員'}</Badge>
                </div>
                <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                <div className="text-xs text-gray-500">
                  {template.form_config.length}項目のフォーム
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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
              {reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">{report.title}</TableCell>
                  <TableCell>{report.template_name}</TableCell>
                  <TableCell>{new Date(report.report_date).toLocaleDateString('ja-JP')}</TableCell>
                  <TableCell>
                    <Badge
                      style={{
                        backgroundColor: report.current_status.background_color,
                        color: report.current_status.font_color,
                      }}
                    >
                      {report.current_status.display_name}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {report.submitted_at
                      ? new Date(report.submitted_at).toLocaleDateString('ja-JP')
                      : '-'}
                  </TableCell>
                  <TableCell>{report.approver_name || '-'}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <ActionButton action="view" />
                      {report.current_status.name === 'draft' && <ActionButton action="edit" />}
                      {report.current_status.name === 'draft' && <ActionButton action="submit" />}
                      {report.current_status.name === 'draft' && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <ActionButton action="delete" />
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>レポートを削除しますか？</AlertDialogTitle>
                              <AlertDialogDescription>
                                この操作は取り消せません。レポートが完全に削除されます。
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>キャンセル</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteReport(report.id)}>
                                削除
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {reports.length === 0 && (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">レポートがありません</p>
              <p className="text-gray-400 text-sm">上記のテンプレートから新規作成してください</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTemplate?.name} - 新規作成</DialogTitle>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              {selectedTemplate.form_config.map((field) => (
                <div key={field.id}>
                  <Label htmlFor={field.id}>
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  {renderFormField(field)}
                </div>
              ))}
              <div className="flex justify-end space-x-2 pt-4">
                <StandardButton
                  buttonType="cancel"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={isSubmitting}
                >
                  キャンセル
                </StandardButton>
                <StandardButton
                  buttonType="save"
                  onClick={() => handleCreateReport('draft')}
                  disabled={isSubmitting}
                >
                  下書き保存
                </StandardButton>
                <StandardButton
                  buttonType="submit"
                  onClick={() => handleCreateReport('submit')}
                  disabled={isSubmitting}
                >
                  提出
                </StandardButton>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
