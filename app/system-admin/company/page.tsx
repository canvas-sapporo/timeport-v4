import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import CompanyListTable from '@/components/system-admin/company/CompanyListTable';

export default async function CompanyListPage() {
  const cookieStore = await cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore }); // ✅ 関数でラップして渡す

  const { data: companies, error } = await supabase
    .from('companies')
    .select('*')
    .is('deleted_at', null);

  if (error) {
    return <div className="p-6 text-destructive">企業データの取得に失敗しました</div>;
  }

  const activeCompanyCount = (companies ?? []).filter(c => c.is_active).length;

  return <CompanyListTable companies={companies ?? []} activeCompanyCount={activeCompanyCount} />;
}
