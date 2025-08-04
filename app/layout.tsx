import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';

import { AuthProvider } from '@/contexts/auth-context';
import { DataProvider } from '@/contexts/data-context';
import { PageTransitionProvider } from '@/contexts/page-transition-context';
import MainLayout from '@/components/layout/main-layout';
import PWAScript from '@/components/pwa/pwa-script';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'TimePort - 勤怠管理システム',
  description: '効率的な勤怠管理を実現するTimePortシステム',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TimePort',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <meta name="application-name" content="TimePort" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="TimePort" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#0f172a" />
        <meta name="msapplication-tap-highlight" content="no" />

        <link rel="apple-touch-icon" href="/android-chrome-192x192.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-16x16.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="mask-icon" href="/android-chrome-192x192.png" color="#0f172a" />
      </head>
      <body className={inter.className} suppressHydrationWarning={true}>
        <PageTransitionProvider>
          <AuthProvider>
            <DataProvider>
              <MainLayout>{children}</MainLayout>
            </DataProvider>
          </AuthProvider>
        </PageTransitionProvider>
        <PWAScript />
      </body>
    </html>
  );
}
