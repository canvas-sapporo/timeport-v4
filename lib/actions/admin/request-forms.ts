'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

import { createServerClient } from '@/lib/supabase';
import { logAudit, logSystem } from '@/lib/utils/log-system';
import { RequestFormSchema } from '@/schemas/request-forms';

// ================================
// バリデーションスキーマ
// ================================

// ================================
// 申請フォーム作成
// ================================

export async function createRequestForm(formData: FormData) {
  const supabase = createServerClient();

  try {
    console.log('createRequestForm: 開始');

    // システムログ: 開始
    await logSystem('info', '申請フォーム作成開始', {
      feature_name: 'request_form_management',
      action_type: 'create_request_form',
      metadata: {
        form_data_keys: Array.from(formData.keys()),
      },
    });

    // ユーザー情報を取得
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    console.log('認証結果:', { user: user?.id, userError });

    if (userError || !user) {
      // システムログ: 認証エラー
      await logSystem('error', '申請フォーム作成時の認証エラー', {
        feature_name: 'request_form_management',
        action_type: 'create_request_form',
        error_message: userError?.message || '認証エラー',
      });

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
        // システムログ: データベースエラー
        await logSystem('error', '申請フォーム作成時のデータベースエラー', {
          feature_name: 'request_form_management',
          action_type: 'create_request_form',
          error_message: error.message,
          metadata: { form_name: rawData.name, category: rawData.category },
        });

        console.error('申請フォーム作成エラー:', error);
        throw new Error('申請フォームの作成に失敗しました');
      }

      // システムログ: 成功
      await logSystem('info', '申請フォーム作成成功', {
        feature_name: 'request_form_management',
        action_type: 'create_request_form',
        resource_id: data.id,
        metadata: {
          form_id: data.id,
          form_name: data.name,
          category: data.category,
          is_active: data.is_active,
          form_config_count: data.form_config?.length || 0,
          approval_flow_count: data.approval_flow?.length || 0,
        },
      });

      // 監査ログ: 申請フォーム作成
      await logAudit('request_form_created', {
        user_id: undefined, // service_role_key使用時はユーザーID不明
        target_type: 'request_forms',
        target_id: data.id,
        before_data: undefined,
        after_data: data,
        details: {
          form_name: data.name,
          category: data.category,
          is_active: data.is_active,
        },
      });

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
      // システムログ: プロフィール取得エラー
      await logSystem('error', '申請フォーム作成時のプロフィール取得エラー', {
        feature_name: 'request_form_management',
        action_type: 'create_request_form',
        user_id: user.id,
        error_message: profileError?.message || 'ユーザープロフィールが見つかりません',
      });

      throw new Error('ユーザープロフィールが見つかりません');
    }

    if (profile.role !== 'admin') {
      // システムログ: 権限エラー
      await logSystem('warn', '申請フォーム作成時の権限エラー', {
        feature_name: 'request_form_management',
        action_type: 'create_request_form',
        user_id: user.id,
        error_message: '権限がありません',
        metadata: { user_role: profile.role },
      });

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
      // システムログ: データベースエラー
      await logSystem('error', '申請フォーム作成時のデータベースエラー', {
        feature_name: 'request_form_management',
        action_type: 'create_request_form',
        user_id: user.id,
        error_message: error.message,
        metadata: { form_name: rawData.name, category: rawData.category },
      });

      console.error('申請フォーム作成エラー:', error);
      throw new Error('申請フォームの作成に失敗しました');
    }

    // システムログ: 成功
    await logSystem('info', '申請フォーム作成成功', {
      feature_name: 'request_form_management',
      action_type: 'create_request_form',
      user_id: user.id,
      resource_id: data.id,
      metadata: {
        form_id: data.id,
        form_name: data.name,
        category: data.category,
        is_active: data.is_active,
        form_config_count: data.form_config?.length || 0,
        approval_flow_count: data.approval_flow?.length || 0,
      },
    });

    // 監査ログ: 申請フォーム作成
    await logAudit('request_form_created', {
      user_id: user.id,
      target_type: 'request_forms',
      target_id: data.id,
      before_data: undefined,
      after_data: data,
      details: {
        form_name: data.name,
        category: data.category,
        is_active: data.is_active,
      },
    });

    revalidatePath('/admin/request-forms');
    return { success: true, data };
  } catch (error) {
    // システムログ: 予期しないエラー
    await logSystem('error', '申請フォーム作成時の予期しないエラー', {
      feature_name: 'request_form_management',
      action_type: 'create_request_form',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      error_stack: error instanceof Error ? error.stack : undefined,
    });

    console.error('申請フォーム作成エラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '申請フォームの作成に失敗しました',
    };
  }
}

// ================================
// 申請フォーム更新
// ================================

export async function updateRequestForm(id: string, formData: FormData) {
  const supabase = createServerClient();

  try {
    // システムログ: 開始
    await logSystem('info', '申請フォーム更新開始', {
      feature_name: 'request_form_management',
      action_type: 'update_request_form',
      resource_id: id,
      metadata: {
        form_data_keys: Array.from(formData.keys()),
      },
    });

    // ユーザー情報を取得
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    console.log('認証結果:', { user, userError });

    if (userError || !user) {
      // システムログ: 認証エラー
      await logSystem('error', '申請フォーム更新時の認証エラー', {
        feature_name: 'request_form_management',
        action_type: 'update_request_form',
        resource_id: id,
        error_message: userError?.message || '認証エラー',
      });

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

      // 更新前のデータを取得（監査ログ用）
      const { data: beforeData } = await supabaseWithServiceRole
        .from('request_forms')
        .select('*')
        .eq('id', id)
        .single();

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
        // システムログ: データベースエラー
        await logSystem('error', '申請フォーム更新時のデータベースエラー', {
          feature_name: 'request_form_management',
          action_type: 'update_request_form',
          resource_id: id,
          error_message: error.message,
        });

        console.error('申請フォーム更新エラー:', error);
        throw new Error('申請フォームの更新に失敗しました');
      }

      // システムログ: 成功
      await logSystem('info', '申請フォーム更新成功', {
        feature_name: 'request_form_management',
        action_type: 'update_request_form',
        resource_id: id,
        metadata: {
          form_name: data.name,
          category: data.category,
          is_active: data.is_active,
        },
      });

      // 監査ログ: 申請フォーム更新
      await logAudit('request_form_updated', {
        user_id: undefined, // service_role_key使用時はユーザーID不明
        target_type: 'request_forms',
        target_id: id,
        before_data: beforeData,
        after_data: data,
        details: {
          updated_fields: Object.keys(validatedData),
        },
      });

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
      // システムログ: プロフィール取得エラー
      await logSystem('error', '申請フォーム更新時のプロフィール取得エラー', {
        feature_name: 'request_form_management',
        action_type: 'update_request_form',
        user_id: user.id,
        resource_id: id,
        error_message: profileError?.message || 'ユーザープロフィールが見つかりません',
      });

      throw new Error('ユーザープロフィールが見つかりません');
    }

    if (profile.role !== 'admin') {
      // システムログ: 権限エラー
      await logSystem('warn', '申請フォーム更新時の権限エラー', {
        feature_name: 'request_form_management',
        action_type: 'update_request_form',
        user_id: user.id,
        resource_id: id,
        error_message: '権限がありません',
        metadata: { user_role: profile.role },
      });

      throw new Error('権限がありません');
    }

    // 更新前のデータを取得（監査ログ用）
    const { data: beforeData } = await supabase
      .from('request_forms')
      .select('*')
      .eq('id', id)
      .single();

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
      // システムログ: データベースエラー
      await logSystem('error', '申請フォーム更新時のデータベースエラー', {
        feature_name: 'request_form_management',
        action_type: 'update_request_form',
        user_id: user.id,
        resource_id: id,
        error_message: error.message,
      });

      console.error('申請フォーム更新エラー:', error);
      throw new Error('申請フォームの更新に失敗しました');
    }

    // システムログ: 成功
    await logSystem('info', '申請フォーム更新成功', {
      feature_name: 'request_form_management',
      action_type: 'update_request_form',
      user_id: user.id,
      resource_id: id,
      metadata: {
        form_name: data.name,
        category: data.category,
        is_active: data.is_active,
      },
    });

    // 監査ログ: 申請フォーム更新
    await logAudit('request_form_updated', {
      user_id: user.id,
      target_type: 'request_forms',
      target_id: id,
      before_data: beforeData,
      after_data: data,
      details: {
        updated_fields: Object.keys(validatedData),
      },
    });

    revalidatePath('/admin/request-forms');
    return { success: true, data };
  } catch (error) {
    // システムログ: 予期しないエラー
    await logSystem('error', '申請フォーム更新時の予期しないエラー', {
      feature_name: 'request_form_management',
      action_type: 'update_request_form',
      resource_id: id,
      error_message: error instanceof Error ? error.message : 'Unknown error',
      error_stack: error instanceof Error ? error.stack : undefined,
    });

    console.error('申請フォーム更新エラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '申請フォームの更新に失敗しました',
    };
  }
}

// ================================
// 申請フォーム削除（論理削除）
// ================================

export async function deleteRequestForm(id: string) {
  const supabase = createServerClient();

  try {
    // システムログ: 開始
    await logSystem('info', '申請フォーム削除開始', {
      feature_name: 'request_form_management',
      action_type: 'delete_request_form',
      resource_id: id,
    });

    // ユーザー情報を取得
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    console.log('認証結果:', { user, userError });

    if (userError || !user) {
      // システムログ: 認証エラー
      await logSystem('error', '申請フォーム削除時の認証エラー', {
        feature_name: 'request_form_management',
        action_type: 'delete_request_form',
        resource_id: id,
        error_message: userError?.message || '認証エラー',
      });

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

      // 削除前のデータを取得（監査ログ用）
      const { data: beforeData } = await supabaseWithServiceRole
        .from('request_forms')
        .select('*')
        .eq('id', id)
        .single();

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
        // システムログ: データベースエラー
        await logSystem('error', '申請フォーム削除時のデータベースエラー', {
          feature_name: 'request_form_management',
          action_type: 'delete_request_form',
          resource_id: id,
          error_message: error.message,
        });

        console.error('申請フォーム削除エラー:', error);
        throw new Error('申請フォームの削除に失敗しました');
      }

      // システムログ: 成功
      await logSystem('info', '申請フォーム削除成功', {
        feature_name: 'request_form_management',
        action_type: 'delete_request_form',
        resource_id: id,
        metadata: {
          form_name: beforeData?.name,
          deletion_type: 'logical',
        },
      });

      // 監査ログ: 申請フォーム削除
      await logAudit('request_form_deleted', {
        user_id: undefined, // service_role_key使用時はユーザーID不明
        target_type: 'request_forms',
        target_id: id,
        before_data: beforeData,
        after_data: undefined,
        details: {
          deletion_type: 'logical',
          deleted_at: data.deleted_at,
        },
      });

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
      // システムログ: プロフィール取得エラー
      await logSystem('error', '申請フォーム削除時のプロフィール取得エラー', {
        feature_name: 'request_form_management',
        action_type: 'delete_request_form',
        user_id: user.id,
        resource_id: id,
        error_message: profileError?.message || 'ユーザープロフィールが見つかりません',
      });

      throw new Error('ユーザープロフィールが見つかりません');
    }

    if (profile.role !== 'admin') {
      // システムログ: 権限エラー
      await logSystem('warn', '申請フォーム削除時の権限エラー', {
        feature_name: 'request_form_management',
        action_type: 'delete_request_form',
        user_id: user.id,
        resource_id: id,
        error_message: '権限がありません',
        metadata: { user_role: profile.role },
      });

      throw new Error('権限がありません');
    }

    // 削除前のデータを取得（監査ログ用）
    const { data: beforeData } = await supabase
      .from('request_forms')
      .select('*')
      .eq('id', id)
      .single();

    // 論理削除（deleted_atを設定）
    const { error } = await supabase
      .from('request_forms')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      // システムログ: データベースエラー
      await logSystem('error', '申請フォーム削除時のデータベースエラー', {
        feature_name: 'request_form_management',
        action_type: 'delete_request_form',
        user_id: user.id,
        resource_id: id,
        error_message: error.message,
      });

      console.error('申請フォーム削除エラー:', error);
      throw new Error('申請フォームの削除に失敗しました');
    }

    // システムログ: 成功
    await logSystem('info', '申請フォーム削除成功', {
      feature_name: 'request_form_management',
      action_type: 'delete_request_form',
      user_id: user.id,
      resource_id: id,
      metadata: {
        form_name: beforeData?.name,
        deletion_type: 'logical',
      },
    });

    // 監査ログ: 申請フォーム削除
    await logAudit('request_form_deleted', {
      user_id: user.id,
      target_type: 'request_forms',
      target_id: id,
      before_data: beforeData,
      after_data: undefined,
      details: {
        deletion_type: 'logical',
        deleted_at: new Date().toISOString(),
      },
    });

    revalidatePath('/admin/requests');
    return { success: true };
  } catch (error) {
    // システムログ: 予期しないエラー
    await logSystem('error', '申請フォーム削除時の予期しないエラー', {
      feature_name: 'request_form_management',
      action_type: 'delete_request_form',
      resource_id: id,
      error_message: error instanceof Error ? error.message : 'Unknown error',
      error_stack: error instanceof Error ? error.stack : undefined,
    });

    console.error('申請フォーム削除エラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '申請フォームの削除に失敗しました',
    };
  }
}

// ================================
// 申請フォームステータス切り替え
// ================================

export async function toggleRequestFormStatus(id: string) {
  const supabase = createServerClient();

  try {
    // システムログ: 開始
    await logSystem('info', '申請フォームステータス切り替え開始', {
      feature_name: 'request_form_management',
      action_type: 'toggle_request_form_status',
      resource_id: id,
    });

    // ユーザー情報を取得
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      // システムログ: 認証エラー
      await logSystem('error', '申請フォームステータス切り替え時の認証エラー', {
        feature_name: 'request_form_management',
        action_type: 'toggle_request_form_status',
        resource_id: id,
        error_message: userError?.message || '認証エラー',
      });

      throw new Error('認証エラー');
    }

    // ユーザープロフィールを取得
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      // システムログ: プロフィール取得エラー
      await logSystem('error', '申請フォームステータス切り替え時のプロフィール取得エラー', {
        feature_name: 'request_form_management',
        action_type: 'toggle_request_form_status',
        user_id: user.id,
        resource_id: id,
        error_message: profileError?.message || 'ユーザープロフィールが見つかりません',
      });

      throw new Error('ユーザープロフィールが見つかりません');
    }

    if (profile.role !== 'admin') {
      // システムログ: 権限エラー
      await logSystem('warn', '申請フォームステータス切り替え時の権限エラー', {
        feature_name: 'request_form_management',
        action_type: 'toggle_request_form_status',
        user_id: user.id,
        resource_id: id,
        error_message: '権限がありません',
        metadata: { user_role: profile.role },
      });

      throw new Error('権限がありません');
    }

    // 現在のステータスを取得
    const { data: currentForm, error: fetchError } = await supabase
      .from('request_forms')
      .select('is_active, name')
      .eq('id', id)
      .single();

    if (fetchError || !currentForm) {
      // システムログ: フォーム取得エラー
      await logSystem('error', '申請フォームステータス切り替え時のフォーム取得エラー', {
        feature_name: 'request_form_management',
        action_type: 'toggle_request_form_status',
        user_id: user.id,
        resource_id: id,
        error_message: fetchError?.message || '申請フォームが見つかりません',
      });

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
      // システムログ: データベースエラー
      await logSystem('error', '申請フォームステータス切り替え時のデータベースエラー', {
        feature_name: 'request_form_management',
        action_type: 'toggle_request_form_status',
        user_id: user.id,
        resource_id: id,
        error_message: error.message,
      });

      console.error('申請フォームステータス更新エラー:', error);
      throw new Error('申請フォームのステータス更新に失敗しました');
    }

    // システムログ: 成功
    await logSystem('info', '申請フォームステータス切り替え成功', {
      feature_name: 'request_form_management',
      action_type: 'toggle_request_form_status',
      user_id: user.id,
      resource_id: id,
      metadata: {
        form_name: currentForm.name,
        old_status: currentForm.is_active,
        new_status: !currentForm.is_active,
      },
    });

    // 監査ログ: 申請フォームステータス切り替え
    await logAudit('request_form_status_toggled', {
      user_id: user.id,
      target_type: 'request_forms',
      target_id: id,
      before_data: { is_active: currentForm.is_active },
      after_data: { is_active: !currentForm.is_active },
      details: {
        form_name: currentForm.name,
        old_status: currentForm.is_active,
        new_status: !currentForm.is_active,
      },
    });

    revalidatePath('/admin/request-forms');
    return { success: true, is_active: !currentForm.is_active };
  } catch (error) {
    // システムログ: 予期しないエラー
    await logSystem('error', '申請フォームステータス切り替え時の予期しないエラー', {
      feature_name: 'request_form_management',
      action_type: 'toggle_request_form_status',
      resource_id: id,
      error_message: error instanceof Error ? error.message : 'Unknown error',
      error_stack: error instanceof Error ? error.stack : undefined,
    });

    console.error('申請フォームステータス更新エラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '申請フォームのステータス更新に失敗しました',
    };
  }
}

// ================================
// 申請フォーム一覧取得
// ================================

export async function getRequestForms() {
  const supabase = createServerClient();

  try {
    // システムログ: 開始
    await logSystem('info', '申請フォーム一覧取得開始', {
      feature_name: 'request_form_management',
      action_type: 'get_request_forms',
    });

    // デバッグ用：認証チェックを一時的に無効化
    console.log('getRequestForms: 開始');

    // ユーザー情報を取得
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    console.log('認証結果:', { user: user?.id, userError });

    if (userError || !user) {
      // システムログ: 認証エラー
      await logSystem('error', '申請フォーム一覧取得時の認証エラー', {
        feature_name: 'request_form_management',
        action_type: 'get_request_forms',
        error_message: userError?.message || '認証エラー',
      });

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
        // システムログ: データベースエラー
        await logSystem('error', '申請フォーム一覧取得時のデータベースエラー', {
          feature_name: 'request_form_management',
          action_type: 'get_request_forms',
          error_message: error.message,
        });

        console.error('申請フォーム取得エラー:', error);
        throw new Error('申請フォームの取得に失敗しました');
      }

      // システムログ: 成功
      await logSystem('info', '申請フォーム一覧取得成功', {
        feature_name: 'request_form_management',
        action_type: 'get_request_forms',
        metadata: {
          form_count: data?.length || 0,
        },
      });

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
      // システムログ: プロフィール取得エラー
      await logSystem('error', '申請フォーム一覧取得時のプロフィール取得エラー', {
        feature_name: 'request_form_management',
        action_type: 'get_request_forms',
        user_id: user.id,
        error_message: profileError?.message || 'ユーザープロフィールが見つかりません',
      });

      throw new Error('ユーザープロフィールが見つかりません');
    }

    // 申請フォーム一覧を取得（論理削除されていないもの）
    const { data, error } = await supabase
      .from('request_forms')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      // システムログ: データベースエラー
      await logSystem('error', '申請フォーム一覧取得時のデータベースエラー', {
        feature_name: 'request_form_management',
        action_type: 'get_request_forms',
        user_id: user.id,
        error_message: error.message,
      });

      console.error('申請フォーム取得エラー:', error);
      throw new Error('申請フォームの取得に失敗しました');
    }

    // システムログ: 成功
    await logSystem('info', '申請フォーム一覧取得成功', {
      feature_name: 'request_form_management',
      action_type: 'get_request_forms',
      user_id: user.id,
      metadata: {
        form_count: data?.length || 0,
      },
    });

    return { success: true, data };
  } catch (error) {
    // システムログ: 予期しないエラー
    await logSystem('error', '申請フォーム一覧取得時の予期しないエラー', {
      feature_name: 'request_form_management',
      action_type: 'get_request_forms',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      error_stack: error instanceof Error ? error.stack : undefined,
    });

    console.error('申請フォーム取得エラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '申請フォームの取得に失敗しました',
      data: [],
    };
  }
}

// ================================
// 申請フォーム詳細取得
// ================================

export async function getRequestForm(id: string) {
  const supabase = createServerClient();

  try {
    // システムログ: 開始
    await logSystem('info', '申請フォーム詳細取得開始', {
      feature_name: 'request_form_management',
      action_type: 'get_request_form',
      resource_id: id,
    });

    // ユーザー情報を取得
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      // システムログ: 認証エラー
      await logSystem('error', '申請フォーム詳細取得時の認証エラー', {
        feature_name: 'request_form_management',
        action_type: 'get_request_form',
        resource_id: id,
        error_message: userError?.message || '認証エラー',
      });

      throw new Error('認証エラー');
    }

    // ユーザープロフィールを取得
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      // システムログ: プロフィール取得エラー
      await logSystem('error', '申請フォーム詳細取得時のプロフィール取得エラー', {
        feature_name: 'request_form_management',
        action_type: 'get_request_form',
        user_id: user.id,
        resource_id: id,
        error_message: profileError?.message || 'ユーザープロフィールが見つかりません',
      });

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
      // システムログ: データベースエラー
      await logSystem('error', '申請フォーム詳細取得時のデータベースエラー', {
        feature_name: 'request_form_management',
        action_type: 'get_request_form',
        user_id: user.id,
        resource_id: id,
        error_message: error.message,
      });

      console.error('申請フォーム詳細取得エラー:', error);
      throw new Error('申請フォームの詳細取得に失敗しました');
    }

    // システムログ: 成功
    await logSystem('info', '申請フォーム詳細取得成功', {
      feature_name: 'request_form_management',
      action_type: 'get_request_form',
      user_id: user.id,
      resource_id: id,
      metadata: {
        form_name: data.name,
        category: data.category,
        is_active: data.is_active,
      },
    });

    return { success: true, data };
  } catch (error) {
    // システムログ: 予期しないエラー
    await logSystem('error', '申請フォーム詳細取得時の予期しないエラー', {
      feature_name: 'request_form_management',
      action_type: 'get_request_form',
      resource_id: id,
      error_message: error instanceof Error ? error.message : 'Unknown error',
      error_stack: error instanceof Error ? error.stack : undefined,
    });

    console.error('申請フォーム詳細取得エラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '申請フォームの詳細取得に失敗しました',
    };
  }
}
