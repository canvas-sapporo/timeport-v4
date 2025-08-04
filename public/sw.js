const CACHE_NAME = 'timeport-v4-cache-v1';
const STATIC_CACHE_NAME = 'timeport-v4-static-v1';
const DYNAMIC_CACHE_NAME = 'timeport-v4-dynamic-v1';

// キャッシュする静的ファイル
const STATIC_FILES = [
  '/',
  '/manifest.json',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/favicon-16x16.png',
];

// キャッシュ可能なスキームかどうかをチェック
function isCacheableRequest(request) {
  const url = new URL(request.url);
  // chrome-extension、chrome、moz-extension、safari-extensionスキームはキャッシュしない
  return !['chrome-extension:', 'chrome:', 'moz-extension:', 'safari-extension:'].includes(
    url.protocol
  );
}

// インストール時の処理
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches
      .open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('Service Worker: Static files cached');
        return self.skipWaiting();
      })
  );
});

// アクティベート時の処理
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated');
        return self.clients.claim();
      })
  );
});

// フェッチ時の処理（オフライン対応）
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // キャッシュ不可能なリクエストはスキップ
  if (!isCacheableRequest(request)) {
    return;
  }

  // APIリクエストの場合はネットワークファースト
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // 成功したレスポンスをキャッシュに保存
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // ネットワークエラーの場合、キャッシュから取得
          return caches.match(request);
        })
    );
    return;
  }

  // 静的ファイルの場合はキャッシュファースト
  if (request.method === 'GET') {
    event.respondWith(
      caches.match(request).then((response) => {
        if (response) {
          return response;
        }
        return fetch(request).then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        });
      })
    );
  }
});

// プッシュ通知の受信処理
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push received');

  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.message,
      icon: '/android-chrome-192x192.png',
      badge: '/android-chrome-192x192.png',
      data: {
        url: data.link_url || '/',
        notificationId: data.id,
        type: data.type,
      },
      actions: [
        {
          action: 'open',
          title: '開く',
          icon: '/android-chrome-192x192.png',
        },
        {
          action: 'close',
          title: '閉じる',
        },
      ],
      requireInteraction: data.priority === 'urgent',
      tag: data.type, // 同じタイプの通知を置き換え
    };

    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});

// 通知クリック時の処理
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');

  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 既に開いているウィンドウがあればフォーカス
      for (const client of clientList) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }

      // 新しいウィンドウを開く
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// バックグラウンド同期（オフライン時のデータ同期）
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync', event.tag);

  if (event.tag === 'background-sync') {
    event.waitUntil(
      // オフライン時に保存されたデータを同期
      syncOfflineData()
    );
  }
});

// オフラインデータの同期処理
async function syncOfflineData() {
  try {
    // IndexedDBからオフラインで保存されたデータを取得
    const offlineData = await getOfflineData();

    if (offlineData.length > 0) {
      console.log('Service Worker: Syncing offline data', offlineData);

      // データをサーバーに送信
      for (const data of offlineData) {
        try {
          const response = await fetch(data.url, {
            method: data.method,
            headers: data.headers,
            body: data.body,
          });

          if (response.ok) {
            // 同期成功したデータを削除
            await removeOfflineData(data.id);
          }
        } catch (error) {
          console.error('Service Worker: Sync failed for', data, error);
        }
      }
    }
  } catch (error) {
    console.error('Service Worker: Background sync error', error);
  }
}

// IndexedDBからオフラインデータを取得
async function getOfflineData() {
  // 実装は後で追加
  return [];
}

// オフラインデータを削除
async function removeOfflineData(id) {
  // 実装は後で追加
}
