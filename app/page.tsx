'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setIsRedirecting(true);
      
      const redirectPath = user 
        ? user.role === 'system-admin' ? '/system-admin' : 
          user.role === 'admin' ? '/admin' : '/member'
        : '/login';
      
      // 短い遅延を追加してスムーズな遷移を確保
      const timer = setTimeout(() => {
        router.push(redirectPath);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [user, isLoading, router]);

  if (isLoading || isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center timeport-main-background">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-blue-200 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-600 font-medium animate-pulse">
            {isLoading ? '読み込み中...' : 'リダイレクト中...'}
          </p>
        </div>
      </div>
    );
  }

  return null;
}