import CompanyListTable from '@/components/system-admin/company/CompanyListTable';
import { getCompanies, getCompanyStats } from '@/lib/actions/system-admin/company';

export default async function CompanyListPage() {
  // 新しいServer Actionを使用してデータを取得
  const companiesResult = await getCompanies();
  const statsResult = await getCompanyStats();

  if (!companiesResult.success) {
    return (
      <div className="p-6 text-destructive">
        企業データの取得に失敗しました: {companiesResult.error.message}
      </div>
    );
  }

  if (!statsResult.success) {
    return (
      <div className="p-6 text-destructive">
        統計データの取得に失敗しました: {statsResult.error.message}
      </div>
    );
  }

  const { companies, activeCount, deletedCount } = companiesResult.data;
  const stats = statsResult.data;

  return (
    <CompanyListTable
      companies={companies}
      activeCompanyCount={activeCount}
      deletedCompanyCount={deletedCount}
    />
  );
}
