"use client";

import { useAuth } from "@/contexts/auth-context";
import { usePathname } from "next/navigation";
import Sidebar from "./sidebar";
import Header from "./header";
import PageTransitionLoader from "./page-transition-loader";

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { user, isLoading, isLoggingOut } = useAuth();
  const pathname = usePathname();

  // ログインページの場合はレイアウトを適用しない
  if (pathname === "/login") {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center timeport-main-background">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (isLoggingOut) {
    return (
      <div className="min-h-screen flex items-center justify-center timeport-main-background">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">ログアウト中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
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

        <Sidebar />
        <div className="flex-1 flex flex-col relative z-10 h-full">
          <Header />
          <main className="flex-1 p-6 overflow-y-auto custom-scrollbar h-full">
            <div className="max-w-7xl mx-auto animate-slide-in">{children}</div>
          </main>
        </div>
      </div>
    </>
  );
}
