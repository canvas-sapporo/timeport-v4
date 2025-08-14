'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';

import { createAdminClient } from '@/lib/supabase';
import { withErrorHandling, AppError } from '@/lib/utils/error-handling';
import { getUserCompanyId } from '@/lib/actions/user';
import { logAudit, logSystem } from '@/lib/utils/log-system';
import type { UUID } from '@/types/common';
import {
  UserProfileSchema,
  type CreateUserProfileInput,
  type UpdateUserProfileInput,
  type UserSearchParams,
  type ApproverListResponse,
  type UserListResponse,
  type UserDetailResponse,
} from '@/schemas/users';
import { Group } from '@/schemas/group';

// ユーザーグループの型定義
interface UserGroup {
  group_id: string;
  groups: Group;
}

// ユーザー情報の型定義
interface UserWithGroups {
  id: string;
  family_name: string;
  first_name: string;
  family_name_kana: string;
  first_name_kana: string;
  email: string;
  code: string;
  phone?: string;
  role: string;
  is_active: boolean;
  [key: string]: unknown;
  groups: Group[];
}

// 環境変数から設定を取得
const DEFAULT_PASSWORD = process.env.NEXT_PUBLIC_DEFAULT_USER_PASSWORD || 'Passw0rd!';
const REQUIRE_PASSWORD_CHANGE = process.env.NEXT_PUBLIC_REQUIRE_PASSWORD_CHANGE === 'true';
const EMAIL_UNIQUE_PER_COMPANY = process.env.NEXT_PUBLIC_EMAIL_UNIQUE_PER_COMPANY === 'true';

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
        // システムログ: 認証エラー
        await logSystem('error', '承認者取得時の認証エラー', {
          feature_name: 'user_management',
          action_type: 'get_approvers',
          error_message: userError?.message || '認証エラー',
        });

        console.log('認証エラー、空の配列を返す');
        return { success: false, error: '認証エラーが発生しました', data: [] };
      }
      currentUserId = user.id;
    }

    // ログインユーザーの企業IDを取得
    const companyId = await getUserCompanyId(currentUserId);
    console.log('企業ID取得結果:', { currentUserId, companyId });
    if (!companyId) {
      // システムログ: 企業情報取得エラー
      await logSystem('error', '承認者取得時の企業情報取得エラー', {
        feature_name: 'user_management',
        action_type: 'get_approvers',
        user_id: currentUserId,
        error_message: 'ユーザーの企業情報を取得できませんでした',
      });

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
      // システムログ: データベースエラー
      await logSystem('error', '承認者取得時のデータベースエラー', {
        feature_name: 'user_management',
        action_type: 'get_approvers',
        user_id: currentUserId,
        company_id: companyId,
        error_message: userIdsError.message,
      });

      console.error('ユーザーID取得エラー:', userIdsError);
      return { success: false, error: userIdsError.message, data: [] };
    }

    if (!userIds || userIds.length === 0) {
      // システムログ: データなし
      await logSystem('info', '承認者取得: 企業内にユーザーなし', {
        feature_name: 'user_management',
        action_type: 'get_approvers',
        user_id: currentUserId,
        company_id: companyId,
        metadata: { user_count: 0 },
      });

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
      // システムログ: データベースエラー
      await logSystem('error', '承認者詳細取得エラー', {
        feature_name: 'user_management',
        action_type: 'get_approvers',
        user_id: currentUserId,
        company_id: companyId,
        error_message: error.message,
      });

      console.error('承認者取得エラー:', error);
      return { success: false, error: error.message, data: [] };
    }

    // システムログ: 成功
    await logSystem('info', '承認者取得成功', {
      feature_name: 'user_management',
      action_type: 'get_approvers',
      user_id: currentUserId,
      company_id: companyId,
      metadata: {
        approver_count: data?.length || 0,
        total_users: userIds.length,
      },
    });

    console.log('承認者取得成功:', data?.length || 0, '件');
    return { success: true, data };
  } catch (error) {
    // システムログ: 予期しないエラー
    await logSystem('error', '承認者取得時の予期しないエラー', {
      feature_name: 'user_management',
      action_type: 'get_approvers',
      user_id: userId,
      error_message: error instanceof Error ? error.message : 'Unknown error',
      error_stack: error instanceof Error ? error.stack : undefined,
    });

    console.error('承認者取得エラー:', error);
    return { success: false, error: '承認者取得中にエラーが発生しました', data: [] };
  }
}

/**
 * 企業内のユーザー一覧を取得
 */
export async function getAdminUsers(
  companyId: UUID,
  params: UserSearchParams = {}
): Promise<UserListResponse> {
  try {
    console.log('ユーザー一覧取得開始:', { companyId, params });

    // システムログ: 開始
    await logSystem('info', '管理者ユーザー一覧取得開始', {
      feature_name: 'user_management',
      action_type: 'get_admin_users',
      company_id: companyId,
      metadata: {
        search_params: params,
      },
    });

    const supabaseAdmin = createAdminClient();

    // 企業内のユーザーを取得（2段階クエリ）
    // 1. 企業内のユーザーIDを取得
    const { data: companyUserIds, error: userIdsError } = await supabaseAdmin
      .from('user_groups')
      .select(
        `
        user_id,
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

    if (userIdsError) {
      // システムログ: データベースエラー
      await logSystem('error', '管理者ユーザー一覧取得時のデータベースエラー', {
        feature_name: 'user_management',
        action_type: 'get_admin_users',
        company_id: companyId,
        error_message: userIdsError.message,
      });

      console.error('ユーザーID取得エラー:', userIdsError);
      return {
        success: false,
        data: [],
        total: 0,
        error: `ユーザーID取得に失敗しました: ${userIdsError.message}`,
      };
    }

    if (!companyUserIds || companyUserIds.length === 0) {
      // システムログ: データなし
      await logSystem('info', '管理者ユーザー一覧取得: 企業内にユーザーなし', {
        feature_name: 'user_management',
        action_type: 'get_admin_users',
        company_id: companyId,
        metadata: { user_count: 0 },
      });

      console.log('企業内にユーザーが見つかりません');
      return {
        success: true,
        data: [],
        total: 0,
      };
    }

    // 2. ユーザー詳細情報を取得
    const userIds = companyUserIds.map((item: { user_id: string }) => item.user_id);
    const { data: usersWithGroups, error: usersError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .in('id', userIds)
      .is('deleted_at', null);

    if (usersError) {
      // システムログ: データベースエラー
      await logSystem('error', '管理者ユーザー詳細取得エラー', {
        feature_name: 'user_management',
        action_type: 'get_admin_users',
        company_id: companyId,
        error_message: usersError.message,
      });

      console.error('ユーザー取得エラー:', usersError);
      return {
        success: false,
        data: [],
        total: 0,
        error: `ユーザー取得に失敗しました: ${usersError.message}`,
      };
    }

    console.log('取得したユーザー数:', usersWithGroups?.length || 0);
    console.log('取得したユーザーデータ:', usersWithGroups);

    // 各ユーザーのグループ情報を取得
    const usersWithGroupsData = await Promise.all(
      (usersWithGroups || []).map(async (user: { id: string; [key: string]: unknown }) => {
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          groups: userGroups?.map((ug: any) => ug.groups).filter(Boolean) || [],
        } as UserWithGroups;
      })
    );

    // 企業内のユーザーのみをフィルタリング
    const companyUsers = usersWithGroupsData.filter((user: UserWithGroups) =>
      user.groups.some((group: Group) => group.company_id === companyId)
    );

    console.log('企業内ユーザー:', companyUsers);
    console.log('企業内ユーザー数:', companyUsers.length);

    // 検索条件を適用
    let filteredUsers = companyUsers;
    console.log('フィルタリング前のユーザー数:', filteredUsers.length);

    if (params.search) {
      filteredUsers = filteredUsers.filter((user: UserWithGroups) => {
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
      filteredUsers = filteredUsers.filter((user: UserWithGroups) => user.role === params.role);
    }

    if (params.is_active !== undefined) {
      filteredUsers = filteredUsers.filter(
        (user: UserWithGroups) => user.is_active === params.is_active
      );
    }

    if (params.group_id) {
      filteredUsers = filteredUsers.filter((user) =>
        user.groups.some((group: Group) => group.id === params.group_id)
      );
    }

    // ソートは一時的に無効化
    console.log('フィルタ後のユーザー数:', filteredUsers.length);

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
    console.log('返却するユーザー:', paginatedUsers);

    // システムログ: 成功
    await logSystem('info', '管理者ユーザー一覧取得成功', {
      feature_name: 'user_management',
      action_type: 'get_admin_users',
      company_id: companyId,
      metadata: {
        total_users: filteredUsers.length,
        returned_users: paginatedUsers.length,
        page,
        limit,
        search_params: params,
      },
    });

    return {
      success: true,
      data: paginatedUsers,
      total: filteredUsers.length,
    };
  } catch (error) {
    // システムログ: 予期しないエラー
    await logSystem('error', '管理者ユーザー一覧取得時の予期しないエラー', {
      feature_name: 'user_management',
      action_type: 'get_admin_users',
      company_id: companyId,
      error_message: error instanceof Error ? error.message : '不明なエラーが発生しました',
      error_stack: error instanceof Error ? error.stack : undefined,
    });

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
 * joined_date 未設定のユーザーを検出
 */
export async function listUsersMissingJoinedDate(companyId: UUID): Promise<{ success: boolean; data: Array<{ id: string; name: string; email: string }>; error?: string }>{
  try {
    const supabase = createAdminClient();
    // 企業内ユーザー特定
    const { data: companyUserIds } = await supabase
      .from('user_groups')
      .select('user_id, groups!inner(company_id)')
      .eq('groups.company_id', companyId)
      .is('deleted_at', null);
    const userIds = (companyUserIds || []).map((r) => (r as { user_id: string }).user_id);
    if (userIds.length === 0) return { success: true, data: [] };
    // joined_dateが空のユーザー
    const { data } = await supabase
      .from('user_profiles')
      .select('id, family_name, first_name, email, joined_date')
      .in('id', userIds)
      .or('joined_date.is.null,joined_date.eq.') // null または 空文字
      .is('deleted_at', null);
    const rows = (data || []).map((u) => ({
      id: (u as { id: string }).id,
      name: `${(u as { family_name?: string }).family_name || ''} ${(u as { first_name?: string }).first_name || ''}`.trim(),
      email: (u as { email?: string }).email || '',
    }));
    return { success: true, data: rows };
  } catch (e) {
    return { success: false, data: [], error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

/**
 * joined_date を一括更新
 */
export async function bulkUpdateJoinedDate(companyId: UUID, updates: Array<{ userId: string; joinedDate: string }>, currentUserId?: string): Promise<{ success: boolean; updated: number; error?: string }>{
  try {
    const supabase = createAdminClient();
    let updated = 0;
    for (const u of updates) {
      // 企業所属チェック（軽量）
      const { data: belongs } = await supabase
        .from('user_groups')
        .select('user_id, groups!inner(company_id)')
        .eq('user_id', u.userId)
        .eq('groups.company_id', companyId)
        .is('deleted_at', null)
        .limit(1);
      if (!belongs || belongs.length === 0) continue;
      // 更新
      const { error } = await supabase
        .from('user_profiles')
        .update({ joined_date: u.joinedDate })
        .eq('id', u.userId);
      if (!error) updated++;
    }
    // ページ再検証など必要に応じ
    if (currentUserId) {
      await logSystem('info', 'joined_date一括更新', {
        feature_name: 'user_management',
        action_type: 'bulk_update_joined_date',
        user_id: currentUserId,
        company_id: companyId,
        metadata: { updated_count: updated },
      });
    }
    return { success: true, updated };
  } catch (e) {
    return { success: false, updated: 0, error: e instanceof Error ? e.message : 'Unknown error' };
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
      groups:
        (data.user_groups as unknown as Array<{ groups: Group }>)?.map((ug) => ug.groups) || [],
    };

    console.log('ユーザー詳細取得完了:', user);

    return user;
  });
}

/**
 * ユーザーを作成
 */
export async function createUser(
  companyId: UUID,
  input: CreateUserProfileInput,
  currentUserId?: string
) {
  return withErrorHandling(async () => {
    console.log('ユーザー作成開始:', { companyId, input });

    // システムログ: 開始
    await logSystem('info', 'ユーザー作成開始', {
      feature_name: 'user_management',
      action_type: 'create_user',
      user_id: currentUserId,
      company_id: companyId,
      metadata: {
        new_user_email: input.email,
        new_user_role: input.role,
        group_count: input.group_ids?.length || 0,
      },
    });

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
        // システムログ: バリデーションエラー
        await logSystem('warn', 'ユーザー作成時のメールアドレス重複エラー', {
          feature_name: 'user_management',
          action_type: 'create_user',
          user_id: currentUserId,
          company_id: companyId,
          error_message: 'このメールアドレスは既に使用されています',
          metadata: { email: input.email },
        });

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
      // システムログ: バリデーションエラー
      await logSystem('warn', 'ユーザー作成時の個人コード重複エラー', {
        feature_name: 'user_management',
        action_type: 'create_user',
        user_id: currentUserId,
        company_id: companyId,
        error_message: 'この個人コードは既に使用されています',
        metadata: { code: input.code },
      });

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
      // システムログ: Auth作成エラー
      await logSystem('error', 'ユーザー作成時のAuth作成エラー', {
        feature_name: 'user_management',
        action_type: 'create_user',
        user_id: currentUserId,
        company_id: companyId,
        error_message: authError?.message || 'ユーザー作成に失敗しました',
        metadata: { email: input.email },
      });

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

      // システムログ: プロフィール作成エラー
      await logSystem('error', 'ユーザー作成時のプロフィール作成エラー', {
        feature_name: 'user_management',
        action_type: 'create_user',
        user_id: currentUserId,
        company_id: companyId,
        error_message: profileError.message,
        metadata: { auth_user_id: userId, email: input.email },
      });

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

        // システムログ: グループ作成エラー
        await logSystem('error', 'ユーザー作成時のグループ作成エラー', {
          feature_name: 'user_management',
          action_type: 'create_user',
          user_id: currentUserId,
          company_id: companyId,
          error_message: groupError.message,
          metadata: { auth_user_id: userId, group_ids: input.group_ids },
        });

        console.error('ユーザーグループ作成エラー:', groupError);
        throw AppError.fromSupabaseError(groupError, 'ユーザーグループ作成');
      }
    }

    console.log('ユーザー作成完了:', userId);

    // システムログ: 成功
    await logSystem('info', 'ユーザー作成成功', {
      feature_name: 'user_management',
      action_type: 'create_user',
      user_id: currentUserId,
      company_id: companyId,
      resource_id: userId,
      metadata: {
        new_user_id: userId,
        new_user_email: input.email,
        new_user_role: input.role,
        group_count: input.group_ids?.length || 0,
      },
    });

    // 監査ログを記録
    if (currentUserId) {
      const clientInfo = await getClientInfo();
      try {
        await logAudit('user_created', {
          user_id: currentUserId,
          company_id: companyId,
          target_type: 'user_profiles',
          target_id: userId,
          before_data: undefined,
          after_data: {
            id: userId,
            code: input.code,
            family_name: input.family_name,
            first_name: input.first_name,
            email: input.email,
            role: input.role,
            employment_type_id: input.employment_type_id || null,
            current_work_type_id: input.current_work_type_id || null,
            group_ids: input.group_ids,
          },
          details: { company_id: companyId },
          ip_address: clientInfo.ip_address,
          user_agent: clientInfo.user_agent,
          session_id: clientInfo.session_id,
        });
        console.log('監査ログ記録完了: user_created');
      } catch (error) {
        console.error('監査ログ記録エラー:', error);
        // システムログ: 監査ログ記録エラー
        await logSystem('error', 'ユーザー作成時の監査ログ記録エラー', {
          feature_name: 'user_management',
          action_type: 'create_user',
          user_id: currentUserId,
          company_id: companyId,
          resource_id: userId,
          error_message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    } else {
      console.log('現在のユーザーIDが提供されていないため、監査ログを記録しません');
    }

    // キャッシュを再検証
    revalidatePath('/admin/users');

    return { id: userId };
  });
}

/**
 * ユーザーを更新
 */
export async function updateUser(
  userId: UUID,
  input: UpdateUserProfileInput,
  currentUserId?: string
) {
  return withErrorHandling(async () => {
    console.log('ユーザー更新開始:', { userId, input });

    // システムログ: 開始
    await logSystem('info', 'ユーザー更新開始', {
      feature_name: 'user_management',
      action_type: 'update_user',
      user_id: currentUserId,
      resource_id: userId,
      metadata: {
        updated_fields: Object.keys(input),
        role_change: input.role !== undefined,
        status_change: input.is_active !== undefined,
      },
    });

    const supabaseAdmin = createAdminClient();

    // 更新前のデータを取得（監査ログ用）
    const { data: beforeData } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

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
        // システムログ: バリデーションエラー
        await logSystem('warn', 'ユーザー更新時の最後の管理者削除エラー', {
          feature_name: 'user_management',
          action_type: 'update_user',
          user_id: currentUserId,
          resource_id: userId,
          error_message: '最後の管理者を削除または無効化することはできません',
          metadata: { current_role: beforeData?.role || null, new_role: input.role || null },
        });

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
        // システムログ: バリデーションエラー
        await logSystem('warn', 'ユーザー更新時のメールアドレス重複エラー', {
          feature_name: 'user_management',
          action_type: 'update_user',
          user_id: currentUserId,
          resource_id: userId,
          error_message: 'このメールアドレスは既に使用されています',
          metadata: { email: input.email },
        });

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
        // システムログ: バリデーションエラー
        await logSystem('warn', 'ユーザー更新時の個人コード重複エラー', {
          feature_name: 'user_management',
          action_type: 'update_user',
          user_id: currentUserId,
          resource_id: userId,
          error_message: 'この個人コードは既に使用されています',
          metadata: { code: input.code },
        });

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
      // システムログ: プロフィール更新エラー
      await logSystem('error', 'ユーザー更新時のプロフィール更新エラー', {
        feature_name: 'user_management',
        action_type: 'update_user',
        user_id: currentUserId,
        resource_id: userId,
        error_message: profileError.message,
      });

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
          // システムログ: グループ更新エラー
          await logSystem('error', 'ユーザー更新時のグループ更新エラー', {
            feature_name: 'user_management',
            action_type: 'update_user',
            user_id: currentUserId,
            resource_id: userId,
            error_message: groupError.message,
            metadata: { group_ids: input.group_ids },
          });

          console.error('ユーザーグループ更新エラー:', groupError);
          throw AppError.fromSupabaseError(groupError, 'ユーザーグループ更新');
        }
      }
    }

    console.log('ユーザー更新完了:', userId);

    // システムログ: 成功
    await logSystem('info', 'ユーザー更新成功', {
      feature_name: 'user_management',
      action_type: 'update_user',
      user_id: currentUserId,
      resource_id: userId,
      metadata: {
        updated_fields: Object.keys(input),
        role_change: input.role !== undefined,
        status_change: input.is_active !== undefined,
        group_change: input.group_ids !== undefined,
      },
    });

    // 監査ログを記録
    console.log('監査ログ記録開始');

    if (currentUserId) {
      const companyId = await getUserCompanyId(currentUserId);
      const clientInfo = await getClientInfo();
      console.log('企業ID取得結果:', { companyId });
      console.log('クライアント情報:', clientInfo);

      try {
        await logAudit('user_updated', {
          user_id: currentUserId,
          company_id: companyId || undefined,
          target_type: 'user_profiles',
          target_id: userId,
          before_data: beforeData,
          after_data: { ...beforeData, ...input },
          details: { updated_fields: Object.keys(input) },
          ip_address: clientInfo.ip_address,
          user_agent: clientInfo.user_agent,
          session_id: clientInfo.session_id,
        });
        console.log('監査ログ記録完了');
      } catch (error) {
        console.error('監査ログ記録エラー:', error);
        // システムログ: 監査ログ記録エラー
        await logSystem('error', 'ユーザー更新時の監査ログ記録エラー', {
          feature_name: 'user_management',
          action_type: 'update_user',
          user_id: currentUserId,
          resource_id: userId,
          error_message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    } else {
      console.log('現在のユーザーIDが提供されていません');
    }

    // キャッシュを再検証
    revalidatePath('/admin/users');
    console.log('キャッシュ再検証完了');

    return { id: userId };
  });
}

/**
 * ユーザーを削除（論理削除）
 */
export async function deleteUser(userId: UUID, currentUserId?: string) {
  return withErrorHandling(async () => {
    console.log('ユーザー削除開始:', userId);

    // システムログ: 開始
    await logSystem('info', 'ユーザー削除開始', {
      feature_name: 'user_management',
      action_type: 'delete_user',
      user_id: currentUserId,
      resource_id: userId,
    });

    const supabaseAdmin = createAdminClient();

    // ユーザーの存在確認とステータスチェック
    const { data: user, error: fetchError } = await supabaseAdmin
      .from('user_profiles')
      .select('role, is_active')
      .eq('id', userId)
      .is('deleted_at', null)
      .single();

    if (fetchError || !user) {
      // システムログ: ユーザー存在エラー
      await logSystem('error', 'ユーザー削除時のユーザー存在エラー', {
        feature_name: 'user_management',
        action_type: 'delete_user',
        user_id: currentUserId,
        resource_id: userId,
        error_message: fetchError?.message || 'ユーザーが見つかりません',
      });

      throw AppError.notFound('ユーザー', userId);
    }

    // アクティブなユーザーは削除不可
    if (user.is_active) {
      // システムログ: バリデーションエラー
      await logSystem('warn', 'ユーザー削除時のアクティブユーザー削除エラー', {
        feature_name: 'user_management',
        action_type: 'delete_user',
        user_id: currentUserId,
        resource_id: userId,
        error_message: 'アクティブなユーザーは削除できません',
        metadata: { user_role: user.role, is_active: user.is_active },
      });

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
        // システムログ: バリデーションエラー
        await logSystem('warn', 'ユーザー削除時の最後の管理者削除エラー', {
          feature_name: 'user_management',
          action_type: 'delete_user',
          user_id: currentUserId,
          resource_id: userId,
          error_message: '最後の管理者を削除することはできません',
          metadata: { user_role: user.role },
        });

        throw new AppError('最後の管理者を削除することはできません', 'VALIDATION_ERROR');
      }
    }

    // 論理削除
    const { error } = await supabaseAdmin
      .from('user_profiles')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) {
      // システムログ: 削除エラー
      await logSystem('error', 'ユーザー削除時のデータベースエラー', {
        feature_name: 'user_management',
        action_type: 'delete_user',
        user_id: currentUserId,
        resource_id: userId,
        error_message: error.message,
      });

      console.error('ユーザー削除エラー:', error);
      throw AppError.fromSupabaseError(error, 'ユーザー削除');
    }

    console.log('ユーザー削除完了:', userId);

    // システムログ: 成功
    await logSystem('info', 'ユーザー削除成功', {
      feature_name: 'user_management',
      action_type: 'delete_user',
      user_id: currentUserId,
      resource_id: userId,
      metadata: {
        deleted_user_role: user.role,
        deletion_type: 'logical',
      },
    });

    // 監査ログを記録
    if (currentUserId) {
      const clientInfo = await getClientInfo();
      try {
        const companyId = await getUserCompanyId(currentUserId);
        await logAudit('user_deleted', {
          user_id: currentUserId,
          company_id: companyId || undefined,
          target_type: 'user_profiles',
          target_id: userId,
          before_data: user,
          after_data: undefined,
          details: { deletion_type: 'logical', deleted_at: new Date().toISOString() },
          ip_address: clientInfo.ip_address,
          user_agent: clientInfo.user_agent,
          session_id: clientInfo.session_id,
        });
        console.log('監査ログ記録完了: user_deleted');
      } catch (error) {
        console.error('監査ログ記録エラー:', error);
        // システムログ: 監査ログ記録エラー
        await logSystem('error', 'ユーザー削除時の監査ログ記録エラー', {
          feature_name: 'user_management',
          action_type: 'delete_user',
          user_id: currentUserId,
          resource_id: userId,
          error_message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    } else {
      console.log('現在のユーザーIDが提供されていないため、監査ログを記録しません');
    }

    // キャッシュを再検証
    revalidatePath('/admin/users');

    return { id: userId };
  });
}

/**
 * ユーザー統計を取得
 */
export async function getUserStats(companyId: UUID) {
  return withErrorHandling(async () => {
    console.log('ユーザー統計取得開始:', companyId);

    // システムログ: 開始
    await logSystem('info', 'ユーザー統計取得開始', {
      feature_name: 'user_management',
      action_type: 'get_user_stats',
      company_id: companyId,
    });

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
      // システムログ: データベースエラー
      await logSystem('error', 'ユーザー統計取得時のデータベースエラー', {
        feature_name: 'user_management',
        action_type: 'get_user_stats',
        company_id: companyId,
        error_message: userGroupsError.message,
      });

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
      // システムログ: データベースエラー
      await logSystem('error', 'ユーザー統計取得時のユーザー詳細取得エラー', {
        feature_name: 'user_management',
        action_type: 'get_user_stats',
        company_id: companyId,
        error_message: usersError.message,
      });

      console.error('ユーザー詳細取得エラー:', usersError);
      throw AppError.fromSupabaseError(usersError, 'ユーザー詳細取得');
    }

    const stats = {
      total: users?.length || 0,
      active: users?.filter((u: { is_active: boolean }) => u.is_active).length || 0,
      inactive: users?.filter((u: { is_active: boolean }) => !u.is_active).length || 0,
      admin:
        users?.filter(
          (u: { role: string; is_active: boolean }) => u.role === 'admin' && u.is_active
        ).length || 0,
      member:
        users?.filter(
          (u: { role: string; is_active: boolean }) => u.role === 'member' && u.is_active
        ).length || 0,
    };

    // システムログ: 成功
    await logSystem('info', 'ユーザー統計取得成功', {
      feature_name: 'user_management',
      action_type: 'get_user_stats',
      company_id: companyId,
      metadata: {
        total_users: stats.total,
        active_users: stats.active,
        inactive_users: stats.inactive,
        admin_users: stats.admin,
        member_users: stats.member,
      },
    });

    console.log('ユーザー統計取得完了:', stats);

    return stats;
  });
}

/**
 * デバッグ用: データベースの状態を確認
 */
export async function debugDatabaseState(companyId: UUID) {
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
}
