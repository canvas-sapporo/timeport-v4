import { NextRequest, NextResponse } from 'next/server';

import { logSystem, logAudit, getMemoryUsage, generateTraceId } from '@/lib/utils/log-system';
import { createAdminClient } from '@/lib/supabase';

// ================================
// ログミドルウェア
// ================================

export async function loggingMiddleware(request: NextRequest, next: () => Promise<NextResponse>) {
  const startTime = Date.now();
  const startMemory = getMemoryUsage();
  const traceId = generateTraceId();

  // リクエスト情報を取得
  const url = new URL(request.url);
  const method = request.method;
  const path = url.pathname;
  const host = url.host;
  const userAgent = request.headers.get('user-agent') || '';
  const referer = request.headers.get('referer') || '';
  const ipAddress = getClientIP(request);

  // リクエストサイズを取得
  const requestSize = await getRequestSize(request);

  try {
    // ユーザー情報を取得
    const supabase = createAdminClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // リクエスト開始ログ
    await logSystem('info', 'API Request Started', {
      trace_id: traceId,
      host,
      method,
      path,
      ip_address: ipAddress,
      user_agent: userAgent,
      referer,
      request_size_bytes: requestSize,
      memory_usage_mb: startMemory,
      user_id: user?.id,
      environment: process.env.NODE_ENV,
      app_version: process.env.npm_package_version,
      metadata: {
        url: request.url,
        headers: Object.fromEntries(request.headers.entries()),
      },
    });

    // 次のミドルウェアまたはハンドラーを実行
    const response = await next();

    // レスポンス情報を取得
    const endTime = Date.now();
    const endMemory = getMemoryUsage();
    const responseTime = endTime - startTime;
    const statusCode = response.status;
    const responseSize = await getResponseSize(response);

    // レスポンス終了ログ
    await logSystem('info', 'API Request Completed', {
      trace_id: traceId,
      host,
      method,
      path,
      status_code: statusCode,
      response_time_ms: responseTime,
      response_size_bytes: responseSize,
      memory_usage_mb: endMemory,
      user_id: user?.id,
      environment: process.env.NODE_ENV,
      app_version: process.env.npm_package_version,
      metadata: {
        response_headers: Object.fromEntries(response.headers.entries()),
      },
    });

    // エラーレスポンスの場合はエラーログも記録
    if (statusCode >= 400) {
      await logSystem('error', 'API Request Failed', {
        trace_id: traceId,
        host,
        method,
        path,
        status_code: statusCode,
        response_time_ms: responseTime,
        user_id: user?.id,
        environment: process.env.NODE_ENV,
        app_version: process.env.npm_package_version,
        metadata: {
          error_type: 'http_error',
          status_text: response.statusText,
        },
      });
    }

    return response;
  } catch (error) {
    // エラーが発生した場合
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    await logSystem('error', 'API Request Error', {
      trace_id: traceId,
      host,
      method,
      path,
      response_time_ms: responseTime,
      error_message: error instanceof Error ? error.message : 'Unknown error',
      error_stack: error instanceof Error ? error.stack : undefined,
      environment: process.env.NODE_ENV,
      app_version: process.env.npm_package_version,
      metadata: {
        error_type: 'unhandled_error',
      },
    });

    // エラーを再スロー
    throw error;
  }
}

// ================================
// ヘルパー関数
// ================================

/**
 * クライアントIPを取得
 */
function getClientIP(request: NextRequest): string {
  // X-Forwarded-Forヘッダーから取得
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  // X-Real-IPヘッダーから取得
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // デフォルト
  return 'unknown';
}

/**
 * リクエストサイズを取得
 */
async function getRequestSize(request: NextRequest): Promise<number> {
  try {
    const contentLength = request.headers.get('content-length');
    if (contentLength) {
      return parseInt(contentLength, 10);
    }

    // ボディサイズを計算
    const body = await request.text();
    return new TextEncoder().encode(body).length;
  } catch {
    return 0;
  }
}

/**
 * レスポンスサイズを取得
 */
async function getResponseSize(response: NextResponse): Promise<number> {
  try {
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      return parseInt(contentLength, 10);
    }

    // ボディサイズを計算
    const body = await response.text();
    return new TextEncoder().encode(body).length;
  } catch {
    return 0;
  }
}

// ================================
// 監査ログ用ヘルパー
// ================================

/**
 * 監査ログを記録（ユーザー操作）
 */
export async function logUserAction(
  action: string,
  targetType?: string,
  targetId?: string,
  beforeData?: any,
  afterData?: any,
  details?: any
) {
  try {
    const supabase = createAdminClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    // ユーザープロファイルを取得
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    await logAudit(action, {
      user_id: user.id,
      company_id: profile?.company_id,
      target_type: targetType,
      target_id: targetId,
      before_data: beforeData,
      after_data: afterData,
      details,
      session_id: user.id, // 簡易的なセッションID
    });
  } catch (error) {
    console.error('Failed to log user action:', error);
  }
}

/**
 * データベース操作の監査ログ
 */
export async function logDatabaseOperation(
  operation: 'create' | 'update' | 'delete' | 'read',
  table: string,
  recordId?: string,
  beforeData?: any,
  afterData?: any
) {
  await logUserAction(`database_${operation}`, table, recordId, beforeData, afterData, {
    operation,
    table,
  });
}
