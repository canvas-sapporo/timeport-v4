'use server';

import { createAdminClient, supabase } from '@/lib/supabase';
import { AppError, withErrorHandling } from '@/lib/utils/error-handling';

// ================================
// 型定義
// ================================

export interface CompanyFeatures {
  company_id: string;
  company_name: string;
  features: {
    chat: boolean;
    report: boolean;
    schedule: boolean;
  };
}

export interface FeatureToggleRequest {
  company_id: string;
  feature_code: string;
  is_active: boolean;
}

// ================================
// 企業機能取得
// ================================

/**
 * 特定の企業の機能を取得
 */
export const getCompanyFeatures = async (
  companyId: string
): Promise<{ success: true; data: CompanyFeatures } | { success: false; error: AppError }> => {
  return withErrorHandling(async () => {
    const supabase = createAdminClient();

    const { data: features, error } = await supabase
      .from('features')
      .select(
        `
        feature_code,
        is_active,
        companies!inner(id, name)
      `
      )
      .eq('company_id', companyId)
      .in('feature_code', ['chat', 'report', 'schedule'])
      .is('deleted_at', null);

    if (error) {
      throw AppError.fromSupabaseError(error, '企業機能取得');
    }

    const companyFeatures: CompanyFeatures = {
      company_id: companyId,
      company_name: '', // 企業名は別途取得する必要がある
      features: {
        chat: false,
        report: false,
        schedule: false,
      },
    };

    features?.forEach((feature: any) => {
      if (feature.feature_code === 'chat') {
        companyFeatures.features.chat = feature.is_active as boolean;
      } else if (feature.feature_code === 'report') {
        companyFeatures.features.report = feature.is_active as boolean;
      } else if (feature.feature_code === 'schedule') {
        companyFeatures.features.schedule = feature.is_active as boolean;
      }
    });

    return companyFeatures;
  });
};

/**
 * 全企業の機能を取得（Server Action）
 */
export const getAllCompanyFeatures = async (): Promise<
  { success: true; data: CompanyFeatures[] } | { success: false; error: AppError }
> => {
  return withErrorHandling(async () => {
    const supabase = createAdminClient();

    // まず企業一覧を取得
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name')
      .is('deleted_at', null);

    if (companiesError) {
      throw AppError.fromSupabaseError(companiesError, '企業一覧取得');
    }

    // 次に機能一覧を取得
    const { data: features, error: featuresError } = await supabase
      .from('features')
      .select('feature_code, is_active, company_id')
      .in('feature_code', ['chat', 'report', 'schedule'])
      .is('deleted_at', null);

    if (featuresError) {
      throw AppError.fromSupabaseError(featuresError, '機能一覧取得');
    }

    // 企業ごとに機能をグループ化
    const companyFeaturesMap = new Map<string, CompanyFeatures>();

    companies?.forEach((company: any) => {
      companyFeaturesMap.set(company.id, {
        company_id: company.id,
        company_name: company.name,
        features: {
          chat: false,
          report: false,
          schedule: false,
        },
      });
    });

    features?.forEach((feature: any) => {
      const companyFeatures = companyFeaturesMap.get(feature.company_id);
      if (companyFeatures) {
        if (feature.feature_code === 'chat') {
          companyFeatures.features.chat = feature.is_active as boolean;
        } else if (feature.feature_code === 'report') {
          companyFeatures.features.report = feature.is_active as boolean;
        } else if (feature.feature_code === 'schedule') {
          companyFeatures.features.schedule = feature.is_active as boolean;
        }
      }
    });

    return Array.from(companyFeaturesMap.values());
  });
};

// ================================
// 機能更新
// ================================

/**
 * 機能の有効/無効を切り替え（サーバーサイド用）
 */
export const toggleFeature = async (
  request: FeatureToggleRequest
): Promise<{ success: true; data: any } | { success: false; error: AppError }> => {
  return withErrorHandling(async () => {
    const supabase = createAdminClient();

    const { data: feature, error } = await supabase
      .from('features')
      .update({ is_active: request.is_active })
      .eq('company_id', request.company_id)
      .eq('feature_code', request.feature_code)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) {
      throw AppError.fromSupabaseError(error, '機能切り替え');
    }

    return feature;
  });
};

/**
 * 企業の機能を一括更新
 */
export const updateCompanyFeatures = async (
  companyId: string,
  features: { chat: boolean; report: boolean; schedule: boolean }
): Promise<{ success: true; data: any[] } | { success: false; error: AppError }> => {
  return withErrorHandling(async () => {
    const supabase = createAdminClient();

    // トランザクション的に更新
    const updates = [
      supabase
        .from('features')
        .update({ is_active: features.chat })
        .eq('company_id', companyId)
        .eq('feature_code', 'chat')
        .is('deleted_at', null),
      supabase
        .from('features')
        .update({ is_active: features.report })
        .eq('company_id', companyId)
        .eq('feature_code', 'report')
        .is('deleted_at', null),
      supabase
        .from('features')
        .update({ is_active: features.schedule })
        .eq('company_id', companyId)
        .eq('feature_code', 'schedule')
        .is('deleted_at', null),
    ];

    const results = await Promise.all(updates);

    // エラーチェック
    for (const result of results) {
      if (result.error) {
        throw AppError.fromSupabaseError(result.error, '企業機能一括更新');
      }
    }

    return results.map((result) => result.data).flat();
  });
};

/**
 * 新規企業のデフォルト機能を作成
 */
export const createCompanyFeatures = async (
  companyId: string
): Promise<{ success: true; data: any[] } | { success: false; error: AppError }> => {
  return withErrorHandling(async () => {
    const supabase = createAdminClient();

    const defaultFeatures = [
      {
        feature_code: 'chat',
        company_id: companyId,
        is_active: false,
        settings: {},
      },
      {
        feature_code: 'report',
        company_id: companyId,
        is_active: false,
        settings: {},
      },
      {
        feature_code: 'schedule',
        company_id: companyId,
        is_active: false,
        settings: {},
      },
    ];

    const { data: features, error } = await supabase
      .from('features')
      .insert(defaultFeatures)
      .select();

    if (error) {
      throw AppError.fromSupabaseError(error, '企業機能作成');
    }

    return features;
  });
};

// ================================
// 機能チェック
// ================================

/**
 * 特定の機能が有効かどうかをチェック
 */
export const isFeatureEnabled = async (
  companyId: string,
  featureCode: string
): Promise<{ success: true; data: boolean } | { success: false; error: AppError }> => {
  return withErrorHandling(async () => {
    const supabase = createAdminClient();

    const { data: feature, error } = await supabase
      .from('features')
      .select('is_active')
      .eq('company_id', companyId)
      .eq('feature_code', featureCode)
      .is('deleted_at', null)
      .single();

    if (error) {
      throw AppError.fromSupabaseError(error, '機能有効性チェック');
    }

    return (feature?.is_active as boolean) || false;
  });
};

/**
 * 企業の全機能ステータスを取得
 */
export const getCompanyFeatureStatus = async (
  companyId: string
): Promise<
  | { success: true; data: { chat: boolean; report: boolean; schedule: boolean } }
  | { success: false; error: AppError }
> => {
  return withErrorHandling(async () => {
    console.log('getCompanyFeatureStatus 開始: companyId =', companyId);

    try {
      const supabase = createAdminClient();
      console.log('createServerClient 成功');

      const { data: features, error } = await supabase
        .from('features')
        .select('feature_code, is_active')
        .eq('company_id', companyId)
        .in('feature_code', ['chat', 'report', 'schedule'])
        .is('deleted_at', null);

      console.log('クエリ実行結果:', { features, error });

      if (error) {
        console.error('Supabaseエラー:', error);
        throw AppError.fromSupabaseError(error, '企業機能ステータス取得');
      }

      const status = {
        chat: false,
        report: false,
        schedule: false,
      };

      features?.forEach((feature: any) => {
        if (feature.feature_code === 'chat') {
          status.chat = feature.is_active as boolean;
        } else if (feature.feature_code === 'report') {
          status.report = feature.is_active as boolean;
        } else if (feature.feature_code === 'schedule') {
          status.schedule = feature.is_active as boolean;
        }
      });

      console.log('機能ステータス:', status);
      return status;
    } catch (error) {
      console.error('getCompanyFeatureStatus エラー:', error);
      throw error;
    }
  });
};
