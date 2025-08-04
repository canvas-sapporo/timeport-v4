'use client';

import { useEffect } from 'react';

export default function PWAScript() {
  useEffect(() => {
    // Service Workerの登録
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('Service Worker registered successfully:', registration);

            // プッシュ通知の初期化（ユーザーがログインしている場合のみ）
            initializePushNotifications(registration);
          })
          .catch((error) => {
            console.error('Service Worker registration failed:', error);
          });
      });
    }

    // オフライン状態の監視
    const handleOnline = () => {
      console.log('Online');
      // オンライン復帰時の処理
      window.dispatchEvent(new CustomEvent('online-status-changed', { detail: { online: true } }));
    };

    const handleOffline = () => {
      console.log('Offline');
      // オフライン時の処理
      window.dispatchEvent(new CustomEvent('online-status-changed', { detail: { online: false } }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return null;
}

// プッシュ通知の初期化
const initializePushNotifications = async (registration: ServiceWorkerRegistration) => {
  try {
    // 通知権限の確認
    if (Notification.permission === 'default') {
      // 初回アクセス時の権限要求
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        console.log('Push notification permission granted');
        await subscribeToPushNotifications(registration);
      } else {
        console.log('Push notification permission denied');
      }
    } else if (Notification.permission === 'granted') {
      console.log('Push notification permission already granted');
      await subscribeToPushNotifications(registration);
    } else {
      console.log('Push notification permission denied');
    }
  } catch (error) {
    console.error('Error initializing push notifications:', error);
  }
};

// プッシュ通知の購読
const subscribeToPushNotifications = async (registration: ServiceWorkerRegistration) => {
  try {
    // VAPID公開鍵（後で設定）
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    if (!vapidPublicKey) {
      console.warn('VAPID public key not found');
      return;
    }

    // 既存の購読を確認
    const existingSubscription = await registration.pushManager.getSubscription();

    if (existingSubscription) {
      console.log('Push subscription already exists');
      return;
    }

    // 新しい購読を作成
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidPublicKey,
    });

    console.log('Push subscription created:', subscription);

    // サーバーに購読情報を送信（ユーザーがログインしている場合のみ）
    await sendSubscriptionToServer(subscription);
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
  }
};

// サーバーに購読情報を送信
const sendSubscriptionToServer = async (subscription: PushSubscription) => {
  try {
    // ユーザーがログインしているかチェック
    const userId = getCurrentUserId();
    if (!userId) {
      console.log('User not logged in, skipping subscription');
      return;
    }

    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        userId: userId,
      }),
    });

    if (response.ok) {
      console.log('Subscription sent to server successfully');
    } else {
      console.error('Failed to send subscription to server');
    }
  } catch (error) {
    console.error('Error sending subscription to server:', error);
  }
};

// 現在のユーザーIDを取得
const getCurrentUserId = (): string | null => {
  // グローバルなユーザー情報から取得
  if (typeof window !== 'undefined' && window.__NEXT_DATA__) {
    // Next.jsのグローバルデータから取得を試行
    try {
      const userData = window.__NEXT_DATA__?.props?.pageProps?.user;
      if (userData?.id) {
        return userData.id;
      }
    } catch (error) {
      console.warn('Could not get user ID from Next.js data');
    }
  }

  return null;
};
