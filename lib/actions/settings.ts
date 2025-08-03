'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

import { createServerClient } from '@/lib/supabase';
import { logAudit } from '@/lib/utils/log-system';
import type {
  SettingData as Setting,
  CsvExportSetting,
  AttendanceSetting,
  NotificationSetting,
  SettingType,
  SaveSettingResult,
  DeleteSettingResult,
} from '@/schemas/setting';

/**
 * クライアント情報を取得
 */
async function getClientInfo() {
  try {
    const headersList = await headers();
    const forwarded = headersList.get('x-forwarded-for');
    const realIp = headersList.get('x-real-ip');
    const userAgent = headersList.get('user-agent');

    // IPアドレスの取得（優先順位: x-forwarded-for > x-real-ip）
    let ipAddress = forwarded || realIp;
    if (ipAddress && ipAddress.includes(',')) {
      // 複数のIPが含まれている場合は最初のものを使用
      ipAddress = ipAddress.split(',')[0].trim();
    }

    return {
      ip_address: ipAddress || undefined,
      user_agent: userAgent || undefined,
      session_id: undefined, // セッションIDは別途取得が必要
    };
  } catch (error) {
    console.error('クライアント情報取得エラー:', error);
    return {
      ip_address: undefined,
      user_agent: undefined,
      session_id: undefined,
    };
  }
}

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
  isDefault: boolean = false,
  currentUserId?: string
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

    // 監査ログを記録
    if (currentUserId) {
      const clientInfo = await getClientInfo();
      try {
        await logAudit('setting_updated', {
          user_id: currentUserId,
          company_id: undefined, // 設定は企業に依存しない
          target_type: 'settings',
          target_id: existingSetting?.id || 'new',
          before_data: existingSetting || undefined,
          after_data: {
            role,
            user_id: role === 'system-admin' ? null : userId,
            setting_type: settingType,
            setting_key: settingKey,
            setting_value: settingValue,
            is_default: isDefault,
          },
          details: {
            action_type: existingSetting ? 'update' : 'create',
            setting_type: settingType,
            setting_key: settingKey,
          },
          ip_address: clientInfo.ip_address,
          user_agent: clientInfo.user_agent,
          session_id: clientInfo.session_id,
        });
        console.log('監査ログ記録完了: setting_updated');
      } catch (error) {
        console.error('監査ログ記録エラー:', error);
      }
    } else {
      console.log('現在のユーザーIDが提供されていないため、監査ログを記録しません');
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
export async function deleteSetting(
  settingId: string,
  currentUserId?: string
): Promise<DeleteSettingResult> {
  const supabase = createServerClient();

  try {
    // 削除前のデータを取得（監査ログ用）
    const { data: beforeData } = await supabase
      .from('settings')
      .select('*')
      .eq('id', settingId)
      .single();

    const { error } = await supabase
      .from('settings')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', settingId);

    if (error) {
      console.error('Error deleting setting:', error);
      return { success: false, error: '設定の削除に失敗しました' };
    }

    // 監査ログを記録
    if (currentUserId) {
      const clientInfo = await getClientInfo();
      try {
        await logAudit('setting_deleted', {
          user_id: currentUserId,
          company_id: undefined, // 設定は企業に依存しない
          target_type: 'settings',
          target_id: settingId,
          before_data: beforeData,
          after_data: undefined,
          details: {
            action_type: 'logical_delete',
            deleted_at: new Date().toISOString(),
          },
          ip_address: clientInfo.ip_address,
          user_agent: clientInfo.user_agent,
          session_id: clientInfo.session_id,
        });
        console.log('監査ログ記録完了: setting_deleted');
      } catch (error) {
        console.error('監査ログ記録エラー:', error);
      }
    } else {
      console.log('現在のユーザーIDが提供されていないため、監査ログを記録しません');
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

/**
 * 打刻編集設定を取得する
 * @param companyId 企業ID（nullの場合はグローバル設定）
 * @returns 打刻編集が有効かどうか
 */
export async function getClockRecordEditSetting(companyId?: string): Promise<boolean> {
  const supabase = createServerClient();

  try {
    // 企業固有の設定を優先して検索
    let query = supabase
      .from('settings')
      .select('*')
      .eq('setting_type', 'attendance')
      .eq('setting_key', 'clock_record_edit')
      .is('deleted_at', null);

    if (companyId) {
      query = query.eq('company_id', companyId);
    } else {
      query = query.is('company_id', null);
    }

    let { data, error } = await query.single();

    // 企業固有の設定が見つからない場合、グローバル設定を検索
    if (!data && error && companyId) {
      query = supabase
        .from('settings')
        .select('*')
        .eq('setting_type', 'attendance')
        .eq('setting_key', 'clock_record_edit')
        .is('company_id', null)
        .is('deleted_at', null);

      ({ data, error } = await query.single());
    }

    if (error || !data) {
      // デフォルトは無効
      return false;
    }

    const settingValue = data.setting_value as { enabled?: boolean };
    return settingValue?.enabled || false;
  } catch (error) {
    console.error('Error in getClockRecordEditSetting:', error);
    return false;
  }
}

/**
 * 勤怠設定を取得する
 * @param companyId 企業ID
 * @param settingKey 設定キー
 * @returns 設定値またはデフォルト値
 */
export async function getAttendanceSettingValue(
  companyId: string,
  settingKey: string
): Promise<any> {
  const supabase = createServerClient();

  try {
    // 企業固有の設定を検索
    let query = supabase
      .from('settings')
      .select('*')
      .eq('setting_type', 'attendance')
      .eq('setting_key', settingKey)
      .eq('company_id', companyId)
      .is('deleted_at', null);

    let { data, error } = await query.single();

    // 企業固有の設定が見つからない場合、グローバル設定を検索
    if (!data && error) {
      query = supabase
        .from('settings')
        .select('*')
        .eq('setting_type', 'attendance')
        .eq('setting_key', settingKey)
        .is('company_id', null)
        .is('deleted_at', null);

      ({ data, error } = await query.single());
    }

    if (error || !data) {
      // デフォルト値を返す
      switch (settingKey) {
        case 'late_alert':
        case 'overtime_alert':
        case 'clock_record_edit':
          return false;
        default:
          return null;
      }
    }

    return data.setting_value;
  } catch (error) {
    console.error('Error in getAttendanceSettingValue:', error);
    return null;
  }
}

/**
 * 勤怠設定を保存する（upsert）
 * @param companyId 企業ID
 * @param settingKey 設定キー
 * @param settingValue 設定値
 * @param currentUserId 現在のユーザーID
 * @returns 成功/失敗の結果
 */
export async function saveAttendanceSetting(
  companyId: string,
  settingKey: string,
  settingValue: any,
  currentUserId?: string
): Promise<{ success: boolean; message: string; error?: string }> {
  const supabase = createServerClient();

  try {
    // 現在のユーザーのロールを取得
    let userRole = 'admin';
    let userCompanyId = null;
    if (currentUserId) {
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('role, company_id')
        .eq('id', currentUserId)
        .single();

      if (userProfile) {
        userRole = userProfile.role;
        userCompanyId = userProfile.company_id;
      }
    }

    console.log('Debug - saveAttendanceSetting:', {
      companyId,
      settingKey,
      settingValue,
      currentUserId,
      userRole,
      userCompanyId,
    });

    // upsertで設定を保存
    const { data, error } = await supabase
      .from('settings')
      .upsert(
        {
          company_id: companyId,
          setting_type: 'attendance',
          setting_key: settingKey,
          setting_value: settingValue,
          role: userRole,
          user_id: currentUserId || null,
          is_default: false,
        },
        {
          onConflict: 'company_id,setting_type,setting_key',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Error saving attendance setting:', error);
      return {
        success: false,
        message: '設定の保存に失敗しました',
        error: error.message,
      };
    }

    // 監査ログを記録
    if (currentUserId) {
      const clientInfo = await getClientInfo();
      try {
        await logAudit('setting_updated', {
          user_id: currentUserId,
          company_id: companyId,
          target_type: 'settings',
          target_id: data.id,
          before_data: undefined, // upsertのため前のデータは不明
          after_data: {
            company_id: companyId,
            setting_type: 'attendance',
            setting_key: settingKey,
            setting_value: settingValue,
            role: userRole,
            user_id: currentUserId || null,
            is_default: false,
          },
          details: {
            action_type: 'upsert',
            setting_type: 'attendance',
            setting_key: settingKey,
          },
          ip_address: clientInfo.ip_address,
          user_agent: clientInfo.user_agent,
          session_id: clientInfo.session_id,
        });
        console.log('監査ログ記録完了: setting_updated (attendance)');
      } catch (error) {
        console.error('監査ログ記録エラー:', error);
      }
    }

    revalidatePath('/admin/settings');
    return { success: true, message: '設定が正常に保存されました' };
  } catch (error) {
    console.error('Error in saveAttendanceSetting:', error);
    return {
      success: false,
      message: '設定の保存に失敗しました',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
