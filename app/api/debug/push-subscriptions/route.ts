import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();

    // プッシュ購読情報を取得
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('Failed to get push subscriptions:', error);
      return NextResponse.json({ error: 'Failed to get subscriptions' }, { status: 500 });
    }

    // ユーザー情報も取得
    const { data: users, error: userError } = await supabase
      .from('user_profiles')
      .select('id, email, name, role');

    if (userError) {
      console.error('Failed to get users:', userError);
      return NextResponse.json({ error: 'Failed to get users' }, { status: 500 });
    }

    // 購読情報とユーザー情報を結合
    const subscriptionsWithUsers = subscriptions?.map((sub: any) => {
      const user = users?.find((u: any) => u.id === sub.user_id);
      return {
        ...sub,
        user: user ? { id: user.id, email: user.email, name: user.name, role: user.role } : null,
      };
    });

    return NextResponse.json({
      subscriptions: subscriptionsWithUsers,
      total: subscriptions?.length || 0,
      active: subscriptions?.filter((s: any) => s.is_active).length || 0,
    });
  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
