import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';

// VAPID設定
const vapidKeys = {
  publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  privateKey: process.env.VAPID_PRIVATE_KEY!,
};

webpush.setVapidDetails('mailto:admin@timeport.com', vapidKeys.publicKey, vapidKeys.privateKey);

export async function POST(request: NextRequest) {
  try {
    const { subscription, notification } = await request.json();

    if (!subscription || !notification) {
      return NextResponse.json({ error: 'Missing subscription or notification' }, { status: 400 });
    }

    // プッシュ通知のペイロードを作成
    const payload = JSON.stringify({
      title: notification.title,
      message: notification.message,
      id: notification.id,
      type: notification.type,
      link_url: notification.link_url,
      priority: notification.priority,
      metadata: notification.metadata,
    });

    // プッシュ通知を送信
    const result = await webpush.sendNotification(subscription, payload);

    if (result.statusCode === 200 || result.statusCode === 201) {
      console.log('Push notification sent successfully');
      return NextResponse.json({ success: true });
    } else {
      console.error('Push notification failed:', result.statusCode, result.body);
      return NextResponse.json({ error: 'Push notification failed' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error sending push notification:', error);

    // 購読が無効な場合の処理
    if (error instanceof Error && error.message.includes('410')) {
      return NextResponse.json({ error: 'Subscription expired' }, { status: 410 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 複数の購読に一括でプッシュ通知を送信
export async function PUT(request: NextRequest) {
  try {
    const { subscriptions, notification } = await request.json();

    if (!subscriptions || !Array.isArray(subscriptions) || !notification) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    const payload = JSON.stringify({
      title: notification.title,
      message: notification.message,
      id: notification.id,
      type: notification.type,
      link_url: notification.link_url,
      priority: notification.priority,
      metadata: notification.metadata,
    });

    const results = await Promise.allSettled(
      subscriptions.map((subscription) => webpush.sendNotification(subscription, payload))
    );

    const successCount = results.filter(
      (result) =>
        result.status === 'fulfilled' &&
        (result.value.statusCode === 200 || result.value.statusCode === 201)
    ).length;

    const failedCount = results.length - successCount;

    console.log(`Bulk push notification: ${successCount} successful, ${failedCount} failed`);

    return NextResponse.json({
      success: true,
      successCount,
      failedCount,
      total: results.length,
    });
  } catch (error) {
    console.error('Error sending bulk push notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
