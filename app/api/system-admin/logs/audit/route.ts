import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const userId = searchParams.get('user_id');
    const companyId = searchParams.get('company_id');
    const search = searchParams.get('search');

    const supabase = createAdminClient();

    let query = supabase
      .from('audit_logs')
      .select(
        `
        *,
        user_profiles!audit_logs_user_id_fkey(
          id,
          family_name,
          first_name
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

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    if (search) {
      query = query.or(`action.ilike.%${search}%,target_type.ilike.%${search}%`);
    }

    // ページネーション
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json(
        { error: `Failed to fetch audit logs: ${error.message}` },
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
    console.error('Error fetching audit logs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
