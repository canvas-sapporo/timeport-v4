// 最小単位への丸めと単位変換（内部は "時間" を基本単位に統一）
export type MinUnit = '1h' | '0.5d' | '1d';

export interface RoundOptions {
  hoursPerDay?: number; // 1日=何時間（デフォルト8）
}

/** minUnit文字列のバリデーション */
export function assertMinUnit(minUnit: string): asserts minUnit is MinUnit {
  if (minUnit !== '1h' && minUnit !== '0.5d' && minUnit !== '1d') {
    throw new Error(`Unsupported minUnit: ${minUnit}`);
  }
}

/** 日⇄時間の相互変換 */
export const toHours = (days: number, hoursPerDay = 8) => days * hoursPerDay;
export const toDays = (hours: number, hoursPerDay = 8) => hours / hoursPerDay;

/** 最小単位へ丸め（四捨五入） */
export function roundToMinUnitHours(
  valueHours: number,
  minUnit: MinUnit,
  opts: RoundOptions = {}
): number {
  const hpd = opts.hoursPerDay ?? 8;

  if (minUnit === '1h') {
    // 1時間単位に丸め
    return Math.round(valueHours);
  }
  if (minUnit === '0.5d') {
    // 0.5日単位に丸め（= hpd/2 * n）
    const halfDay = hpd / 2;
    return Math.round(valueHours / halfDay) * halfDay;
  }
  if (minUnit === '1d') {
    // 1日単位に丸め（= hpd * n）
    return Math.round(valueHours / hpd) * hpd;
  }
  // 型的には到達しない
  return valueHours;
}

/** 単位（day/half/hour）→ 時間へ正規化。quantityは申請入力値（例: 日=1, 半=1, 時間=3 など） */
export function normalizeToHours(
  unit: 'day' | 'half' | 'hour',
  quantity: number,
  hoursPerDay = 8
): number {
  if (unit === 'hour') return quantity;
  if (unit === 'half') return (hoursPerDay / 2) * quantity; // 半休×個数
  if (unit === 'day') return hoursPerDay * quantity;
  return quantity;
}


