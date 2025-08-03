'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

import { loginUser } from '@/lib/auth';
import { type LoginActionResult } from '@/schemas/auth';
import { logAudit, logSystem } from '@/lib/utils/log-system';
import { createAdminClient } from '@/lib/supabase';

export async function loginAction(email: string, password: string): Promise<LoginActionResult> {
  console.log('Server Action開始');
  console.log('認証情報取得:', { email, password: password ? '[REDACTED]' : 'undefined' });

  // システムログ: 開始
  await logSystem('info', 'ログイン処理開始', {
    feature_name: 'authentication',
    action_type: 'login_attempt',
    metadata: {
      email: email,
      has_password: !!password,
    },
  });

  if (!email || !password) {
    // システムログ: バリデーションエラー
    await logSystem('warn', 'ログイン時のバリデーションエラー', {
      feature_name: 'authentication',
      action_type: 'login_attempt',
      error_message: 'メールアドレスまたはパスワードが空',
      metadata: {
        email: email,
        has_password: !!password,
      },
    });

    console.log('バリデーションエラー: メールアドレスまたはパスワードが空');
    return { error: 'メールアドレスとパスワードを入力してください' };
  }

  // クライアント情報を取得
  const headersList = await headers();
  const forwarded = headersList.get('x-forwarded-for');
  const realIp = headersList.get('x-real-ip');
  const userAgent = headersList.get('user-agent');

  let ipAddress = forwarded || realIp;
  if (ipAddress && ipAddress.includes(',')) {
    ipAddress = ipAddress.split(',')[0].trim();
  }

  console.log('loginUser呼び出し開始');
  const user = await loginUser(email, password);
  console.log('loginUser結果:', user ? '成功' : '失敗');

  if (!user) {
    console.log('認証失敗: ユーザーがnull');

    // システムログ: 認証失敗
    await logSystem('warn', 'ログイン認証失敗', {
      feature_name: 'authentication',
      action_type: 'login_attempt',
      error_message: '無効な認証情報',
      metadata: {
        email: email,
        failure_reason: 'invalid_credentials',
      },
    });

    // ログイン失敗時の監査ログを記録
    try {
      await logAudit('user_login_failed', {
        user_id: undefined,
        target_type: 'auth',
        target_id: undefined,
        before_data: undefined,
        after_data: undefined,
        details: {
                  login_method: 'password',
        email: email,
        failure_reason: 'invalid_credentials',
        user_agent: userAgent || null,
        ip_address: ipAddress || null,
      },
      ip_address: ipAddress || undefined,
      user_agent: userAgent || undefined,
      });
      console.log('ログイン失敗監査ログ記録完了');
    } catch (error) {
      console.error('ログイン失敗監査ログ記録エラー:', error);
    }

    return { error: 'メールアドレスまたはパスワードが正しくありません' };
  }

  console.log('ログイン成功、リダイレクト準備中:', user.role);

  // ユーザーのcompany_idを取得
  let companyId: string | undefined;
  try {
    const supabase = createAdminClient();
    const { data: userGroups, error: userGroupsError } = await supabase
      .from('user_groups')
      .select(
        `
        groups!user_groups_group_id_fkey(
          company_id
        )
      `
      )
      .eq('user_id', user.id)
      .is('deleted_at', null);

    if (!userGroupsError && userGroups && userGroups.length > 0) {
      const firstGroup = userGroups[0];
      if (
        firstGroup.groups &&
        typeof firstGroup.groups === 'object' &&
        'company_id' in firstGroup.groups
      ) {
        companyId = firstGroup.groups.company_id as string;
        console.log('ユーザーのcompany_id取得成功:', companyId);
      }
    } else {
      console.log('ユーザーのcompany_id取得失敗:', userGroupsError);
    }
  } catch (error) {
    console.error('company_id取得エラー:', error);
  }

  // システムログ: 認証成功
  await logSystem('info', 'ログイン認証成功', {
    feature_name: 'authentication',
    action_type: 'login_success',
    user_id: user.id,
    metadata: {
      email: user.email,
      role: user.role,
      employee_id: user.employee_id,
    },
  });

  // サーバーサイドでのログイン監査ログを記録
  try {
    await logAudit('user_login', {
      user_id: user.id,
      company_id: companyId,
      target_type: 'auth',
      target_id: user.id,
      before_data: undefined,
      after_data: {
        id: user.id,
        email: user.email,
        role: user.role,
        employee_id: user.employee_id,
        full_name: user.full_name,
      },
      details: {
        login_method: 'password',
        user_agent: userAgent || null,
        ip_address: ipAddress || null,
      },
      ip_address: ipAddress || undefined,
      user_agent: userAgent || undefined,
    });
    console.log('サーバーサイドログイン監査ログ記録完了');
  } catch (error) {
    console.error('サーバーサイドログイン監査ログ記録エラー:', error);
  }

  console.log('ログイン監査ログ記録完了');

  // 成功レスポンスを返す（リダイレクトは行わない）
  return { user };
}

/**
 * ログアウトアクション（サーバーサイド）
 */
export async function logoutAction(userId?: string): Promise<void> {
  console.log('ログアウトServer Action開始');

  // システムログ: 開始
  await logSystem('info', 'ログアウト処理開始', {
    feature_name: 'authentication',
    action_type: 'logout_attempt',
    user_id: userId,
  });

  // クライアント情報を取得
  const headersList = await headers();
  const forwarded = headersList.get('x-forwarded-for');
  const realIp = headersList.get('x-real-ip');
  const userAgent = headersList.get('user-agent');

  let ipAddress = forwarded || realIp;
  if (ipAddress && ipAddress.includes(',')) {
    ipAddress = ipAddress.split(',')[0].trim();
  }

  // ユーザーのcompany_idを取得
  let companyId: string | undefined;
  if (userId) {
    try {
      const supabase = createAdminClient();
      const { data: userGroups, error: userGroupsError } = await supabase
        .from('user_groups')
        .select(
          `
          groups!user_groups_group_id_fkey(
            company_id
          )
        `
        )
        .eq('user_id', userId)
        .is('deleted_at', null);

      if (!userGroupsError && userGroups && userGroups.length > 0) {
        const firstGroup = userGroups[0];
        if (
          firstGroup.groups &&
          typeof firstGroup.groups === 'object' &&
          'company_id' in firstGroup.groups
        ) {
          companyId = firstGroup.groups.company_id as string;
          console.log('ログアウト時のcompany_id取得成功:', companyId);
        }
      } else {
        console.log('ログアウト時のcompany_id取得失敗:', userGroupsError);
      }
    } catch (error) {
      console.error('ログアウト時のcompany_id取得エラー:', error);
    }
  }

  // ログアウト監査ログを記録
  if (userId) {
    try {
      await logAudit('user_logout', {
        user_id: userId,
        company_id: companyId,
        target_type: 'auth',
        target_id: userId,
        before_data: undefined,
        after_data: undefined,
        details: {
          logout_method: 'manual',
          user_agent: userAgent || null,
          ip_address: ipAddress || null,
        },
        ip_address: ipAddress || undefined,
        user_agent: userAgent || undefined,
      });
      console.log('サーバーサイドログアウト監査ログ記録完了');
    } catch (error) {
      console.error('サーバーサイドログアウト監査ログ記録エラー:', error);
    }
  }

  // システムログ: 成功
  await logSystem('info', 'ログアウト処理完了', {
    feature_name: 'authentication',
    action_type: 'logout_success',
    user_id: userId,
  });

  console.log('ログアウトServer Action完了');
}

/**
 * セッション期限切れログアウトアクション（サーバーサイド）
 */
export async function sessionExpiredLogoutAction(userId?: string): Promise<void> {
  console.log('セッション期限切れログアウトServer Action開始');

  // システムログ: 開始
  await logSystem('warn', 'セッション期限切れログアウト処理開始', {
    feature_name: 'authentication',
    action_type: 'session_expired_logout',
    user_id: userId,
  });

  // クライアント情報を取得
  const headersList = await headers();
  const forwarded = headersList.get('x-forwarded-for');
  const realIp = headersList.get('x-real-ip');
  const userAgent = headersList.get('user-agent');

  let ipAddress = forwarded || realIp;
  if (ipAddress && ipAddress.includes(',')) {
    ipAddress = ipAddress.split(',')[0].trim();
  }

  // ユーザーのcompany_idを取得
  let companyId: string | undefined;
  if (userId) {
    try {
      const supabase = createAdminClient();
      const { data: userGroups, error: userGroupsError } = await supabase
        .from('user_groups')
        .select(
          `
          groups!user_groups_group_id_fkey(
            company_id
          )
        `
        )
        .eq('user_id', userId)
        .is('deleted_at', null);

      if (!userGroupsError && userGroups && userGroups.length > 0) {
        const firstGroup = userGroups[0];
        if (
          firstGroup.groups &&
          typeof firstGroup.groups === 'object' &&
          'company_id' in firstGroup.groups
        ) {
          companyId = firstGroup.groups.company_id as string;
          console.log('セッション期限切れ時のcompany_id取得成功:', companyId);
        }
      } else {
        console.log('セッション期限切れ時のcompany_id取得失敗:', userGroupsError);
      }
    } catch (error) {
      console.error('セッション期限切れ時のcompany_id取得エラー:', error);
    }
  }

  // セッション期限切れログアウト監査ログを記録
  if (userId) {
    try {
      await logAudit('user_logout', {
        user_id: userId,
        company_id: companyId,
        target_type: 'auth',
        target_id: userId,
        before_data: undefined,
        after_data: undefined,
        details: {
          logout_method: 'session_expired',
          user_agent: userAgent || null,
          ip_address: ipAddress || null,
        },
        ip_address: ipAddress || undefined,
        user_agent: userAgent || undefined,
      });
      console.log('セッション期限切れログアウト監査ログ記録完了');
    } catch (error) {
      console.error('セッション期限切れログアウト監査ログ記録エラー:', error);
    }
  }

  // システムログ: 完了
  await logSystem('info', 'セッション期限切れログアウト処理完了', {
    feature_name: 'authentication',
    action_type: 'session_expired_logout',
    user_id: userId,
  });

  console.log('セッション期限切れログアウトServer Action完了');
}
