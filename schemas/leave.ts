import { z } from 'zod';
import { assertMinUnit, MinUnit, normalizeToHours, roundToMinUnitHours } from '@/lib/leave/rounding';

// --- 共通プリミティブ ---
export const UUID = z.string().uuid();
export const ISODate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 形式');
export const ISODateTime = z.string().datetime(); // 例: 2025-08-13T09:00:00.000Z

// --- leave_policies 相当 ---
export const LeavePolicySchema = z.object({
  companyId: UUID,
  leaveTypeId: UUID,
  accrualMethod: z.enum(['anniversary', 'fiscal_fixed', 'monthly']),
  baseDaysByService: z.record(z.string(), z.number().nonnegative()).default({}), // {"0":10,"1":11,...}
  prorateParttime: z.boolean().default(true),
  carryoverMaxDays: z.number().nonnegative().nullable().optional(),
  expireMonths: z.number().int().positive().default(24),
  minUnit: z.enum(['1h', '0.5d', '1d']).default('1h'),
  allowNegative: z.boolean().default(false),
  holdOnApply: z.boolean().default(true),
  deductionTiming: z.enum(['apply', 'approve']).default('approve'),
  businessDayOnly: z.boolean().default(true),
  blackoutDates: z.array(ISODate).default([]),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type LeavePolicy = z.infer<typeof LeavePolicySchema>;

// --- 申請明細（UI 入力用） ---
export const LeaveRequestDetailSchema = z.object({
  leaveTypeId: UUID,
  startAt: ISODateTime,
  endAt: ISODateTime,
  unit: z.enum(['day', 'half', 'hour']),
  quantity: z.number().positive(), // unit基準の入力（例: day=1, half=1, hour=3）
  reason: z.string().optional(),
});

export type LeaveRequestDetailInput = z.infer<typeof LeaveRequestDetailSchema>;

// --- 申請ペイロード（複数明細＋ポリシー＆1日=何時間） ---
export const LeaveRequestPayloadSchema = z.object({
  userId: UUID,
  details: z.array(LeaveRequestDetailSchema).min(1),
  // バリデーション用の文脈
  policy: LeavePolicySchema,
  hoursPerDay: z.number().positive().default(8),
}).superRefine((val, ctx) => {
  // 1) 各明細の時間整合チェック（startAt < endAt）
  for (let i = 0; i < val.details.length; i++) {
    const d = val.details[i];
    const start = new Date(d.startAt).getTime();
    const end = new Date(d.endAt).getTime();
    if (!(start < end)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `details[${i}]: startAt < endAt を満たす必要があります`,
        path: ['details', i, 'startAt'],
      });
    }
  }

  // 2) minUnit 丸めの事前チェック
  const minUnit = val.policy.minUnit as MinUnit;
  try { assertMinUnit(minUnit); } catch (e) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${e}`, path: ['policy', 'minUnit'] });
  }

  // 3) 明細ごとの実時間（hour）に正規化し、minUnitに丸めて合計
  const hoursPerDay = val.hoursPerDay ?? 8;
  let totalHoursRequested = 0;

  for (let i = 0; i < val.details.length; i++) {
    const d = val.details[i];
    const hours = normalizeToHours(d.unit, d.quantity, hoursPerDay);

    // 端数丸め（四捨五入）
    const rounded = roundToMinUnitHours(hours, minUnit, { hoursPerDay });

    if (rounded <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `details[${i}]: 丸め後の時間が0以下です。数量または単位を見直してください。`,
        path: ['details', i, 'quantity'],
      });
    }
    totalHoursRequested += rounded;
  }

  // 4) マイナス残不可ポリシーなら、事前に残高と比較したいが、
  //    クライアント単体では正確な残高が不明なのでここでは構造チェックのみ。
  //    サーバー側（Step4 allocate）で最終検証を必ず行うこと。
});

export type LeaveRequestPayload = z.infer<typeof LeaveRequestPayloadSchema>;

// --- サーバー側検証のためのヘルパー（合計時間の算出のみを公開） ---
export function computeRoundedTotalHours(
  details: LeaveRequestDetailInput[],
  minUnit: MinUnit,
  hoursPerDay = 8
) {
  let sum = 0;
  for (const d of details) {
    const h = normalizeToHours(d.unit, d.quantity, hoursPerDay);
    sum += roundToMinUnitHours(h, minUnit, { hoursPerDay });
  }
  return sum;
}


