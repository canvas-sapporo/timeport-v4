'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { createServerClient } from '@/lib/supabase';
import type {
  SettingData as Setting,
  CsvExportSetting,
  AttendanceSetting,
  NotificationSetting,
  SettingType,
  GetSettingResult,
  SaveSettingResult,
  DeleteSettingResult,
  GetUserSettingsResult,
} from '@/schemas/setting';

/**
 * 設定を取得する
 * @param userId ユーザーID
 * @param role ユーザーのロール
 * @param settingType 設定タイプ
 * @param settingKey 設定キー
 * @returns 設定オブジェクトまたはnull
 */
export async function getSetting(
  userId: string,
  role: 'system-admin' | 'admin' | 'member',
  settingType: SettingType,
  settingKey: string
): Promise<Setting | null> {
  const supabase = createServerClient();

  try {
    // 1. まず個人設定を検索
    let query = supabase
      .from('settings')
      .select('*')
      .eq('user_id', userId)
      .eq('setting_type', settingType)
      .eq('setting_key', settingKey)
      .is('deleted_at', null);

    let { data, error } = await query.single();

    // 個人設定が見つからない場合、ロール別デフォルト設定を検索
    if (!data && error) {
      query = supabase
        .from('settings')
        .select('*')
        .eq('role', role)
        .is('user_id', null)
        .eq('setting_type', settingType)
        .eq('setting_key', settingKey)
        .eq('is_default', true)
        .is('deleted_at', null);

      ({ data, error } = await query.single());
    }

    // ロール別デフォルト設定も見つからない場合、システムデフォルト設定を検索
    if (!data && error) {
      query = supabase
        .from('settings')
        .select('*')
        .eq('role', 'system-admin')
        .is('user_id', null)
        .eq('setting_type', settingType)
        .eq('setting_key', settingKey)
        .eq('is_default', true)
        .is('deleted_at', null);

      ({ data, error } = await query.single());
    }

    if (error || !data) {
      console.error('Error fetching setting:', error);
      return null;
    }

    return data as Setting;
  } catch (error) {
    console.error('Error in getSetting:', error);
    return null;
  }
}

/**
 * 設定を保存する
 * @param userId ユーザーID
 * @param role ユーザーのロール
 * @param settingType 設定タイプ
 * @param settingKey 設定キー
 * @param settingValue 設定値
 * @param isDefault デフォルト設定かどうか
 * @returns 成功/失敗の結果
 */
export async function saveSetting(
  userId: string,
  role: 'system-admin' | 'admin' | 'member',
  settingType: SettingType,
  settingKey: string,
  settingValue: CsvExportSetting | AttendanceSetting | NotificationSetting,
  isDefault: boolean = false
): Promise<SaveSettingResult> {
  const supabase = createServerClient();

  try {
    // 既存の設定を確認
    const existingSetting = await getSetting(userId, role, settingType, settingKey);

    if (existingSetting) {
      // 既存設定を更新
      const { error } = await supabase
        .from('settings')
        .update({
          setting_value: settingValue,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingSetting.id);

      if (error) {
        console.error('Error updating setting:', error);
        return {
          success: false,
          message: '設定の更新に失敗しました',
          error: '設定の更新に失敗しました',
        };
      }
    } else {
      // 新規設定を作成
      const { error } = await supabase.from('settings').insert({
        role,
        user_id: role === 'system-admin' ? null : userId,
        setting_type: settingType,
        setting_key: settingKey,
        setting_value: settingValue,
        is_default: isDefault,
      });

      if (error) {
        console.error('Error creating setting:', error);
        return {
          success: false,
          message: '設定の作成に失敗しました',
          error: '設定の作成に失敗しました',
        };
      }
    }

    revalidatePath('/admin/settings');
    return { success: true, message: '設定が正常に保存されました' };
  } catch (error) {
    console.error('Error in saveSetting:', error);
    return {
      success: false,
      message: '設定の保存に失敗しました',
      error: '設定の保存に失敗しました',
    };
  }
}

/**
 * 設定を削除する
 * @param settingId 設定ID
 * @returns 成功/失敗の結果
 */
export async function deleteSetting(settingId: string): Promise<DeleteSettingResult> {
  const supabase = createServerClient();

  try {
    const { error } = await supabase
      .from('settings')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', settingId);

    if (error) {
      console.error('Error deleting setting:', error);
      return { success: false, error: '設定の削除に失敗しました' };
    }

    revalidatePath('/admin/settings');
    return { success: true };
  } catch (error) {
    console.error('Error in deleteSetting:', error);
    return { success: false, error: '設定の削除に失敗しました' };
  }
}

/**
 * ユーザーの全設定を取得する
 * @param userId ユーザーID
 * @param role ユーザーのロール
 * @param settingType 設定タイプ（オプション）
 * @returns 設定の配列
 */
export async function getUserSettings(
  userId: string,
  role: 'system-admin' | 'admin' | 'member',
  settingType?: SettingType
): Promise<Setting[]> {
  const supabase = createServerClient();

  try {
    let query = supabase.from('settings').select('*').eq('user_id', userId).is('deleted_at', null);

    if (settingType) {
      query = query.eq('setting_type', settingType);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user settings:', error);
      return [];
    }

    return data as Setting[];
  } catch (error) {
    console.error('Error in getUserSettings:', error);
    return [];
  }
}

/**
 * CSV出力設定を取得する（型安全なヘルパー関数）
 * @param userId ユーザーID
 * @param role ユーザーのロール
 * @param settingKey 設定キー
 * @returns CSV出力設定またはnull
 */
export async function getCsvExportSetting(
  userId: string,
  role: 'system-admin' | 'admin' | 'member',
  settingKey: string = 'default'
): Promise<CsvExportSetting | null> {
  const setting = await getSetting(userId, role, 'csv_export', settingKey);
  return setting ? (setting.setting_value as CsvExportSetting) : null;
}

/**
 * 勤怠設定を取得する（型安全なヘルパー関数）
 * @param userId ユーザーID
 * @param role ユーザーのロール
 * @param settingKey 設定キー
 * @returns 勤怠設定またはnull
 */
export async function getAttendanceSetting(
  userId: string,
  role: 'system-admin' | 'admin' | 'member',
  settingKey: string = 'default'
): Promise<AttendanceSetting | null> {
  const setting = await getSetting(userId, role, 'attendance', settingKey);
  return setting ? (setting.setting_value as AttendanceSetting) : null;
}

/**
 * 通知設定を取得する（型安全なヘルパー関数）
 * @param userId ユーザーID
 * @param role ユーザーのロール
 * @param settingKey 設定キー
 * @returns 通知設定またはnull
 */
export async function getNotificationSetting(
  userId: string,
  role: 'system-admin' | 'admin' | 'member',
  settingKey: string = 'default'
): Promise<NotificationSetting | null> {
  const setting = await getSetting(userId, role, 'notification', settingKey);
  return setting ? (setting.setting_value as NotificationSetting) : null;
}
