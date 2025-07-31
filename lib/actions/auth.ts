'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';

import { loginUser } from '@/lib/auth';
import { type LoginActionResult } from '@/schemas/auth';

export async function loginAction(formData: FormData): Promise<LoginActionResult | never> {
  console.log('Server Action開始');
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  console.log('フォームデータ取得:', { email, password: password ? '[REDACTED]' : 'undefined' });

  if (!email || !password) {
    console.log('バリデーションエラー: メールアドレスまたはパスワードが空');
    return { error: 'メールアドレスとパスワードを入力してください' };
  }

  console.log('loginUser呼び出し開始');
  const user = await loginUser(email, password);
  console.log('loginUser結果:', user ? '成功' : '失敗');

  if (!user) {
    console.log('認証失敗: ユーザーがnull');
    return { error: 'メールアドレスまたはパスワードが正しくありません' };
  }

  console.log('ログイン成功、リダイレクト準備中:', user.role);

  // ログイン成功時のリダイレクト先を決定
  const redirectPath =
    user.role === 'system-admin' ? '/system-admin' : user.role === 'admin' ? '/admin' : '/member';

  console.log('リダイレクト先:', redirectPath);

  // リダイレクト（try-catchの外に移動）
  redirect(redirectPath);
}
