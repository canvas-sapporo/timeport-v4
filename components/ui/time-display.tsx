'use client';

import { useState, useEffect } from 'react';

export default function TimeDisplay() {
  const [time, setTime] = useState<Date | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setTime(new Date());
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, [isClient]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  };

  if (!time) {
    return (
      <div className="text-center">
        <div className="text-4xl font-bold text-gray-900 mb-2">--:--:--</div>
        <div className="text-lg text-gray-600">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="text-4xl font-bold text-gray-900 mb-2">{formatTime(time)}</div>
      <div className="text-lg text-gray-600">{formatDate(time)}</div>
    </div>
  );
}
