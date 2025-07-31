'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { AppError, withErrorHandling } from '@/lib/utils/error-handling';
import type { ValidationError } from '@/types/common';
import {
  CreateEmploymentTypeFormSchema,
  EditEmploymentTypeFormSchema,
  EmploymentTypeSearchParamsSchema,
  EmploymentTypeSchema,
  CreateEmploymentTypeResultSchema,
  UpdateEmploymentTypeResultSchema,
  DeleteEmploymentTypeResultSchema,
  EmploymentTypeListResponseSchema,
  EmploymentTypeStatsSchema,
  ToggleEmploymentTypeStatusResultSchema,
  type CreateEmploymentTypeFormData,
  type EditEmploymentTypeFormData,
  type EmploymentTypeSearchParams,
  type EmploymentType,
  type CreateEmploymentTypeResult,
  type UpdateEmploymentTypeResult,
  type DeleteEmploymentTypeResult,
  type EmploymentTypeListResponse,
  type EmploymentTypeStats,
  type ToggleEmploymentTypeStatusResult,
} from '@/schemas/employment-type';

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
function validateCreateEmploymentTypeForm(form: z.infer<typeof CreateEmploymentTypeFormSchema>): {
  isValid: boolean;
  errors: ValidationError[];
} {
  const result = CreateEmploymentTypeFormSchema.safeParse(form);

  if (result.success) {
    return { isValid: true, errors: [] };
  }

  const errors: ValidationError[] = result.error.errors.map((error) => ({
    field: error.path.join('.') as keyof z.infer<typeof CreateEmploymentTypeFormSchema>,
    message: error.message,
    code: 'VALIDATION_ERROR',
  }));

  return { isValid: false, errors };
}

/**
 * 雇用形態編集フォームのバリデーション
 */
function validateEditEmploymentTypeForm(form: z.infer<typeof EditEmploymentTypeFormSchema>): {
  isValid: boolean;
  errors: ValidationError[];
} {
  const result = EditEmploymentTypeFormSchema.safeParse(form);

  if (result.success) {
    return { isValid: true, errors: [] };
  }

  const errors: ValidationError[] = result.error.errors.map((error) => ({
    field: error.path.join('.') as keyof z.infer<typeof EditEmploymentTypeFormSchema>,
    message: error.message,
    code: 'VALIDATION_ERROR',
  }));

  return { isValid: false, errors };
}

/**
 * 雇用形態検索パラメータのバリデーション
 */
function validateSearchParams(
  params: Partial<z.infer<typeof EmploymentTypeSearchParamsSchema>>
): z.infer<typeof EmploymentTypeSearchParamsSchema> {
  const result = EmploymentTypeSearchParamsSchema.safeParse(params);

  if (result.success) {
    return result.data;
  }

  // デフォルト値を返す
  return {
    search: '',
    status: 'all',
    page: 1,
    limit: 10,
    orderBy: undefined,
    ascending: true,
  };
}

// ================================
// ヘルパー関数
// ================================

/**
 * 雇用形態コードの重複チェック
 */
async function checkEmploymentTypeCodeExists(
  code: string,
  companyId: string,
  excludeId?: string
): Promise<boolean> {
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
}

/**
 * 雇用形態の使用状況チェック
 */
async function checkEmploymentTypeUsage(id: string): Promise<boolean> {
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
}

/**
 * データベース結果をZodスキーマで検証
 */
function validateEmploymentTypeData(data: unknown): z.infer<typeof EmploymentTypeSchema> {
  const result = EmploymentTypeSchema.safeParse(data);

  if (!result.success) {
    console.error('雇用形態データ検証エラー:', result.error);
    throw new AppError('雇用形態データの形式が正しくありません', 'DATA_VALIDATION_ERROR', 500);
  }

  return result.data;
}

/**
 * データベース結果をZodスキーマで検証（配列）
 */
function validateEmploymentTypeArray(data: unknown): z.infer<typeof EmploymentTypeSchema>[] {
  const result = z.array(EmploymentTypeSchema).safeParse(data);

  if (!result.success) {
    console.error('雇用形態配列データ検証エラー:', result.error);
    throw new AppError('雇用形態データの形式が正しくありません', 'DATA_VALIDATION_ERROR', 500);
  }

  return result.data;
}

// ================================
// Server Actions
// ================================

/**
 * 雇用形態作成
 */
export async function createEmploymentType(
  form: z.infer<typeof CreateEmploymentTypeFormSchema>,
  companyId: string
): Promise<
  | { success: true; data: z.infer<typeof CreateEmploymentTypeResultSchema> }
  | { success: false; error: AppError }
> {
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
    // Zodバリデーション
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

    // データ検証
    const validatedData = validateEmploymentTypeData(employmentType);

    console.log('Employment type created successfully:', validatedData);

    revalidatePath('/admin/settings');

    // 結果をZodスキーマで検証
    const result = CreateEmploymentTypeResultSchema.parse({
      id: validatedData.id,
      code: validatedData.code || '',
      name: validatedData.name,
      description: validatedData.description || '',
      created_at: validatedData.created_at,
    });

    return result;
  }, '雇用形態作成');
}

/**
 * 雇用形態更新
 */
export async function updateEmploymentType(
  id: string,
  form: z.infer<typeof EditEmploymentTypeFormSchema>,
  companyId: string
): Promise<
  | { success: true; data: z.infer<typeof UpdateEmploymentTypeResultSchema> }
  | { success: false; error: AppError }
> {
  console.log('updateEmploymentType called with form:', form);

  return withErrorHandling(async () => {
    // Zodバリデーション
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

    // データ検証
    const validatedData = validateEmploymentTypeData(employmentType);

    revalidatePath('/admin/settings');

    // 結果をZodスキーマで検証
    const result = UpdateEmploymentTypeResultSchema.parse({
      id: validatedData.id,
      code: validatedData.code || '',
      name: validatedData.name,
      description: validatedData.description || '',
      updated_at: validatedData.updated_at || new Date().toISOString(),
    });

    return result;
  }, '雇用形態更新');
}

/**
 * 雇用形態削除
 */
export async function deleteEmploymentType(
  id: string,
  companyId: string
): Promise<
  | { success: true; data: z.infer<typeof DeleteEmploymentTypeResultSchema> }
  | { success: false; error: AppError }
> {
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

    // データ検証
    const validatedData = validateEmploymentTypeData(deletedEmploymentType);

    revalidatePath('/admin/settings');

    // 結果をZodスキーマで検証
    const result = DeleteEmploymentTypeResultSchema.parse({
      id: validatedData.id,
      deleted_at: validatedData.deleted_at || new Date().toISOString(),
    });

    return result;
  }, '雇用形態削除');
}

/**
 * 雇用形態一覧取得
 */
export async function getEmploymentTypes(
  companyId: string,
  params: Partial<z.infer<typeof EmploymentTypeSearchParamsSchema>> = {}
): Promise<
  | { success: true; data: z.infer<typeof EmploymentTypeListResponseSchema> }
  | { success: false; error: AppError }
> {
  console.log('getEmploymentTypes called with params:', params);

  return withErrorHandling(async () => {
    // 検索パラメータのバリデーション
    const validatedParams = validateSearchParams(params);
    const { page, limit, search, status } = validatedParams;
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

    // データ検証
    const validatedEmploymentTypes = validateEmploymentTypeArray(employmentTypes || []);

    // 結果をZodスキーマで検証
    const result = EmploymentTypeListResponseSchema.parse({
      employment_types: validatedEmploymentTypes,
      total: count || 0,
      page,
      limit,
    });

    return result;
  }, '雇用形態一覧取得');
}

/**
 * 雇用形態統計取得
 */
export async function getEmploymentTypeStats(
  companyId: string
): Promise<
  | { success: true; data: z.infer<typeof EmploymentTypeStatsSchema> }
  | { success: false; error: AppError }
> {
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

    // データ検証
    const validatedEmploymentTypes = validateEmploymentTypeArray(employmentTypes || []);

    const total = validatedEmploymentTypes.length;
    const active = validatedEmploymentTypes.filter((et) => et.is_active).length;
    const inactive = total - active;

    // 結果をZodスキーマで検証
    const result = EmploymentTypeStatsSchema.parse({
      total,
      active,
      inactive,
    });

    return result;
  }, '雇用形態統計取得');
}

/**
 * 雇用形態の有効/無効を切り替え
 */
export async function toggleEmploymentTypeStatus(
  id: string,
  companyId: string
): Promise<
  | { success: true; data: z.infer<typeof ToggleEmploymentTypeStatusResultSchema> }
  | { success: false; error: AppError }
> {
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

    // データ検証
    const validatedData = validateEmploymentTypeData(employmentType);

    revalidatePath('/admin/settings');

    // 結果をZodスキーマで検証
    const result = ToggleEmploymentTypeStatusResultSchema.parse({
      id: validatedData.id,
      is_active: validatedData.is_active,
    });

    return result;
  }, '雇用形態ステータス切り替え');
}
