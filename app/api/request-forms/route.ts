import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { withErrorHandling } from '@/lib/utils/error-handling';
import { AppError } from '@/lib/utils/error-handling';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    // 申請フォーム一覧を取得（論理削除されていないもの）
    const { data, error } = await supabase
      .from('request_forms')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw AppError.fromSupabaseError(error, '申請フォーム一覧取得');
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error('申請フォーム一覧取得エラー:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        data: []
      },
      { status: 500 }
    );
  }
} 