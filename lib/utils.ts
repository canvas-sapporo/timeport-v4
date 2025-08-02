import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 日時を「YYYY年MM月DD日hh:mm」形式でフォーマット
 * @param date 日付文字列またはDateオブジェクト
 * @param includeTime 時刻を含めるかどうか（デフォルト: true）
 * @returns フォーマットされた日時文字列
 */
export function formatDateTime(
  date: string | Date | null | undefined,
  includeTime: boolean = true
): string {
  if (!date) return '--:--';

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) {
      return '--:--';
    }

    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');

    if (!includeTime) {
      return `${year}年${month}月${day}日`;
    }

    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');

    return `${year}年${month}月${day}日${hours}:${minutes}`;
  } catch (error) {
    console.error('日時フォーマットエラー:', error);
    return '--:--';
  }
}

/**
 * 時刻のみを「hh:mm」形式でフォーマット
 * @param time 時刻文字列またはDateオブジェクト
 * @returns フォーマットされた時刻文字列
 */
export function formatTime(time: string | Date | null | undefined): string {
  if (!time) return '--:--';

  try {
    const dateObj = typeof time === 'string' ? new Date(time) : time;

    if (isNaN(dateObj.getTime())) {
      return '--:--';
    }

    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');

    return `${hours}:${minutes}`;
  } catch (error) {
    console.error('時刻フォーマットエラー:', error);
    return '--:--';
  }
}

/**
 * 日付のみを「YYYY年MM月DD日」形式でフォーマット
 * @param date 日付文字列またはDateオブジェクト
 * @returns フォーマットされた日付文字列
 */
export function formatDate(date: string | Date | null | undefined): string {
  return formatDateTime(date, false);
}

/**
 * ひらがなをカタカナに変換
 * @param text 変換する文字列
 * @returns カタカナに変換された文字列
 */
export function hiraganaToKatakana(text: string): string {
  return text.replace(/[\u3041-\u3096]/g, (char) => {
    return String.fromCharCode(char.charCodeAt(0) + 0x60);
  });
}

/**
 * 日本時間での日付を取得する関数
 * @param date 基準日時（デフォルト: 現在時刻）
 * @returns YYYY-MM-DD形式の日本時間での日付文字列
 */
export function getJSTDate(date: Date = new Date()): string {
  const jstOffset = 9 * 60; // JSTはUTC+9
  const jstTime = new Date(date.getTime() + jstOffset * 60 * 1000);
  return jstTime.toISOString().split('T')[0];
}

/**
 * 指定された日時を日本時間の日付に変換する関数
 * @param dateString ISO形式の日時文字列
 * @returns YYYY-MM-DD形式の日本時間での日付文字列
 */
export function getJSTDateFromString(dateString: string): string {
  const date = new Date(dateString);
  return getJSTDate(date);
}
