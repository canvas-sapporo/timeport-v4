'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { createServerClient, createAdminClient } from '@/lib/supabase';
import { validateAttendanceObject } from '@/lib/utils/attendance-validation';
import type { Request, RequestForm, ObjectMetadata } from '@/types/request';
import type { ClockRecord } from '@/types/attendance';

/**
 * 申請データを取得する（メンバー用）
 */
export const getRequests = async (userId?: string): Promise<{ success: boolean; data?: Request[]; error?: string }> => {
  console.log('getRequests: 開始', { userId });
  
  try {
    const supabase = createAdminClient();
    console.log('getRequests: Supabase Admin クライアント作成完了');

    if (!userId) {
      console.error('getRequests: ユーザーIDが指定されていません');
      return {
        success: false,
        error: 'ユーザーIDが指定されていません',
      };
    }

    console.log('getRequests: ユーザーIDでクエリ実行', userId);

    const { data, error } = await supabase
      .from('requests')
      .select(`
        *,
        statuses!requests_status_id_fkey(
          id,
          code,
          name,
          color,
          category
        ),
        request_forms!requests_request_form_id_fkey(
          id,
          name,
          approval_flow
        )
      `)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    console.log('getRequests: クエリ実行結果', { data, error });
    
    // デバッグ: request_formsの詳細をログ出力
    if (data && data.length > 0) {
      console.log('getRequests: request_forms詳細', data.map(req => ({
        id: req.id,
        request_form_id: req.request_form_id,
        current_approval_step: req.current_approval_step,
        request_forms: req.request_forms
      })));
    }

    if (error) {
      console.error('申請データ取得エラー:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    console.log('getRequests: 成功', { dataCount: data?.length || 0 });
    return {
      success: true,
      data: data || [],
    };
  } catch (error) {
    console.error('getRequests エラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * 管理者用の申請データを取得する
 */
export const getAdminRequests = async (): Promise<{ success: boolean; data?: Request[]; error?: string }> => {
  console.log('getAdminRequests: 開始');

  try {
    const supabase = createAdminClient();
    console.log('getAdminRequests: Supabase Admin クライアント作成完了');

    const { data, error } = await supabase
      .from('requests')
      .select(`
        *,
        statuses!requests_status_id_fkey(
          id,
          code,
          name,
          color,
          category
        ),
        request_forms!requests_request_form_id_fkey(
          id,
          name,
          approval_flow
        )
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('getAdminRequests: エラー', error);
      return { success: false, error: error.message };
    }

    console.log('getAdminRequests: クエリ実行結果', { data, error });
    console.log('getAdminRequests: 成功', { dataCount: data?.length || 0 });

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('getAdminRequests: 例外エラー', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * 申請ステータスを更新する
 */
export const updateRequestStatus = async (
  requestId: string,
  newStatusCode: string,
  comment?: string
): Promise<{ success: boolean; message: string; error?: string }> => {
      console.log('updateRequestStatus 開始:', { requestId, newStatusCode, comment });

    try {
      const supabase = createAdminClient();

      // 現在の申請データを確認
      const { data: currentRequest, error: currentError } = await supabase
        .from('requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (currentError) {
        console.error('現在の申請データ取得エラー:', currentError);
      } else {
        console.log('現在の申請データ:', currentRequest);
      }

    // ステータスコードからステータスIDを取得
    const { data: statusData, error: statusError } = await supabase
      .from('statuses')
      .select('id')
      .eq('code', newStatusCode)
      .eq('category', 'request')
      .single();

    if (statusError || !statusData) {
      console.error('ステータス取得エラー:', statusError);
      return {
        success: false,
        message: 'ステータスの取得に失敗しました',
        error: statusError?.message || 'ステータスが見つかりません',
      };
    }

    console.log('取得したステータスID:', statusData.id);
    console.log('更新するデータ:', {
      status_id: statusData.id,
      updated_at: new Date().toISOString(),
    });

    // 申請ステータスを更新
    const { data: updateData, error: updateError } = await supabase
      .from('requests')
      .update({
        status_id: statusData.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select();

    if (updateError) {
      console.error('申請ステータス更新エラー:', updateError);
      return {
        success: false,
        message: '申請ステータスの更新に失敗しました',
        error: updateError.message,
      };
    }

    console.log('更新後のデータ:', updateData);

    console.log('updateRequestStatus 成功');
    revalidatePath('/member/requests');

    return {
      success: true,
      message: '申請ステータスを更新しました',
    };
  } catch (error) {
    console.error('updateRequestStatus エラー:', error);
    return {
      success: false,
      message: '申請ステータスの更新に失敗しました',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * 申請を承認する
 */
export const approveRequest = async (
  requestId: string,
  approverId: string,
  comment?: string
): Promise<{ success: boolean; message: string; error?: string }> => {
  console.log('approveRequest 開始:', { requestId, approverId, comment });

  try {
    const supabase = createServerClient();

    // 申請情報を取得
    const { data: request, error: requestError } = await supabase
      .from('requests')
      .select(`
        *,
        request_forms (
          id,
          name,
          form_config,
          approval_flow,
          object_config
        )
      `)
      .eq('id', requestId)
      .single();

    if (requestError || !request) {
      console.error('申請取得エラー:', requestError);
      return {
        success: false,
        message: '申請が見つかりません',
        error: requestError?.message,
      };
    }

    // 申請フォーム情報を取得
    const requestForm = request.request_forms as RequestForm;
    if (!requestForm) {
      return {
        success: false,
        message: '申請フォームが見つかりません',
      };
    }

    // オブジェクトタイプの処理
    if (requestForm.object_config) {
      const objectMetadata = requestForm.object_config as ObjectMetadata;
      
      if (objectMetadata.object_type === 'attendance') {
        const objectFields = requestForm.form_config.filter(
          (field) => field.type === 'object'
        );

        for (const field of objectFields) {
          const result = await handleAttendanceObjectApproval(request, field, objectMetadata, approverId);
          if (!result.success) {
            return result;
          }
        }
      }
    }

    // 申請ステータスを更新
    const { error: updateError } = await supabase
      .from('requests')
      .update({
        status_id: 'approved', // 承認済みステータスID
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (updateError) {
      console.error('申請更新エラー:', updateError);
      return {
        success: false,
        message: '申請の更新に失敗しました',
        error: updateError.message,
      };
    }

    console.log('approveRequest 成功');
    revalidatePath('/admin/requests');
    revalidatePath('/member/requests');

    return {
      success: true,
      message: '申請を承認しました',
    };
  } catch (error) {
    console.error('approveRequest エラー:', error);
    return {
      success: false,
      message: '申請の承認に失敗しました',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * attendanceオブジェクトの承認処理
 */
const handleAttendanceObjectApproval = async (
  request: any,
  field: any,
  metadata: ObjectMetadata,
  approverId: string
): Promise<{ success: boolean; message: string; error?: string }> => {
  console.log('handleAttendanceObjectApproval 開始');

  try {
    const supabase = createServerClient();
    const formData = request.form_data;

    // バリデーション
    if (metadata.validation_rules) {
      const validationResult = validateAttendanceObject(formData, metadata.validation_rules);
      if (!validationResult.isValid) {
        return {
          success: false,
          message: 'データの検証に失敗しました',
          error: validationResult.errors.join(', '),
        };
      }
    }

    // 既存のattendanceレコードを検索
    const workDate = formData.work_date;
    const userId = request.user_id;

    const { data: existingAttendance, error: searchError } = await supabase
      .from('attendances')
      .select('*')
      .eq('user_id', userId)
      .eq('work_date', workDate)
      .is('deleted_at', null)
      .single();

    if (searchError && searchError.code !== 'PGRST116') {
      console.error('attendance検索エラー:', searchError);
      return {
        success: false,
        message: '既存の勤怠記録の検索に失敗しました',
        error: searchError.message,
      };
    }

    // 新しいattendanceレコードを作成
    const newAttendanceData = {
      user_id: userId,
      work_date: workDate,
      clock_records: formData.clock_records || [],
      source_id: existingAttendance?.id || null,
      edit_reason: `申請による修正 (申請ID: ${request.id})`,
      edited_by: approverId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: newAttendance, error: createError } = await supabase
      .from('attendances')
      .insert(newAttendanceData)
      .select()
      .single();

    if (createError) {
      console.error('attendance作成エラー:', createError);
      return {
        success: false,
        message: '新しい勤怠記録の作成に失敗しました',
        error: createError.message,
      };
    }

    console.log('attendanceオブジェクト承認処理成功:', newAttendance);
    return { success: true, message: '勤怠記録を更新しました' };
  } catch (error) {
    console.error('handleAttendanceObjectApproval エラー:', error);
    return {
      success: false,
      message: '勤怠記録の更新に失敗しました',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * 申請を更新する
 */
export const updateRequest = async (
  requestId: string,
  updateData: {
    form_data?: any;
    target_date?: string | null;
    start_date?: string | null;
    end_date?: string | null;
  }
): Promise<{ success: boolean; message: string; error?: string }> => {
  console.log('updateRequest 開始', { requestId, updateData });

  try {
    const supabase = createServerClient();

    // 申請が下書き状態かチェック
    const { data: request, error: fetchError } = await supabase
      .from('requests')
      .select('status_id, statuses!requests_status_id_fkey(code)')
      .eq('id', requestId)
      .single();

    if (fetchError) {
      console.error('申請取得エラー:', fetchError);
      return {
        success: false,
        message: '申請の取得に失敗しました',
        error: fetchError.message,
      };
    }

    if ((request.statuses as any)?.code !== 'draft') {
      return {
        success: false,
        message: '下書き状態の申請のみ編集可能です',
        error: 'Invalid status for editing',
      };
    }

    // 申請を更新
    const { error: updateError } = await supabase
      .from('requests')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (updateError) {
      console.error('申請更新エラー:', updateError);
      return {
        success: false,
        message: '申請の更新に失敗しました',
        error: updateError.message,
      };
    }

    console.log('申請更新成功');
    return {
      success: true,
      message: '申請を更新しました',
    };
  } catch (error) {
    console.error('updateRequest エラー:', error);
    return {
      success: false,
      message: '申請の更新に失敗しました',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}; 