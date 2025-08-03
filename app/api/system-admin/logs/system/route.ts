import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const levels = searchParams.get('levels')?.split(',');
    const userId = searchParams.get('user_id');
    const companyId = searchParams.get('company_id');
    const path = searchParams.get('path');
    const featureName = searchParams.get('feature_name');
    const errorsOnly = searchParams.get('errors_only') === 'true';
    const search = searchParams.get('search');

    const supabase = createAdminClient();

    let query = supabase
      .from('system_logs')
      .select(
        `
        *,
        user_profiles!system_logs_user_id_fkey (
          id,
          family_name,
          first_name
        ),
        companies!system_logs_company_id_fkey (
          id,
          name
        )
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false });

    // フィルター適用
    if (startDate) {
      query = query.gte('created_date', startDate);
    }

    if (endDate) {
      query = query.lte('created_date', endDate);
    }

    if (levels && levels.length > 0) {
      query = query.in('level', levels);
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    if (path) {
      query = query.ilike('path', `%${path}%`);
    }

    if (featureName) {
      query = query.ilike('feature_name', `%${featureName}%`);
    }

    if (errorsOnly) {
      query = query.not('error_message', 'is', null);
    }

    if (search) {
      query = query.or(`error_message.ilike.%${search}%,metadata->>'message'.ilike.%${search}%`);
    }

    // ページネーション
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json(
        { error: `Failed to fetch system logs: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('Error fetching system logs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
