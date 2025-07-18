'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';
import { usePageTransition } from '@/contexts/page-transition-context';

export default function PageTransitionLoader() {
  const [isLoading, setIsLoading] = useState(false);
  const [previousPath, setPreviousPath] = useState<string>('');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const pathname = usePathname();
  const { isTransitionDisabled } = usePageTransition();

  useEffect(() => {
    // ページが変更されたときの処理
    if (previousPath && previousPath !== pathname && !isTransitionDisabled) {
      setIsLoading(true);
      setLoadingProgress(0);

      // プログレスバーのアニメーション
      const progressInterval = setInterval(() => {
        setLoadingProgress((prev) => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + Math.random() * 15 + 5;
        });
      }, 50);

      // ローディング終了タイマー
      const loadingTimer = setTimeout(() => {
        clearInterval(progressInterval);
        setLoadingProgress(100);

        // 少し待ってからフェードアウト
        setTimeout(() => {
          setIsLoading(false);
          setLoadingProgress(0);
        }, 200);
      }, 500);

      return () => {
        clearInterval(progressInterval);
        clearTimeout(loadingTimer);
      };
    }

    setPreviousPath(pathname);
  }, [pathname, previousPath, isTransitionDisabled]);

  // ページの初期ロード時はローディングを表示しない
  useEffect(() => {
    setPreviousPath(pathname);
  }, []);

  if (!isLoading) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] flex items-center justify-center',
        'bg-gradient-to-br from-blue-50/95 to-indigo-50/95 backdrop-blur-sm',
        'transition-all duration-300 ease-out',
        'animate-in fade-in-0'
      )}
    >
      <div className="flex flex-col items-center space-y-6">
        {/* メインローディングアニメーション */}
        <div className="relative">
          {/* 外側のリング */}
          <div className="w-16 h-16 border-4 border-blue-200/60 rounded-full animate-spin"></div>
          {/* 内側のリング - 反対方向に回転 */}
          <div
            className="absolute inset-0 w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"
            style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}
          ></div>
          {/* 中央のドット */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full animate-pulse"></div>
          </div>
        </div>

        {/* ローディングテキスト */}
        <div className="flex flex-col items-center space-y-3">
          <p className="text-gray-700 font-semibold text-lg">ページを読み込み中</p>
          <div className="flex space-x-1">
            <div
              className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
              style={{ animationDelay: '0ms' }}
            ></div>
            <div
              className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
              style={{ animationDelay: '150ms' }}
            ></div>
            <div
              className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
              style={{ animationDelay: '300ms' }}
            ></div>
          </div>
        </div>

        {/* プログレスバー */}
        <div className="w-72 space-y-2">
          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 rounded-full transition-all duration-200 ease-out"
              style={{ width: `${loadingProgress}%` }}
            ></div>
          </div>
          <div className="text-center">
            <span className="text-xs text-gray-500 font-medium">
              {Math.round(loadingProgress)}%
            </span>
          </div>
        </div>
      </div>

      {/* 背景のパーティクル効果 */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3000}ms`,
              animationDuration: `${2000 + Math.random() * 2000}ms`,
            }}
          />
        ))}
      </div>

      {/* 追加の装飾要素 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 left-10 w-16 h-16 bg-blue-200/30 rounded-full animate-pulse"></div>
        <div
          className="absolute top-1/4 right-16 w-8 h-8 bg-indigo-200/40 rounded-full animate-pulse"
          style={{ animationDelay: '1s' }}
        ></div>
        <div
          className="absolute bottom-20 left-1/4 w-12 h-12 bg-purple-200/30 rounded-full animate-pulse"
          style={{ animationDelay: '2s' }}
        ></div>
        <div
          className="absolute bottom-32 right-1/3 w-6 h-6 bg-blue-200/50 rounded-full animate-pulse"
          style={{ animationDelay: '0.5s' }}
        ></div>
      </div>
    </div>
  );
}
