import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { withErrorHandling } from '@/lib/utils/error-handling';
import { AppError } from '@/lib/utils/error-handling';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    const supabase = createServerSupabaseClient();

    let query = supabase
      .from('requests')
      .select(`
        *,
        request_forms (
          name,
          category
        ),
        user_profiles (
          family_name,
          first_name
        )
      `)
      .order('created_at', { ascending: false });

    // ユーザーIDが指定されている場合はフィルタリング
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      throw AppError.fromSupabaseError(error, '申請データ一覧取得');
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error('申請データ一覧取得エラー:', error);
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user_id,
      request_form_id,
      title,
      form_data,
      target_date,
      start_date,
      end_date,
      submission_comment,
    } = body;

    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from('requests')
      .insert({
        user_id,
        request_form_id,
        title,
        form_data,
        target_date,
        start_date,
        end_date,
        submission_comment,
        status_id: 'pending',
      })
      .select()
      .single();

    if (error) {
      throw AppError.fromSupabaseError(error, '申請作成');
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('申請作成エラー:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        data: null
      },
      { status: 500 }
    );
  }
} 