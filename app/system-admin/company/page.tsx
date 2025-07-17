import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import CompanyListTable from '@/components/system-admin/company/CompanyListTable';

export default async function CompanyListPage() {
  const cookieStore = await cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });

  const { data: allCompanies, error } = await supabase
    .from('companies')
    .select('*'); // 全件取得

  if (error) {
    return <div className="p-6 text-destructive">企業データの取得に失敗しました</div>;
  }

  const companies = (allCompanies ?? []).filter(c => !c.deleted_at);
  const deletedCompanies = (allCompanies ?? []).filter(c => c.deleted_at);
  const activeCompanyCount = companies.filter(c => c.is_active).length;

  return <CompanyListTable companies={companies} activeCompanyCount={activeCompanyCount} deletedCompanyCount={deletedCompanies.length} />;
}
