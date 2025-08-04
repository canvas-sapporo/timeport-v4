import { NextRequest, NextResponse } from 'next/server';

import { sendPushNotification } from '@/lib/pwa/push-notification';

export async function POST(request: NextRequest) {
  try {
    const { userId, title, message } = await request.json();

    if (!userId || !title || !message) {
      return NextResponse.json(
        {
          error: 'Missing required fields: userId, title, message',
        },
        { status: 400 }
      );
    }

    console.log('Test push notification:', { userId, title, message });

    const result = await sendPushNotification(userId, title, message, 'test', '/', 'normal');

    return NextResponse.json({
      success: result,
      message: result ? 'Push notification sent successfully' : 'Failed to send push notification',
    });
  } catch (error) {
    console.error('Test push API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
