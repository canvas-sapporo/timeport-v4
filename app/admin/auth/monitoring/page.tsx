import dynamic from 'next/dynamic';
import MonitoringSkeleton from '@/components/admin/auth-monitoring/MonitoringSkeleton';

const AuthMonitoringPageClient = dynamic(
  () => import('@/components/admin/auth-monitoring/AuthMonitoringPage'),
  { ssr: false, loading: () => <MonitoringSkeleton /> }
);

export default function Page() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">認証監視</h1>
        <p className="text-muted-foreground">
          認証システムの監視データとセキュリティ統計を確認できます。
        </p>
      </div>
      <AuthMonitoringPageClient />
    </div>
  );
}
