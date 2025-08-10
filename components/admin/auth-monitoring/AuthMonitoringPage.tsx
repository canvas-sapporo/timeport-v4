'use client';

import dynamic from 'next/dynamic';
import MonitoringSkeleton from '@/components/admin/auth-monitoring/MonitoringSkeleton';

const AuthMonitoring = dynamic(
  () => import('@/components/admin/AuthMonitoring').then((m) => m.AuthMonitoring),
  {
    ssr: false,
    loading: () => <MonitoringSkeleton />,
  }
);

export default function AuthMonitoringPageClient() {
  return <AuthMonitoring />;
}
