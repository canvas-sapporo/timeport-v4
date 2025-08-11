'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

import { createAdminClient } from '@/lib/supabase';
import { validateAttendanceObject } from '@/lib/utils/attendance-validation';
import { logAudit, logSystem } from '@/lib/utils/log-system';
import {
  sendRequestApprovalNotification,
  sendRequestStatusNotification,
} from '@/lib/pwa/push-notification';
import type {
  RequestForm,
  ObjectMetadata,
  RequestData as Request,
  GetRequestsResult,
  UpdateRequestResult,
  ApproveRequestResult,
  FormFieldConfig,
} from '@/schemas/request';
import type { ClockBreakRecord, ClockRecord } from '@/schemas/attendance';

// ユーティリティ: metadataがObjectMetadataかどうか
function isObjectMetadata(m: unknown): m is ObjectMetadata {
  return !!m && typeof m === 'object' && 'object_type' in (m as Record<string, unknown>);
}

// calculateWorkTime関数をインポート
async function calculateWorkTime(
  clockInTime: string,
  clockOutTime: string,
  breakRecords: ClockBreakRecord[],
  workTypeId?: string
): Promise<{ actualWorkMinutes: number; overtimeMinutes: number }> {
  const supabaseAdmin = createAdminClient();
  const clockIn = new Date(clockInTime);
  const clockOut = new Date(clockOutTime);

  // 総勤務時間（分）
  const totalMinutes = Math.floor((clockOut.getTime() - clockIn.getTime()) / 60000);

  // 休憩時間（分）の計算
  const breakMinutes = breakRecords.reduce((total, br) => {
    if (br.break_start && br.break_end) {
      try {
        const breakStart = new Date(br.break_start);
        const breakEnd = new Date(br.break_end);

        if (isNaN(breakStart.getTime()) || isNaN(breakEnd.getTime())) {
          console.warn('無効な休憩時間:', { break_start: br.break_start, break_end: br.break_end });
          return total;
        }

        const breakDuration = Math.floor((breakEnd.getTime() - breakStart.getTime()) / 60000);
        return total + Math.max(0, breakDuration);
      } catch (error) {
        console.warn('休憩時間計算エラー:', error);
        return total;
      }
    }
    return total;
  }, 0);

  // 実勤務時間（分）
  const actualWorkMinutes = Math.max(0, totalMinutes - breakMinutes);

  // work_typeから残業閾値を取得
  let overtimeThresholdMinutes = 480;

  if (workTypeId) {
    try {
      const { data: workType, error } = await supabaseAdmin
        .from('work_types')
        .select('overtime_threshold_minutes')
        .eq('id', workTypeId)
        .is('deleted_at', null)
        .single();

      if (!error && workType?.overtime_threshold_minutes) {
        overtimeThresholdMinutes = workType.overtime_threshold_minutes;
      }
    } catch (error) {
      console.warn('work_type取得エラー:', error);
    }
  }

  // 残業時間（分）
  const overtimeMinutes = Math.max(0, actualWorkMinutes - overtimeThresholdMinutes);

  return { actualWorkMinutes, overtimeMinutes };
}

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
 * 申請を作成する
 */
export async function createRequest(
  requestData: {
    user_id: string;
    request_form_id: string;
    title: string;
    form_data: Record<string, unknown>;
    target_date?: string;
    start_date?: string;
    end_date?: string;
    submission_comment?: string;
    status_code?: string;
  },
  currentUserId?: string
): Promise<{ success: boolean; message: string; data?: Record<string, unknown>; error?: string }> {
  console.log('createRequest Server Action: 開始', { requestData, currentUserId });

  // システムログ: 開始
  await logSystem('info', '申請作成開始', {
    feature_name: 'request_management',
    action_type: 'create_request',
    user_id: currentUserId,
    metadata: {
      request_form_id: requestData.request_form_id,
      title: requestData.title,
      target_date: requestData.target_date || null,
      start_date: requestData.start_date || null,
      end_date: requestData.end_date || null,
    },
  });

  // システムログ: 開始
  await logSystem('info', '申請作成開始', {
    feature_name: 'request_management',
    action_type: 'create_request',
    user_id: currentUserId,
    metadata: {
      request_form_id: requestData.request_form_id,
      title: requestData.title,
      target_date: requestData.target_date || null,
      start_date: requestData.start_date || null,
      end_date: requestData.end_date || null,
    },
  });

  try {
    const supabase = createAdminClient();

    // ステータスコードを決定（デフォルトは 'draft'）
    const statusCode = requestData.status_code || 'draft';

    // 指定されたステータスを取得
    const { data: defaultStatus, error: statusError } = await supabase
      .from('statuses')
      .select('id')
      .eq('code', statusCode)
      .eq('category', 'request')
      .single();

    if (statusError || !defaultStatus) {
      // システムログ: ステータス取得エラー
      await logSystem('error', '申請作成時のステータス取得エラー', {
        feature_name: 'request_management',
        action_type: 'create_request',
        user_id: currentUserId,
        error_message: statusError?.message || 'デフォルトステータスを取得できませんでした',
      });

      console.error('デフォルトステータス取得エラー:', statusError);
      return {
        success: false,
        message: 'デフォルトステータスを取得できませんでした',
        error: 'デフォルトステータスを取得できませんでした',
      };
    }

    // 申請を作成
    const { data, error } = await supabase
      .from('requests')
      .insert([
        {
          user_id: requestData.user_id,
          request_form_id: requestData.request_form_id,
          title: requestData.title,
          form_data: requestData.form_data,
          target_date: requestData.target_date,
          start_date: requestData.start_date,
          end_date: requestData.end_date,
          status_id: defaultStatus.id,
          current_approval_step: 1,
          submission_comment: requestData.submission_comment || '',
        },
      ])
      .select()
      .single();

    if (error || !data) {
      // システムログ: データベースエラー
      await logSystem('error', '申請作成時のデータベースエラー', {
        feature_name: 'request_management',
        action_type: 'create_request',
        user_id: currentUserId,
        error_message: error?.message || '申請の作成に失敗しました',
        metadata: { request_form_id: requestData.request_form_id },
      });

      console.error('申請作成エラー:', error);
      return {
        success: false,
        message: '申請の作成に失敗しました',
        error: error?.message || '申請の作成に失敗しました',
      };
    }

    console.log('申請作成成功:', data);

    // システムログ: 成功
    await logSystem('info', '申請作成成功', {
      feature_name: 'request_management',
      action_type: 'create_request',
      user_id: currentUserId,
      resource_id: data.id,
      metadata: {
        request_id: data.id,
        request_form_id: data.request_form_id,
        status_id: data.status_id,
        title: data.title,
      },
    });

    // 監査ログを記録
    if (currentUserId) {
      const clientInfo = await getClientInfo();
      try {
        // ユーザーの企業IDを取得
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('id', requestData.user_id)
          .single();

        let companyId: string | undefined;
        if (userProfile) {
          const { data: userGroup } = await supabase
            .from('user_groups')
            .select('groups(company_id)')
            .eq('user_id', requestData.user_id)
            .is('deleted_at', null)
            .single();
          companyId = userGroup?.groups?.[0]?.company_id;
        }

        await logAudit('request_created', {
          user_id: currentUserId,
          company_id: companyId,
          target_type: 'requests',
          target_id: data.id,
          before_data: undefined,
          after_data: {
            id: data.id,
            user_id: data.user_id,
            request_form_id: data.request_form_id,
            status_id: data.status_id,
            form_data: data.form_data,
            target_date: data.target_date,
            start_date: data.start_date,
            end_date: data.end_date,
          },
          details: {
            request_form_id: data.request_form_id,
            status_id: data.status_id,
          },
          ip_address: clientInfo.ip_address,
          user_agent: clientInfo.user_agent,
          session_id: clientInfo.session_id,
        });
        console.log('監査ログ記録完了: request_created');
      } catch (error) {
        console.error('監査ログ記録エラー:', error);
        // システムログ: 監査ログ記録エラー
        await logSystem('error', '申請作成時の監査ログ記録エラー', {
          feature_name: 'request_management',
          action_type: 'create_request',
          user_id: currentUserId,
          resource_id: data.id,
          error_message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    } else {
      console.log('現在のユーザーIDが提供されていないため、監査ログを記録しません');
    }

    // プッシュ通知を送信
    try {
      // リクエストフォームの承認フローを取得して最初の承認者に通知
      const { data: requestForm } = await supabase
        .from('request_forms')
        .select('approval_flow')
        .eq('id', requestData.request_form_id)
        .single();

      if (
        requestForm?.approval_flow &&
        Array.isArray(requestForm.approval_flow) &&
        requestForm.approval_flow.length > 0
      ) {
        const firstApproverId = requestForm.approval_flow[0]?.approver_id;
        if (firstApproverId) {
          console.log('プッシュ通知送信開始:', { requestId: data.id, approverId: firstApproverId });
          await sendRequestApprovalNotification(data.id, firstApproverId, data.title);
          console.log('プッシュ通知送信完了');
        }
      }
    } catch (pushError) {
      console.error('プッシュ通知送信エラー:', pushError);
      // プッシュ通知の失敗はリクエスト作成の成功を妨げない
    }

    // キャッシュを再検証
    revalidatePath('/member/requests');

    return {
      success: true,
      message: '申請を提出しました',
      data,
    };
  } catch (error) {
    // システムログ: 予期しないエラー
    await logSystem('error', '申請作成時の予期しないエラー', {
      feature_name: 'request_management',
      action_type: 'create_request',
      user_id: currentUserId,
      error_message: error instanceof Error ? error.message : '不明なエラーが発生しました',
      error_stack: error instanceof Error ? error.stack : undefined,
    });

    console.error('createRequest Server Action エラー:', error);
    return {
      success: false,
      message: '申請の作成に失敗しました',
      error: error instanceof Error ? error.message : '不明なエラーが発生しました',
    };
  }
}

/**
 * 申請データを取得する（メンバー用）
 */
export async function getRequests(userId?: string): Promise<GetRequestsResult> {
  console.log('getRequests: 開始', { userId });

  // システムログ: 開始
  await logSystem('info', '申請一覧取得開始', {
    feature_name: 'request_management',
    action_type: 'get_requests',
    user_id: userId,
  });

  try {
    const supabase = createAdminClient();
    console.log('getRequests: Supabase Admin クライアント作成完了');

    if (!userId) {
      // システムログ: バリデーションエラー
      await logSystem('error', '申請一覧取得時のユーザーID未指定エラー', {
        feature_name: 'request_management',
        action_type: 'get_requests',
        error_message: 'ユーザーIDが指定されていません',
      });

      console.error('getRequests: ユーザーIDが指定されていません');
      return {
        success: false,
        error: 'ユーザーIDが指定されていません',
      };
    }

    console.log('getRequests: ユーザーIDでクエリ実行', userId);

    const { data, error } = await supabase
      .from('requests')
      .select(
        `
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
          description,
          form_config,
          approval_flow,
          category
        )
      `
      )
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    console.log('getRequests: クエリ実行結果', { data, error });

    // デバッグ: request_formsの詳細をログ出力
    if (data && data.length > 0) {
      console.log(
        'getRequests: request_forms詳細',
        data.map((req) => ({
          id: req.id,
          request_form_id: req.request_form_id,
          current_approval_step: req.current_approval_step,
          request_forms: req.request_forms,
        }))
      );
    }

    if (error) {
      // システムログ: データベースエラー
      await logSystem('error', '申請一覧取得時のデータベースエラー', {
        feature_name: 'request_management',
        action_type: 'get_requests',
        user_id: userId,
        error_message: error.message,
      });

      console.error('申請データ取得エラー:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    // システムログ: 成功
    await logSystem('info', '申請一覧取得成功', {
      feature_name: 'request_management',
      action_type: 'get_requests',
      user_id: userId,
      metadata: {
        request_count: data?.length || 0,
      },
    });

    console.log('getRequests: 成功', { dataCount: data?.length || 0 });
    return {
      success: true,
      data: data || [],
    };
  } catch (error) {
    // システムログ: 予期しないエラー
    await logSystem('error', '申請一覧取得時の予期しないエラー', {
      feature_name: 'request_management',
      action_type: 'get_requests',
      user_id: userId,
      error_message: error instanceof Error ? error.message : 'Unknown error',
      error_stack: error instanceof Error ? error.stack : undefined,
    });

    console.error('getRequests エラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 管理者用の申請データを取得する
 */
export async function getAdminRequests(): Promise<GetRequestsResult> {
  console.log('getAdminRequests: 開始');

  // システムログ: 開始
  await logSystem('info', '管理者申請一覧取得開始', {
    feature_name: 'request_management',
    action_type: 'get_admin_requests',
  });

  try {
    const supabase = createAdminClient();
    console.log('getAdminRequests: Supabase Admin クライアント作成完了');

    const { data, error } = await supabase
      .from('requests')
      .select(
        `
        *,
        statuses!requests_status_id_fkey(
          id,
          code,
          name,
          color,
          category
        ),
        request_forms!requests_request_form_id_fkey(
          *,
          form_config,
          approval_flow
        )
      `
      )
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      // システムログ: データベースエラー
      await logSystem('error', '管理者申請一覧取得時のデータベースエラー', {
        feature_name: 'request_management',
        action_type: 'get_admin_requests',
        error_message: error.message,
      });

      console.error('getAdminRequests: エラー', error);
      return { success: false, error: error.message };
    }

    // システムログ: 成功
    await logSystem('info', '管理者申請一覧取得成功', {
      feature_name: 'request_management',
      action_type: 'get_admin_requests',
      metadata: {
        request_count: data?.length || 0,
      },
    });

    console.log('getAdminRequests: クエリ実行結果', { data, error });
    console.log('getAdminRequests: 成功', { dataCount: data?.length || 0 });

    return { success: true, data: data || [] };
  } catch (error) {
    // システムログ: 予期しないエラー
    await logSystem('error', '管理者申請一覧取得時の予期しないエラー', {
      feature_name: 'request_management',
      action_type: 'get_admin_requests',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      error_stack: error instanceof Error ? error.stack : undefined,
    });

    console.error('getAdminRequests: 例外エラー', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 申請ステータスを更新する
 */
export async function updateRequestStatus(
  requestId: string,
  newStatusCode: string,
  comment?: string,
  currentUserId?: string
): Promise<UpdateRequestResult> {
  console.log('updateRequestStatus 開始:', { requestId, newStatusCode, comment });

  // システムログ: 開始
  await logSystem('info', '申請ステータス更新開始', {
    feature_name: 'request_management',
    action_type: 'update_request_status',
    user_id: currentUserId,
    resource_id: requestId,
    metadata: {
      new_status_code: newStatusCode,
      has_comment: !!comment,
    },
  });

  try {
    const supabase = createAdminClient();

    // 現在の申請データを確認
    const { data: currentRequest, error: currentError } = await supabase
      .from('requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (currentError || !currentRequest) {
      // システムログ: 申請取得エラー
      await logSystem('error', '申請ステータス更新時の申請取得エラー', {
        feature_name: 'request_management',
        action_type: 'update_request_status',
        user_id: currentUserId,
        resource_id: requestId,
        error_message: currentError?.message || '申請が見つかりません',
      });

      console.error('現在の申請データ取得エラー:', currentError);
      return {
        success: false,
        message: '申請データの取得に失敗しました',
        error: currentError?.message || '申請が見つかりません',
      };
    }

    console.log('現在の申請データ:', currentRequest);

    // ステータスコードからステータスIDを取得
    const { data: statusData, error: statusError } = await supabase
      .from('statuses')
      .select('id')
      .eq('code', newStatusCode)
      .eq('category', 'request')
      .single();

    if (statusError || !statusData) {
      // システムログ: ステータス取得エラー
      await logSystem('error', '申請ステータス更新時のステータス取得エラー', {
        feature_name: 'request_management',
        action_type: 'update_request_status',
        user_id: currentUserId,
        resource_id: requestId,
        error_message: statusError?.message || 'ステータスが見つかりません',
        metadata: { new_status_code: newStatusCode },
      });

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
      // システムログ: データベースエラー
      await logSystem('error', '申請ステータス更新時のデータベースエラー', {
        feature_name: 'request_management',
        action_type: 'update_request_status',
        user_id: currentUserId,
        resource_id: requestId,
        error_message: updateError.message,
      });

      console.error('申請ステータス更新エラー:', updateError);
      return {
        success: false,
        message: '申請ステータスの更新に失敗しました',
        error: updateError.message,
      };
    }

    console.log('更新後のデータ:', updateData);

    // システムログ: 成功
    await logSystem('info', '申請ステータス更新成功', {
      feature_name: 'request_management',
      action_type: 'update_request_status',
      user_id: currentUserId,
      resource_id: requestId,
      metadata: {
        old_status_id: currentRequest.status_id,
        new_status_id: statusData.id,
        new_status_code: newStatusCode,
      },
    });

    console.log('updateRequestStatus 成功');

    // 監査ログを記録
    if (currentUserId) {
      const clientInfo = await getClientInfo();
      try {
        // ユーザーの企業IDを取得
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('id', currentRequest.user_id)
          .single();

        let companyId: string | undefined;
        if (userProfile) {
          const { data: userGroup } = await supabase
            .from('user_groups')
            .select('groups(company_id)')
            .eq('user_id', currentRequest.user_id)
            .is('deleted_at', null)
            .single();
          companyId = userGroup?.groups?.[0]?.company_id;
        }

        await logAudit('request_status_updated', {
          user_id: currentUserId,
          company_id: companyId,
          target_type: 'requests',
          target_id: requestId,
          before_data: currentRequest,
          after_data: updateData[0],
          details: {
            action_type: newStatusCode === 'approved' ? 'approve' : 'reject',
            status_code: newStatusCode,
            comment: comment || null,
          },
          ip_address: clientInfo.ip_address,
          user_agent: clientInfo.user_agent,
          session_id: clientInfo.session_id,
        });
        console.log('監査ログ記録完了: request_status_updated');
      } catch (error) {
        console.error('監査ログ記録エラー:', error);
        // システムログ: 監査ログ記録エラー
        await logSystem('error', '申請ステータス更新時の監査ログ記録エラー', {
          feature_name: 'request_management',
          action_type: 'update_request_status',
          user_id: currentUserId,
          resource_id: requestId,
          error_message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    } else {
      console.log('現在のユーザーIDが提供されていないため、監査ログを記録しません');
    }

    // プッシュ通知を送信（却下の場合のみ）
    if (newStatusCode === 'rejected') {
      try {
        console.log('プッシュ通知送信開始:', { requestId, requesterId: currentRequest.user_id });
        await sendRequestStatusNotification(
          requestId,
          currentRequest.user_id,
          currentRequest.title,
          'rejected'
        );
        console.log('プッシュ通知送信完了');
      } catch (pushError) {
        console.error('プッシュ通知送信エラー:', pushError);
        // プッシュ通知の失敗はステータス更新の成功を妨げない
      }
    }

    revalidatePath('/member/requests');

    return {
      success: true,
      message: '申請ステータスを更新しました',
    };
  } catch (error) {
    // システムログ: 予期しないエラー
    await logSystem('error', '申請ステータス更新時の予期しないエラー', {
      feature_name: 'request_management',
      action_type: 'update_request_status',
      user_id: currentUserId,
      resource_id: requestId,
      error_message: error instanceof Error ? error.message : 'Unknown error',
      error_stack: error instanceof Error ? error.stack : undefined,
    });

    console.error('updateRequestStatus エラー:', error);
    return {
      success: false,
      message: '申請ステータスの更新に失敗しました',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 申請を承認する
 */
export async function approveRequest(
  requestId: string,
  approverId: string,
  comment?: string
): Promise<ApproveRequestResult> {
  console.log('approveRequest 開始:', { requestId, approverId, comment });

  // システムログ: 開始
  await logSystem('info', '申請承認開始', {
    feature_name: 'request_management',
    action_type: 'approve_request',
    user_id: approverId,
    resource_id: requestId,
    metadata: {
      has_comment: !!comment,
    },
  });

  try {
    // 管理者操作のため、RLSを回避できる管理者クライアントを使用する
    const supabase = createAdminClient();

    // 申請情報を取得
    const { data: request, error: requestError } = await supabase
      .from('requests')
      .select(
        `
        *,
        request_forms (
          id,
          name,
          form_config,
          approval_flow,
          object_config
        )
      `
      )
      .eq('id', requestId)
      .single();

    if (requestError || !request) {
      // システムログ: 申請取得エラー
      await logSystem('error', '申請承認時の申請取得エラー', {
        feature_name: 'request_management',
        action_type: 'approve_request',
        user_id: approverId,
        resource_id: requestId,
        error_message: requestError?.message || '申請が見つかりません',
      });

      console.error('申請取得エラー:', requestError);
      return {
        success: false,
        message: '申請が見つかりません',
        error: requestError?.message,
      };
    }

    // デバッグログ: リクエスト情報
    console.log('approveRequest リクエスト情報:', {
      requestId,
      target_date: request.target_date,
      form_data: request.form_data,
      form_data_keys: request.form_data ? Object.keys(request.form_data) : [],
      work_date_in_form: request.form_data?.work_date,
    });

    // 申請フォーム情報を取得
    const requestForm = request.request_forms as RequestForm;
    if (!requestForm) {
      // システムログ: フォーム取得エラー
      await logSystem('error', '申請承認時の申請フォーム取得エラー', {
        feature_name: 'request_management',
        action_type: 'approve_request',
        user_id: approverId,
        resource_id: requestId,
        error_message: '申請フォームが見つかりません',
      });

      return {
        success: false,
        message: '申請フォームが見つかりません',
      };
    }

    // オブジェクトタイプの処理
    // フォーム全体のobject_configが無い場合でも、フィールドのmetadataから推測して処理する
    {
      const objectFields: FormFieldConfig[] = (requestForm.form_config || []).filter(
        (field: FormFieldConfig) => field.type === 'object'
      );

      let objectMetadata: ObjectMetadata | undefined = requestForm.object_config || undefined;

      if (!objectMetadata) {
        const withMeta = objectFields.find((f) => isObjectMetadata(f.metadata));
        if (withMeta && isObjectMetadata(withMeta.metadata)) {
          objectMetadata = withMeta.metadata;
        }
      }

      if (objectMetadata && objectMetadata.object_type === 'attendance') {
        for (const field of objectFields) {
          const result = await handleAttendanceObjectApproval(
            request,
            field.name,
            objectMetadata,
            approverId
          );
          if (!result.success) {
            // システムログ: オブジェクト処理エラー
            await logSystem('error', '申請承認時のオブジェクト処理エラー', {
              feature_name: 'request_management',
              action_type: 'approve_request',
              user_id: approverId,
              resource_id: requestId,
              error_message: result.error || 'オブジェクト処理に失敗しました',
              metadata: { object_type: objectMetadata.object_type },
            });

            return result;
          }
        }
      }
    }

    // 承認済みステータスのIDを取得
    const { data: approvedStatus, error: statusError } = await supabase
      .from('statuses')
      .select('id')
      .eq('code', 'approved')
      .eq('category', 'request')
      .single();

    if (statusError || !approvedStatus) {
      console.error('承認済みステータス取得エラー:', statusError);
      return {
        success: false,
        message: '承認済みステータスの取得に失敗しました',
        error: statusError?.message,
      };
    }

    // 申請ステータスを更新（approved_by, approved_at も設定）
    const { error: updateError } = await supabase
      .from('requests')
      .update({
        status_id: approvedStatus.id, // 承認済みステータスID
        approved_by: approverId,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (updateError) {
      // システムログ: データベースエラー
      await logSystem('error', '申請承認時のデータベースエラー', {
        feature_name: 'request_management',
        action_type: 'approve_request',
        user_id: approverId,
        resource_id: requestId,
        error_message: updateError.message,
      });

      console.error('申請更新エラー:', updateError);
      return {
        success: false,
        message: '申請の更新に失敗しました',
        error: updateError.message,
      };
    }

    // システムログ: 成功
    await logSystem('info', '申請承認成功', {
      feature_name: 'request_management',
      action_type: 'approve_request',
      user_id: approverId,
      resource_id: requestId,
      metadata: {
        request_form_id: request.request_form_id,
        object_type: requestForm.object_config?.object_type || null,
      },
    });

    // 監査ログを記録
    const clientInfo = await getClientInfo();
    try {
      // ユーザーの企業IDを取得
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', request.user_id)
        .single();

      let companyId: string | undefined;
      if (userProfile) {
        const { data: userGroup } = await supabase
          .from('user_groups')
          .select('groups(company_id)')
          .eq('user_id', request.user_id)
          .is('deleted_at', null)
          .single();
        companyId = userGroup?.groups?.[0]?.company_id;
      }

      await logAudit('request_approved', {
        user_id: approverId,
        company_id: companyId,
        target_type: 'requests',
        target_id: requestId,
        before_data: request,
        after_data: { ...request, status_id: 'approved' },
        details: {
          action_type: 'approve',
          approver_id: approverId,
          comment: comment || null,
          request_form_id: request.request_form_id,
        },
        ip_address: clientInfo.ip_address,
        user_agent: clientInfo.user_agent,
        session_id: clientInfo.session_id,
      });
      console.log('監査ログ記録完了: request_approved');
    } catch (error) {
      console.error('監査ログ記録エラー:', error);
      // システムログ: 監査ログ記録エラー
      await logSystem('error', '申請承認時の監査ログ記録エラー', {
        feature_name: 'request_management',
        action_type: 'approve_request',
        user_id: approverId,
        resource_id: requestId,
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // プッシュ通知を送信
    try {
      console.log('プッシュ通知送信開始:', { requestId, requesterId: request.user_id });
      await sendRequestStatusNotification(requestId, request.user_id, request.title, 'approved');
      console.log('プッシュ通知送信完了');
    } catch (pushError) {
      console.error('プッシュ通知送信エラー:', pushError);
      // プッシュ通知の失敗は承認の成功を妨げない
    }

    console.log('approveRequest 成功');
    revalidatePath('/admin/requests');
    revalidatePath('/member/requests');

    return {
      success: true,
      message: '申請を承認しました',
    };
  } catch (error) {
    // システムログ: 予期しないエラー
    await logSystem('error', '申請承認時の予期しないエラー', {
      feature_name: 'request_management',
      action_type: 'approve_request',
      user_id: approverId,
      resource_id: requestId,
      error_message: error instanceof Error ? error.message : 'Unknown error',
      error_stack: error instanceof Error ? error.stack : undefined,
    });

    console.error('approveRequest エラー:', error);
    return {
      success: false,
      message: '申請の承認に失敗しました',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * attendanceオブジェクトの承認処理
 */
async function handleAttendanceObjectApproval(
  request: Request,
  field: string,
  metadata: ObjectMetadata,
  approverId: string
): Promise<{ success: boolean; message: string; error?: string }> {
  console.log('handleAttendanceObjectApproval 開始');

  try {
    const supabaseAdmin = createAdminClient();
    // Create a mutable copy of form_data to potentially add work_date for validation
    const mutableFormData = { ...request.form_data };

    // デバッグログを追加
    console.log('handleAttendanceObjectApproval デバッグ:', {
      formData: mutableFormData,
      work_date_from_form: mutableFormData?.work_date,
      target_date_from_request: request.target_date,
      formData_keys: mutableFormData ? Object.keys(mutableFormData) : [],
    });

    // Determine workDate and ensure it's in mutableFormData for validation
    let workDate = mutableFormData?.work_date;
    if (!workDate && request.target_date) {
      workDate = request.target_date;
      mutableFormData.work_date = workDate; // Add work_date to the mutable copy
    }

    // バリデーション
    if (metadata.validation_rules) {
      const validationResult = validateAttendanceObject(mutableFormData, metadata.validation_rules);
      if (!validationResult.isValid) {
        return {
          success: false,
          message: 'データの検証に失敗しました',
          error: validationResult.errors.join(', '),
        };
      }
    }

    // 既存のattendanceレコードを検索
    // 対象日（target_date）を勤務日（work_date）として使用

    console.log('workDate 設定結果:', {
      workDate,
      formData_work_date: mutableFormData?.work_date,
      request_target_date: request.target_date,
      final_work_date: workDate,
    });

    if (!workDate) {
      return {
        success: false,
        message: '勤務日が設定されていません',
        error: '対象日または勤務日が必須です',
      };
    }
    const userId = request.user_id;

    const { data: existingAttendance, error: searchError } = await supabaseAdmin
      .from('attendances')
      .select('*')
      .eq('user_id', userId)
      .eq('work_date', workDate)
      .eq('is_current', true)
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

    // 申請側のclock_recordsを抽出・正規化（attendance_correction または clock_records）
    const rootForm = mutableFormData as Record<string, unknown>;
    const rawCandidate: unknown = Array.isArray(rootForm.clock_records)
      ? (rootForm.clock_records as unknown)
      : Array.isArray(rootForm.attendance_correction)
        ? (rootForm.attendance_correction as unknown)
        : [];
    const arr = rawCandidate as unknown[];
    const proposedForExisting: ClockRecord[] = Array.isArray(arr)
      ? (arr
          .map((rec) => {
            const r = rec as Record<string, unknown>;
            const in_time = typeof r.in_time === 'string' ? r.in_time : undefined;
            const out_time = typeof r.out_time === 'string' ? r.out_time : undefined;
            const breaksRaw = Array.isArray(r.breaks) ? (r.breaks as unknown[]) : [];
            const breaks = breaksRaw
              .map((b) => {
                const br = b as Record<string, unknown>;
                const break_start = typeof br.break_start === 'string' ? br.break_start : undefined;
                const break_end = typeof br.break_end === 'string' ? br.break_end : undefined;
                return break_start || break_end
                  ? { break_start: break_start || '', break_end: break_end || '' }
                  : null;
              })
              .filter(Boolean) as { break_start: string; break_end: string }[];
            return in_time || out_time ? ({ in_time, out_time, breaks } as ClockRecord) : null;
          })
          .filter(Boolean) as ClockRecord[])
      : [];

    // 既存が無い場合は新規作成として扱う
    const hasExisting = !!existingAttendance;

    if (hasExisting) {
      // 既存のレコードを非アクティブにする（is_current = false）
      const { error: deactivateError } = await supabaseAdmin
        .from('attendances')
        .update({ is_current: false })
        .eq('id', existingAttendance!.id);

      if (deactivateError) {
        console.error('既存レコード非アクティブ化エラー:', deactivateError);
        return {
          success: false,
          message: '勤怠記録の更新に失敗しました',
          error: deactivateError.message,
        };
      }
    }

    // 既存レコードがある場合は updateAttendance を使用して編集履歴・is_current を安全に更新
    if (existingAttendance?.id) {
      const { updateAttendance } = await import('@/lib/actions/attendance');

      const updateResult = await updateAttendance(
        existingAttendance.id,
        {
          clock_records: proposedForExisting,
          edit_reason: `申請による修正 (申請ID: ${request.id})`,
          approved_by: approverId,
          approved_at: new Date().toISOString(),
          description: existingAttendance?.description || undefined,
          work_type_id: existingAttendance?.work_type_id || undefined,
        },
        approverId
      );

      if (!updateResult.success) {
        console.error('updateAttendance 実行エラー:', updateResult.error);
        return {
          success: false,
          message: '勤怠記録の更新に失敗しました',
          error: updateResult.error,
        };
      }

      return { success: true, message: '勤怠を更新しました' };
    }

    // 既存が無い場合は新規作成データを用意
    // 申請データから clock_records を抽出（attendance_correction または clock_records）
    const proposedClockRecords: ClockRecord[] = proposedForExisting;

    // work_type_id は既存レコードが無い場合、申請者の現在の勤務タイプを採用
    let workTypeId: string | null = existingAttendance?.work_type_id || null;
    if (!workTypeId) {
      try {
        const { getUserWorkType } = await import('@/lib/actions/attendance');
        const wt = await getUserWorkType(userId);
        workTypeId = wt || null;
      } catch (e) {
        console.warn('getUserWorkType 呼び出しに失敗:', e);
      }
    }

    // 自動計算（actual_work_minutes / overtime_minutes / late_minutes / early_leave_minutes）
    let actualWorkMinutes: number | null = null;
    let overtimeMinutes: number | null = null;
    let lateMinutes: number | null = null;
    let earlyLeaveMinutes: number | null = null;

    try {
      if (proposedClockRecords.length > 0) {
        // 実働分の合計
        const totalActual = proposedClockRecords.reduce((sum, sess) => {
          if (!sess?.in_time || !sess?.out_time) return sum;
          const inT = new Date(sess.in_time).getTime();
          const outT = new Date(sess.out_time).getTime();
          if (isNaN(inT) || isNaN(outT) || outT <= inT) return sum;
          const base = Math.floor((outT - inT) / 60000);
          const breakMinutes = (sess.breaks || []).reduce((b, br) => {
            if (!br?.break_start || !br?.break_end) return b;
            const bs = new Date(br.break_start).getTime();
            const be = new Date(br.break_end).getTime();
            if (isNaN(bs) || isNaN(be) || be <= bs) return b;
            return b + Math.floor((be - bs) / 60000);
          }, 0);
          return sum + Math.max(0, base - breakMinutes);
        }, 0);

        actualWorkMinutes = totalActual;

        // 残業閾値を取得して残業分を計算（デフォルト480分）
        let overtimeThreshold = 480;
        if (workTypeId) {
          const { data: wt, error: wtErr } = await supabaseAdmin
            .from('work_types')
            .select('overtime_threshold_minutes, work_start_time, work_end_time')
            .eq('id', workTypeId)
            .is('deleted_at', null)
            .single();
          if (!wtErr && wt?.overtime_threshold_minutes) {
            overtimeThreshold = wt.overtime_threshold_minutes;
          }

          // 遅刻・早退計算
          try {
            const day = new Date(`${workDate}T00:00:00Z`);
            // 開始予定
            let scheduledStart: Date | null = null;
            const wtStartStr = (wt as { work_start_time?: string } | null)?.work_start_time || null;
            if (wtStartStr) {
              const [hh, mm, ss] = wtStartStr.split(':').map((v) => parseInt(v, 10));
              const d = new Date(day);
              d.setUTCHours(hh || 0, mm || 0, ss || 0, 0);
              scheduledStart = d;
            }
            // 終了予定
            let scheduledEnd: Date | null = null;
            const wtEndStr = (wt as { work_end_time?: string } | null)?.work_end_time || null;
            if (wtEndStr) {
              const [hh, mm, ss] = wtEndStr.split(':').map((v) => parseInt(v, 10));
              const d = new Date(day);
              d.setUTCHours(hh || 0, mm || 0, ss || 0, 0);
              scheduledEnd = d;
            }

            const earliestIn = proposedClockRecords.find((s) => s?.in_time)?.in_time
              ? new Date(proposedClockRecords.find((s) => s?.in_time)!.in_time!)
              : null;
            const lastWithOut = [...proposedClockRecords].reverse().find((s) => s?.out_time);
            const latestOut = lastWithOut?.out_time ? new Date(lastWithOut.out_time) : null;

            if (scheduledStart && earliestIn) {
              const diff = Math.floor((earliestIn.getTime() - scheduledStart.getTime()) / 60000);
              lateMinutes = diff > 0 ? diff : 0;
            }
            if (scheduledEnd && latestOut) {
              const diff = Math.floor((scheduledEnd.getTime() - latestOut.getTime()) / 60000);
              earlyLeaveMinutes = diff > 0 ? diff : 0;
            }
          } catch (e) {
            console.warn('遅刻/早退計算で例外:', e);
          }
        }

        overtimeMinutes = Math.max(0, (actualWorkMinutes || 0) - overtimeThreshold);
      }
    } catch (e) {
      console.warn('勤怠自動計算に失敗:', e);
    }

    const newRecordData: Record<string, unknown> = {
      user_id: userId,
      work_date: workDate,
      work_type_id: workTypeId,
      description: existingAttendance?.description || null,
      approved_by: approverId,
      approved_at: new Date().toISOString(),
      source_id: null,
      edit_reason: `申請による修正 (申請ID: ${request.id})`,
      edited_by: approverId,
      attendance_status_id: existingAttendance?.attendance_status_id || null,
      clock_records: proposedClockRecords,
      actual_work_minutes: actualWorkMinutes,
      overtime_minutes: overtimeMinutes,
      late_minutes: lateMinutes,
      early_leave_minutes: earlyLeaveMinutes,
      is_current: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 勤務時間の自動計算（clock_recordsが更新された場合）
    if (
      mutableFormData.clock_records &&
      Array.isArray(mutableFormData.clock_records) &&
      mutableFormData.clock_records.length > 0
    ) {
      const last = mutableFormData.clock_records[
        mutableFormData.clock_records.length - 1
      ] as unknown;
      const latestSession = (last || {}) as ClockRecord;
      if (latestSession.in_time && latestSession.out_time) {
        const { actualWorkMinutes, overtimeMinutes } = await calculateWorkTime(
          latestSession.in_time,
          latestSession.out_time,
          latestSession.breaks || [],
          existingAttendance?.work_type_id
        );
        newRecordData.actual_work_minutes = actualWorkMinutes;
        newRecordData.overtime_minutes = overtimeMinutes;
      }
    }

    // 新しいレコードを作成
    const { data: newRecord, error: createError } = await supabaseAdmin
      .from('attendances')
      .insert(newRecordData)
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

    // 監査ログを記録
    try {
      const clientInfo = await getClientInfo();

      // ユーザーの企業IDを取得
      const { data: userProfile } = await supabaseAdmin
        .from('user_profiles')
        .select('id')
        .eq('id', userId)
        .single();

      let companyId: string | undefined;
      if (userProfile) {
        const { data: userGroup } = await supabaseAdmin
          .from('user_groups')
          .select('groups(company_id)')
          .eq('user_id', userId)
          .is('deleted_at', null)
          .single();
        companyId = userGroup?.groups?.[0]?.company_id;
      }

      await logAudit('attendance_updated', {
        user_id: userId,
        company_id: companyId || undefined,
        target_type: 'attendances',
        target_id: newRecord.id,
        before_data: existingAttendance || undefined,
        after_data: newRecord,
        details: {
          action_type: 'request_approval',
          updated_fields: ['clock_records'],
          approved_by: approverId,
          approved_at: new Date().toISOString(),
          source_id: existingAttendance?.id || null,
          edit_reason: `申請による修正 (申請ID: ${request.id})`,
          request_id: request.id,
        },
        ip_address: clientInfo.ip_address,
        user_agent: clientInfo.user_agent,
        session_id: clientInfo.session_id,
      });
      console.log('監査ログ記録完了: attendance_updated (request_approval)');
    } catch (error) {
      console.error('監査ログ記録エラー:', error);
    }

    console.log('attendanceオブジェクト承認処理成功:', newRecord);
    return { success: true, message: '勤怠記録を更新しました' };
  } catch (error) {
    console.error('handleAttendanceObjectApproval エラー:', error);
    return {
      success: false,
      message: '勤怠記録の更新に失敗しました',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// （未使用の旧実装は削除）

/**
 * 申請を更新する
 */
export async function updateRequest(
  requestId: string,
  updateData: {
    form_data?: Record<string, unknown>;
    target_date?: string | null;
    start_date?: string | null;
    end_date?: string | null;
  },
  currentUserId?: string
): Promise<UpdateRequestResult> {
  console.log('updateRequest 開始', { requestId, updateData });

  // システムログ: 開始
  await logSystem('info', '申請更新開始', {
    feature_name: 'request_management',
    action_type: 'update_request',
    user_id: currentUserId,
    resource_id: requestId,
    metadata: {
      updated_fields: Object.keys(updateData),
    },
  });

  try {
    const supabase = createAdminClient();

    // 申請が下書き状態かチェック
    const { data: request, error: fetchError } = await supabase
      .from('requests')
      .select(
        `
        user_id, 
        status_id, 
        statuses!requests_status_id_fkey(code)
      `
      )
      .eq('id', requestId)
      .single();

    if (fetchError) {
      // システムログ: 申請取得エラー
      await logSystem('error', '申請更新時の申請取得エラー', {
        feature_name: 'request_management',
        action_type: 'update_request',
        user_id: currentUserId,
        resource_id: requestId,
        error_message: fetchError.message,
      });

      console.error('申請取得エラー:', fetchError);
      return {
        success: false,
        message: '申請の取得に失敗しました',
        error: fetchError.message,
      };
    }

    if ((request.statuses as unknown as { code: string })?.code !== 'draft') {
      // システムログ: ステータスエラー
      await logSystem('warn', '申請更新時のステータスエラー', {
        feature_name: 'request_management',
        action_type: 'update_request',
        user_id: currentUserId,
        resource_id: requestId,
        error_message: '下書き状態の申請のみ編集可能です',
        metadata: { current_status: (request.statuses as unknown as { code: string })?.code },
      });

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
      // システムログ: データベースエラー
      await logSystem('error', '申請更新時のデータベースエラー', {
        feature_name: 'request_management',
        action_type: 'update_request',
        user_id: currentUserId,
        resource_id: requestId,
        error_message: updateError.message,
      });

      console.error('申請更新エラー:', updateError);
      return {
        success: false,
        message: '申請の更新に失敗しました',
        error: updateError.message,
      };
    }

    console.log('申請更新成功');

    // システムログ: 成功
    await logSystem('info', '申請更新成功', {
      feature_name: 'request_management',
      action_type: 'update_request',
      user_id: currentUserId,
      resource_id: requestId,
      metadata: {
        updated_fields: Object.keys(updateData),
      },
    });

    // 監査ログを記録
    if (currentUserId) {
      const clientInfo = await getClientInfo();
      try {
        // ユーザーの企業IDを取得
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('id', request.user_id)
          .single();

        let companyId: string | undefined;
        if (userProfile) {
          const { data: userGroup } = await supabase
            .from('user_groups')
            .select('groups(company_id)')
            .eq('user_id', request.user_id)
            .is('deleted_at', null)
            .single();
          companyId = userGroup?.groups?.[0]?.company_id;
        }

        await logAudit('request_updated', {
          user_id: currentUserId,
          company_id: companyId,
          target_type: 'requests',
          target_id: requestId,
          before_data: { user_id: request.user_id, status_id: request.status_id },
          after_data: { user_id: request.user_id, status_id: request.status_id, ...updateData },
          details: {
            action_type: 'edit',
            updated_fields: Object.keys(updateData),
          },
          ip_address: clientInfo.ip_address,
          user_agent: clientInfo.user_agent,
          session_id: clientInfo.session_id,
        });
        console.log('監査ログ記録完了: request_updated');
      } catch (error) {
        console.error('監査ログ記録エラー:', error);
      }
    } else {
      console.log('現在のユーザーIDが提供されていないため、監査ログを記録しません');
    }

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
}

/**
 * 申請を削除する（論理削除）
 */
export async function deleteRequest(
  requestId: string,
  currentUserId?: string
): Promise<{ success: boolean; message: string; error?: string }> {
  console.log('deleteRequest 開始:', { requestId });

  // システムログ: 開始
  await logSystem('info', '申請削除開始', {
    feature_name: 'request_management',
    action_type: 'delete_request',
    user_id: currentUserId,
    resource_id: requestId,
  });

  try {
    const supabase = createAdminClient();

    // 申請の存在確認とステータスチェック
    const { data: request, error: fetchError } = await supabase
      .from('requests')
      .select('user_id, status_id, deleted_at, statuses!requests_status_id_fkey(code)')
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

    if (!request) {
      return {
        success: false,
        message: '申請が見つかりません',
        error: 'NOT_FOUND',
      };
    }

    // 既に削除済みの申請の場合
    if (request.deleted_at) {
      return {
        success: false,
        message: 'この申請は既に削除されています',
        error: 'ALREADY_DELETED',
      };
    }

    // 下書き状態または承認待ち状態の申請のみ削除可能
    const statusCode = (request.statuses as unknown as { code: string })?.code;
    if (statusCode !== 'draft' && statusCode !== 'pending') {
      return {
        success: false,
        message: '下書き状態または承認待ち状態の申請のみ削除可能です',
        error: 'Invalid status for deletion',
      };
    }

    // 論理削除
    const { error: deleteError } = await supabase
      .from('requests')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', requestId);

    if (deleteError) {
      console.error('申請削除エラー:', deleteError);
      return {
        success: false,
        message: '申請の削除に失敗しました',
        error: deleteError.message,
      };
    }

    console.log('申請削除成功:', requestId);

    // 監査ログを記録
    if (currentUserId) {
      const clientInfo = await getClientInfo();
      try {
        // ユーザーの企業IDを取得
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('id', request.user_id)
          .single();

        let companyId: string | undefined;
        if (userProfile) {
          const { data: userGroup } = await supabase
            .from('user_groups')
            .select('groups(company_id)')
            .eq('user_id', request.user_id)
            .is('deleted_at', null)
            .single();
          companyId = userGroup?.groups?.[0]?.company_id;
        }

        await logAudit('request_deleted', {
          user_id: currentUserId,
          company_id: companyId,
          target_type: 'requests',
          target_id: requestId,
          before_data: { user_id: request.user_id, status_id: request.status_id },
          after_data: undefined,
          details: {
            action_type: 'logical_delete',
            deleted_at: new Date().toISOString(),
            user_id: request.user_id,
          },
          ip_address: clientInfo.ip_address,
          user_agent: clientInfo.user_agent,
          session_id: clientInfo.session_id,
        });
        console.log('監査ログ記録完了: request_deleted');
      } catch (error) {
        console.error('監査ログ記録エラー:', error);
      }
    } else {
      console.log('現在のユーザーIDが提供されていないため、監査ログを記録しません');
    }

    return {
      success: true,
      message: '申請を削除しました',
    };
  } catch (error) {
    console.error('deleteRequest エラー:', error);
    return {
      success: false,
      message: '申請の削除に失敗しました',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 現在有効な勤怠レコードを取得（管理者用）
 */
export async function getCurrentAttendance(
  userId: string,
  workDate: string
): Promise<{
  success: boolean;
  data?: { clock_records: ClockRecord[] };
  notFound?: boolean;
  error?: string;
}> {
  try {
    const supabase = createAdminClient();

    const {
      data,
      error,
    }: {
      data: { clock_records: unknown } | null;
      error: { code?: string; message?: string } | null;
    } = await supabase
      .from('attendances')
      .select('clock_records')
      .eq('user_id', userId)
      .eq('work_date', workDate)
      .eq('is_current', true)
      .is('deleted_at', null)
      .single();

    if (error?.code === 'PGRST116' || !data) {
      return { success: true, notFound: true };
    }
    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: { clock_records: (data.clock_records || []) as ClockRecord[] } };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Unknown error',
    };
  }
}
