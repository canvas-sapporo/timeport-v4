"use server";

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import type { 
  CreateCompanyInput, 
  UpdateCompanyInput, 
  CreateCompanyFormData,
  EditCompanyFormData,
  CreateCompanyResult,
  UpdateCompanyResult,
  DeleteCompanyResult,
  CompanyListResponse,
  CompanySearchParams,
  CompanyStats,
  CompanyValidationResult
} from '@/types/company';
import { 
  AppError, 
  withErrorHandling, 
  createSuccessResponse, 
  createFailureResponse,
  validateRequired,
  validateEmail,
  validatePassword
} from '@/lib/utils/error-handling';
import type { ValidationError } from '@/types/common';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ================================
// バリデーション関数
// ================================

/**
 * 会社作成フォームのバリデーション
 */
function validateCreateCompanyForm(form: CreateCompanyFormData): CompanyValidationResult {
  const errors: ValidationError[] = [];

  // 企業情報のバリデーション
  const nameError = validateRequired(form.name, '企業名');
  if (nameError) errors.push(nameError);

  const codeError = validateRequired(form.code, '企業コード');
  if (codeError) errors.push(codeError);

  // グループ情報のバリデーション
  const groupNameError = validateRequired(form.group_name, '初期グループ名');
  if (groupNameError) errors.push(groupNameError);

  // 管理者情報のバリデーション
  const familyNameError = validateRequired(form.admin_family_name, '管理者姓');
  if (familyNameError) errors.push(familyNameError);

  const firstNameError = validateRequired(form.admin_first_name, '管理者名');
  if (firstNameError) errors.push(firstNameError);

  const familyNameKanaError = validateRequired(form.admin_family_name_kana, '管理者姓カナ');
  if (familyNameKanaError) errors.push(familyNameKanaError);

  const firstNameKanaError = validateRequired(form.admin_first_name_kana, '管理者名カナ');
  if (firstNameKanaError) errors.push(firstNameKanaError);

  const emailError = validateEmail(form.admin_email, '管理者メールアドレス');
  if (emailError) errors.push(emailError);

  const passwordError = validatePassword(form.admin_password, '管理者パスワード');
  if (passwordError) errors.push(passwordError);

  return {
    isValid: errors.length === 0,
    errors: errors.map(error => ({
      field: error.field as keyof CreateCompanyFormData,
      message: error.message,
      code: error.code || 'VALIDATION_ERROR'
    }))
  };
}

/**
 * 会社編集フォームのバリデーション
 */
function validateEditCompanyForm(form: EditCompanyFormData): CompanyValidationResult {
  const errors: ValidationError[] = [];

  const nameError = validateRequired(form.name, '企業名');
  if (nameError) errors.push(nameError);

  const codeError = validateRequired(form.code, '企業コード');
  if (codeError) errors.push(codeError);

  return {
    isValid: errors.length === 0,
    errors: errors.map(error => ({
      field: error.field as keyof EditCompanyFormData,
      message: error.message,
      code: error.code || 'VALIDATION_ERROR'
    }))
  };
}

// ================================
// データベース操作関数
// ================================

/**
 * 企業コードの重複チェック
 */
async function checkCompanyCodeExists(code: string, excludeId?: string): Promise<boolean> {
  const query = supabaseAdmin
    .from('companies')
    .select('id')
    .eq('code', code)
    .is('deleted_at', null);

  if (excludeId) {
    query.neq('id', excludeId);
  }

  const { data } = await query;
  return (data?.length || 0) > 0;
}

/**
 * メールアドレスの重複チェック
 */
async function checkEmailExists(email: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('user_profiles')
    .select('id')
    .eq('email', email)
    .is('deleted_at', null);

  return (data?.length || 0) > 0;
}

// ================================
// Server Actions
// ================================

/**
 * 企業作成（管理者ユーザー・グループ同時作成）
 */
export async function createCompany(form: CreateCompanyFormData): Promise<{ success: true; data: CreateCompanyResult } | { success: false; error: AppError }> {
  return withErrorHandling(async () => {
    // バリデーション
    const validation = validateCreateCompanyForm(form);
    if (!validation.isValid) {
      throw AppError.fromValidationErrors(validation.errors, '企業作成');
    }

    // 企業コードの重複チェック
    const codeExists = await checkCompanyCodeExists(form.code);
    if (codeExists) {
      throw AppError.duplicate('企業コード', form.code);
    }

    // メールアドレスの重複チェック
    const emailExists = await checkEmailExists(form.admin_email);
    if (emailExists) {
      throw AppError.duplicate('メールアドレス', form.admin_email);
    }

    // 1. 企業作成
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .insert([{
        name: form.name,
        code: form.code,
        address: form.address,
        phone: form.phone,
        is_active: form.is_active,
      }])
      .select()
      .single();

    if (companyError) {
      throw AppError.fromSupabaseError(companyError, '企業作成');
    }

    // 2. グループ作成
    const { data: group, error: groupError } = await supabaseAdmin
      .from('groups')
      .insert([{
        company_id: company.id,
        name: form.group_name,
      }])
      .select()
      .single();

    if (groupError) {
      // 企業ロールバック
      await supabaseAdmin.from('companies').delete().eq('id', company.id);
      throw AppError.fromSupabaseError(groupError, 'グループ作成');
    }

    // 3. 管理者ユーザー作成（auth.users）
    const adminUserRes = await supabaseAdmin.auth.admin.createUser({
      email: form.admin_email,
      password: form.admin_password,
      email_confirm: false,
    });

    if (adminUserRes.error || !adminUserRes.data?.user) {
      // グループ・企業ロールバック
      await supabaseAdmin.from('groups').delete().eq('id', group.id);
      await supabaseAdmin.from('companies').delete().eq('id', company.id);
      throw AppError.fromSupabaseError(adminUserRes.error || new Error('管理者ユーザー作成に失敗しました'), '管理者ユーザー作成');
    }

    const adminUserId = adminUserRes.data.user.id;

    // 4. user_profiles作成
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert([{
        id: adminUserId,
        family_name: form.admin_family_name,
        first_name: form.admin_first_name,
        family_name_kana: form.admin_family_name_kana,
        first_name_kana: form.admin_first_name_kana,
        email: form.admin_email,
        role: 'admin',
        is_active: true,
      }]);

    if (profileError) {
      // ユーザー・グループ・企業ロールバック
      await supabaseAdmin.auth.admin.deleteUser(adminUserId);
      await supabaseAdmin.from('groups').delete().eq('id', group.id);
      await supabaseAdmin.from('companies').delete().eq('id', company.id);
      throw AppError.fromSupabaseError(profileError, 'ユーザープロフィール作成');
    }

    // 5. user_groups作成
    const { error: userGroupError } = await supabaseAdmin
      .from('user_groups')
      .insert([{
        user_id: adminUserId,
        group_id: group.id,
      }]);

    if (userGroupError) {
      // user_profiles・ユーザー・グループ・企業ロールバック
      await supabaseAdmin.from('user_profiles').delete().eq('id', adminUserId);
      await supabaseAdmin.auth.admin.deleteUser(adminUserId);
      await supabaseAdmin.from('groups').delete().eq('id', group.id);
      await supabaseAdmin.from('companies').delete().eq('id', company.id);
      throw AppError.fromSupabaseError(userGroupError, 'ユーザーグループ作成');
    }

    return {
      company,
      groupId: group.id,
      adminUserId
    };
  }, '企業作成');
}

/**
 * 企業更新
 */
export async function updateCompany(id: string, form: EditCompanyFormData): Promise<{ success: true; data: UpdateCompanyResult } | { success: false; error: AppError }> {
  return withErrorHandling(async () => {
    // バリデーション
    const validation = validateEditCompanyForm(form);
    if (!validation.isValid) {
      throw AppError.fromValidationErrors(validation.errors, '企業更新');
    }

    // 企業コードの重複チェック（自分以外）
    const codeExists = await checkCompanyCodeExists(form.code, id);
    if (codeExists) {
      throw AppError.duplicate('企業コード', form.code);
    }

    // 企業の存在確認
    const { data: existingCompany, error: fetchError } = await supabaseAdmin
      .from('companies')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existingCompany) {
      throw AppError.notFound('企業', id);
    }

    // 更新
    const { data: company, error: updateError } = await supabaseAdmin
      .from('companies')
      .update({
        name: form.name,
        code: form.code,
        address: form.address,
        phone: form.phone,
        is_active: form.is_active,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      throw AppError.fromSupabaseError(updateError, '企業更新');
    }

    // 更新されたフィールドを特定
    const updatedFields: (keyof UpdateCompanyInput)[] = [];
    if (existingCompany.name !== form.name) updatedFields.push('name');
    if (existingCompany.code !== form.code) updatedFields.push('code');
    if (existingCompany.address !== form.address) updatedFields.push('address');
    if (existingCompany.phone !== form.phone) updatedFields.push('phone');
    if (existingCompany.is_active !== form.is_active) updatedFields.push('is_active');

    return {
      company,
      updatedFields
    };
  }, '企業更新');
}

/**
 * 企業削除（論理削除）
 */
export async function deleteCompany(id: string): Promise<{ success: true; data: DeleteCompanyResult } | { success: false; error: AppError }> {
  return withErrorHandling(async () => {
    // 企業の存在確認
    const { data: existingCompany, error: fetchError } = await supabaseAdmin
      .from('companies')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existingCompany) {
      throw AppError.notFound('企業', id);
    }

    // アクティブな企業は削除不可
    if (existingCompany.is_active) {
      throw new AppError('アクティブな企業は削除できません。先に無効化してください。', 'ACTIVE_COMPANY_DELETE_ERROR', 400);
    }

    // 論理削除
    const { data: company, error: deleteError } = await supabaseAdmin
      .from('companies')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (deleteError) {
      throw AppError.fromSupabaseError(deleteError, '企業削除');
    }

    return {
      companyId: id,
      deletedAt: company.deleted_at!
    };
  }, '企業削除');
}

/**
 * 企業一覧取得
 */
export async function getCompanies(params: CompanySearchParams = {}): Promise<{ success: true; data: CompanyListResponse } | { success: false; error: AppError }> {
  return withErrorHandling(async () => {
    const {
      search = '',
      status = 'all',
      page = 1,
      limit = 50,
      orderBy = 'updated_at',
      ascending = false
    } = params;

    let query = supabaseAdmin
      .from('companies')
      .select('*', { count: 'exact' });

    // 削除済みを除外
    query = query.is('deleted_at', null);

    // ステータスフィルター
    if (status === 'active') {
      query = query.eq('is_active', true);
    } else if (status === 'inactive') {
      query = query.eq('is_active', false);
    }

    // 検索フィルター
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      query = query.or(`name.ilike.%${searchLower}%,code.ilike.%${searchLower}%,address.ilike.%${searchLower}%,phone.ilike.%${searchLower}%`);
    }

    // ソート
    query = query.order(orderBy, { ascending });

    // ページネーション
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: companies, error, count } = await query;

    if (error) {
      throw AppError.fromSupabaseError(error, '企業一覧取得');
    }

    // 統計情報を取得
    const { data: allCompanies } = await supabaseAdmin
      .from('companies')
      .select('is_active, deleted_at');

    const total = count || 0;
    const activeCount = allCompanies?.filter(c => c.is_active && !c.deleted_at).length || 0;
    const deletedCount = allCompanies?.filter(c => c.deleted_at).length || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      companies: companies || [],
      total,
      activeCount,
      deletedCount,
      pagination: {
        page,
        limit,
        totalPages,
        hasMore: page < totalPages,
        hasPrevious: page > 1
      }
    };
  }, '企業一覧取得');
}

/**
 * 企業統計情報取得
 */
export async function getCompanyStats(): Promise<{ success: true; data: CompanyStats } | { success: false; error: AppError }> {
  return withErrorHandling(async () => {
    const { data: companies, error } = await supabaseAdmin
      .from('companies')
      .select('is_active, deleted_at, created_at, updated_at');

    if (error) {
      throw AppError.fromSupabaseError(error, '企業統計取得');
    }

    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats: CompanyStats = {
      total: companies?.length || 0,
      active: companies?.filter(c => c.is_active && !c.deleted_at).length || 0,
      inactive: companies?.filter(c => !c.is_active && !c.deleted_at).length || 0,
      deleted: companies?.filter(c => c.deleted_at).length || 0,
      createdThisMonth: companies?.filter(c => new Date(c.created_at) >= thisMonth).length || 0,
      updatedThisMonth: companies?.filter(c => new Date(c.updated_at) >= thisMonth).length || 0,
    };

    return stats;
  }, '企業統計取得');
} 