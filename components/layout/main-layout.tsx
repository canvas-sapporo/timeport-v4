'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { Toaster } from '@/components/ui/toaster';
import OfflineIndicator from '@/components/pwa/offline-indicator';
import InstallPrompt from '@/components/pwa/install-prompt';

import Sidebar from './sidebar';
import Header from './header';
import PageTransitionLoader from './page-transition-loader';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { user, isLoading, isLoggingOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // ハンバーガーメニューのトグル関数
  const toggleSidebar = () => {
    console.log('ハンバーガーメニューがクリックされました。現在の状態:', isSidebarOpen);
    setIsSidebarOpen(!isSidebarOpen);
    console.log('新しい状態:', !isSidebarOpen);
  };

  // ユーザーが認証されていない場合は、ログインページにリダイレクト
  useEffect(() => {
    if (!user && !isLoading && pathname !== '/login') {
      console.log('認証されていないユーザーをログインページにリダイレクト');
      router.push('/login');
    }
  }, [user, isLoading, pathname, router]);

  // ページ遷移時にサイドバーを閉じる（モバイル）
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  // ログインページ、feature-disabledページ、エラーページ、404ページの場合はレイアウトを適用しない
  if (
    pathname === '/login' ||
    pathname === '/member/feature-disabled' ||
    pathname === '/error' ||
    pathname === '/not-found'
  ) {
    return <>{children}</>;
  }

  // ローディング中またはログアウト中はローディング画面を表示
  if (isLoading || isLoggingOut) {
    return (
      <div className="min-h-screen flex items-center justify-center timeport-main-background">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">{isLoggingOut ? 'ログアウト中...' : '読み込み中...'}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // ログインページ以外の場合は、ローディング画面を表示
    if (pathname !== '/login') {
      return (
        <div className="min-h-screen flex items-center justify-center timeport-main-background">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-600">リダイレクト中...</p>
          </div>
        </div>
      );
    }
    return <>{children}</>;
  }

  return (
    <>
      <PageTransitionLoader />
      <div className="h-screen timeport-main-background flex relative overflow-hidden">
        {/* 浮遊パーティクル */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="timeport-particle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 6}s`,
              }}
            />
          ))}
        </div>

        <Sidebar isOpen={isSidebarOpen} onToggle={toggleSidebar} />
        <div className="flex-1 flex flex-col relative z-10 h-full w-full lg:w-auto main-container">
          <Header onMenuClick={toggleSidebar} />
          <main className="flex-1 p-4 lg:p-6 overflow-y-auto custom-scrollbar h-full w-full mobile-main">
            <div className="w-full max-w-7xl mx-auto animate-slide-in">{children}</div>
          </main>
        </div>
      </div>
      <Toaster />
      <OfflineIndicator />
      <InstallPrompt />
    </>
  );
}
