'use client';

import { useEffect, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

import { Badge } from '@/components/ui/badge';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // 初期状態を設定
    setIsOnline(navigator.onLine);

    // オンライン/オフライン状態の監視
    const handleOnline = () => {
      setIsOnline(true);
      console.log('Online');
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log('Offline');
    };

    // カスタムイベントの監視
    const handleOnlineStatusChanged = (event: CustomEvent) => {
      setIsOnline(event.detail.online);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online-status-changed', handleOnlineStatusChanged as EventListener);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener(
        'online-status-changed',
        handleOnlineStatusChanged as EventListener
      );
    };
  }, []);

  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <Badge variant="destructive" className="flex items-center gap-2">
        <WifiOff className="w-4 h-4" />
        <span>オフライン</span>
      </Badge>
    </div>
  );
}
