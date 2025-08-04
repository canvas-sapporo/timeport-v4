import { supabase } from '@/lib/supabase';

// プッシュ通知の送信
export async function sendPushNotification(
  userId: string,
  title: string,
  message: string,
  type: string,
  linkUrl?: string,
  priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal',
  metadata?: Record<string, any>
) {
  try {
    // 1. データベースに通知を保存
    const { data: notification, error: dbError } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message,
        type,
        link_url: linkUrl,
        priority,
        is_read: false,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (dbError) {
      console.error('Failed to save notification to database:', dbError);
      return false;
    }

    // 2. プッシュ通知を送信
    const pushResult = await sendPushToUser(userId, {
      id: notification.id,
      title,
      message,
      type,
      link_url: linkUrl,
      priority,
      metadata,
    });

    return pushResult;
  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
  }
}

// 特定ユーザーにプッシュ通知を送信
async function sendPushToUser(userId: string, notificationData: any) {
  try {
    console.log('sendPushToUser: 開始', { userId, notificationData });

    // ユーザーのプッシュ購読情報を取得
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) {
      console.error('Failed to get push subscriptions:', error);
      return false;
    }

    console.log('sendPushToUser: 購読情報取得結果', {
      subscriptions,
      count: subscriptions?.length,
    });

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No push subscriptions found for user:', userId);
      return false;
    }

    // 各購読にプッシュ通知を送信
    console.log('sendPushToUser: プッシュ通知送信開始', {
      subscriptionCount: subscriptions.length,
    });

    const results = await Promise.allSettled(
      subscriptions.map((subscription) => sendPushToSubscription(subscription, notificationData))
    );

    const successCount = results.filter((result) => result.status === 'fulfilled').length;
    console.log(`Push notification sent to ${successCount}/${subscriptions.length} subscriptions`);

    // 詳細な結果をログ出力
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Subscription ${index} failed:`, result.reason);
      } else {
        console.log(`Subscription ${index} succeeded`);
      }
    });

    return successCount > 0;
  } catch (error) {
    console.error('Error sending push to user:', error);
    return false;
  }
}

// 特定の購読にプッシュ通知を送信
async function sendPushToSubscription(subscription: any, notificationData: any) {
  try {
    const response = await fetch('/api/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscription: subscription.subscription_data,
        notification: notificationData,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error('Error sending push to subscription:', error);
    return false;
  }
}

// 複数ユーザーに一括でプッシュ通知を送信
export async function sendBulkPushNotification(
  userIds: string[],
  title: string,
  message: string,
  type: string,
  linkUrl?: string,
  priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal',
  metadata?: Record<string, any>
) {
  try {
    const results = await Promise.allSettled(
      userIds.map((userId) =>
        sendPushNotification(userId, title, message, type, linkUrl, priority, metadata)
      )
    );

    const successCount = results.filter(
      (result) => result.status === 'fulfilled' && result.value
    ).length;
    console.log(`Bulk push notification sent to ${successCount}/${userIds.length} users`);

    return successCount;
  } catch (error) {
    console.error('Error sending bulk push notification:', error);
    return 0;
  }
}

// リクエスト関連の通知送信関数
export async function sendRequestApprovalNotification(
  requestId: string,
  approverId: string,
  requestTitle: string
) {
  return sendPushNotification(
    approverId,
    '新しいリクエスト',
    `「${requestTitle}」が作成されました。承認をお願いします。`,
    'request_created',
    `/admin/requests/${requestId}`,
    'normal',
    { requestId, requestTitle }
  );
}

export async function sendRequestStatusNotification(
  requestId: string,
  requesterId: string,
  requestTitle: string,
  status: 'approved' | 'rejected'
) {
  const title = status === 'approved' ? 'リクエスト承認' : 'リクエスト却下';
  const message =
    status === 'approved'
      ? `リクエスト「${requestTitle}」が承認されました。`
      : `リクエスト「${requestTitle}」が却下されました。`;
  const type = status === 'approved' ? 'request_approval' : 'request_rejection';

  return sendPushNotification(
    requesterId,
    title,
    message,
    type,
    `/member/requests/${requestId}`,
    'normal',
    { requestId, requestTitle, status }
  );
}

// システム通知の送信
export async function sendSystemNotification(
  userId: string,
  title: string,
  message: string,
  linkUrl?: string,
  priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal'
) {
  return sendPushNotification(userId, title, message, 'system', linkUrl, priority);
}

// PWAインストール促進通知
export async function sendPWAInstallPromptNotification(userId: string) {
  return sendPushNotification(
    userId,
    'TimePortをインストール',
    'TimePortをホーム画面に追加して、より快適にご利用ください。',
    'pwa_install_prompt',
    '/',
    'low',
    { promptType: 'install' }
  );
}

// 勤怠関連の通知
export async function sendAttendanceNotification(
  userId: string,
  title: string,
  message: string,
  linkUrl?: string
) {
  return sendPushNotification(
    userId,
    title,
    message,
    'attendance',
    linkUrl || '/member/attendance',
    'normal'
  );
}
