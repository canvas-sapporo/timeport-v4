import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/contexts/auth-context';
import { DataProvider } from '@/contexts/data-context';
import { PageTransitionProvider } from '@/contexts/page-transition-context';
import MainLayout from '@/components/layout/main-layout';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'TimePort - 勤怠管理システム',
  description: '効率的な勤怠管理を実現するTimePortシステム',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <PageTransitionProvider>
          <AuthProvider>
            <DataProvider>
              <MainLayout>
                {children}
              </MainLayout>
            </DataProvider>
          </AuthProvider>
        </PageTransitionProvider>
      </body>
    </html>
  );
}