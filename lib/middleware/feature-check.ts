import { NextRequest, NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase';

/**
 * 機能制御ミドルウェア
 * ユーザーがアクセスしようとしている機能が企業で有効になっているかをチェック
 */
export const checkFeatureAccess = async (
  request: NextRequest,
  featureCode: string
): Promise<{ allowed: boolean; redirectUrl?: string }> => {
  try {
    const supabase = createServerClient();

    // 認証情報を取得
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { allowed: false, redirectUrl: '/login' };
    }

    // ユーザープロフィールを取得
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role, company_id')
      .eq('id', user.id)
      .is('deleted_at', null)
      .single();

    if (profileError || !profile) {
      return { allowed: false, redirectUrl: '/login' };
    }

    // system-adminは全ての機能にアクセス可能
    if (profile.role === 'system-admin') {
      return { allowed: true };
    }

    // 企業IDがない場合はアクセス不可
    if (!profile.company_id) {
      return { allowed: false, redirectUrl: '/unauthorized' };
    }

    // 機能の有効性をチェック
    const { data: feature, error: featureError } = await supabase
      .from('features')
      .select('is_active')
      .eq('company_id', profile.company_id)
      .eq('feature_code', featureCode)
      .is('deleted_at', null)
      .single();

    if (featureError || !feature) {
      // 機能が見つからない場合は無効として扱う
      return { allowed: false, redirectUrl: '/feature-disabled' };
    }

    if (!feature.is_active) {
      return { allowed: false, redirectUrl: '/feature-disabled' };
    }

    return { allowed: true };
  } catch (error) {
    console.error('機能制御チェックエラー:', error);
    return { allowed: false, redirectUrl: '/error' };
  }
};

/**
 * 機能制御ミドルウェア（Next.js Middleware用）
 */
export const withFeatureCheck = (featureCode: string) => {
  return async (request: NextRequest) => {
    const result = await checkFeatureAccess(request, featureCode);

    if (!result.allowed) {
      return NextResponse.redirect(new URL(result.redirectUrl || '/unauthorized', request.url));
    }

    return NextResponse.next();
  };
};

/**
 * 複数機能の制御チェック
 */
export const checkMultipleFeatures = async (
  request: NextRequest,
  featureCodes: string[]
): Promise<{ allowed: boolean; redirectUrl?: string; disabledFeatures?: string[] }> => {
  try {
    const supabase = createServerClient();

    // 認証情報を取得
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { allowed: false, redirectUrl: '/login' };
    }

    // ユーザープロフィールを取得
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role, company_id')
      .eq('id', user.id)
      .is('deleted_at', null)
      .single();

    if (profileError || !profile) {
      return { allowed: false, redirectUrl: '/login' };
    }

    // system-adminは全ての機能にアクセス可能
    if (profile.role === 'system-admin') {
      return { allowed: true };
    }

    // 企業IDがない場合はアクセス不可
    if (!profile.company_id) {
      return { allowed: false, redirectUrl: '/unauthorized' };
    }

    // 機能の有効性をチェック
    const { data: features, error: featureError } = await supabase
      .from('features')
      .select('feature_code, is_active')
      .eq('company_id', profile.company_id)
      .in('feature_code', featureCodes)
      .is('deleted_at', null);

    if (featureError) {
      return { allowed: false, redirectUrl: '/error' };
    }

    const disabledFeatures: string[] = [];
    const featureMap = new Map(features?.map((f) => [f.feature_code, f.is_active]) || []);

    // 各機能の有効性をチェック
    for (const code of featureCodes) {
      const isActive = featureMap.get(code);
      if (!isActive) {
        disabledFeatures.push(code);
      }
    }

    if (disabledFeatures.length > 0) {
      return {
        allowed: false,
        redirectUrl: '/feature-disabled',
        disabledFeatures,
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('複数機能制御チェックエラー:', error);
    return { allowed: false, redirectUrl: '/error' };
  }
};
