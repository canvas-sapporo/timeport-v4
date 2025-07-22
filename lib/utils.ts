import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
};

/**
 * 日時を「YYYY年MM月DD日hh:mm」形式でフォーマット
 * @param date 日付文字列またはDateオブジェクト
 * @param includeTime 時刻を含めるかどうか（デフォルト: true）
 * @returns フォーマットされた日時文字列
 */
export const formatDateTime = (
  date: string | Date | null | undefined,
  includeTime: boolean = true
): string => {
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
};

/**
 * 時刻のみを「hh:mm」形式でフォーマット
 * @param time 時刻文字列またはDateオブジェクト
 * @returns フォーマットされた時刻文字列
 */
export const formatTime = (time: string | Date | null | undefined): string => {
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
};

/**
 * 日付のみを「YYYY年MM月DD日」形式でフォーマット
 * @param date 日付文字列またはDateオブジェクト
 * @returns フォーマットされた日付文字列
 */
export const formatDate = (date: string | Date | null | undefined): string => {
  return formatDateTime(date, false);
};
