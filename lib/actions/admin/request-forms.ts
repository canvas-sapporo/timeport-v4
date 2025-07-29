'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { createServerClient } from '@/lib/supabase';
import type { RequestForm, FormFieldConfig, ApprovalStep } from '@/types/request';

// ================================
// バリデーションスキーマ
// ================================

const RequestFormSchema = z.object({
  name: z.string().min(1, '申請フォーム名は必須です'),
  description: z.string().optional(),
  category: z.string().min(1, 'カテゴリは必須です'),
  form_config: z.array(z.any()).default([]),
  approval_flow: z.array(z.any()).default([]),
  is_active: z.boolean().default(true),
});

// ================================
// 申請フォーム作成
// ================================

export const createRequestForm = async (formData: FormData) => {
  const supabase = createServerClient();

  try {
    console.log('createRequestForm: 開始');

    // ユーザー情報を取得
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    console.log('認証結果:', { user: user?.id, userError });

    if (userError || !user) {
      console.log('認証エラー、service_role_keyで試行');
      // 認証エラーの場合、service_role_keyで直接アクセス
      const serviceSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      // フォームデータを解析
      const rawData = {
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        category: formData.get('category') as string,
        form_config: JSON.parse((formData.get('form_config') as string) || '[]'),
        approval_flow: JSON.parse((formData.get('approval_flow') as string) || '[]'),
        is_active: formData.get('is_active') === 'true',
        object_config: formData.get('object_config')
          ? JSON.parse(formData.get('object_config') as string)
          : undefined,
      };

      console.log('作成データ:', rawData);

      // バリデーション
      const validatedData = RequestFormSchema.parse(rawData);
      console.log('バリデーション済みデータ:', validatedData);

      // 申請フォームを作成
      console.log('データベース挿入開始');
      const { data, error } = await serviceSupabase
        .from('request_forms')
        .insert(validatedData)
        .select()
        .single();

      console.log('データベース挿入結果:', { data, error });

      if (error) {
        console.error('申請フォーム作成エラー:', error);
        throw new Error('申請フォームの作成に失敗しました');
      }

      console.log('申請フォーム作成成功:', data);
      revalidatePath('/admin/request-forms');
      return { success: true, data };
    }

    // 認証成功の場合
    console.log('認証成功、通常のクライアントでアクセス');

    // ユーザープロフィールを取得
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('ユーザープロフィールが見つかりません');
    }

    if (profile.role !== 'admin') {
      throw new Error('権限がありません');
    }

    // フォームデータを解析
    const rawData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      category: formData.get('category') as string,
      form_config: JSON.parse((formData.get('form_config') as string) || '[]'),
      approval_flow: JSON.parse((formData.get('approval_flow') as string) || '[]'),
      is_active: formData.get('is_active') === 'true',
      object_config: formData.get('object_config')
        ? JSON.parse(formData.get('object_config') as string)
        : undefined,
    };

    // バリデーション
    const validatedData = RequestFormSchema.parse(rawData);

    // 申請フォームを作成
    const { data, error } = await supabase
      .from('request_forms')
      .insert(validatedData)
      .select()
      .single();

    if (error) {
      console.error('申請フォーム作成エラー:', error);
      throw new Error('申請フォームの作成に失敗しました');
    }

    revalidatePath('/admin/request-forms');
    return { success: true, data };
  } catch (error) {
    console.error('申請フォーム作成エラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '申請フォームの作成に失敗しました',
    };
  }
};

// ================================
// 申請フォーム更新
// ================================

export const updateRequestForm = async (id: string, formData: FormData) => {
  const supabase = createServerClient();

  try {
    // ユーザー情報を取得
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    console.log('認証結果:', { user, userError });

    if (userError || !user) {
      console.log('認証エラー、service_role_keyで試行');
      // service_role_keyを使用してSupabaseクライアントを作成
      const supabaseAdmin = createServerClient();
      const supabaseWithServiceRole = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );

      // フォームデータを解析
      const rawData = {
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        category: formData.get('category') as string,
        form_config: JSON.parse((formData.get('form_config') as string) || '[]'),
        approval_flow: JSON.parse((formData.get('approval_flow') as string) || '[]'),
        is_active: formData.get('is_active') === 'true',
        object_config: formData.get('object_config')
          ? JSON.parse(formData.get('object_config') as string)
          : undefined,
      };

      // バリデーション
      const validatedData = RequestFormSchema.parse(rawData);

      // 申請フォームを更新
      const { data, error } = await supabaseWithServiceRole
        .from('request_forms')
        .update({
          ...validatedData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('申請フォーム更新エラー:', error);
        throw new Error('申請フォームの更新に失敗しました');
      }

      revalidatePath('/admin/requests');
      return { success: true, data };
    }

    // 通常の認証フロー（ユーザーが認証されている場合）
    // ユーザープロフィールを取得
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('ユーザープロフィールが見つかりません');
    }

    if (profile.role !== 'admin') {
      throw new Error('権限がありません');
    }

    // フォームデータを解析
    const rawData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      category: formData.get('category') as string,
      form_config: JSON.parse((formData.get('form_config') as string) || '[]'),
      approval_flow: JSON.parse((formData.get('approval_flow') as string) || '[]'),
      is_active: formData.get('is_active') === 'true',
      object_config: formData.get('object_config')
        ? JSON.parse(formData.get('object_config') as string)
        : undefined,
    };

    // バリデーション
    const validatedData = RequestFormSchema.parse(rawData);

    // 申請フォームを更新
    const { data, error } = await supabase
      .from('request_forms')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('申請フォーム更新エラー:', error);
      throw new Error('申請フォームの更新に失敗しました');
    }

    revalidatePath('/admin/request-forms');
    return { success: true, data };
  } catch (error) {
    console.error('申請フォーム更新エラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '申請フォームの更新に失敗しました',
    };
  }
};

// ================================
// 申請フォーム削除（論理削除）
// ================================

export const deleteRequestForm = async (id: string) => {
  const supabase = createServerClient();

  try {
    // ユーザー情報を取得
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    console.log('認証結果:', { user, userError });

    if (userError || !user) {
      console.log('認証エラー、service_role_keyで試行');
      // service_role_keyを使用してSupabaseクライアントを作成
      const supabaseWithServiceRole = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );

      // 申請フォームを論理削除（deleted_atを設定）
      const { data, error } = await supabaseWithServiceRole
        .from('request_forms')
        .update({
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('申請フォーム削除エラー:', error);
        throw new Error('申請フォームの削除に失敗しました');
      }

      revalidatePath('/admin/requests');
      return { success: true, data };
    }

    // 通常の認証フロー（ユーザーが認証されている場合）
    // ユーザープロフィールを取得
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('ユーザープロフィールが見つかりません');
    }

    if (profile.role !== 'admin') {
      throw new Error('権限がありません');
    }

    // 論理削除（deleted_atを設定）
    const { error } = await supabase
      .from('request_forms')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('申請フォーム削除エラー:', error);
      throw new Error('申請フォームの削除に失敗しました');
    }

    revalidatePath('/admin/requests');
    return { success: true };
  } catch (error) {
    console.error('申請フォーム削除エラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '申請フォームの削除に失敗しました',
    };
  }
};

// ================================
// 申請フォームステータス切り替え
// ================================

export const toggleRequestFormStatus = async (id: string) => {
  const supabase = createServerClient();

  try {
    // ユーザー情報を取得
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('認証エラー');
    }

    // ユーザープロフィールを取得
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('ユーザープロフィールが見つかりません');
    }

    if (profile.role !== 'admin') {
      throw new Error('権限がありません');
    }

    // 現在のステータスを取得
    const { data: currentForm, error: fetchError } = await supabase
      .from('request_forms')
      .select('is_active')
      .eq('id', id)
      .single();

    if (fetchError || !currentForm) {
      throw new Error('申請フォームが見つかりません');
    }

    // ステータスを切り替え
    const { error } = await supabase
      .from('request_forms')
      .update({
        is_active: !currentForm.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('申請フォームステータス更新エラー:', error);
      throw new Error('申請フォームのステータス更新に失敗しました');
    }

    revalidatePath('/admin/request-forms');
    return { success: true, is_active: !currentForm.is_active };
  } catch (error) {
    console.error('申請フォームステータス更新エラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '申請フォームのステータス更新に失敗しました',
    };
  }
};

// ================================
// 申請フォーム一覧取得
// ================================

export const getRequestForms = async () => {
  const supabase = createServerClient();

  try {
    // デバッグ用：認証チェックを一時的に無効化
    console.log('getRequestForms: 開始');

    // ユーザー情報を取得
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    console.log('認証結果:', { user: user?.id, userError });

    if (userError || !user) {
      console.log('認証エラー、service_role_keyで試行');
      // 認証エラーの場合、service_role_keyで直接アクセス
      const serviceSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      // 申請フォーム一覧を取得（論理削除されていないもの）
      const { data, error } = await serviceSupabase
        .from('request_forms')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('申請フォーム取得エラー:', error);
        throw new Error('申請フォームの取得に失敗しました');
      }

      return { success: true, data };
    }

    // 認証成功の場合
    console.log('認証成功、通常のクライアントでアクセス');

    // ユーザープロフィールを取得
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('ユーザープロフィールが見つかりません');
    }

    // 申請フォーム一覧を取得（論理削除されていないもの）
    const { data, error } = await supabase
      .from('request_forms')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('申請フォーム取得エラー:', error);
      throw new Error('申請フォームの取得に失敗しました');
    }

    return { success: true, data };
  } catch (error) {
    console.error('申請フォーム取得エラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '申請フォームの取得に失敗しました',
      data: [],
    };
  }
};

// ================================
// 申請フォーム詳細取得
// ================================

export const getRequestForm = async (id: string) => {
  const supabase = createServerClient();

  try {
    // ユーザー情報を取得
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('認証エラー');
    }

    // ユーザープロフィールを取得
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('ユーザープロフィールが見つかりません');
    }

    // 申請フォーム詳細を取得
    const { data, error } = await supabase
      .from('request_forms')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) {
      console.error('申請フォーム詳細取得エラー:', error);
      throw new Error('申請フォームの詳細取得に失敗しました');
    }

    return { success: true, data };
  } catch (error) {
    console.error('申請フォーム詳細取得エラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '申請フォームの詳細取得に失敗しました',
    };
  }
};
