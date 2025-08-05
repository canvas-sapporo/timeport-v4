import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase';

// プッシュ購読データの型定義
interface PushSubscriptionData {
  user_id: string;
  subscription_data: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
  is_active: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();

    // プッシュ購読情報を取得
    const { data, error } = await supabase
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
    const subscriptionsWithUsers = data?.map((sub: PushSubscriptionData) => {
      const user = users?.find(
        (u: { id: string; email: string; name: string; role: string }) => u.id === sub.user_id
      );
      return {
        id: sub.user_id,
        endpoint: sub.subscription_data.endpoint,
        is_active: sub.is_active,
        user: user ? { id: user.id, email: user.email, name: user.name, role: user.role } : null,
      };
    });

    return NextResponse.json({
      subscriptions: subscriptionsWithUsers,
      total: data?.length || 0,
      active: data?.filter((s: PushSubscriptionData) => s.is_active).length || 0,
    });
  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
