'use server';

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

import type {
  CreateEmploymentTypeFormData,
  EditEmploymentTypeFormData,
  CreateEmploymentTypeResult,
  UpdateEmploymentTypeResult,
  DeleteEmploymentTypeResult,
  EmploymentTypeListResponse,
  EmploymentTypeSearchParams,
  EmploymentTypeStats,
  EmploymentTypeValidationResult,
  EmploymentType,
} from '@/types/employment_type';
import {
  AppError,
  withErrorHandling,
  createSuccessResponse,
  createFailureResponse,
  validateRequired,
} from '@/lib/utils/error-handling';
import type { ValidationError } from '@/types/common';

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
 * 雇用形態作成フォームのバリデーション
 */
const validateCreateEmploymentTypeForm = (
  form: CreateEmploymentTypeFormData
): EmploymentTypeValidationResult => {
  const errors: ValidationError[] = [];

  const nameError = validateRequired(form.name, '雇用形態名');
  if (nameError) errors.push(nameError);

  const codeError = validateRequired(form.code, '雇用形態コード');
  if (codeError) errors.push(codeError);

  return {
    isValid: errors.length === 0,
    errors: errors.map((error) => ({
      field: error.field as keyof CreateEmploymentTypeFormData,
      message: error.message,
      code: error.code || 'VALIDATION_ERROR',
    })),
  };
};

/**
 * 雇用形態編集フォームのバリデーション
 */
const validateEditEmploymentTypeForm = (
  form: EditEmploymentTypeFormData
): EmploymentTypeValidationResult => {
  const errors: ValidationError[] = [];

  const nameError = validateRequired(form.name, '雇用形態名');
  if (nameError) errors.push(nameError);

  const codeError = validateRequired(form.code, '雇用形態コード');
  if (codeError) errors.push(codeError);

  return {
    isValid: errors.length === 0,
    errors: errors.map((error) => ({
      field: error.field as keyof EditEmploymentTypeFormData,
      message: error.message,
      code: error.code || 'VALIDATION_ERROR',
    })),
  };
};

// ================================
// ヘルパー関数
// ================================

/**
 * 雇用形態コードの重複チェック
 */
const checkEmploymentTypeCodeExists = async (
  code: string,
  companyId: string,
  excludeId?: string
): Promise<boolean> => {
  let query = supabaseAdmin
    .from('employment_types')
    .select('id')
    .eq('code', code)
    .eq('company_id', companyId)
    .is('deleted_at', null);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('雇用形態コード重複チェックエラー:', error);
    throw AppError.fromSupabaseError(error, '雇用形態コード重複チェック');
  }

  return (data && data.length > 0) || false;
};

/**
 * 雇用形態の使用状況チェック
 */
const checkEmploymentTypeUsage = async (id: string): Promise<boolean> => {
  const { data, error } = await supabaseAdmin
    .from('user_profiles')
    .select('id')
    .eq('employment_type_id', id)
    .is('deleted_at', null)
    .limit(1);

  if (error) {
    console.error('雇用形態使用状況チェックエラー:', error);
    throw AppError.fromSupabaseError(error, '雇用形態使用状況チェック');
  }

  return (data && data.length > 0) || false;
};

// ================================
// Server Actions
// ================================

/**
 * 雇用形態作成
 */
export const createEmploymentType = async (
  form: CreateEmploymentTypeFormData,
  companyId: string
): Promise<
  { success: true; data: CreateEmploymentTypeResult } | { success: false; error: AppError }
> => {
  console.log('createEmploymentType called with form:', form);

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
    const validation = validateCreateEmploymentTypeForm(form);
    if (!validation.isValid) {
      throw AppError.fromValidationErrors(validation.errors, '雇用形態作成');
    }

    // 雇用形態コードの重複チェック
    const codeExists = await checkEmploymentTypeCodeExists(form.code, companyId);
    if (codeExists) {
      throw AppError.duplicate('雇用形態コード', form.code);
    }

    // 表示順序の最大値を取得
    const { data: maxOrderData, error: maxOrderError } = await supabaseAdmin
      .from('employment_types')
      .select('display_order')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('display_order', { ascending: false })
      .limit(1);

    if (maxOrderError) {
      throw AppError.fromSupabaseError(maxOrderError, '表示順序取得');
    }

    const nextDisplayOrder = (maxOrderData?.[0]?.display_order || 0) + 1;

    // 雇用形態作成
    console.log('Creating employment type with data:', {
      code: form.code,
      name: form.name,
      description: form.description,
      company_id: companyId,
      display_order: nextDisplayOrder,
    });

    const { data: employmentType, error: employmentTypeError } = await supabaseAdmin
      .from('employment_types')
      .insert([
        {
          code: form.code,
          name: form.name,
          description: form.description,
          company_id: companyId,
          is_active: true,
          display_order: nextDisplayOrder,
        },
      ])
      .select()
      .single();

    if (employmentTypeError) {
      console.error('Employment type creation error:', employmentTypeError);
      throw AppError.fromSupabaseError(employmentTypeError, '雇用形態作成');
    }

    console.log('Employment type created successfully:', employmentType);

    revalidatePath('/admin/settings');
    return {
      id: employmentType.id,
      code: employmentType.code,
      name: employmentType.name,
      description: employmentType.description,
      created_at: employmentType.created_at,
    };
  }, '雇用形態作成');
};

/**
 * 雇用形態更新
 */
export const updateEmploymentType = async (
  id: string,
  form: EditEmploymentTypeFormData,
  companyId: string
): Promise<
  { success: true; data: UpdateEmploymentTypeResult } | { success: false; error: AppError }
> => {
  console.log('updateEmploymentType called with form:', form);

  return withErrorHandling(async () => {
    // バリデーション
    const validation = validateEditEmploymentTypeForm(form);
    if (!validation.isValid) {
      throw AppError.fromValidationErrors(validation.errors, '雇用形態更新');
    }

    // 雇用形態コードの重複チェック（自分以外）
    const codeExists = await checkEmploymentTypeCodeExists(form.code, companyId, id);
    if (codeExists) {
      throw AppError.duplicate('雇用形態コード', form.code);
    }

    // 雇用形態更新
    const { data: employmentType, error: employmentTypeError } = await supabaseAdmin
      .from('employment_types')
      .update({
        code: form.code,
        name: form.name,
        description: form.description,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single();

    if (employmentTypeError) {
      throw AppError.fromSupabaseError(employmentTypeError, '雇用形態更新');
    }

    revalidatePath('/admin/settings');
    return {
      id: employmentType.id,
      code: employmentType.code,
      name: employmentType.name,
      description: employmentType.description,
      updated_at: employmentType.updated_at,
    };
  }, '雇用形態更新');
};

/**
 * 雇用形態削除
 */
export const deleteEmploymentType = async (
  id: string,
  companyId: string
): Promise<
  { success: true; data: DeleteEmploymentTypeResult } | { success: false; error: AppError }
> => {
  console.log('deleteEmploymentType called with id:', id);

  return withErrorHandling(async () => {
    // 雇用形態の現在の情報を取得
    const { data: employmentType, error: fetchError } = await supabaseAdmin
      .from('employment_types')
      .select('is_active')
      .eq('id', id)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single();

    if (fetchError) {
      throw AppError.fromSupabaseError(fetchError, '雇用形態情報取得');
    }

    // 有効な雇用形態は削除できない
    if (employmentType.is_active) {
      throw new AppError(
        '有効な雇用形態は削除できません。先に無効にしてから削除してください。',
        'EMPLOYMENT_TYPE_ACTIVE_ERROR',
        400
      );
    }

    // 使用状況チェック
    const isUsed = await checkEmploymentTypeUsage(id);
    if (isUsed) {
      throw new AppError(
        'この雇用形態は既にユーザーに割り当てられているため削除できません',
        'EMPLOYMENT_TYPE_IN_USE_ERROR',
        400
      );
    }

    // 雇用形態削除（論理削除）
    const { data: deletedEmploymentType, error: employmentTypeError } = await supabaseAdmin
      .from('employment_types')
      .update({
        deleted_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single();

    if (employmentTypeError) {
      throw AppError.fromSupabaseError(employmentTypeError, '雇用形態削除');
    }

    revalidatePath('/admin/settings');
    return {
      id: deletedEmploymentType.id,
      deleted_at: deletedEmploymentType.deleted_at!,
    };
  }, '雇用形態削除');
};

/**
 * 雇用形態一覧取得
 */
export const getEmploymentTypes = async (
  companyId: string,
  params: EmploymentTypeSearchParams = {}
): Promise<
  { success: true; data: EmploymentTypeListResponse } | { success: false; error: AppError }
> => {
  console.log('getEmploymentTypes called with params:', params);

  return withErrorHandling(async () => {
    const { page = 1, limit = 10, search = '', status = 'all' } = params;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('employment_types')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId)
      .is('deleted_at', null);

    // ステータスフィルター
    if (status === 'active') {
      query = query.eq('is_active', true);
    } else if (status === 'inactive') {
      query = query.eq('is_active', false);
    }

    // 検索条件
    if (search) {
      query = query.or(
        `name.ilike.%${search}%,code.ilike.%${search}%,description.ilike.%${search}%`
      );
    }

    // ページネーション
    query = query.range(offset, offset + limit - 1).order('display_order', { ascending: true });

    const { data: employmentTypes, error: employmentTypesError, count } = await query;

    if (employmentTypesError) {
      throw AppError.fromSupabaseError(employmentTypesError, '雇用形態一覧取得');
    }

    return {
      employment_types: employmentTypes || [],
      total: count || 0,
      page,
      limit,
    };
  }, '雇用形態一覧取得');
};

/**
 * 雇用形態統計取得
 */
export const getEmploymentTypeStats = async (
  companyId: string
): Promise<{ success: true; data: EmploymentTypeStats } | { success: false; error: AppError }> => {
  console.log('getEmploymentTypeStats called with companyId:', companyId);

  return withErrorHandling(async () => {
    const { data: employmentTypes, error } = await supabaseAdmin
      .from('employment_types')
      .select('is_active')
      .eq('company_id', companyId)
      .is('deleted_at', null);

    if (error) {
      throw AppError.fromSupabaseError(error, '雇用形態統計取得');
    }

    const total = employmentTypes?.length || 0;
    const active = employmentTypes?.filter((et) => et.is_active).length || 0;
    const inactive = total - active;

    return {
      total,
      active,
      inactive,
    };
  }, '雇用形態統計取得');
};

/**
 * 雇用形態の有効/無効を切り替え
 */
export const toggleEmploymentTypeStatus = async (
  id: string,
  companyId: string
): Promise<
  { success: true; data: { id: string; is_active: boolean } } | { success: false; error: AppError }
> => {
  console.log('toggleEmploymentTypeStatus called with id:', id, 'companyId:', companyId);

  return withErrorHandling(async () => {
    // 現在の雇用形態情報を取得
    const { data: currentEmploymentType, error: fetchError } = await supabaseAdmin
      .from('employment_types')
      .select('is_active')
      .eq('id', id)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single();

    console.log('Current employment type data:', currentEmploymentType, 'fetchError:', fetchError);

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      throw AppError.fromSupabaseError(fetchError, '雇用形態情報取得');
    }

    // ステータスを切り替え
    const newStatus = !currentEmploymentType.is_active;
    console.log('Toggling status from', currentEmploymentType.is_active, 'to', newStatus);

    const { data: employmentType, error: updateError } = await supabaseAdmin
      .from('employment_types')
      .update({
        is_active: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('company_id', companyId)
      .select('id, is_active')
      .single();

    console.log('Update result:', employmentType, 'updateError:', updateError);

    if (updateError) {
      console.error('Update error:', updateError);
      throw AppError.fromSupabaseError(updateError, '雇用形態ステータス更新');
    }

    revalidatePath('/admin/settings');
    return {
      id: employmentType.id,
      is_active: employmentType.is_active,
    };
  }, '雇用形態ステータス切り替え');
};
