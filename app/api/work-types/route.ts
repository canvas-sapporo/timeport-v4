import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { withErrorHandling } from '@/lib/utils/error-handling';
import { AppError } from '@/lib/utils/error-handling';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId is required' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // 勤務形態一覧を取得
    const { data, error } = await supabase
      .from('work_types')
      .select('*')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) {
      throw AppError.fromSupabaseError(error, '勤務形態一覧取得');
    }

    return NextResponse.json({
      success: true,
      data: {
        work_types: data || [],
        pagination: {
          page,
          limit,
          total: data?.length || 0
        }
      },
    });
  } catch (error) {
    console.error('勤務形態一覧取得エラー:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        data: {
          work_types: [],
          pagination: {
            page: 1,
            limit: 10,
            total: 0
          }
        }
      },
      { status: 500 }
    );
  }
} 