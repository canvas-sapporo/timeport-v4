import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export interface ServerUser {
  id: string;
  role: 'system-admin' | 'admin' | 'member';
  full_name: string;
  company_id: string | null;
  email: string;
}

export async function getServerUser(): Promise<ServerUser | null> {
  const supabase = createRouteHandlerClient({ cookies });
  
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return null;
    }
    
    // ユーザープロフィール情報を取得
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, code, family_name, first_name, email, role, current_work_type_id')
      .eq('id', user.id)
      .eq('is_active', true)
      .single();
      
    if (!profile) {
      return null;
    }
    
    return {
      id: profile.id,
      role: profile.role,
      full_name: `${profile.family_name} ${profile.first_name}`,
      company_id: profile.current_work_type_id,
      email: profile.email,
    };
  } catch (error) {
    console.error('getServerUser error:', error);
    return null;
  }
}

// 権限チェック用のヘルパー関数
export async function requireAuth(allowedRoles?: ServerUser['role'][]) {
  const user = await getServerUser();
  
  if (!user) {
    throw new Error('Unauthorized');
  }
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    throw new Error('Forbidden');
  }
  
  return user;
}

// 会社の機能フラグを取得
export async function getCompanyFeatures(companyId: string | null) {
  if (!companyId) return {};
  
  const supabase = createRouteHandlerClient({ cookies });
  
  try {
    const { data: features } = await supabase
      .from('company_features')
      .select('chat_enabled, report_enabled, schedule_enabled')
      .eq('company_id', companyId)
      .single();
      
    return {
      chat: features?.chat_enabled ?? false,
      report: features?.report_enabled ?? false,
      schedule: features?.schedule_enabled ?? false,
    };
  } catch (error) {
    console.error('getCompanyFeatures error:', error);
    return {};
  }
}

// 申請件数と未読通知を取得
export async function getUserBadges(userId: string) {
  const supabase = createRouteHandlerClient({ cookies });
  
  try {
    const [requestsResult, notificationsResult] = await Promise.all([
      supabase
        .from('requests')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'pending'),
      supabase
        .from('notifications')
        .select('id, title, message, user_id, is_read')
        .eq('user_id', userId)
        .eq('is_read', false)
    ]);
    
    return {
      pendingRequestsCount: requestsResult.data?.length ?? 0,
      unreadNotifications: notificationsResult.data ?? [],
    };
  } catch (error) {
    console.error('getUserBadges error:', error);
    return {
      pendingRequestsCount: 0,
      unreadNotifications: [],
    };
  }
}
