'use server';

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import {
  AppError,
  withErrorHandling,
  createSuccessResponse,
  createFailureResponse,
  validateRequired,
} from '@/lib/utils/error-handling';
import type { ValidationError } from '@/types/common';
import {
  CreateGroupFormSchema,
  EditGroupFormSchema,
  GroupSearchParamsSchema,
  GroupSchema,
  CreateGroupResultSchema,
  UpdateGroupResultSchema,
  DeleteGroupResultSchema,
  GroupListResponseSchema,
  GroupStatsSchema,
  ToggleGroupStatusResultSchema,
  GroupDeletionSafetyResultSchema,
  GroupValidationResultSchema,
  type CreateGroupFormData,
  type EditGroupFormData,
  type CreateGroupResult,
  type UpdateGroupResult,
  type DeleteGroupResult,
  type GroupListResponse,
  type GroupSearchParams,
  type GroupStats,
  type GroupValidationResult,
} from '@/schemas/group';

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
 * グループ作成フォームのバリデーション
 */
function validateCreateGroupForm(
  form: z.infer<typeof CreateGroupFormSchema>
): GroupValidationResult {
  const errors: ValidationError[] = [];

  const nameError = validateRequired(form.name, 'グループ名');
  if (nameError) errors.push(nameError);

  return {
    isValid: errors.length === 0,
    errors: errors.map((error) => ({
      field: String(error.field),
      message: error.message,
      code: error.code || 'VALIDATION_ERROR',
    })),
  };
}

/**
 * グループ編集フォームのバリデーション
 */
function validateEditGroupForm(form: z.infer<typeof EditGroupFormSchema>): GroupValidationResult {
  const errors: ValidationError[] = [];

  const nameError = validateRequired(form.name, 'グループ名');
  if (nameError) errors.push(nameError);

  return {
    isValid: errors.length === 0,
    errors: errors.map((error) => ({
      field: String(error.field),
      message: error.message,
      code: error.code || 'VALIDATION_ERROR',
    })),
  };
}

// ================================
// データベース操作関数
// ================================

/**
 * グループコードの重複チェック
 */
async function checkGroupCodeExists(
  code: string,
  companyId: string,
  excludeId?: string
): Promise<boolean> {
  const query = supabaseAdmin
    .from('groups')
    .select('id')
    .eq('code', code)
    .eq('company_id', companyId)
    .is('deleted_at', null);

  if (excludeId) {
    query.neq('id', excludeId);
  }

  const { data } = await query;
  return (data?.length || 0) > 0;
}

// ================================
// Server Actions
// ================================

/**
 * グループ作成
 */
export async function createGroup(
  form: z.infer<typeof CreateGroupFormSchema>,
  companyId: string
): Promise<
  | { success: true; data: z.infer<typeof CreateGroupResultSchema> }
  | { success: false; error: AppError }
> {
  console.log('createGroup called with form:', form);

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
    const validation = validateCreateGroupForm(form);
    if (!validation.isValid) {
      throw AppError.fromValidationErrors(validation.errors, 'グループ作成');
    }

    // グループコードの重複チェック（コードが指定されている場合）
    if (form.code) {
      const codeExists = await checkGroupCodeExists(form.code, companyId);
      if (codeExists) {
        throw AppError.duplicate('グループコード', form.code);
      }
    }

    // グループ作成
    console.log('Creating group with data:', {
      name: form.name,
      code: form.code,
      description: form.description,
      company_id: companyId,
    });

    const { data: group, error: groupError } = await supabaseAdmin
      .from('groups')
      .insert([
        {
          name: form.name,
          code: form.code,
          description: form.description,
          company_id: companyId,
          is_active: true,
        },
      ])
      .select()
      .single();

    if (groupError) {
      console.error('Group creation error:', groupError);
      throw AppError.fromSupabaseError(groupError, 'グループ作成');
    }

    console.log('Group created successfully:', group);

    revalidatePath('/admin/group');
    return {
      id: group.id,
      name: group.name,
      code: group.code,
      description: group.description,
      created_at: group.created_at,
      updated_at: group.updated_at,
    };
  }, 'グループ作成');
}

/**
 * グループ更新
 */
export async function updateGroup(
  id: string,
  form: z.infer<typeof EditGroupFormSchema>,
  companyId: string
): Promise<
  | { success: true; data: z.infer<typeof UpdateGroupResultSchema> }
  | { success: false; error: AppError }
> {
  console.log('updateGroup called with form:', form);

  return withErrorHandling(async () => {
    // バリデーション
    const validation = validateEditGroupForm(form);
    if (!validation.isValid) {
      throw AppError.fromValidationErrors(validation.errors, 'グループ更新');
    }

    // グループコードの重複チェック（コードが指定されている場合）
    if (form.code) {
      const codeExists = await checkGroupCodeExists(form.code, companyId, id);
      if (codeExists) {
        throw AppError.duplicate('グループコード', form.code);
      }
    }

    // グループ更新
    const { data: group, error: groupError } = await supabaseAdmin
      .from('groups')
      .update({
        name: form.name,
        code: form.code,
        description: form.description,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single();

    if (groupError) {
      throw AppError.fromSupabaseError(groupError, 'グループ更新');
    }

    revalidatePath('/admin/group');
    return {
      id: group.id,
      name: group.name,
      code: group.code,
      description: group.description,
      updated_at: group.updated_at,
    };
  }, 'グループ更新');
}

/**
 * グループ削除
 */
export async function deleteGroup(
  id: string,
  companyId: string
): Promise<
  | { success: true; data: z.infer<typeof DeleteGroupResultSchema> }
  | { success: false; error: AppError }
> {
  console.log('deleteGroup called with id:', id);

  return withErrorHandling(async () => {
    // グループ削除（論理削除）
    const { data: group, error: groupError } = await supabaseAdmin
      .from('groups')
      .update({
        deleted_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single();

    if (groupError) {
      throw AppError.fromSupabaseError(groupError, 'グループ削除');
    }

    revalidatePath('/admin/group');
    return {
      id: group.id,
      deleted_at: group.deleted_at!,
    };
  }, 'グループ削除');
}

/**
 * グループ一覧取得
 */
export async function getGroups(
  companyId?: string,
  params: Partial<z.infer<typeof GroupSearchParamsSchema>> = {}
): Promise<
  | { success: true; data: z.infer<typeof GroupListResponseSchema> }
  | { success: false; error: AppError }
> {
  console.log('getGroups called with companyId:', companyId, 'params:', params);

  return withErrorHandling(async () => {
    const { page = 1, limit = 10, search = '' } = params;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin.from('groups').select('*', { count: 'exact' }).is('deleted_at', null);

    // companyIdが指定されている場合のみフィルタリング
    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    // 検索条件
    if (search) {
      query = query.or(
        `name.ilike.%${search}%,code.ilike.%${search}%,description.ilike.%${search}%`
      );
    }

    // ページネーション
    query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });

    const { data: groups, error: groupsError, count } = await query;

    if (groupsError) {
      throw AppError.fromSupabaseError(groupsError, 'グループ一覧取得');
    }

    return {
      groups: groups || [],
      total: count || 0,
      page,
      limit,
    };
  }, 'グループ一覧取得');
}

/**
 * グループ統計取得
 */
export async function getGroupStats(
  companyId: string
): Promise<
  { success: true; data: z.infer<typeof GroupStatsSchema> } | { success: false; error: AppError }
> {
  console.log('getGroupStats called');

  return withErrorHandling(async () => {
    const { data: groups, error: groupsError } = await supabaseAdmin
      .from('groups')
      .select('id, is_active')
      .eq('company_id', companyId)
      .is('deleted_at', null);

    if (groupsError) {
      throw AppError.fromSupabaseError(groupsError, 'グループ統計取得');
    }

    const total = groups?.length || 0;
    const active = groups?.filter((group) => group.is_active).length || 0;
    const inactive = total - active;

    return {
      total,
      active,
      inactive,
    };
  }, 'グループ統計取得');
}

/**
 * グループの有効/無効を切り替え
 */
export async function toggleGroupStatus(
  id: string,
  companyId: string
): Promise<
  | { success: true; data: z.infer<typeof ToggleGroupStatusResultSchema> }
  | { success: false; error: AppError }
> {
  console.log('toggleGroupStatus called with id:', id, 'companyId:', companyId);

  return withErrorHandling(async () => {
    // 現在のグループ情報を取得
    const { data: currentGroup, error: fetchError } = await supabaseAdmin
      .from('groups')
      .select('is_active')
      .eq('id', id)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single();

    console.log('Current group data:', currentGroup, 'fetchError:', fetchError);

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      throw AppError.fromSupabaseError(fetchError, 'グループ情報取得');
    }

    // ステータスを切り替え
    const newStatus = !currentGroup.is_active;
    console.log('Toggling status from', currentGroup.is_active, 'to', newStatus);

    const { data: group, error: updateError } = await supabaseAdmin
      .from('groups')
      .update({
        is_active: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('company_id', companyId)
      .select('id, is_active')
      .single();

    console.log('Update result:', group, 'updateError:', updateError);

    if (updateError) {
      console.error('Update error:', updateError);
      throw AppError.fromSupabaseError(updateError, 'グループステータス更新');
    }

    revalidatePath('/admin/group');
    return {
      id: group.id,
      is_active: group.is_active,
    };
  }, 'グループステータス切り替え');
}

/**
 * グループ削除前のユーザー所属状況チェック
 */
export async function checkGroupDeletionSafety(
  groupId: string,
  companyId: string
): Promise<
  | {
      success: true;
      data: z.infer<typeof GroupDeletionSafetyResultSchema>;
    }
  | { success: false; error: AppError }
> {
  console.log('checkGroupDeletionSafety called with groupId:', groupId, 'companyId:', companyId);

  return withErrorHandling(async () => {
    // このグループに所属しているユーザーを取得
    const { data: usersInGroup, error: usersError } = await supabaseAdmin
      .from('user_groups')
      .select('user_id')
      .eq('group_id', groupId)
      .is('deleted_at', null);

    if (usersError) {
      console.error('Users error:', usersError);
      throw AppError.fromSupabaseError(usersError, 'ユーザー情報取得');
    }

    console.log('Users in group:', usersInGroup);

    if (!usersInGroup || usersInGroup.length === 0) {
      // グループに所属するユーザーがいない場合は削除可能
      return {
        canDelete: true,
        affectedUsers: [],
      };
    }

    // 各ユーザーが他のグループにも所属しているかチェック
    const affectedUsers: Array<{ id: string; full_name: string; email: string }> = [];

    for (const userGroup of usersInGroup) {
      const userId = userGroup.user_id;

      // このユーザーが他のグループにも所属しているかチェック
      const { data: otherGroups, error: otherGroupsError } = await supabaseAdmin
        .from('user_groups')
        .select('group_id')
        .eq('user_id', userId)
        .neq('group_id', groupId)
        .is('deleted_at', null);

      if (otherGroupsError) {
        console.error('Other groups error:', otherGroupsError);
        throw AppError.fromSupabaseError(otherGroupsError, 'ユーザーの他のグループ取得');
      }

      // 他のグループに所属していない場合、ユーザー情報を取得
      if (!otherGroups || otherGroups.length === 0) {
        const { data: userProfile, error: profileError } = await supabaseAdmin
          .from('user_profiles')
          .select('id, full_name, email')
          .eq('id', userId)
          .single();

        if (profileError) {
          console.error('Profile error:', profileError);
          continue; // このユーザーはスキップ
        }

        if (userProfile) {
          affectedUsers.push({
            id: userProfile.id,
            full_name: userProfile.full_name,
            email: userProfile.email,
          });
        }
      }
    }

    console.log('Affected users:', affectedUsers);

    return {
      canDelete: affectedUsers.length === 0,
      affectedUsers,
    };
  }, 'グループ削除安全性チェック');
}
