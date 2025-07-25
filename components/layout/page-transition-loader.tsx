'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';
import { usePageTransition } from '@/contexts/page-transition-context';

export default function PageTransitionLoader() {
  // タブ切り替え時の不要なローディング表示を防ぐため、一時的に無効化
  return null;
}
