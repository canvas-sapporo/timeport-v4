'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

import { loginUser } from '@/lib/auth';
import { type LoginActionResult } from '@/schemas/auth';
import { logAudit } from '@/lib/utils/log-system';

export async function loginAction(email: string, password: string): Promise<LoginActionResult> {
  console.log('Server Action開始');
  console.log('認証情報取得:', { email, password: password ? '[REDACTED]' : 'undefined' });

  if (!email || !password) {
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
          user_agent: userAgent || undefined,
          ip_address: ipAddress || undefined,
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

  // サーバーサイドでのログイン監査ログを記録
  try {
    await logAudit('user_login', {
      user_id: user.id,
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
        user_agent: userAgent || undefined,
        ip_address: ipAddress || undefined,
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
  return { success: true };
}

/**
 * ログアウトアクション（サーバーサイド）
 */
export async function logoutAction(userId?: string): Promise<void> {
  console.log('ログアウトServer Action開始');

  // クライアント情報を取得
  const headersList = await headers();
  const forwarded = headersList.get('x-forwarded-for');
  const realIp = headersList.get('x-real-ip');
  const userAgent = headersList.get('user-agent');
  
  let ipAddress = forwarded || realIp;
  if (ipAddress && ipAddress.includes(',')) {
    ipAddress = ipAddress.split(',')[0].trim();
  }

  // ログアウト監査ログを記録
  if (userId) {
    try {
      await logAudit('user_logout', {
        user_id: userId,
        target_type: 'auth',
        target_id: userId,
        before_data: undefined,
        after_data: undefined,
        details: {
          logout_method: 'manual',
          user_agent: userAgent || undefined,
          ip_address: ipAddress || undefined,
        },
        ip_address: ipAddress || undefined,
        user_agent: userAgent || undefined,
      });
      console.log('サーバーサイドログアウト監査ログ記録完了');
    } catch (error) {
      console.error('サーバーサイドログアウト監査ログ記録エラー:', error);
    }
  }

  console.log('ログアウトServer Action完了');
}

/**
 * セッション期限切れログアウトアクション（サーバーサイド）
 */
export async function sessionExpiredLogoutAction(userId?: string): Promise<void> {
  console.log('セッション期限切れログアウトServer Action開始');

  // クライアント情報を取得
  const headersList = await headers();
  const forwarded = headersList.get('x-forwarded-for');
  const realIp = headersList.get('x-real-ip');
  const userAgent = headersList.get('user-agent');
  
  let ipAddress = forwarded || realIp;
  if (ipAddress && ipAddress.includes(',')) {
    ipAddress = ipAddress.split(',')[0].trim();
  }

  // セッション期限切れログアウト監査ログを記録
  if (userId) {
    try {
      await logAudit('user_logout', {
        user_id: userId,
        target_type: 'auth',
        target_id: userId,
        before_data: undefined,
        after_data: undefined,
        details: {
          logout_method: 'session_expired',
          user_agent: userAgent || undefined,
          ip_address: ipAddress || undefined,
        },
        ip_address: ipAddress || undefined,
        user_agent: userAgent || undefined,
      });
      console.log('セッション期限切れログアウト監査ログ記録完了');
    } catch (error) {
      console.error('セッション期限切れログアウト監査ログ記録エラー:', error);
    }
  }

  console.log('セッション期限切れログアウトServer Action完了');
}
