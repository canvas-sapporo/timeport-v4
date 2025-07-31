'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

import { AppError, withErrorHandling, validateRequired } from '@/lib/utils/error-handling';
import type { ValidationError } from '@/types/common';
import {
  type CreateWorkTypeFormData,
  type EditWorkTypeFormData,
  type WorkTypeSearchParams,
  type WorkTypeValidationResult,
  type CreateWorkTypeResult,
  type UpdateWorkTypeResult,
  type DeleteWorkTypeResult,
  type WorkTypeListResponse,
  type WorkTypeStats,
} from '@/schemas/work-types';

// 環境変数の確認
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('NEXT_PUBLIC_SUPABASE_URL is not set');
}

if (!serviceRoleKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is not set');
}

const supabaseAdmin = createClient(supabaseUrl || '', serviceRoleKey || '');

// ================================
// バリデーション関数
// ================================

/**
 * 勤務形態作成フォームのバリデーション
 */
function validateCreateWorkTypeForm(form: CreateWorkTypeFormData): WorkTypeValidationResult {
  const errors: ValidationError[] = [];

  const nameError = validateRequired(form.name, '勤務形態名');
  if (nameError) errors.push(nameError);

  const workStartTimeError = validateRequired(form.work_start_time, '勤務開始時刻');
  if (workStartTimeError) errors.push(workStartTimeError);

  const workEndTimeError = validateRequired(form.work_end_time, '勤務終了時刻');
  if (workEndTimeError) errors.push(workEndTimeError);

  if (form.break_duration_minutes < 0) {
    errors.push({
      field: 'break_duration_minutes',
      message: '休憩時間は0分以上で入力してください',
      code: 'INVALID_VALUE',
    });
  }

  if (form.overtime_threshold_minutes < 0) {
    errors.push({
      field: 'overtime_threshold_minutes',
      message: '残業開始閾値は0分以上で入力してください',
      code: 'INVALID_VALUE',
    });
  }

  if (form.late_threshold_minutes < 0) {
    errors.push({
      field: 'late_threshold_minutes',
      message: '遅刻許容時間は0分以上で入力してください',
      code: 'INVALID_VALUE',
    });
  }

  // フレックス勤務の場合の追加バリデーション
  if (form.is_flexible) {
    if (!form.flex_start_time || !form.flex_end_time) {
      errors.push({
        field: 'flex_start_time',
        message: 'フレックス勤務の場合は、フレックス開始・終了時刻を設定してください',
        code: 'REQUIRED',
      });
    }

    // コアタイムのチェック（環境変数で制御）
    const requireCoreTime = process.env.NEXT_PUBLIC_FLEX_WORK_REQUIRE_CORE_TIME === 'true';
    if (requireCoreTime && (!form.core_start_time || !form.core_end_time)) {
      errors.push({
        field: 'core_start_time',
        message: 'フレックス勤務の場合は、コアタイムを設定してください',
        code: 'REQUIRED',
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors: errors.map((error) => ({
      field: error.field as keyof CreateWorkTypeFormData,
      message: error.message,
      code: error.code || 'VALIDATION_ERROR',
    })),
  };
}

/**
 * 勤務形態編集フォームのバリデーション
 */
function validateEditWorkTypeForm(form: EditWorkTypeFormData): WorkTypeValidationResult {
  const errors: ValidationError[] = [];

  const nameError = validateRequired(form.name, '勤務形態名');
  if (nameError) errors.push(nameError);

  const workStartTimeError = validateRequired(form.work_start_time, '勤務開始時刻');
  if (workStartTimeError) errors.push(workStartTimeError);

  const workEndTimeError = validateRequired(form.work_end_time, '勤務終了時刻');
  if (workEndTimeError) errors.push(workEndTimeError);

  if (form.break_duration_minutes < 0) {
    errors.push({
      field: 'break_duration_minutes',
      message: '休憩時間は0分以上で入力してください',
      code: 'INVALID_VALUE',
    });
  }

  if (form.overtime_threshold_minutes < 0) {
    errors.push({
      field: 'overtime_threshold_minutes',
      message: '残業開始閾値は0分以上で入力してください',
      code: 'INVALID_VALUE',
    });
  }

  if (form.late_threshold_minutes < 0) {
    errors.push({
      field: 'late_threshold_minutes',
      message: '遅刻許容時間は0分以上で入力してください',
      code: 'INVALID_VALUE',
    });
  }

  // フレックス勤務の場合の追加バリデーション
  if (form.is_flexible) {
    if (!form.flex_start_time || !form.flex_end_time) {
      errors.push({
        field: 'flex_start_time',
        message: 'フレックス勤務の場合は、フレックス開始・終了時刻を設定してください',
        code: 'REQUIRED',
      });
    }

    // コアタイムのチェック（環境変数で制御）
    const requireCoreTime = process.env.NEXT_PUBLIC_FLEX_WORK_REQUIRE_CORE_TIME === 'true';
    if (requireCoreTime && (!form.core_start_time || !form.core_end_time)) {
      errors.push({
        field: 'core_start_time',
        message: 'フレックス勤務の場合は、コアタイムを設定してください',
        code: 'REQUIRED',
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors: errors.map((error) => ({
      field: error.field as keyof EditWorkTypeFormData,
      message: error.message,
      code: error.code || 'VALIDATION_ERROR',
    })),
  };
}

/**
 * 勤務形態の時間バリデーション
 */
function validateWorkTypeTimes(form: CreateWorkTypeFormData | EditWorkTypeFormData): void {
  // 勤務時間の整合性チェック
  if (form.work_start_time && form.work_end_time) {
    if (form.work_start_time >= form.work_end_time) {
      throw new AppError(
        '勤務開始時刻は勤務終了時刻より前である必要があります',
        'WORK_TYPE_TIME_INVALID'
      );
    }
  }

  // フレックス勤務の場合のチェック
  if (form.is_flexible && form.flex_start_time && form.flex_end_time) {
    if (form.flex_start_time >= form.flex_end_time) {
      throw new AppError(
        'フレックス開始時刻はフレックス終了時刻より前である必要があります',
        'WORK_TYPE_FLEX_TIME_INVALID'
      );
    }

    if (form.core_start_time && form.core_end_time) {
      if (form.core_start_time >= form.core_end_time) {
        throw new AppError(
          'コアタイム開始時刻はコアタイム終了時刻より前である必要があります',
          'WORK_TYPE_CORE_TIME_INVALID'
        );
      }

      if (form.flex_start_time > form.core_start_time || form.core_end_time > form.flex_end_time) {
        throw new AppError(
          'コアタイムはフレックス時間内に設定してください',
          'WORK_TYPE_CORE_TIME_OUT_OF_RANGE'
        );
      }
    }
  }
}

// ================================
// ヘルパー関数
// ================================

/**
 * 勤務形態コードの重複チェック
 */
async function checkWorkTypeCodeExists(
  code: string,
  companyId: string,
  excludeId?: string
): Promise<boolean> {
  let query = supabaseAdmin
    .from('work_types')
    .select('id')
    .eq('code', code)
    .eq('company_id', companyId)
    .is('deleted_at', null);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('勤務形態コード重複チェックエラー:', error);
    throw AppError.fromSupabaseError(error, '勤務形態コード重複チェック');
  }

  return (data && data.length > 0) || false;
}

/**
 * 勤務形態の使用状況チェック
 */
async function checkWorkTypeUsage(id: string): Promise<boolean> {
  // ユーザープロフィールで使用中
  const { data: users, error: usersError } = await supabaseAdmin
    .from('user_profiles')
    .select('id')
    .eq('current_work_type_id', id)
    .is('deleted_at', null)
    .limit(1);

  if (usersError) {
    console.error('勤務形態使用状況チェックエラー（ユーザー）:', usersError);
    throw AppError.fromSupabaseError(usersError, '勤務形態使用状況チェック');
  }

  if (users && users.length > 0) {
    return true;
  }

  // 勤怠記録で使用中
  const { data: attendances, error: attendancesError } = await supabaseAdmin
    .from('attendances')
    .select('id')
    .eq('work_type_id', id)
    .is('deleted_at', null)
    .limit(1);

  if (attendancesError) {
    console.error('勤務形態使用状況チェックエラー（勤怠）:', attendancesError);
    throw AppError.fromSupabaseError(attendancesError, '勤務形態使用状況チェック');
  }

  if (attendances && attendances.length > 0) {
    return true;
  }

  // 勤務履歴で使用中
  const { data: history, error: historyError } = await supabaseAdmin
    .from('user_work_type_history')
    .select('id')
    .eq('work_type_id', id)
    .is('deleted_at', null)
    .limit(1);

  if (historyError) {
    console.error('勤務形態使用状況チェックエラー（履歴）:', historyError);
    throw AppError.fromSupabaseError(historyError, '勤務形態使用状況チェック');
  }

  return (history && history.length > 0) || false;
}

// ================================
// Server Actions
// ================================

/**
 * 勤務形態作成
 */
export async function createWorkType(
  form: CreateWorkTypeFormData,
  companyId: string
): Promise<{ success: true; data: CreateWorkTypeResult } | { success: false; error: AppError }> {
  console.log('createWorkType called with form:', form);

  // 環境変数の確認
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Required environment variables are not set');
    return {
      success: false,
      error: new AppError('環境変数が正しく設定されていません', 'ENV_ERROR', 500),
    };
  }

  return withErrorHandling(async () => {
    // バリデーション
    const validation = validateCreateWorkTypeForm(form);
    if (!validation.isValid) {
      throw AppError.fromValidationErrors(validation.errors, '勤務形態作成');
    }

    // 時間バリデーション
    validateWorkTypeTimes(form);

    // 勤務形態コードの重複チェック
    if (form.code) {
      const codeExists = await checkWorkTypeCodeExists(form.code, companyId);
      if (codeExists) {
        throw AppError.duplicate('勤務形態コード', form.code);
      }
    }

    // 表示順序の最大値を取得
    const { data: maxOrderData, error: maxOrderError } = await supabaseAdmin
      .from('work_types')
      .select('display_order')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('display_order', { ascending: false })
      .limit(1);

    if (maxOrderError) {
      throw AppError.fromSupabaseError(maxOrderError, '表示順序取得');
    }

    const nextDisplayOrder = (maxOrderData?.[0]?.display_order || 0) + 1;

    // 勤務形態作成
    console.log('Creating work type with data:', {
      ...form,
      company_id: companyId,
      display_order: nextDisplayOrder,
      settings: {},
    });

    const { data: workType, error } = await supabaseAdmin
      .from('work_types')
      .insert({
        company_id: companyId,
        code: form.code || null,
        name: form.name,
        work_start_time: form.work_start_time,
        work_end_time: form.work_end_time,
        break_duration_minutes: form.break_duration_minutes,
        is_flexible: form.is_flexible,
        flex_start_time: form.flex_start_time || null,
        flex_end_time: form.flex_end_time || null,
        core_start_time: form.core_start_time || null,
        core_end_time: form.core_end_time || null,
        overtime_threshold_minutes: form.overtime_threshold_minutes,
        description: form.description || null,
        settings: {},
        is_active: true,
        display_order: nextDisplayOrder,
      })
      .select()
      .single();

    if (error) {
      throw AppError.fromSupabaseError(error, '勤務形態作成');
    }

    revalidatePath('/admin/settings');

    return {
      id: workType.id,
      code: workType.code || '',
      name: workType.name,
      work_start_time: workType.work_start_time,
      work_end_time: workType.work_end_time,
      break_duration_minutes: workType.break_duration_minutes,
      is_flexible: workType.is_flexible,
      created_at: workType.created_at,
    };
  });
}

/**
 * 勤務形態更新
 */
export async function updateWorkType(
  id: string,
  form: EditWorkTypeFormData,
  companyId: string
): Promise<{ success: true; data: UpdateWorkTypeResult } | { success: false; error: AppError }> {
  console.log('updateWorkType called with id:', id, 'form:', form);

  return withErrorHandling(async () => {
    // 既存データ取得
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('work_types')
      .select('*')
      .eq('id', id)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existing) {
      throw AppError.notFound('勤務形態', id);
    }

    // バリデーション
    const validation = validateEditWorkTypeForm(form);
    if (!validation.isValid) {
      throw AppError.fromValidationErrors(validation.errors, '勤務形態更新');
    }

    // 時間バリデーション
    validateWorkTypeTimes(form);

    // 勤務形態コードの重複チェック（自分以外）
    if (form.code && form.code !== existing.code) {
      const codeExists = await checkWorkTypeCodeExists(form.code, companyId, id);
      if (codeExists) {
        throw AppError.duplicate('勤務形態コード', form.code);
      }
    }

    // 勤務形態更新
    const { data: workType, error } = await supabaseAdmin
      .from('work_types')
      .update({
        code: form.code || null,
        name: form.name,
        work_start_time: form.work_start_time,
        work_end_time: form.work_end_time,
        break_duration_minutes: form.break_duration_minutes,
        is_flexible: form.is_flexible,
        flex_start_time: form.flex_start_time || null,
        flex_end_time: form.flex_end_time || null,
        core_start_time: form.core_start_time || null,
        core_end_time: form.core_end_time || null,
        overtime_threshold_minutes: form.overtime_threshold_minutes,
        description: form.description || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw AppError.fromSupabaseError(error, '勤務形態更新');
    }

    revalidatePath('/admin/settings');

    return {
      id: workType.id,
      code: workType.code || '',
      name: workType.name,
      work_start_time: workType.work_start_time,
      work_end_time: workType.work_end_time,
      break_duration_minutes: workType.break_duration_minutes,
      is_flexible: workType.is_flexible,
      updated_at: workType.updated_at,
    };
  });
}

/**
 * 勤務形態削除
 */
export async function deleteWorkType(
  id: string,
  replacementWorkTypeId?: string
): Promise<{ success: true; data: DeleteWorkTypeResult } | { success: false; error: AppError }> {
  console.log(
    'deleteWorkType called with id:',
    id,
    'replacementWorkTypeId:',
    replacementWorkTypeId
  );

  return withErrorHandling(async () => {
    // 既存データ取得
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('work_types')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existing) {
      throw AppError.notFound('勤務形態', id);
    }

    // 使用中チェック
    const isInUse = await checkWorkTypeUsage(id);

    if (isInUse) {
      if (!replacementWorkTypeId) {
        throw new AppError(
          'この勤務形態は使用中のため、代替勤務形態を指定してください',
          'WORK_TYPE_IN_USE'
        );
      }

      // 代替勤務形態の存在確認
      const { data: replacement, error: replacementError } = await supabaseAdmin
        .from('work_types')
        .select('id')
        .eq('id', replacementWorkTypeId)
        .eq('company_id', existing.company_id)
        .is('deleted_at', null)
        .single();

      if (replacementError || !replacement) {
        throw new AppError(
          '指定された代替勤務形態が見つかりません',
          'REPLACEMENT_WORK_TYPE_NOT_FOUND'
        );
      }

      // 使用中のユーザーを代替勤務形態に更新
      const { error: updateError } = await supabaseAdmin
        .from('user_profiles')
        .update({ current_work_type_id: replacementWorkTypeId })
        .eq('current_work_type_id', id)
        .is('deleted_at', null);

      if (updateError) {
        console.error('代替勤務形態更新エラー:', updateError);
        throw AppError.fromSupabaseError(updateError, '代替勤務形態更新');
      }
    }

    // 論理削除
    const { error } = await supabaseAdmin
      .from('work_types')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      throw AppError.fromSupabaseError(error, '勤務形態削除');
    }

    revalidatePath('/admin/settings');

    return {
      id,
      deleted_at: new Date().toISOString(),
    };
  });
}

/**
 * 勤務形態一覧取得
 */
export async function getWorkTypes(
  companyId: string,
  params: WorkTypeSearchParams = {}
): Promise<{ success: true; data: WorkTypeListResponse } | { success: false; error: AppError }> {
  console.log('getWorkTypes called with companyId:', companyId, 'params:', params);

  return withErrorHandling(async () => {
    const {
      search,
      is_flexible,
      status,
      page = 1,
      limit = 10,
      orderBy = 'display_order',
      ascending = true,
    } = params;

    let query = supabaseAdmin
      .from('work_types')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId)
      .is('deleted_at', null);

    // 検索条件
    if (search) {
      query = query.or(`code.ilike.%${search}%,name.ilike.%${search}%`);
    }

    // フレックス勤務フィルター
    if (is_flexible !== undefined) {
      query = query.eq('is_flexible', is_flexible);
    }

    // ステータスフィルター
    if (status && status !== 'all') {
      query = query.eq('is_active', status === 'active');
    }

    // ページネーション
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    // ソート
    query = query.order(orderBy, { ascending });

    const { data: workTypes, error, count } = await query;

    if (error) {
      throw AppError.fromSupabaseError(error, '勤務形態一覧取得');
    }

    return {
      work_types: workTypes || [],
      total: count || 0,
      page,
      limit,
    };
  });
}

/**
 * 勤務形態統計取得
 */
export async function getWorkTypeStats(
  companyId: string
): Promise<{ success: true; data: WorkTypeStats } | { success: false; error: AppError }> {
  console.log('getWorkTypeStats called with companyId:', companyId);

  return withErrorHandling(async () => {
    const { data: workTypes, error } = await supabaseAdmin
      .from('work_types')
      .select('is_active, is_flexible')
      .eq('company_id', companyId)
      .is('deleted_at', null);

    if (error) {
      throw AppError.fromSupabaseError(error, '勤務形態統計取得');
    }

    const total = workTypes?.length || 0;
    const active = workTypes?.filter((w: { is_active: boolean }) => w.is_active).length || 0;
    const inactive = total - active;
    const flexible = workTypes?.filter((w: { is_flexible: boolean }) => w.is_flexible).length || 0;

    return {
      total,
      active,
      inactive,
      flexible,
    };
  });
}

/**
 * 勤務形態ステータス切り替え
 */
export async function toggleWorkTypeStatus(
  id: string,
  companyId: string
): Promise<
  { success: true; data: { id: string; is_active: boolean } } | { success: false; error: AppError }
> {
  console.log('toggleWorkTypeStatus called with id:', id);

  return withErrorHandling(async () => {
    // 既存データ取得
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('work_types')
      .select('is_active')
      .eq('id', id)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existing) {
      throw AppError.notFound('勤務形態', id);
    }

    // ステータス切り替え
    const { data: workType, error } = await supabaseAdmin
      .from('work_types')
      .update({
        is_active: !existing.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('is_active')
      .single();

    if (error) {
      throw AppError.fromSupabaseError(error, '勤務形態ステータス切り替え');
    }

    revalidatePath('/admin/settings');

    return {
      id,
      is_active: workType.is_active,
    };
  });
}
