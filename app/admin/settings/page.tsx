'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Settings,
  Building,
  Clock,
  Bell,
  Shield,
  Save,
  Plus,
  Edit,
  Trash2,
  FormInput,
  Users,
  Briefcase,
  Loader2,
  FileText,
  Activity,
  CalendarDays,
} from 'lucide-react';

import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ActionButton } from '@/components/ui/action-button';
import { StandardButton } from '@/components/ui/standard-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from '@/components/ui/select';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getEmploymentTypes, getEmploymentTypeStats } from '@/lib/actions/admin/employment-types';
import { getWorkTypes, getWorkTypeStats } from '@/lib/actions/admin/work-types';
import { getAttendanceStatuses } from '@/lib/actions/attendance';
import { getCompanyInfo, updateCompanyInfo } from '@/lib/actions/user-settings';
import { saveAttendanceSetting, getAttendanceSettingValue } from '@/lib/actions/settings';
import type { EmploymentType, WorkType } from '@/schemas/employment-type';
import type { AttendanceStatusData } from '@/schemas/attendance';
import type { Company } from '@/schemas/company';
import type { CompanyInfo } from '@/schemas/user_profile';
import { formatDateTimeForDisplay, formatTime } from '@/lib/utils';
import { useData } from '@/contexts/data-context';
import { createManualGrant, importGrantsCsv, runPolicyGrantFlat } from '@/lib/actions/leave-grants';
import { Calendar } from '@/components/ui/calendar';
import { previewPolicyGrantAdvanced } from '@/lib/actions/leave-grants';
import { createClient } from '@supabase/supabase-js';
import { listUsersMissingJoinedDate, bulkUpdateJoinedDate } from '@/lib/actions/admin/users';
import { updateLeavePolicyPartial } from '@/lib/actions/leave-policies';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';

function InlineCompanyCalendarSettings() {
  return (
    <div className="text-sm text-gray-600">
      カレンダー管理はこの環境で有効です。会社カレンダーの設定は別コンポーネントで提供されます。
    </div>
  );
}

function InlineGrantsManager({ companyId }: { companyId: string }) {
  const { users } = useData();
  const { toast } = useToast();
  const [leaveTypes, setLeaveTypes] = useState<Array<{ id: string; name: string }>>([]);
  const [manual, setManual] = useState({
    userId: '',
    leaveTypeId: '',
    quantityMinutes: 480,
    grantedOn: '',
    expiresOn: '',
    note: '',
  });
  const [policy, setPolicy] = useState({ leaveTypeId: '', grantDate: '' });
  const [isBusy, setIsBusy] = useState(false);
  const [recentGrants, setRecentGrants] = useState<
    Array<{
      id: string;
      user_id: string;
      leave_type_id: string;
      quantity_minutes: number;
      granted_on: string;
      expires_on: string | null;
      source: string;
      note: string | null;
      created_at: string;
    }>
  >([]);
  const [fiscalStartMonth, setFiscalStartMonth] = useState<number>(4);
  const [policyDialogOpen, setPolicyDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewRows, setPreviewRows] = useState<
    Array<{
      userId: string;
      eligible: boolean;
      serviceYears: number;
      baseDays: number;
      quantityMinutes: number;
      reason?: string;
      duplicate?: boolean;
    }>
  >([]);
  const [previewAccrual, setPreviewAccrual] = useState<
    'anniversary' | 'fiscal_fixed' | 'monthly' | undefined
  >(undefined);
  const [postRunDiff, setPostRunDiff] = useState<
    Array<{ userId: string; expected: number; actual: number }>
  >([]);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [diffSort, setDiffSort] = useState<
    'delta_desc' | 'delta_asc' | 'expected_desc' | 'actual_desc'
  >('delta_desc');
  const [diffMinAbs, setDiffMinAbs] = useState<number>(0);
  const [policyForm, setPolicyForm] = useState({
    day_hours: 8,
    anniversary_offset_days: 0,
    monthly_proration: false,
    monthly_proration_basis: 'days' as 'days' | 'hours',
    monthly_min_attendance_rate: 0,
    carryover_max_days: '' as string | '',
    expire_months: 24 as number,
    allow_negative: false,
    min_booking_unit_minutes: 60 as number,
    rounding_minutes: 15 as number,
    hold_on_apply: true,
    deduction_timing: 'approve' as 'apply' | 'approve',
    business_day_only: true,
    base_days_by_service: {} as Record<string, number>,
    allowed_units: ['day', 'half', 'hour'] as Array<'day' | 'half' | 'hour'>,
    half_day_mode: 'fixed_hours' as 'fixed_hours' | 'am_pm',
    allow_multi_day: true,
    blackout_dates: [] as string[],
  });

  function isIsoDateString(v: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(v);
  }

  function validatePolicy(pf: typeof policyForm): Record<string, string> {
    const errs: Record<string, string> = {};
    if (!(pf.day_hours > 0 && pf.day_hours <= 24)) errs.day_hours = '1〜24の範囲で入力してください';
    if (!(pf.anniversary_offset_days >= -366 && pf.anniversary_offset_days <= 366))
      errs.anniversary_offset_days = '-366〜366の整数で入力してください';
    if (!(pf.monthly_min_attendance_rate >= 0 && pf.monthly_min_attendance_rate <= 1))
      errs.monthly_min_attendance_rate = '0〜1で入力してください';
    if (!(pf.expire_months >= 0 && pf.expire_months <= 120))
      errs.expire_months = '0〜120の範囲で入力してください';
    if (!(pf.min_booking_unit_minutes >= 1 && pf.min_booking_unit_minutes <= 1440))
      errs.min_booking_unit_minutes = '1〜1440の範囲で入力してください';
    if (!(pf.rounding_minutes >= 0 && pf.rounding_minutes <= 120))
      errs.rounding_minutes = '0〜120の範囲で入力してください';
    if (!pf.allowed_units || pf.allowed_units.length === 0)
      errs.allowed_units = '少なくとも1つの取得単位を選択してください';
    if (pf.blackout_dates.some((d) => !isIsoDateString(d)))
      errs.blackout_dates = 'YYYY-MM-DD をカンマ区切りで入力してください';
    return errs;
  }

  useEffect(() => {
    setValidationErrors(validatePolicy(policyForm));
  }, [policyForm]);

  async function fetchRecentGrants() {
    try {
      if (!companyId || users.length === 0) return;
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const userIds = users.map((u) => u.id);
      const { data } = await supabase
        .from('leave_grants')
        .select(
          'id,user_id,leave_type_id,quantity_minutes,granted_on,expires_on,source,note,created_at'
        )
        .in('user_id', userIds)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(50);
      setRecentGrants(((data || []) as any[]).filter(Boolean) as any);
    } catch {
      setRecentGrants([]);
    }
  }

  useEffect(() => {
    async function loadLeaveTypes() {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { data } = await supabase
          .from('leave_types')
          .select('id, name')
          .is('deleted_at', null);
        setLeaveTypes(((data || []) as Array<{ id: string; name: string }>).filter(Boolean));
      } catch {
        setLeaveTypes([]);
      }
    }
    loadLeaveTypes();
  }, []);

  useEffect(() => {
    fetchRecentGrants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, companyId]);

  useEffect(() => {
    async function loadFiscal() {
      try {
        if (!companyId || !policy.leaveTypeId) return;
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { data } = await supabase
          .from('leave_policies')
          .select(
            'fiscal_start_month, day_hours, anniversary_offset_days, monthly_proration, monthly_proration_basis, monthly_min_attendance_rate, carryover_max_days, expire_months, allow_negative, min_booking_unit_minutes, rounding_minutes, hold_on_apply, deduction_timing, business_day_only, base_days_by_service'
          )
          .eq('company_id', companyId)
          .eq('leave_type_id', policy.leaveTypeId)
          .is('deleted_at', null)
          .maybeSingle();
        setFiscalStartMonth(
          ((data || {}) as { fiscal_start_month?: number }).fiscal_start_month || 4
        );
        if (data) {
          const d = data as {
            day_hours?: number;
            anniversary_offset_days?: number;
            monthly_proration?: boolean;
            monthly_proration_basis?: 'days' | 'hours';
            monthly_min_attendance_rate?: number;
            base_days_by_service?: Record<string, number>;
            carryover_max_days?: number | null;
            expire_months?: number;
            allow_negative?: boolean;
            min_booking_unit_minutes?: number;
            rounding_minutes?: number;
            hold_on_apply?: boolean;
            deduction_timing?: 'apply' | 'approve';
            business_day_only?: boolean;
          };
          setPolicyForm({
            day_hours: d.day_hours ?? 8,
            anniversary_offset_days: d.anniversary_offset_days ?? 0,
            monthly_proration: !!d.monthly_proration,
            monthly_proration_basis: d.monthly_proration_basis ?? 'days',
            monthly_min_attendance_rate: d.monthly_min_attendance_rate ?? 0,
            base_days_by_service: d.base_days_by_service || {},
            carryover_max_days:
              d.carryover_max_days !== null && d.carryover_max_days !== undefined
                ? String(d.carryover_max_days)
                : '',
            expire_months: d.expire_months ?? 24,
            allow_negative: !!d.allow_negative,
            min_booking_unit_minutes: d.min_booking_unit_minutes ?? 60,
            rounding_minutes: d.rounding_minutes ?? 15,
            hold_on_apply: d.hold_on_apply ?? true,
            deduction_timing: (d.deduction_timing as 'apply' | 'approve') ?? 'approve',
            business_day_only: d.business_day_only ?? true,
          });
        } else {
          setPolicyForm({
            day_hours: 8,
            anniversary_offset_days: 0,
            monthly_proration: false,
            monthly_proration_basis: 'days',
            monthly_min_attendance_rate: 0,
            base_days_by_service: {},
            carryover_max_days: '',
            expire_months: 24,
            allow_negative: false,
            min_booking_unit_minutes: 60,
            rounding_minutes: 15,
            hold_on_apply: true,
            deduction_timing: 'approve',
            business_day_only: true,
          });
        }
      } catch {
        setFiscalStartMonth(4);
      }
    }
    loadFiscal();
  }, [companyId, policy.leaveTypeId]);

  function downloadTemplate() {
    const header = 'user_id,leave_type_id,quantity_minutes,granted_on,expires_on,note\n';
    const example =
      '00000000-0000-0000-0000-000000000000,00000000-0000-0000-0000-000000000000,480,2025-04-01,2027-03-31,初期取込\n';
    const blob = new Blob([header + example], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leave_grants_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function submitManual() {
    if (!manual.userId || !manual.leaveTypeId || !manual.grantedOn) {
      toast({
        title: '入力エラー',
        description: 'ユーザー、休暇種別、付与日は必須です。',
        variant: 'destructive',
      });
      return;
    }
    setIsBusy(true);
    try {
      const res = await createManualGrant({
        userId: manual.userId,
        leaveTypeId: manual.leaveTypeId,
        quantityMinutes: Number(manual.quantityMinutes) || 0,
        grantedOn: manual.grantedOn,
        expiresOn: manual.expiresOn || null,
        source: 'manual',
        note: manual.note,
        createdBy: null,
      });
      if (!res.success) throw new Error(res.error || 'failed');
      toast({ title: '付与完了', description: '手動付与を登録しました。' });
      fetchRecentGrants();
    } catch (e) {
      toast({
        title: '付与失敗',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsBusy(false);
    }
  }

  async function handleCsv(file: File) {
    setIsBusy(true);
    try {
      const text = await file.text();
      const res = await importGrantsCsv(companyId, text, null);
      if (!res.success) throw new Error('CSV取り込みに失敗しました');
      toast({
        title: 'CSV取り込み',
        description: `追加:${res.inserted}件 / 既存:${res.skipped}件 / エラー:${res.errorRows}件`,
      });
      fetchRecentGrants();
    } catch (e) {
      toast({
        title: 'CSV取り込み失敗',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsBusy(false);
    }
  }

  async function submitPolicyGrant() {
    if (!policy.leaveTypeId || !policy.grantDate) {
      toast({
        title: '入力エラー',
        description: '休暇種別と付与日を指定してください。',
        variant: 'destructive',
      });
    }
    setIsBusy(true);
    try {
      const res = await runPolicyGrantFlat({
        companyId,
        leaveTypeId: policy.leaveTypeId,
        grantDate: policy.grantDate,
      });
      if (!res.success) throw new Error(res.error || 'failed');
      toast({
        title: '一括付与完了',
        description: `付与:${res.granted} / スキップ:${res.skipped}`,
      });
      fetchRecentGrants();
    } catch (e) {
      toast({
        title: '一括付与失敗',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsBusy(false);
    }
  }

  async function saveFiscalStartMonth() {
    if (!companyId || !policy.leaveTypeId) {
      toast({
        title: '入力エラー',
        description: '会社と休暇種別を選択してください。',
        variant: 'destructive',
      });
      return;
    }
    setIsBusy(true);
    try {
      const res = await updateLeavePolicyPartial({
        companyId,
        leaveTypeId: policy.leaveTypeId,
        patch: { fiscal_start_month: fiscalStartMonth },
      });
      if (!res.success) throw new Error(res.error || 'failed');
      toast({ title: '保存完了', description: `期首月を ${fiscalStartMonth} 月に保存しました。` });
    } catch (e) {
      toast({
        title: '保存失敗',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">手動付与</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>ユーザー</Label>
            <select
              className="w-full h-9 border rounded-md px-2"
              value={manual.userId}
              onChange={(e) => setManual({ ...manual, userId: e.target.value })}
            >
              <option value="">選択してください</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {`${u.family_name || ''} ${u.first_name || ''}`.trim() || u.email || u.id}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>休暇種別</Label>
            <select
              className="w-full h-9 border rounded-md px-2"
              value={manual.leaveTypeId}
              onChange={(e) => setManual({ ...manual, leaveTypeId: e.target.value })}
            >
              <option value="">選択してください</option>
              {leaveTypes.map((lt) => (
                <option key={lt.id} value={lt.id}>
                  {lt.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>付与分（分）</Label>
            <Input
              type="number"
              value={manual.quantityMinutes}
              onChange={(e) =>
                setManual({ ...manual, quantityMinutes: Number(e.target.value || 0) })
              }
            />
          </div>
          <div>
            <Label>付与日</Label>
            <Input
              type="date"
              value={manual.grantedOn}
              onChange={(e) => setManual({ ...manual, grantedOn: e.target.value })}
            />
          </div>
          <div>
            <Label>失効日（任意）</Label>
            <Input
              type="date"
              value={manual.expiresOn}
              onChange={(e) => setManual({ ...manual, expiresOn: e.target.value })}
            />
          </div>
          <div className="md:col-span-3">
            <Label>メモ</Label>
            <Input
              value={manual.note}
              onChange={(e) => setManual({ ...manual, note: e.target.value })}
            />
          </div>
        </div>
        <div className="mt-4">
          <Button onClick={submitManual} disabled={isBusy}>
            手動付与を登録
          </Button>
        </div>
      </div>

      <div className="border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">CSVインポート</h3>
        <div className="flex items-center gap-3 flex-wrap">
          <label className="px-3 py-2 border rounded-md cursor-pointer hover:bg-gray-50">
            ファイルを選択
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleCsv(f);
                e.currentTarget.value = '';
              }}
            />
          </label>
          <Button variant="outline" onClick={downloadTemplate}>
            テンプレDL
          </Button>
          <div className="text-sm text-gray-600">
            ヘッダ例: user_id,leave_type_id,quantity_minutes,granted_on,expires_on,note
          </div>
        </div>
      </div>

      <div className="border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">ポリシー一括付与</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>休暇種別</Label>
            <select
              className="w-full h-9 border rounded-md px-2"
              value={policy.leaveTypeId}
              onChange={(e) => setPolicy({ ...policy, leaveTypeId: e.target.value })}
            >
              <option value="">選択してください</option>
              {leaveTypes.map((lt) => (
                <option key={lt.id} value={lt.id}>
                  {lt.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>付与日</Label>
            <Input
              type="date"
              value={policy.grantDate}
              onChange={(e) => setPolicy({ ...policy, grantDate: e.target.value })}
            />
          </div>
          <div>
            <Label>期首月（fiscal_fixed時）</Label>
            <Input
              type="number"
              min={1}
              max={12}
              value={fiscalStartMonth}
              onChange={(e) =>
                setFiscalStartMonth(Math.max(1, Math.min(12, Number(e.target.value || 4))))
              }
            />
            <div className="text-xs text-gray-500 mt-1">
              leave_policies.fiscal_start_month に保存されている値を初期表示します。
            </div>
          </div>
        </div>
        <div className="mt-4">
          <Button onClick={submitPolicyGrant} disabled={isBusy}>
            一括付与を実行
          </Button>
          <Button
            className="ml-2"
            variant="outline"
            onClick={saveFiscalStartMonth}
            disabled={isBusy || !policy.leaveTypeId}
          >
            期首月を保存
          </Button>
          <Dialog open={policyDialogOpen} onOpenChange={setPolicyDialogOpen}>
            <DialogTrigger asChild>
              <Button className="ml-2" variant="secondary" disabled={!policy.leaveTypeId}>
                ポリシー編集
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  ポリシー編集（
                  {leaveTypes.find((l) => l.id === policy.leaveTypeId)?.name || '未選択'}）
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>基準付与（年数→日数）</Label>
                  <div className="text-xs text-gray-500 mb-2">
                    例: 0年=10, 1年=11, 2年=12 ...（空欄は未設定）
                  </div>
                  <div className="space-y-2">
                    {Array.from({ length: 10 }).map((_, idx) => (
                      <div key={idx} className="grid grid-cols-3 gap-2 items-center">
                        <div className="col-span-1 text-sm text-gray-600">{idx} 年目</div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            min={0}
                            max={365}
                            step={0.5}
                            value={policyForm.base_days_by_service[String(idx)] ?? ''}
                            onChange={(e) => {
                              const v = e.target.value;
                              const num = v === '' ? undefined : Number(v);
                              setPolicyForm((prev) => {
                                const next = { ...prev };
                                const map = { ...next.base_days_by_service };
                                if (v === '') delete map[String(idx)];
                                else map[String(idx)] = Number.isFinite(num) ? Number(num) : 0;
                                next.base_days_by_service = map;
                                return next;
                              });
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>1日の所定労働時間（hours）</Label>
                  <div className="text-xs text-gray-500 mb-1">
                    ツールチップ: 1営業日の換算時間。半日=この半分
                  </div>
                  <Input
                    type="number"
                    min={1}
                    max={24}
                    step={0.25}
                    value={policyForm.day_hours}
                    onChange={(e) =>
                      setPolicyForm({ ...policyForm, day_hours: Number(e.target.value || 8) })
                    }
                  />
                  {validationErrors.day_hours && (
                    <div className="text-xs text-red-600 mt-1">{validationErrors.day_hours}</div>
                  )}
                  {policyForm.half_day_mode === 'fixed_hours' && (
                    <div className="text-xs mt-1">
                      <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">半日</span>
                      <span className="text-gray-700 ml-2">
                        目安: {(policyForm.day_hours / 2).toFixed(2)} 時間
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <Label>anniversary 前倒し/後倒し（日）</Label>
                  <div className="text-xs text-gray-500 mb-1">
                    ツールチップ: 入社記念日の前後に付与日をずらす日数
                  </div>
                  <Input
                    type="number"
                    min={-366}
                    max={366}
                    step={1}
                    value={policyForm.anniversary_offset_days}
                    onChange={(e) =>
                      setPolicyForm({
                        ...policyForm,
                        anniversary_offset_days: Math.max(
                          -366,
                          Math.min(366, Math.floor(Number(e.target.value || 0)))
                        ),
                      })
                    }
                  />
                  {validationErrors.anniversary_offset_days && (
                    <div className="text-xs text-red-600 mt-1">
                      {validationErrors.anniversary_offset_days}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={policyForm.monthly_proration}
                    onCheckedChange={(v) =>
                      setPolicyForm({ ...policyForm, monthly_proration: !!v })
                    }
                  />
                  <div>
                    <Label>月次付与の按分を有効化</Label>
                    <div className="text-xs text-gray-500">
                      対象月（前月）の勤怠・カレンダーで比例配分
                    </div>
                  </div>
                </div>
                <div>
                  <Label>按分基準</Label>
                  <select
                    className="w-full h-9 border rounded-md px-2"
                    value={policyForm.monthly_proration_basis}
                    onChange={(e) =>
                      setPolicyForm({
                        ...policyForm,
                        monthly_proration_basis: e.target.value as 'days' | 'hours',
                      })
                    }
                  >
                    <option value="days">日数ベース（出勤日/稼働日）</option>
                    <option value="hours">時間ベース（実働時間/所定時間）</option>
                  </select>
                </div>
                <div>
                  <Label>最低出勤率（0〜1）</Label>
                  <div className="text-xs text-gray-500 mb-1">
                    ツールチップ: 月次按分時、これ未満なら0付与
                  </div>
                  <Input
                    type="number"
                    min={0}
                    max={1}
                    step={0.05}
                    value={policyForm.monthly_min_attendance_rate}
                    onChange={(e) =>
                      setPolicyForm({
                        ...policyForm,
                        monthly_min_attendance_rate: Math.max(
                          0,
                          Math.min(1, Number(e.target.value || 0))
                        ),
                      })
                    }
                  />
                  {validationErrors.monthly_min_attendance_rate && (
                    <div className="text-xs text-red-600 mt-1">
                      {validationErrors.monthly_min_attendance_rate}
                    </div>
                  )}
                </div>
                <div>
                  <Label>繰越上限（日）</Label>
                  <Input
                    type="text"
                    placeholder="空欄で無制限"
                    value={policyForm.carryover_max_days}
                    onChange={(e) =>
                      setPolicyForm({ ...policyForm, carryover_max_days: e.target.value })
                    }
                  />
                  <div className="text-xs text-gray-500">小数可。空欄は無制限</div>
                </div>
                <div>
                  <Label>失効（月）</Label>
                  <div className="text-xs text-gray-500 mb-1">
                    ツールチップ: 付与から何ヶ月後に失効するか
                  </div>
                  <Input
                    type="number"
                    min={0}
                    max={120}
                    step={1}
                    value={policyForm.expire_months}
                    onChange={(e) =>
                      setPolicyForm({
                        ...policyForm,
                        expire_months: Math.max(
                          0,
                          Math.min(120, Math.floor(Number(e.target.value || 0)))
                        ),
                      })
                    }
                  />
                  {validationErrors.expire_months && (
                    <div className="text-xs text-red-600 mt-1">
                      {validationErrors.expire_months}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={policyForm.allow_negative}
                    onCheckedChange={(v) => setPolicyForm({ ...policyForm, allow_negative: !!v })}
                  />
                  <div>
                    <Label>マイナス残高を許容</Label>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>最小予約単位（分）</Label>
                    <div className="text-xs text-gray-500 mb-1">
                      ツールチップ: 申請時に切り上げる最小単位
                    </div>
                    <Input
                      type="number"
                      min={1}
                      max={1440}
                      step={1}
                      value={policyForm.min_booking_unit_minutes}
                      onChange={(e) =>
                        setPolicyForm({
                          ...policyForm,
                          min_booking_unit_minutes: Math.max(
                            1,
                            Math.min(1440, Math.floor(Number(e.target.value || 0)))
                          ),
                        })
                      }
                    />
                    {validationErrors.min_booking_unit_minutes && (
                      <div className="text-xs text-red-600 mt-1">
                        {validationErrors.min_booking_unit_minutes}
                      </div>
                    )}
                  </div>
                  <div>
                    <Label>丸め（分）</Label>
                    <div className="text-xs text-gray-500 mb-1">
                      ツールチップ: 申請時に近い単位へ丸める
                    </div>
                    <Input
                      type="number"
                      min={0}
                      max={120}
                      step={1}
                      value={policyForm.rounding_minutes}
                      onChange={(e) =>
                        setPolicyForm({
                          ...policyForm,
                          rounding_minutes: Math.max(
                            0,
                            Math.min(120, Math.floor(Number(e.target.value || 0)))
                          ),
                        })
                      }
                    />
                    {validationErrors.rounding_minutes && (
                      <div className="text-xs text-red-600 mt-1">
                        {validationErrors.rounding_minutes}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={policyForm.hold_on_apply}
                    onCheckedChange={(v) => setPolicyForm({ ...policyForm, hold_on_apply: !!v })}
                  />
                  <div>
                    <Label>申請時ホールド（保留）</Label>
                  </div>
                </div>
                <div>
                  <Label>控除タイミング</Label>
                  <select
                    className="w-full h-9 border rounded-md px-2"
                    value={policyForm.deduction_timing}
                    onChange={(e) =>
                      setPolicyForm({
                        ...policyForm,
                        deduction_timing: e.target.value as 'apply' | 'approve',
                      })
                    }
                  >
                    <option value="apply">申請時</option>
                    <option value="approve">承認時</option>
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={policyForm.business_day_only}
                    onCheckedChange={(v) =>
                      setPolicyForm({ ...policyForm, business_day_only: !!v })
                    }
                  />
                  <div>
                    <Label>取得対象日を営業日のみに限定</Label>
                  </div>
                </div>
                <div>
                  <Label>許可する取得単位</Label>
                  <div className="flex items-center gap-4 mt-2">
                    {(['day', 'half', 'hour'] as Array<'day' | 'half' | 'hour'>).map((u) => (
                      <label key={u} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={policyForm.allowed_units.includes(u)}
                          onChange={(e) => {
                            const set = new Set(policyForm.allowed_units);
                            if (e.target.checked) set.add(u);
                            else set.delete(u);
                            const next = Array.from(set) as Array<'day' | 'half' | 'hour'>;
                            setPolicyForm({
                              ...policyForm,
                              allowed_units: next.length > 0 ? next : ['day'],
                            });
                          }}
                        />
                        <span>{u === 'day' ? '1日' : u === 'half' ? '半日' : '時間'}</span>
                      </label>
                    ))}
                  </div>
                  {validationErrors.allowed_units && (
                    <div className="text-xs text-red-600 mt-1">
                      {validationErrors.allowed_units}
                    </div>
                  )}
                </div>
                <div>
                  <Label>半休モード</Label>
                  <select
                    className={`w-full h-9 border rounded-md px-2 mt-1 ${
                      !policyForm.allowed_units.includes('half')
                        ? 'bg-gray-100 cursor-not-allowed'
                        : ''
                    }`}
                    value={policyForm.half_day_mode}
                    disabled={!policyForm.allowed_units.includes('half')}
                    onChange={(e) =>
                      setPolicyForm({
                        ...policyForm,
                        half_day_mode: e.target.value as 'fixed_hours' | 'am_pm',
                      })
                    }
                  >
                    <option value="fixed_hours">固定時間（例: 4時間）</option>
                    <option value="am_pm">AM/PM 指定</option>
                  </select>
                  {!policyForm.allowed_units.includes('half') && (
                    <div className="text-xs text-gray-500 mt-1">
                      半日単位が許可されていないため設定できません。まず「許可する取得単位」で半日を有効にしてください。
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={policyForm.allow_multi_day}
                    onCheckedChange={(v) => setPolicyForm({ ...policyForm, allow_multi_day: !!v })}
                  />
                  <div>
                    <Label>複数日申請を許可</Label>
                  </div>
                </div>
                <div>
                  <Label>取得不可日（blackout_dates）</Label>
                  <div className="text-xs text-gray-500 mb-2">カレンダーから複数選択できます</div>
                  <div className="p-2 border rounded">
                    <Calendar
                      mode="multiple"
                      selected={policyForm.blackout_dates.map((d) => new Date(d))}
                      onSelect={(dates) => {
                        const arr = (dates || [])
                          .map((dt) => {
                            if (!(dt instanceof Date) || isNaN(dt.getTime())) return null;
                            const y = dt.getFullYear();
                            const m = String(dt.getMonth() + 1).padStart(2, '0');
                            const d = String(dt.getDate()).padStart(2, '0');
                            return `${y}-${m}-${d}`;
                          })
                          .filter((x): x is string => !!x);
                        const uniq = Array.from(new Set(arr)).sort();
                        setPolicyForm({ ...policyForm, blackout_dates: uniq });
                      }}
                    />
                  </div>
                  {validationErrors.blackout_dates && (
                    <div className="text-xs text-red-600 mt-1">
                      {validationErrors.blackout_dates}
                    </div>
                  )}
                  <div className="text-xs text-gray-500 mt-2">
                    選択済: {policyForm.blackout_dates.length}日
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={async () => {
                    if (!companyId || !policy.leaveTypeId) return;
                    setIsBusy(true);
                    try {
                      const errs = validatePolicy(policyForm);
                      setValidationErrors(errs);
                      if (Object.keys(errs).length > 0) {
                        toast({
                          title: '入力エラー',
                          description: '不正な入力があります。赤字の説明を確認してください。',
                          variant: 'destructive',
                        });
                        setIsBusy(false);
                        return;
                      }
                      const res = await updateLeavePolicyPartial({
                        companyId,
                        leaveTypeId: policy.leaveTypeId,
                        patch: {
                          day_hours: policyForm.day_hours,
                          anniversary_offset_days: policyForm.anniversary_offset_days,
                          monthly_proration: policyForm.monthly_proration,
                          monthly_proration_basis: policyForm.monthly_proration_basis,
                          monthly_min_attendance_rate: policyForm.monthly_min_attendance_rate,
                          base_days_by_service: policyForm.base_days_by_service,
                          carryover_max_days:
                            policyForm.carryover_max_days === ''
                              ? null
                              : Number(policyForm.carryover_max_days),
                          expire_months: policyForm.expire_months,
                          allow_negative: policyForm.allow_negative,
                          min_booking_unit_minutes: policyForm.min_booking_unit_minutes,
                          rounding_minutes: policyForm.rounding_minutes,
                          hold_on_apply: policyForm.hold_on_apply,
                          deduction_timing: policyForm.deduction_timing,
                          business_day_only: policyForm.business_day_only,
                          allowed_units: policyForm.allowed_units,
                          half_day_mode: policyForm.half_day_mode,
                          allow_multi_day: policyForm.allow_multi_day,
                          blackout_dates: policyForm.blackout_dates,
                        },
                      });
                      if (!res.success) throw new Error(res.error || 'failed');
                      toast({ title: '保存完了', description: 'ポリシーを更新しました。' });
                      setPolicyDialogOpen(false);
                    } catch (e) {
                      toast({
                        title: '保存失敗',
                        description: e instanceof Error ? e.message : 'Unknown error',
                        variant: 'destructive',
                      });
                    } finally {
                      setIsBusy(false);
                    }
                  }}
                  disabled={isBusy}
                >
                  保存
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="ml-2"
                variant="outline"
                disabled={!policy.leaveTypeId || !policy.grantDate}
                onClick={async () => {
                  if (!companyId || !policy.leaveTypeId || !policy.grantDate) return;
                  setIsBusy(true);
                  try {
                    // サーバ側でポリシーのaccrual_methodを自動判定
                    const res = await previewPolicyGrantAdvanced({
                      companyId,
                      leaveTypeId: policy.leaveTypeId,
                      grantDate: policy.grantDate,
                    });
                    if (!res.success) throw new Error(res.error || 'failed');
                    setPreviewRows(res.results);
                    setPreviewAccrual(res.accrualMethod);
                    setPostRunDiff([]);
                    setPreviewDialogOpen(true);
                  } catch (e) {
                    toast({
                      title: 'プレビュー失敗',
                      description: e instanceof Error ? e.message : 'Unknown error',
                      variant: 'destructive',
                    });
                  } finally {
                    setIsBusy(false);
                  }
                }}
              >
                付与プレビュー
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>付与プレビュー</DialogTitle>
              </DialogHeader>
              <div className="text-sm text-gray-600 mb-2">
                方式: {previewAccrual || '-'}
                {previewAccrual === 'fiscal_fixed' ? `（期首月: ${fiscalStartMonth}月）` : ''}
              </div>
              <div className="max-h-[60vh] overflow-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-600">
                      <th className="py-2 pr-4">ユーザー</th>
                      <th className="py-2 pr-4">対象</th>
                      <th className="py-2 pr-4">勤続年数</th>
                      <th className="py-2 pr-4">基準日数</th>
                      <th className="py-2 pr-4">付与分(分)</th>
                      <th className="py-2 pr-4">重複</th>
                      <th className="py-2 pr-4">理由</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((r, idx) => {
                      const u = users.find((x) => x.id === r.userId);
                      return (
                        <tr key={idx} className="border-t">
                          <td className="py-2 pr-4">
                            {u ? `${u.family_name || ''} ${u.first_name || ''}`.trim() : r.userId}
                          </td>
                          <td className="py-2 pr-4">{r.eligible ? '対象' : '対象外'}</td>
                          <td className="py-2 pr-4">{r.serviceYears}</td>
                          <td className="py-2 pr-4">{r.baseDays.toFixed(2)}</td>
                          <td className="py-2 pr-4">{r.quantityMinutes}</td>
                          <td className="py-2 pr-4">{r.duplicate ? '既存あり' : '-'}</td>
                          <td className="py-2 pr-4">{r.reason || '-'}</td>
                        </tr>
                      );
                    })}
                    {previewRows.length === 0 && (
                      <tr>
                        <td className="py-4 text-gray-500" colSpan={7}>
                          表示するデータがありません
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {postRunDiff.length > 0 && (
                <div className="mt-4 border rounded-md p-3 bg-amber-50">
                  <div className="font-semibold mb-2">実行結果の検証</div>
                  <div className="text-xs text-gray-600 mb-2">
                    期待と実行結果に差分がありました（最大20件表示）。
                  </div>
                  <div className="flex items-center gap-3 mb-3 text-sm">
                    <div>
                      <Label className="mr-2">並び替え</Label>
                      <select
                        className="h-8 border rounded px-2"
                        value={diffSort}
                        onChange={(e) =>
                          setDiffSort(
                            e.target.value as
                              | 'delta_desc'
                              | 'delta_asc'
                              | 'expected_desc'
                              | 'actual_desc'
                          )
                        }
                      >
                        <option value="delta_desc">差分 大きい順</option>
                        <option value="delta_asc">差分 小さい順</option>
                        <option value="expected_desc">期待分 大きい順</option>
                        <option value="actual_desc">実績分 大きい順</option>
                      </select>
                    </div>
                    <div>
                      <Label className="mr-2">最小差分（分）</Label>
                      <Input
                        type="number"
                        className="h-8 w-28 inline-block"
                        min={0}
                        step={1}
                        value={diffMinAbs}
                        onChange={(e) =>
                          setDiffMinAbs(Math.max(0, Math.floor(Number(e.target.value || 0))))
                        }
                      />
                    </div>
                  </div>
                  {(() => {
                    const rows = [...postRunDiff]
                      .filter((r) => Math.abs((r.actual || 0) - (r.expected || 0)) >= diffMinAbs)
                      .sort((a, b) => {
                        const da = (a.actual || 0) - (a.expected || 0);
                        const db = (b.actual || 0) - (b.expected || 0);
                        switch (diffSort) {
                          case 'delta_asc':
                            return Math.abs(da) - Math.abs(db);
                          case 'expected_desc':
                            return (b.expected || 0) - (a.expected || 0);
                          case 'actual_desc':
                            return (b.actual || 0) - (a.actual || 0);
                          case 'delta_desc':
                          default:
                            return Math.abs(db) - Math.abs(da);
                        }
                      })
                      .slice(0, 20);
                    return (
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="text-left text-gray-600">
                            <th className="py-2 pr-4">ユーザー</th>
                            <th className="py-2 pr-4">期待(分)</th>
                            <th className="py-2 pr-4">実績(分)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((r, idx) => {
                            const u = users.find((x) => x.id === r.userId);
                            return (
                              <tr key={idx} className="border-t">
                                <td className="py-2 pr-4">
                                  {u
                                    ? `${u.family_name || ''} ${u.first_name || ''}`.trim()
                                    : r.userId}
                                </td>
                                <td className="py-2 pr-4">{r.expected}</td>
                                <td className="py-2 pr-4">{r.actual}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    );
                  })()}
                </div>
              )}
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setPreviewDialogOpen(false);
                    setPostRunDiff([]);
                  }}
                >
                  閉じる
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    // CSVエクスポート
                    const header = [
                      'user_id',
                      'name',
                      'eligible',
                      'service_years',
                      'base_days',
                      'quantity_minutes',
                      'duplicate',
                      'reason',
                    ];
                    const rows = previewRows.map((r) => {
                      const u = users.find((x) => x.id === r.userId);
                      const name = u ? `${u.family_name || ''} ${u.first_name || ''}`.trim() : '';
                      return [
                        r.userId,
                        name,
                        r.eligible ? '1' : '0',
                        String(r.serviceYears),
                        r.baseDays.toFixed(2),
                        String(r.quantityMinutes),
                        r.duplicate ? '1' : '0',
                        r.reason || '',
                      ].join(',');
                    });
                    const blob = new Blob([[header.join(','), ...rows].join('\n')], {
                      type: 'text/csv;charset=utf-8;',
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `leave_grant_preview_${policy.grantDate || 'date'}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  CSVダウンロード
                </Button>
                <Button
                  variant="outline"
                  disabled={postRunDiff.length === 0}
                  onClick={() => {
                    if (postRunDiff.length === 0) return;
                    const header = [
                      'user_id',
                      'name',
                      'expected_minutes',
                      'actual_minutes',
                      'delta_minutes',
                    ];
                    const rows = postRunDiff.map((r) => {
                      const u = users.find((x) => x.id === r.userId);
                      const name = u ? `${u.family_name || ''} ${u.first_name || ''}`.trim() : '';
                      const delta = (r.actual || 0) - (r.expected || 0);
                      return [
                        r.userId,
                        name,
                        String(r.expected),
                        String(r.actual),
                        String(delta),
                      ].join(',');
                    });
                    const blob = new Blob([[header.join(','), ...rows].join('\n')], {
                      type: 'text/csv;charset=utf-8;',
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `leave_grant_diff_${policy.grantDate || 'date'}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  差分CSVダウンロード
                </Button>
                <Button
                  onClick={async () => {
                    if (!companyId || !policy.leaveTypeId || !policy.grantDate) return;
                    setIsBusy(true);
                    try {
                      const { runPolicyGrantAuto } = await import('@/lib/actions/leave-grants');
                      const res = await runPolicyGrantAuto({
                        companyId,
                        leaveTypeId: policy.leaveTypeId,
                        grantDate: policy.grantDate,
                        createdBy: user?.id || undefined,
                      });
                      if (!res.success) throw new Error(res.error || 'failed');
                      toast({
                        title: '付与実行',
                        description: `付与:${res.granted} / スキップ:${res.skipped}`,
                      });
                      // 実行後の差分検証
                      try {
                        const supabase = createClient(
                          process.env.NEXT_PUBLIC_SUPABASE_URL!,
                          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                        );
                        const userIds = users.map((u) => u.id);
                        const { data: grants } = await supabase
                          .from('leave_grants')
                          .select('user_id, quantity_minutes')
                          .in('user_id', userIds)
                          .eq('leave_type_id', policy.leaveTypeId)
                          .eq('granted_on', policy.grantDate)
                          .eq('source', 'policy')
                          .is('deleted_at', null);
                        const actualMap = new Map<string, number>();
                        (grants || []).forEach((g) => {
                          const uid = (g as { user_id: string }).user_id;
                          const qty = (g as { quantity_minutes: number }).quantity_minutes || 0;
                          actualMap.set(uid, (actualMap.get(uid) || 0) + qty);
                        });
                        const expectedMap = new Map<string, number>();
                        previewRows
                          .filter((r) => r.eligible && r.quantityMinutes > 0 && !r.duplicate)
                          .forEach((r) =>
                            expectedMap.set(
                              r.userId,
                              (expectedMap.get(r.userId) || 0) + r.quantityMinutes
                            )
                          );
                        const diffs: Array<{ userId: string; expected: number; actual: number }> =
                          [];
                        const allIds = new Set<string>([
                          ...Array.from(actualMap.keys()),
                          ...Array.from(expectedMap.keys()),
                        ]);
                        allIds.forEach((uid) => {
                          const ex = expectedMap.get(uid) || 0;
                          const ac = actualMap.get(uid) || 0;
                          if (ex !== ac) diffs.push({ userId: uid, expected: ex, actual: ac });
                        });
                        setPostRunDiff(diffs);
                        if (diffs.length > 0) {
                          toast({
                            title: '検証完了（差分あり）',
                            description: `差分: ${diffs.length}件`,
                          });
                        } else {
                          toast({ title: '検証完了', description: '差分はありません。' });
                        }
                      } catch (e) {
                        toast({
                          title: '検証エラー',
                          description: e instanceof Error ? e.message : 'Unknown error',
                          variant: 'destructive',
                        });
                      }
                    } catch (e) {
                      toast({
                        title: '付与実行失敗',
                        description: e instanceof Error ? e.message : 'Unknown error',
                        variant: 'destructive',
                      });
                    } finally {
                      setIsBusy(false);
                    }
                  }}
                  disabled={isBusy || previewRows.length === 0}
                >
                  この内容で付与を実行
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">最近の付与（最新50件）</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600">
                <th className="py-2 pr-4">ユーザー</th>
                <th className="py-2 pr-4">休暇種別</th>
                <th className="py-2 pr-4">分</th>
                <th className="py-2 pr-4">付与日</th>
                <th className="py-2 pr-4">失効日</th>
                <th className="py-2 pr-4">ソース</th>
                <th className="py-2 pr-4">メモ</th>
              </tr>
            </thead>
            <tbody>
              {recentGrants.map((g) => {
                const u = users.find((x) => x.id === g.user_id);
                const lt = leaveTypes.find((x) => x.id === g.leave_type_id);
                return (
                  <tr key={g.id} className="border-t">
                    <td className="py-2 pr-4">
                      {u ? `${u.family_name || ''} ${u.first_name || ''}`.trim() : g.user_id}
                    </td>
                    <td className="py-2 pr-4">{lt ? lt.name : g.leave_type_id}</td>
                    <td className="py-2 pr-4">{g.quantity_minutes}</td>
                    <td className="py-2 pr-4">{g.granted_on}</td>
                    <td className="py-2 pr-4">{g.expires_on || '-'}</td>
                    <td className="py-2 pr-4">{g.source}</td>
                    <td className="py-2 pr-4">{g.note || ''}</td>
                  </tr>
                );
              })}
              {recentGrants.length === 0 && (
                <tr>
                  <td className="py-4 text-gray-500" colSpan={7}>
                    付与履歴がありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// 雇用形態管理用ダイアログコンポーネントをインポート
import EmploymentTypeCreateDialog from '@/components/admin/employment-types/EmploymentTypeCreateDialog';
import EmploymentTypeEditDialog from '@/components/admin/employment-types/EmploymentTypeEditDialog';
import EmploymentTypeDeleteDialog from '@/components/admin/employment-types/EmploymentTypeDeleteDialog';

// 勤務形態管理用ダイアログコンポーネントをインポート
import WorkTypeCreateDialog from '@/components/admin/work-types/WorkTypeCreateDialog';
import WorkTypeEditDialog from '@/components/admin/work-types/WorkTypeEditDialog';
import WorkTypeDeleteDialog from '@/components/admin/work-types/WorkTypeDeleteDialog';

function JoinDateAssistant({ companyId }: { companyId: string }) {
  const { toast } = useToast();
  const [rows, setRows] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [isBusy, setIsBusy] = useState(false);

  async function load() {
    if (!companyId) return;
    const res = await listUsersMissingJoinedDate(companyId as unknown as string);
    if (res.success) setRows(res.data);
  }

  useEffect(() => {
    load();
  }, [companyId]);

  async function save() {
    setIsBusy(true);
    try {
      const updates = Object.entries(editing)
        .filter(([, date]) => !!date)
        .map(([userId, joinedDate]) => ({ userId, joinedDate }));
      if (updates.length === 0) {
        toast({ title: '更新不要', description: '入力された入社日がありません。' });
        return;
      }
      const res = await bulkUpdateJoinedDate(companyId as unknown as string, updates);
      if (!res.success) throw new Error(res.error || 'failed');
      toast({ title: '更新完了', description: `${res.updated}件 更新しました。` });
      setEditing({});
      load();
    } catch (e) {
      toast({
        title: '更新失敗',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsBusy(false);
    }
  }

  if (!companyId) return <div className="text-sm text-gray-600">会社が未選択です。</div>;

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-700">
        入社日（joined_date）が未設定のユーザーを検出し、ここで一括入力できます。
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600">
              <th className="py-2 pr-4">ユーザー</th>
              <th className="py-2 pr-4">メール</th>
              <th className="py-2 pr-4">入社日</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="py-2 pr-4">{r.name || r.id}</td>
                <td className="py-2 pr-4">{r.email}</td>
                <td className="py-2 pr-4">
                  <input
                    type="date"
                    className="h-9 border rounded-md px-2"
                    value={editing[r.id] || ''}
                    onChange={(e) => setEditing({ ...editing, [r.id]: e.target.value })}
                  />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="py-4 text-gray-500" colSpan={3}>
                  未設定のユーザーはいません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={load}>
          再読み込み
        </Button>
        <Button onClick={save} disabled={isBusy}>
          入社日を一括更新
        </Button>
      </div>
    </div>
  );
}

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('system');

  // Company State
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [isCompanyLoading, setIsCompanyLoading] = useState(false);

  // Attendance Statuses State
  const [attendanceStatuses, setAttendanceStatuses] = useState<AttendanceStatusData[]>([]);
  const [isAttendanceStatusesLoading, setIsAttendanceStatusesLoading] = useState(false);

  // Employment Types State
  const [employmentTypes, setEmploymentTypes] = useState<EmploymentType[]>([]);
  const [employmentTypeStats, setEmploymentTypeStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
  });
  const [isEmploymentTypesLoading, setIsEmploymentTypesLoading] = useState(false);

  // 雇用形態ダイアログの状態管理
  const [createEmploymentTypeDialogOpen, setCreateEmploymentTypeDialogOpen] = useState(false);
  const [editEmploymentTypeDialogOpen, setEditEmploymentTypeDialogOpen] = useState(false);
  const [editEmploymentTypeTarget, setEditEmploymentTypeTarget] = useState<EmploymentType | null>(
    null
  );
  const [deleteEmploymentTypeDialogOpen, setDeleteEmploymentTypeDialogOpen] = useState(false);
  const [deleteEmploymentTypeTarget, setDeleteEmploymentTypeTarget] =
    useState<EmploymentType | null>(null);

  // Work Types State
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [workTypeStats, setWorkTypeStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
  });
  const [isWorkTypesLoading, setIsWorkTypesLoading] = useState(false);

  // 勤務形態ダイアログの状態管理
  const [createWorkTypeDialogOpen, setCreateWorkTypeDialogOpen] = useState(false);
  const [editWorkTypeDialogOpen, setEditWorkTypeDialogOpen] = useState(false);
  const [editWorkTypeTarget, setEditWorkTypeTarget] = useState<WorkType | null>(null);
  const [deleteWorkTypeDialogOpen, setDeleteWorkTypeDialogOpen] = useState(false);
  const [deleteWorkTypeTarget, setDeleteWorkTypeTarget] = useState<WorkType | null>(null);

  // System Settings State
  const [systemSettings, setSystemSettings] = useState({
    debugMode: false,
    maintenanceMode: false,
    logLevel: 'info',
    features: {
      attendance: true,
      requests: true,
      userManagement: true,
      organizationManagement: true,
      analytics: false,
    },
  });

  // Notification Settings State
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    lateArrivalAlert: true,
    overtimeAlert: true,
    applicationAlert: true,
    systemMaintenance: true,
    securityAlert: false,
    backupNotification: false,
    timeEditPermission: false, // 打刻編集許可
  });

  // 企業情報取得
  async function fetchCompanyInfo() {
    if (!user?.company_id) return;

    setIsCompanyLoading(true);
    try {
      const companyInfo = await getCompanyInfo(user.company_id);
      if (companyInfo) {
        setCompany(companyInfo);
      } else {
        console.error('企業情報取得失敗');
      }
    } catch (error) {
      console.error('企業情報取得エラー:', error);
    } finally {
      setIsCompanyLoading(false);
    }
  }

  // 勤怠ステータス取得
  async function fetchAttendanceStatuses() {
    if (!user?.company_id) return;

    setIsAttendanceStatusesLoading(true);
    try {
      const [statusesResult, lateAlertResult, overtimeAlertResult, clockEditResult] =
        await Promise.all([
          getAttendanceStatuses(user.company_id),
          getAttendanceSettingValue(user.company_id, 'late_alert'),
          getAttendanceSettingValue(user.company_id, 'overtime_alert'),
          getAttendanceSettingValue(user.company_id, 'clock_record_edit'),
        ]);

      if (statusesResult?.success && statusesResult?.statuses) {
        setAttendanceStatuses(statusesResult.statuses);
      } else {
        console.warn('勤怠ステータス取得失敗:', statusesResult?.error || 'Unknown error');
      }

      // 設定値を更新（安全な処理）
      setNotificationSettings((prev) => ({
        ...prev,
        lateArrivalAlert: (lateAlertResult as { enabled: boolean })?.enabled ?? false,
        overtimeAlert: (overtimeAlertResult as { enabled: boolean })?.enabled ?? false,
        timeEditPermission: (clockEditResult as { enabled: boolean })?.enabled ?? false,
      }));
    } catch (error) {
      console.error('勤怠ステータス取得エラー:', error);
    } finally {
      setIsAttendanceStatusesLoading(false);
    }
  }

  // 雇用形態データ取得
  async function fetchEmploymentTypes() {
    if (!user?.company_id) return;

    setIsEmploymentTypesLoading(true);
    try {
      const [typesResult, statsResult] = await Promise.all([
        getEmploymentTypes(user.company_id),
        getEmploymentTypeStats(user.company_id),
      ]);

      if (typesResult.success) {
        setEmploymentTypes(typesResult.data.employment_types);
      } else {
        console.error('雇用形態取得失敗:', typesResult.error);
      }

      if (statsResult.success) {
        setEmploymentTypeStats(statsResult.data);
      } else {
        console.error('雇用形態統計取得失敗:', statsResult.error);
      }
    } catch (error) {
      console.error('雇用形態データ取得エラー:', error);
    } finally {
      setIsEmploymentTypesLoading(false);
    }
  }

  // 勤務形態取得
  async function fetchWorkTypes() {
    if (!user?.company_id) return;

    setIsWorkTypesLoading(true);
    try {
      const [typesResult, statsResult] = await Promise.all([
        getWorkTypes(user.company_id, { page: 1, limit: 100 }),
        getWorkTypeStats(user.company_id),
      ]);

      if (typesResult.success) {
        console.log('勤務形態データ取得成功:', typesResult.data.work_types);
        setWorkTypes(typesResult.data.work_types);
      } else {
        console.error('勤務形態取得失敗:', typesResult.error);
      }

      if (statsResult.success) {
        setWorkTypeStats(statsResult.data);
      } else {
        console.error('勤務形態統計取得失敗:', statsResult.error);
      }
    } catch (error) {
      console.error('勤務形態データ取得エラー:', error);
    } finally {
      setIsWorkTypesLoading(false);
    }
  }

  async function handleSaveSettings(settingsType: string) {
    setIsLoading(true);
    try {
      if (settingsType === 'company' && company && user?.company_id) {
        const result = await updateCompanyInfo(
          user.company_id,
          {
            name: company.name,
            code: company.code,
            address: company.address,
            phone: company.phone,
          },
          user.id
        );

        if (result.success) {
          toast({
            title: '成功',
            description: result.message,
          });
        } else {
          toast({
            title: 'エラー',
            description: result.error || '企業情報の更新に失敗しました',
            variant: 'destructive',
          });
        }
      } else if (settingsType === 'attendance' && user?.company_id) {
        // 勤怠設定の保存
        const results = await Promise.all([
          saveAttendanceSetting(
            user.company_id,
            'late_alert',
            { enabled: notificationSettings.lateArrivalAlert },
            user.id
          ),
          saveAttendanceSetting(
            user.company_id,
            'overtime_alert',
            { enabled: notificationSettings.overtimeAlert },
            user.id
          ),
          saveAttendanceSetting(
            user.company_id,
            'clock_record_edit',
            { enabled: notificationSettings.timeEditPermission },
            user.id
          ),
        ]);

        const hasError = results.some((result) => !result.success);
        if (hasError) {
          toast({
            title: 'エラー',
            description: '勤怠設定の保存に失敗しました',
            variant: 'destructive',
          });
        } else {
          toast({
            title: '成功',
            description: '勤怠設定を保存しました',
          });
        }
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        console.log(`Saving ${settingsType} settings...`);
      }
    } catch (error) {
      console.error('設定保存エラー:', error);
      toast({
        title: 'エラー',
        description: '設定の保存に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  // 雇用形態編集ボタン押下時
  function handleEditEmploymentType(employmentType: EmploymentType) {
    setEditEmploymentTypeTarget(employmentType);
    setEditEmploymentTypeDialogOpen(true);
  }

  // 雇用形態削除ボタン押下時
  function handleDeleteEmploymentType(employmentType: EmploymentType) {
    setDeleteEmploymentTypeTarget(employmentType);
    setDeleteEmploymentTypeDialogOpen(true);
  }

  // 勤務形態編集ボタン押下時
  function handleEditWorkType(workType: WorkType) {
    setEditWorkTypeTarget(workType);
    setEditWorkTypeDialogOpen(true);
  }

  // 勤務形態削除ボタン押下時
  function handleDeleteWorkType(workType: WorkType) {
    setDeleteWorkTypeTarget(workType);
    setDeleteWorkTypeDialogOpen(true);
  }

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/login');
      return;
    }

    // システムタブがアクティブになったときに企業情報を取得
    if (activeTab === 'system') {
      fetchCompanyInfo();
    }

    // 勤怠管理タブがアクティブになったときに勤怠ステータスを取得
    if (activeTab === 'attendance') {
      fetchAttendanceStatuses();
    }

    // 雇用形態タブがアクティブになったときにデータを取得
    if (activeTab === 'employment-types') {
      fetchEmploymentTypes();
    }

    // 勤務形態タブがアクティブになったときにデータを取得
    if (activeTab === 'work-types') {
      fetchWorkTypes();
    }
  }, [user, router, activeTab]);

  if (!user || user.role !== 'admin') {
    return null;
  }

  const tabs = [
    { id: 'system', label: 'システム', icon: Settings },
    { id: 'notifications', label: '通知', icon: Bell },
    { id: 'features', label: '機能設定', icon: FormInput },
    { id: 'employment-types', label: '雇用形態', icon: Users },
    { id: 'work-types', label: '勤務形態', icon: Briefcase },
    { id: 'attendance', label: '勤怠管理', icon: Clock },
    { id: 'calendar', label: 'カレンダー管理', icon: CalendarDays },
    { id: 'leave-grants', label: '休暇', icon: Plus },
    { id: 'user-join', label: '入社日補助', icon: Edit },
    { id: 'logs', label: 'ログ設定', icon: FileText },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">設定</h1>
        <p className="text-gray-600">システム全体の設定を管理できます</p>
      </div>

      {/* タブナビゲーション */}
      <div className="border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <nav className="flex space-x-0 bg-gray-50 rounded-t-lg px-2 py-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-2 px-4 font-semibold text-sm whitespace-nowrap transition-all duration-200 rounded-md mx-1
                  ${
                    activeTab === tab.id
                      ? 'bg-black text-white shadow-md scale-105'
                      : 'text-gray-500 hover:text-black hover:bg-gray-100'
                  }
                `}
                style={{ minHeight: 32 }}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* タブコンテンツ */}
      <div className="mt-6">
        {/* システム設定 */}
        {activeTab === 'system' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Building className="w-5 h-5" />
                    <span>企業情報</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isCompanyLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="flex items-center space-x-2">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span>企業情報を読み込み中...</span>
                      </div>
                    </div>
                  ) : company ? (
                    <>
                      <div>
                        <Label htmlFor="companyName">企業名</Label>
                        <Input
                          id="companyName"
                          value={company.name}
                          onChange={(e) =>
                            setCompany((prev) => (prev ? { ...prev, name: e.target.value } : null))
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="companyCode">企業コード</Label>
                        <Input
                          id="companyCode"
                          value={company.code}
                          onChange={(e) =>
                            setCompany((prev) => (prev ? { ...prev, code: e.target.value } : null))
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="companyAddress">住所</Label>
                        <Textarea
                          id="companyAddress"
                          value={company.address || ''}
                          onChange={(e) =>
                            setCompany((prev) =>
                              prev ? { ...prev, address: e.target.value } : null
                            )
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="companyPhone">電話番号</Label>
                        <Input
                          id="companyPhone"
                          value={company.phone || ''}
                          onChange={(e) =>
                            setCompany((prev) => (prev ? { ...prev, phone: e.target.value } : null))
                          }
                        />
                      </div>
                      <Button
                        onClick={() => handleSaveSettings('company')}
                        disabled={isLoading}
                        className="w-full"
                        variant="timeport-primary"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        保存
                      </Button>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500">企業情報を取得できませんでした</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="w-5 h-5" />
                  <span>システム設定</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>デバッグモード</Label>
                    <p className="text-sm text-gray-500">開発・デバッグ用の詳細ログ出力</p>
                  </div>
                  <Switch
                    checked={systemSettings.debugMode || false}
                    onCheckedChange={(checked) =>
                      setSystemSettings((prev) => ({ ...prev, debugMode: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>メンテナンスモード</Label>
                    <p className="text-sm text-gray-500">システムメンテナンス時の一時停止</p>
                  </div>
                  <Switch
                    checked={systemSettings.maintenanceMode || false}
                    onCheckedChange={(checked) =>
                      setSystemSettings((prev) => ({ ...prev, maintenanceMode: checked }))
                    }
                  />
                </div>

                <Button
                  onClick={() => handleSaveSettings('system')}
                  disabled={isLoading}
                  className="w-full"
                  variant="timeport-primary"
                >
                  <Save className="w-4 h-4 mr-2" />
                  保存
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 通知設定 */}
        {activeTab === 'notifications' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="w-5 h-5" />
                <span>通知設定</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>メール通知</Label>
                  <p className="text-sm text-gray-500">システムからのメール通知</p>
                </div>
                <Switch
                  checked={notificationSettings.emailNotifications ?? true}
                  onCheckedChange={(checked) =>
                    setNotificationSettings((prev) => ({ ...prev, emailNotifications: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>セキュリティアラート</Label>
                  <p className="text-sm text-gray-500">セキュリティ関連の通知</p>
                </div>
                <Switch
                  checked={notificationSettings.securityAlert ?? false}
                  onCheckedChange={(checked) =>
                    setNotificationSettings((prev) => ({ ...prev, securityAlert: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>バックアップ通知</Label>
                  <p className="text-sm text-gray-500">データバックアップの通知</p>
                </div>
                <Switch
                  checked={notificationSettings.backupNotification ?? false}
                  onCheckedChange={(checked) =>
                    setNotificationSettings((prev) => ({ ...prev, backupNotification: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>申請アラート</Label>
                  <p className="text-sm text-gray-500">申請・承認の通知</p>
                </div>
                <Switch
                  checked={notificationSettings.applicationAlert ?? true}
                  onCheckedChange={(checked) =>
                    setNotificationSettings((prev) => ({ ...prev, applicationAlert: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>システムメンテナンス</Label>
                  <p className="text-sm text-gray-500">メンテナンス情報の通知</p>
                </div>
                <Switch
                  checked={notificationSettings.systemMaintenance ?? true}
                  onCheckedChange={(checked) =>
                    setNotificationSettings((prev) => ({ ...prev, systemMaintenance: checked }))
                  }
                />
              </div>

              <Button
                onClick={() => handleSaveSettings('notifications')}
                disabled={isLoading}
                className="w-full"
                variant="timeport-primary"
              >
                <Save className="w-4 h-4 mr-2" />
                保存
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 機能設定 */}
        {activeTab === 'features' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FormInput className="w-5 h-5" />
                <span>機能設定</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>勤怠管理</Label>
                  <p className="text-sm text-gray-500">出退勤記録・勤怠管理機能</p>
                </div>
                <Switch
                  checked={systemSettings.features.attendance}
                  onCheckedChange={(checked) =>
                    setSystemSettings((prev) => ({
                      ...prev,
                      features: { ...prev.features, attendance: checked },
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>申請・承認</Label>
                  <p className="text-sm text-gray-500">各種申請・承認機能</p>
                </div>
                <Switch
                  checked={systemSettings.features.requests}
                  onCheckedChange={(checked) =>
                    setSystemSettings((prev) => ({
                      ...prev,
                      features: { ...prev.features, requests: checked },
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>ユーザー管理</Label>
                  <p className="text-sm text-gray-500">ユーザーの追加・編集・削除</p>
                </div>
                <Switch
                  checked={systemSettings.features.userManagement}
                  onCheckedChange={(checked) =>
                    setSystemSettings((prev) => ({
                      ...prev,
                      features: { ...prev.features, userManagement: checked },
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>組織管理</Label>
                  <p className="text-sm text-gray-500">グループ・グループの管理</p>
                </div>
                <Switch
                  checked={systemSettings.features.organizationManagement}
                  onCheckedChange={(checked) =>
                    setSystemSettings((prev) => ({
                      ...prev,
                      features: { ...prev.features, organizationManagement: checked },
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>分析機能</Label>
                  <p className="text-sm text-gray-500">勤怠データの分析・レポート</p>
                </div>
                <Switch
                  checked={systemSettings.features.analytics}
                  onCheckedChange={(checked) =>
                    setSystemSettings((prev) => ({
                      ...prev,
                      features: { ...prev.features, analytics: checked },
                    }))
                  }
                />
              </div>

              <Button
                onClick={() => handleSaveSettings('features')}
                disabled={isLoading}
                className="w-full"
                variant="timeport-primary"
              >
                <Save className="w-4 h-4 mr-2" />
                保存
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 勤怠管理設定 */}
        {activeTab === 'attendance' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="w-5 h-5" />
                  <span>勤怠管理設定</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* ステータス管理セクション */}
                <div className="border rounded-lg p-6 bg-gray-50">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">ステータス管理</h3>
                      <p className="text-sm text-gray-600">
                        勤怠ステータスの種類を管理できます。正常、遅刻、早退、欠勤などのステータスをカスタマイズできます。
                      </p>
                    </div>
                    <Button
                      onClick={() => router.push('/admin/attendance-statuses')}
                      variant="timeport-primary"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      ステータス管理
                    </Button>
                  </div>

                  {isAttendanceStatusesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="flex items-center space-x-2">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span>ステータスを読み込み中...</span>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {attendanceStatuses.map((status) => (
                        <div key={status.id} className="bg-white p-4 rounded-lg border">
                          <div className="flex items-center space-x-2 mb-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: status.background_color }}
                            ></div>
                            <span className="font-medium">{status.display_name}</span>
                            {status.is_required && (
                              <Badge variant="outline" className="text-xs">
                                必須
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{status.description}</p>
                        </div>
                      ))}
                      {attendanceStatuses.length === 0 && (
                        <div className="col-span-full text-center py-8">
                          <p className="text-gray-500">勤怠ステータスが登録されていません</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 勤怠設定セクション */}
                <div className="border rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">勤怠設定</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>遅刻アラート</Label>
                        <p className="text-sm text-gray-500">遅刻時の通知</p>
                      </div>
                      <Switch
                        checked={notificationSettings.lateArrivalAlert ?? false}
                        onCheckedChange={(checked) =>
                          setNotificationSettings((prev) => ({
                            ...prev,
                            lateArrivalAlert: checked,
                          }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>残業アラート</Label>
                        <p className="text-sm text-gray-500">残業時間の通知</p>
                      </div>
                      <Switch
                        checked={notificationSettings.overtimeAlert ?? false}
                        onCheckedChange={(checked) =>
                          setNotificationSettings((prev) => ({ ...prev, overtimeAlert: checked }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>打刻編集</Label>
                        <p className="text-sm text-gray-500">管理者による打刻の編集許可</p>
                      </div>
                      <Switch
                        checked={notificationSettings.timeEditPermission ?? false}
                        onCheckedChange={(checked) =>
                          setNotificationSettings((prev) => ({
                            ...prev,
                            timeEditPermission: checked,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <Button
                    onClick={() => handleSaveSettings('attendance')}
                    disabled={isLoading}
                    className="w-full mt-6"
                    variant="timeport-primary"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    保存
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* カレンダー管理 */}
        {activeTab === 'calendar' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CalendarDays className="w-5 h-5" />
                  <span>カレンダー管理</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <InlineCompanyCalendarSettings />
              </CardContent>
            </Card>
          </div>
        )}

        {/* 休暇 */}
        {activeTab === 'leave-grants' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Plus className="w-5 h-5" />
                  <span>休暇</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <InlineGrantsManager companyId={user?.company_id || ''} />
              </CardContent>
            </Card>
          </div>
        )}

        {/* 入社日補助 */}
        {activeTab === 'user-join' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Edit className="w-5 h-5" />
                  <span>入社日未設定ユーザーの検出/一括更新</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <JoinDateAssistant companyId={user?.company_id || ''} />
              </CardContent>
            </Card>
          </div>
        )}

        {/* ログ設定 */}
        {activeTab === 'logs' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>ログ設定</span>
                </CardTitle>
                <CardDescription>
                  システムログと監査ログの設定を管理します。ログの記録レベルや保存期間を設定できます。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* システムログ設定 */}
                <div className="border rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">システムログ設定</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>システムログ記録</Label>
                        <p className="text-sm text-gray-500">
                          システム技術ログの記録を有効にします
                        </p>
                      </div>
                      <Switch
                        checked={systemSettings.debugMode}
                        onCheckedChange={(checked) =>
                          setSystemSettings((prev) => ({ ...prev, debugMode: checked }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>ログレベル</Label>
                      <p className="text-sm text-gray-500">
                        記録するログの重要度レベルを選択します
                      </p>
                      <select
                        className="w-full px-3 py-2 border border-input bg-background rounded-md"
                        defaultValue="info"
                      >
                        <option value="debug">Debug - デバッグ情報</option>
                        <option value="info">Info - 一般情報</option>
                        <option value="warn">Warning - 警告</option>
                        <option value="error">Error - エラー</option>
                        <option value="fatal">Fatal - 致命的エラー</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>エラーログ即座保存</Label>
                        <p className="text-sm text-gray-500">
                          エラーログを即座にデータベースに保存します
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.securityAlert || false}
                        onCheckedChange={(checked) =>
                          setNotificationSettings((prev) => ({ ...prev, securityAlert: checked }))
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* 監査ログ設定 */}
                <div className="border rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">監査ログ設定</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>監査ログ記録</Label>
                        <p className="text-sm text-gray-500">
                          ユーザー操作ログの記録を有効にします
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.applicationAlert}
                        onCheckedChange={(checked) =>
                          setNotificationSettings((prev) => ({
                            ...prev,
                            applicationAlert: checked,
                          }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>データ変更記録</Label>
                        <p className="text-sm text-gray-500">データの変更前後の状態を記録します</p>
                      </div>
                      <Switch
                        checked={notificationSettings.systemMaintenance}
                        onCheckedChange={(checked) =>
                          setNotificationSettings((prev) => ({
                            ...prev,
                            systemMaintenance: checked,
                          }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>セッション情報記録</Label>
                        <p className="text-sm text-gray-500">ユーザーセッション情報を記録します</p>
                      </div>
                      <Switch
                        checked={notificationSettings.backupNotification || false}
                        onCheckedChange={(checked) =>
                          setNotificationSettings((prev) => ({
                            ...prev,
                            backupNotification: checked,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* ログ保持設定 */}
                <div className="border rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">ログ保持設定</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="systemLogRetention">システムログ保持期間（日）</Label>
                      <Input
                        id="systemLogRetention"
                        type="number"
                        placeholder="30"
                        className="w-full"
                      />
                      <p className="text-sm text-gray-500">システムログの自動削除期間</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="auditLogRetention">監査ログ保持期間（日）</Label>
                      <Input
                        id="auditLogRetention"
                        type="number"
                        placeholder="90"
                        className="w-full"
                      />
                      <p className="text-sm text-gray-500">監査ログの自動削除期間</p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => handleSaveSettings('logs')}
                  disabled={isLoading}
                  className="w-full"
                  variant="timeport-primary"
                >
                  <Save className="w-4 h-4 mr-2" />
                  ログ設定を保存
                </Button>
              </CardContent>
            </Card>

            {/* ログ監視 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="w-5 h-5" />
                  <span>ログ監視</span>
                </CardTitle>
                <CardDescription>企業内のログ状況を監視します</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">1,234</div>
                    <div className="text-sm text-gray-600">今日のログ数</div>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">5</div>
                    <div className="text-sm text-gray-600">エラーログ数</div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">98.5%</div>
                    <div className="text-sm text-gray-600">システム稼働率</div>
                  </div>
                </div>

                <div className="mt-4 flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    最終更新: {formatDateTimeForDisplay(new Date())}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => router.push('/admin/logs')}>
                    <FileText className="w-4 h-4 mr-2" />
                    ログ詳細を表示
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* 雇用形態管理ダイアログ */}
      <EmploymentTypeCreateDialog
        open={createEmploymentTypeDialogOpen}
        onOpenChangeAction={setCreateEmploymentTypeDialogOpen}
        onSuccess={fetchEmploymentTypes}
      />
      <EmploymentTypeEditDialog
        open={editEmploymentTypeDialogOpen}
        onOpenChangeAction={setEditEmploymentTypeDialogOpen}
        employmentType={editEmploymentTypeTarget}
        onSuccess={fetchEmploymentTypes}
      />
      <EmploymentTypeDeleteDialog
        open={deleteEmploymentTypeDialogOpen}
        onOpenChangeAction={setDeleteEmploymentTypeDialogOpen}
        employmentType={deleteEmploymentTypeTarget}
        onSuccess={fetchEmploymentTypes}
      />

      {/* 勤務形態管理ダイアログ */}
      <WorkTypeCreateDialog
        open={createWorkTypeDialogOpen}
        onOpenChangeAction={setCreateWorkTypeDialogOpen}
        companyId={user?.company_id || ''}
        onSuccessAction={fetchWorkTypes}
      />
      <WorkTypeEditDialog
        open={editWorkTypeDialogOpen}
        onOpenChangeAction={setEditWorkTypeDialogOpen}
        workType={editWorkTypeTarget}
        companyId={user?.company_id || ''}
        onSuccessAction={fetchWorkTypes}
      />
      <WorkTypeDeleteDialog
        open={deleteWorkTypeDialogOpen}
        onOpenChangeAction={setDeleteWorkTypeDialogOpen}
        workType={deleteWorkTypeTarget}
        companyId={user?.company_id || ''}
        onSuccessAction={fetchWorkTypes}
      />
    </div>
  );
}
