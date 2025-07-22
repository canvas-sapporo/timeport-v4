import { createServerClient } from '@/lib/supabase';
import type {
  Setting,
  CsvExportSetting,
  AttendanceSetting,
  NotificationSetting,
} from '@/types/settings';

// 設定を取得する（優先順位: 個人設定 > ロール別デフォルト > システムデフォルト）
export async function getSetting(
  userId: string,
  role: string,
  settingType: string,
  settingKey: string
): Promise<Setting | null> {
  const supabase = createServerClient();

  // 1. 個人設定を検索
  let { data: setting, error } = await supabase
    .from('settings')
    .select('*')
    .eq('user_id', userId)
    .eq('setting_type', settingType)
    .eq('setting_key', settingKey)
    .is('deleted_at', null)
    .single();

  if (setting) return setting;

  // 2. ロール別デフォルト設定を検索
  ({ data: setting, error } = await supabase
    .from('settings')
    .select('*')
    .eq('role', role)
    .is('user_id', null)
    .eq('setting_type', settingType)
    .eq('setting_key', settingKey)
    .eq('is_default', true)
    .is('deleted_at', null)
    .single());

  if (setting) return setting;

  // 3. システムデフォルト設定を検索
  ({ data: setting, error } = await supabase
    .from('settings')
    .select('*')
    .eq('role', 'system-admin')
    .is('user_id', null)
    .eq('setting_type', settingType)
    .eq('setting_key', settingKey)
    .eq('is_default', true)
    .is('deleted_at', null)
    .single());

  return setting;
}

// 個人設定を保存する
export async function savePersonalSetting(
  userId: string,
  role: string,
  settingType: string,
  settingKey: string,
  settingValue: CsvExportSetting | AttendanceSetting | NotificationSetting
): Promise<{ success: boolean; message: string; data?: Setting }> {
  const supabase = createServerClient();

  try {
    const { data, error } = await supabase
      .from('settings')
      .upsert({
        role,
        user_id: userId,
        setting_type: settingType,
        setting_key: settingKey,
        setting_value: settingValue,
        is_default: false,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      message: '設定を保存しました',
      data,
    };
  } catch (error) {
    console.error('設定保存エラー:', error);
    return {
      success: false,
      message: '設定の保存に失敗しました',
    };
  }
}

// ロール別デフォルト設定を保存する（管理者のみ）
export async function saveRoleDefaultSetting(
  role: string,
  settingType: string,
  settingKey: string,
  settingValue: CsvExportSetting | AttendanceSetting | NotificationSetting
): Promise<{ success: boolean; message: string; data?: Setting }> {
  const supabase = createServerClient();

  try {
    const { data, error } = await supabase
      .from('settings')
      .upsert({
        role,
        user_id: null,
        setting_type: settingType,
        setting_key: settingKey,
        setting_value: settingValue,
        is_default: true,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      message: 'デフォルト設定を保存しました',
      data,
    };
  } catch (error) {
    console.error('デフォルト設定保存エラー:', error);
    return {
      success: false,
      message: 'デフォルト設定の保存に失敗しました',
    };
  }
}

// 設定を削除する（ソフトデリート）
export async function deleteSetting(
  settingId: string
): Promise<{ success: boolean; message: string }> {
  const supabase = createServerClient();

  try {
    const { error } = await supabase
      .from('settings')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', settingId);

    if (error) throw error;

    return {
      success: true,
      message: '設定を削除しました',
    };
  } catch (error) {
    console.error('設定削除エラー:', error);
    return {
      success: false,
      message: '設定の削除に失敗しました',
    };
  }
}

// ユーザーの設定一覧を取得する
export async function getUserSettings(userId: string, settingType?: string): Promise<Setting[]> {
  const supabase = createServerClient();

  let query = supabase.from('settings').select('*').eq('user_id', userId).is('deleted_at', null);

  if (settingType) {
    query = query.eq('setting_type', settingType);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('設定取得エラー:', error);
    return [];
  }

  return data || [];
}

// ロール別デフォルト設定一覧を取得する
export async function getRoleDefaultSettings(
  role: string,
  settingType?: string
): Promise<Setting[]> {
  const supabase = createServerClient();

  let query = supabase
    .from('settings')
    .select('*')
    .eq('role', role)
    .is('user_id', null)
    .eq('is_default', true)
    .is('deleted_at', null);

  if (settingType) {
    query = query.eq('setting_type', settingType);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('デフォルト設定取得エラー:', error);
    return [];
  }

  return data || [];
}
