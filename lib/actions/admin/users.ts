'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { createAdminClient, createServerClient } from '@/lib/supabase';
import { withErrorHandling, AppError } from '@/lib/utils/error-handling';
import { getUserCompanyId } from '@/lib/actions/user';
import type { UserProfile } from '@/schemas/user_profile';
import type { UUID } from '@/types/common';
import {
  ApproverListResponseSchema,
  UserListResponseSchema,
  UserDetailResponseSchema,
  CreateUserResultSchema,
  UpdateUserResultSchema,
  DeleteUserResultSchema,
  UserStatsSchema,
  UserProfileSchema,
  type CreateUserProfileInput,
  type UpdateUserProfileInput,
  type UserSearchParams,
  type ApproverListResponse,
  type UserListResponse,
  type UserDetailResponse,
  type CreateUserResult,
  type UpdateUserResult,
  type DeleteUserResult,
  type UserStats,
} from '@/schemas/users';
import { Group } from '@/schemas/group';

// 環境変数から設定を取得
const DEFAULT_PASSWORD = process.env.NEXT_PUBLIC_DEFAULT_USER_PASSWORD || 'Passw0rd!';
const REQUIRE_PASSWORD_CHANGE = process.env.NEXT_PUBLIC_REQUIRE_PASSWORD_CHANGE === 'true';
const EMAIL_UNIQUE_PER_COMPANY = process.env.NEXT_PUBLIC_EMAIL_UNIQUE_PER_COMPANY === 'true';

/**
 * 承認者選択用のユーザー一覧を取得（企業内のユーザーのみ）
 */
export async function getApprovers(userId?: string): Promise<ApproverListResponse> {
  console.log('getApprovers: 開始', { userId });

  try {
    const supabase = createAdminClient();

    // ユーザーIDが渡されていない場合は認証情報を取得
    let currentUserId = userId;
    if (!currentUserId) {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      console.log('認証結果:', { user, userError });

      if (userError || !user) {
        console.log('認証エラー、空の配列を返す');
        return { success: false, error: '認証エラーが発生しました', data: [] };
      }
      currentUserId = user.id;
    }

    // ログインユーザーの企業IDを取得
    const companyId = await getUserCompanyId(currentUserId);
    console.log('企業ID取得結果:', { currentUserId, companyId });
    if (!companyId) {
      console.error('ユーザーの企業情報を取得できませんでした');
      return { success: false, error: 'ユーザーの企業情報を取得できませんでした', data: [] };
    }

    // 同じ企業内のユーザーのみを取得（2段階クエリ）
    // 1. 企業内のユーザーID一覧を取得
    const { data: userIds, error: userIdsError } = await supabase
      .from('user_groups')
      .select(
        `
        user_id,
        groups!inner (
          company_id
        )
      `
      )
      .eq('groups.company_id', companyId)
      .is('deleted_at', null);

    console.log('ユーザーID取得結果:', { userIds, userIdsError });

    if (userIdsError) {
      console.error('ユーザーID取得エラー:', userIdsError);
      return { success: false, error: userIdsError.message, data: [] };
    }

    if (!userIds || userIds.length === 0) {
      console.log('企業内にユーザーが見つかりません');
      return { success: true, data: [] };
    }

    // 2. ユーザー詳細情報を取得
    const userIdList = userIds.map((item: { user_id: string }) => item.user_id);
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, first_name, family_name, email, role')
      .eq('is_active', true)
      .in('id', userIdList)
      .order('family_name', { ascending: true });

    if (error) {
      console.error('承認者取得エラー:', error);
      return { success: false, error: error.message, data: [] };
    }

    console.log('承認者取得成功:', data?.length || 0, '件');
    return { success: true, data };
  } catch (error) {
    console.error('承認者取得エラー:', error);
    return { success: false, error: '承認者取得中にエラーが発生しました', data: [] };
  }
}

/**
 * 企業内のユーザー一覧を取得
 */
export async function getUsers(
  companyId: UUID,
  params: UserSearchParams = {}
): Promise<UserListResponse> {
  try {
    console.log('ユーザー一覧取得開始:', { companyId, params });

    const supabaseAdmin = createAdminClient();

    // 一時的に全てのユーザーを取得
    const { data: allUsers, error: allUsersError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .is('deleted_at', null);

    if (allUsersError) {
      console.error('全ユーザー取得エラー:', allUsersError);
      return {
        success: false,
        data: [],
        total: 0,
        error: '全ユーザー取得に失敗しました',
      };
    }

    // 各ユーザーのグループ情報を取得
    const usersWithGroups = await Promise.all(
      (allUsers || []).map(async (user: z.infer<typeof UserProfileSchema>) => {
        const { data: userGroups } = await supabaseAdmin
          .from('user_groups')
          .select(
            `
            group_id,
            groups(
              id,
              name,
              code,
              company_id
            )
          `
          )
          .eq('user_id', user.id)
          .is('deleted_at', null);

        return {
          ...user,
          groups: userGroups?.map((ug: any) => ug.groups).filter(Boolean) || [],
        };
      })
    );

    // 企業内のユーザーのみをフィルタリング
    const companyUsers = usersWithGroups.filter((user) =>
      user.groups.some((group: Group) => group.company_id === companyId)
    );

    console.log('企業内ユーザー:', companyUsers);

    // 検索条件を適用
    let filteredUsers = companyUsers;

    if (params.search) {
      filteredUsers = filteredUsers.filter((user) => {
        const fullName = `${user.family_name} ${user.first_name}`;
        const fullNameKana = `${user.family_name_kana} ${user.first_name_kana}`;
        return (
          fullName.toLowerCase().includes(params.search!.toLowerCase()) ||
          fullNameKana.toLowerCase().includes(params.search!.toLowerCase()) ||
          user.email.toLowerCase().includes(params.search!.toLowerCase()) ||
          user.code.toLowerCase().includes(params.search!.toLowerCase()) ||
          (user.phone && user.phone.toLowerCase().includes(params.search!.toLowerCase()))
        );
      });
    }

    if (params.role) {
      filteredUsers = filteredUsers.filter((user) => user.role === params.role);
    }

    if (params.is_active !== undefined) {
      filteredUsers = filteredUsers.filter((user) => user.is_active === params.is_active);
    }

    if (params.group_id) {
      filteredUsers = filteredUsers.filter((user) =>
        user.groups.some((group: any) => group.id === params.group_id)
      );
    }

    // ソート
    filteredUsers.sort((a, b) => a.code.localeCompare(b.code));

    // ページネーション
    const page = params.page || 1;
    const limit = params.limit || 50;
    const from = (page - 1) * limit;
    const to = from + limit;
    const paginatedUsers = filteredUsers.slice(from, to);

    console.log('ユーザー一覧取得完了:', {
      total: filteredUsers.length,
      page,
      limit,
      returned: paginatedUsers.length,
    });

    return {
      success: true,
      data: paginatedUsers,
      total: filteredUsers.length,
    };
  } catch (error) {
    console.error('getUsers エラー:', error);
    return {
      success: false,
      data: [],
      total: 0,
      error: error instanceof Error ? error.message : '不明なエラーが発生しました',
    };
  }
}

/**
 * ユーザー詳細を取得
 */
export async function getUser(userId: UUID): Promise<UserDetailResponse> {
  return withErrorHandling(async () => {
    console.log('ユーザー詳細取得開始:', userId);

    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select(
        `
        *,
        user_groups(
          group_id,
          groups(
            id,
            name,
            code
          )
        )
      `
      )
      .eq('id', userId)
      .is('deleted_at', null)
      .single();

    if (error) {
      console.error('ユーザー詳細取得エラー:', error);
      throw AppError.fromSupabaseError(error, 'ユーザー詳細取得');
    }

    // データを整形
    const user = {
      ...data,
      groups: (data.user_groups as any)?.map((ug: any) => ug.groups) || [],
    };

    console.log('ユーザー詳細取得完了:', user);

    return user;
  });
}

/**
 * ユーザーを作成
 */
export const createUser = async (companyId: UUID, input: CreateUserProfileInput) => {
  return withErrorHandling(async () => {
    console.log('ユーザー作成開始:', { companyId, input });

    const supabaseAdmin = createAdminClient();

    // バリデーション
    if (EMAIL_UNIQUE_PER_COMPANY) {
      // 企業内でメールアドレスの重複チェック
      const { data: existingUser } = await supabaseAdmin
        .from('user_profiles')
        .select('id')
        .eq('email', input.email)
        .is('deleted_at', null);

      if (existingUser && existingUser.length > 0) {
        throw new AppError('このメールアドレスは既に使用されています', 'VALIDATION_ERROR');
      }
    }

    // 個人コードの重複チェック
    const { data: existingCode } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('code', input.code)
      .is('deleted_at', null);

    if (existingCode && existingCode.length > 0) {
      throw new AppError('この個人コードは既に使用されています', 'VALIDATION_ERROR');
    }

    // 1. Supabase Authでユーザー作成
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: input.email,
      password: DEFAULT_PASSWORD,
      email_confirm: true,
      user_metadata: {
        require_password_change: REQUIRE_PASSWORD_CHANGE,
      },
    });

    if (authError || !authUser.user) {
      console.error('Authユーザー作成エラー:', authError);
      throw AppError.fromSupabaseError(
        authError || new Error('ユーザー作成に失敗しました'),
        'Authユーザー作成'
      );
    }

    const userId = authUser.user.id;

    // 2. user_profiles作成
    const { error: profileError } = await supabaseAdmin.from('user_profiles').insert([
      {
        id: userId,
        code: input.code,
        family_name: input.family_name,
        first_name: input.first_name,
        family_name_kana: input.family_name_kana,
        first_name_kana: input.first_name_kana,
        email: input.email,
        phone: input.phone,
        role: input.role,
        employment_type_id: input.employment_type_id,
        current_work_type_id: input.current_work_type_id,
        is_active: true,
      },
    ]);

    if (profileError) {
      // Authユーザーを削除してロールバック
      await supabaseAdmin.auth.admin.deleteUser(userId);
      console.error('プロフィール作成エラー:', profileError);
      throw AppError.fromSupabaseError(profileError, 'プロフィール作成');
    }

    // 3. user_groups作成
    if (input.group_ids && input.group_ids.length > 0) {
      const userGroups = input.group_ids.map((groupId) => ({
        user_id: userId,
        group_id: groupId,
      }));

      const { error: groupError } = await supabaseAdmin.from('user_groups').insert(userGroups);

      if (groupError) {
        // プロフィールとAuthユーザーを削除してロールバック
        await supabaseAdmin.from('user_profiles').delete().eq('id', userId);
        await supabaseAdmin.auth.admin.deleteUser(userId);
        console.error('ユーザーグループ作成エラー:', groupError);
        throw AppError.fromSupabaseError(groupError, 'ユーザーグループ作成');
      }
    }

    console.log('ユーザー作成完了:', userId);

    // キャッシュを再検証
    revalidatePath('/admin/users');

    return { id: userId };
  });
};

/**
 * ユーザーを更新
 */
export const updateUser = async (userId: UUID, input: UpdateUserProfileInput) => {
  return withErrorHandling(async () => {
    console.log('ユーザー更新開始:', { userId, input });

    const supabaseAdmin = createAdminClient();

    // 最後の管理者チェック
    if (input.role === 'member' || input.is_active === false) {
      const { data: adminCount } = await supabaseAdmin
        .from('user_profiles')
        .select('id', { count: 'exact' })
        .eq('role', 'admin')
        .eq('is_active', true)
        .neq('id', userId) // 現在更新中のユーザーを除外
        .is('deleted_at', null);

      if (adminCount && adminCount.length <= 0) {
        throw new AppError(
          '最後の管理者を削除または無効化することはできません',
          'VALIDATION_ERROR'
        );
      }
    }

    // メールアドレス重複チェック
    if (input.email) {
      const { data: existingUser } = await supabaseAdmin
        .from('user_profiles')
        .select('id')
        .eq('email', input.email)
        .neq('id', userId)
        .is('deleted_at', null);

      if (existingUser && existingUser.length > 0) {
        throw new AppError('このメールアドレスは既に使用されています', 'VALIDATION_ERROR');
      }
    }

    // 個人コード重複チェック
    if (input.code) {
      const { data: existingCode } = await supabaseAdmin
        .from('user_profiles')
        .select('id')
        .eq('code', input.code)
        .neq('id', userId)
        .is('deleted_at', null);

      if (existingCode && existingCode.length > 0) {
        throw new AppError('この個人コードは既に使用されています', 'VALIDATION_ERROR');
      }
    }

    // 1. user_profiles更新
    const updateData: Partial<UpdateUserProfileInput> = {};
    if (input.code !== undefined) updateData.code = input.code;
    if (input.family_name !== undefined) updateData.family_name = input.family_name;
    if (input.first_name !== undefined) updateData.first_name = input.first_name;
    if (input.family_name_kana !== undefined) updateData.family_name_kana = input.family_name_kana;
    if (input.first_name_kana !== undefined) updateData.first_name_kana = input.first_name_kana;
    if (input.email !== undefined) updateData.email = input.email;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.role !== undefined) updateData.role = input.role;
    if (input.employment_type_id !== undefined)
      updateData.employment_type_id = input.employment_type_id;
    if (input.current_work_type_id !== undefined)
      updateData.current_work_type_id = input.current_work_type_id;
    if (input.is_active !== undefined) updateData.is_active = input.is_active;

    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .update(updateData)
      .eq('id', userId);

    if (profileError) {
      console.error('プロフィール更新エラー:', profileError);
      throw AppError.fromSupabaseError(profileError, 'プロフィール更新');
    }

    // 2. グループ更新（指定された場合）
    if (input.group_ids !== undefined) {
      // 既存のグループを削除
      await supabaseAdmin.from('user_groups').delete().eq('user_id', userId);

      // 新しいグループを追加
      if (input.group_ids.length > 0) {
        const userGroups = input.group_ids.map((groupId) => ({
          user_id: userId,
          group_id: groupId,
        }));

        const { error: groupError } = await supabaseAdmin.from('user_groups').insert(userGroups);

        if (groupError) {
          console.error('ユーザーグループ更新エラー:', groupError);
          throw AppError.fromSupabaseError(groupError, 'ユーザーグループ更新');
        }
      }
    }

    console.log('ユーザー更新完了:', userId);

    // キャッシュを再検証
    revalidatePath('/admin/users');
    console.log('キャッシュ再検証完了');

    return { id: userId };
  });
};

/**
 * ユーザーを削除（論理削除）
 */
export const deleteUser = async (userId: UUID) => {
  return withErrorHandling(async () => {
    console.log('ユーザー削除開始:', userId);

    const supabaseAdmin = createAdminClient();

    // ユーザーの存在確認とステータスチェック
    const { data: user, error: fetchError } = await supabaseAdmin
      .from('user_profiles')
      .select('role, is_active')
      .eq('id', userId)
      .is('deleted_at', null)
      .single();

    if (fetchError || !user) {
      throw AppError.notFound('ユーザー', userId);
    }

    // アクティブなユーザーは削除不可
    if (user.is_active) {
      throw new AppError(
        'アクティブなユーザーは削除できません。先に無効化してください。',
        'ACTIVE_USER_DELETE_ERROR',
        400
      );
    }

    // 最後の管理者チェック
    if (user.role === 'admin') {
      const { data: adminCount } = await supabaseAdmin
        .from('user_profiles')
        .select('id', { count: 'exact' })
        .eq('role', 'admin')
        .eq('is_active', true)
        .is('deleted_at', null);

      if (adminCount && adminCount.length <= 1) {
        throw new AppError('最後の管理者を削除することはできません', 'VALIDATION_ERROR');
      }
    }

    // 論理削除
    const { error } = await supabaseAdmin
      .from('user_profiles')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) {
      console.error('ユーザー削除エラー:', error);
      throw AppError.fromSupabaseError(error, 'ユーザー削除');
    }

    console.log('ユーザー削除完了:', userId);

    // キャッシュを再検証
    revalidatePath('/admin/users');

    return { id: userId };
  });
};

/**
 * ユーザー統計を取得
 */
export const getUserStats = async (companyId: UUID) => {
  return withErrorHandling(async () => {
    console.log('ユーザー統計取得開始:', companyId);

    const supabaseAdmin = createAdminClient();

    // 企業内のユーザーを特定するために、user_groupsを通じてcompany_idを確認
    const { data: userGroupsData, error: userGroupsError } = await supabaseAdmin
      .from('user_groups')
      .select(
        `
        user_id,
        groups!inner(
          id,
          company_id
        )
      `
      )
      .eq('groups.company_id', companyId);

    if (userGroupsError) {
      console.error('ユーザーグループ取得エラー:', userGroupsError);
      throw AppError.fromSupabaseError(userGroupsError, 'ユーザーグループ取得');
    }

    // 企業内のユーザーIDを抽出
    const companyUserIds = userGroupsData?.map((ug) => ug.user_id) || [];

    // 企業内のユーザーの詳細情報を取得
    const { data: users, error: usersError } = await supabaseAdmin
      .from('user_profiles')
      .select('role, is_active')
      .in('id', companyUserIds)
      .is('deleted_at', null);

    if (usersError) {
      console.error('ユーザー詳細取得エラー:', usersError);
      throw AppError.fromSupabaseError(usersError, 'ユーザー詳細取得');
    }

    const stats = {
      total: users?.length || 0,
      active: users?.filter((u: any) => u.is_active).length || 0,
      inactive: users?.filter((u: any) => !u.is_active).length || 0,
      admin: users?.filter((u: any) => u.role === 'admin' && u.is_active).length || 0,
      member: users?.filter((u: any) => u.role === 'member' && u.is_active).length || 0,
    };

    console.log('ユーザー統計取得完了:', stats);

    return stats;
  });
};

/**
 * デバッグ用: データベースの状態を確認
 */
export const debugDatabaseState = async (companyId: UUID) => {
  return withErrorHandling(async () => {
    console.log('=== データベース状態デバッグ開始 ===');

    const supabaseAdmin = createAdminClient();

    // 1. 全ユーザーを取得
    const { data: allUsers, error: allUsersError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .is('deleted_at', null);

    if (allUsersError) {
      console.error('全ユーザー取得エラー:', allUsersError);
    } else {
      console.log('全ユーザー:', allUsers);
    }

    // 2. 全グループを取得
    const { data: allGroups, error: allGroupsError } = await supabaseAdmin
      .from('groups')
      .select('*')
      .is('deleted_at', null);

    if (allGroupsError) {
      console.error('全グループ取得エラー:', allGroupsError);
    } else {
      console.log('全グループ:', allGroups);
    }

    // 3. 企業内のグループを取得
    const { data: companyGroups, error: companyGroupsError } = await supabaseAdmin
      .from('groups')
      .select('*')
      .eq('company_id', companyId)
      .is('deleted_at', null);

    if (companyGroupsError) {
      console.error('企業内グループ取得エラー:', companyGroupsError);
    } else {
      console.log('企業内グループ:', companyGroups);
    }

    // 4. 全ユーザーグループ関連を取得
    const { data: allUserGroups, error: allUserGroupsError } = await supabaseAdmin
      .from('user_groups')
      .select(
        `
        user_id,
        group_id,
        groups(
          id,
          name,
          code,
          company_id
        )
      `
      )
      .is('deleted_at', null);

    if (allUserGroupsError) {
      console.error('全ユーザーグループ取得エラー:', allUserGroupsError);
    } else {
      console.log('全ユーザーグループ:', allUserGroups);
    }

    // 5. 企業内のユーザーグループ関連を取得
    const { data: companyUserGroups, error: companyUserGroupsError } = await supabaseAdmin
      .from('user_groups')
      .select(
        `
        user_id,
        group_id,
        groups!inner(
          id,
          name,
          code,
          company_id
        )
      `
      )
      .eq('groups.company_id', companyId)
      .is('deleted_at', null);

    if (companyUserGroupsError) {
      console.error('企業内ユーザーグループ取得エラー:', companyUserGroupsError);
    } else {
      console.log('企業内ユーザーグループ:', companyUserGroups);
    }

    console.log('=== データベース状態デバッグ完了 ===');

    return {
      allUsers: allUsers || [],
      allGroups: allGroups || [],
      companyGroups: companyGroups || [],
      allUserGroups: allUserGroups || [],
      companyUserGroups: companyUserGroups || [],
    };
  });
};
