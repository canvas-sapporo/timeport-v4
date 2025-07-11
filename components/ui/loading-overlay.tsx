'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  className?: string;
}

export default function LoadingOverlay({ 
  isVisible, 
  message = '読み込み中...', 
  className 
}: LoadingOverlayProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isVisible) return null;

  return (
    <div 
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center",
        "bg-white/80 backdrop-blur-sm transition-all duration-300",
        "animate-in fade-in-0",
        className
      )}
    >
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-blue-200 rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-gray-700 font-medium animate-pulse">{message}</p>
      </div>
    </div>
  );
} 