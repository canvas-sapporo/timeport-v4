'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

import { createServerClient, createAdminClient } from '@/lib/supabase';
import { validateAttendanceObject } from '@/lib/utils/attendance-validation';
import { logAudit } from '@/lib/utils/log-system';
import type {
  RequestForm,
  ObjectMetadata,
  RequestData as Request,
  GetRequestsResult,
  UpdateRequestResult,
  ApproveRequestResult,
} from '@/schemas/request';

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
  },
  currentUserId?: string
): Promise<{ success: boolean; message: string; data?: any; error?: string }> {
  console.log('createRequest Server Action: 開始', { requestData, currentUserId });

  try {
    const supabase = createAdminClient();

    // デフォルトステータスを取得
    const { data: defaultStatus, error: statusError } = await supabase
      .from('statuses')
      .select('id')
      .eq('code', 'draft')
      .eq('category', 'request')
      .single();

    if (statusError || !defaultStatus) {
      console.error('デフォルトステータス取得エラー:', statusError);
      return {
        success: false,
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
      console.error('申請作成エラー:', error);
      return {
        success: false,
        error: error?.message || '申請の作成に失敗しました',
      };
    }

    console.log('申請作成成功:', data);

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
          companyId = userGroup?.groups?.company_id;
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
      }
    } else {
      console.log('現在のユーザーIDが提供されていないため、監査ログを記録しません');
    }

    // キャッシュを再検証
    revalidatePath('/member/requests');

    return {
      success: true,
      message: '申請を提出しました',
      data,
    };
  } catch (error) {
    console.error('createRequest Server Action エラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '不明なエラーが発生しました',
    };
  }
}

/**
 * 申請データを取得する（メンバー用）
 */
export async function getRequests(userId?: string): Promise<GetRequestsResult> {
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
}

/**
 * 管理者用の申請データを取得する
 */
export async function getAdminRequests(): Promise<GetRequestsResult> {
  console.log('getAdminRequests: 開始');

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
          id,
          name,
          description,
          form_config,
          approval_flow,
          category
        )
      `
      )
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

  try {
    const supabase = createAdminClient();

    // 現在の申請データを確認
    const { data: currentRequest, error: currentError } = await supabase
      .from('requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (currentError || !currentRequest) {
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
          companyId = userGroup?.groups?.company_id;
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
            comment: comment,
          },
          ip_address: clientInfo.ip_address,
          user_agent: clientInfo.user_agent,
          session_id: clientInfo.session_id,
        });
        console.log('監査ログ記録完了: request_status_updated');
      } catch (error) {
        console.error('監査ログ記録エラー:', error);
      }
    } else {
      console.log('現在のユーザーIDが提供されていないため、監査ログを記録しません');
    }

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

  try {
    const supabase = createServerClient();

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
        const objectFields = requestForm.form_config.filter((field) => field.type === 'object');

        for (const field of objectFields) {
          const result = await handleAttendanceObjectApproval(
            request,
            field.name,
            objectMetadata,
            approverId
          );
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
        companyId = userGroup?.groups?.company_id;
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
          comment: comment,
          request_form_id: request.request_form_id,
        },
        ip_address: clientInfo.ip_address,
        user_agent: clientInfo.user_agent,
        session_id: clientInfo.session_id,
      });
      console.log('監査ログ記録完了: request_approved');
    } catch (error) {
      console.error('監査ログ記録エラー:', error);
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
}

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

  try {
    const supabase = createServerClient();

    // 申請が下書き状態かチェック
    const { data: request, error: fetchError } = await supabase
      .from('requests')
      .select('user_id, status_id, statuses!requests_status_id_fkey(code)')
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

    if ((request.statuses as unknown as { code: string })?.code !== 'draft') {
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
          companyId = userGroup?.groups?.company_id;
        }

        await logAudit('request_updated', {
          user_id: currentUserId,
          company_id: companyId,
          target_type: 'requests',
          target_id: requestId,
          before_data: request,
          after_data: { ...request, ...updateData },
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

  try {
    const supabase = createServerClient();

    // 申請の存在確認とステータスチェック
    const { data: request, error: fetchError } = await supabase
      .from('requests')
      .select('user_id, status_id, statuses!requests_status_id_fkey(code)')
      .eq('id', requestId)
      .is('deleted_at', null)
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

    // 下書き状態の申請のみ削除可能
    if ((request.statuses as unknown as { code: string })?.code !== 'draft') {
      return {
        success: false,
        message: '下書き状態の申請のみ削除可能です',
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
          companyId = userGroup?.groups?.company_id;
        }

        await logAudit('request_deleted', {
          user_id: currentUserId,
          company_id: companyId,
          target_type: 'requests',
          target_id: requestId,
          before_data: request,
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
