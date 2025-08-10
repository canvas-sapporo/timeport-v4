'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import { useAuth } from '@/contexts/auth-context';
import { getGroups, getGroupStats } from '@/lib/actions/admin/groups';
import GroupListTable from '@/components/admin/groups/GroupListTable';
import type { Group } from '@/schemas/group';
import { supabase } from '@/lib/supabase';

export default function AdminGroupPage() {
  const { user, updateCompanyId } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
  });

  async function refetchData(companyId: string) {
    try {
      const [groupsResult, statsResult] = await Promise.all([
        getGroups(companyId),
        getGroupStats(companyId),
      ]);

      if (groupsResult.success) {
        setGroups(groupsResult.data.groups);
      }

      if (statsResult.success) {
        setStats(statsResult.data);
      }
    } catch (error) {
      console.error('データの再取得に失敗しました:', error);
    }
  }

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/login');
      return;
    }

    async function fetchData() {
      try {
        let currentCompanyId = user?.company_id;

        if (!currentCompanyId) {
          if (user?.primary_group_id) {
            const { data: groupData } = await supabase
              .from('groups')
              .select('company_id')
              .eq('id', user.primary_group_id)
              .single();

            if (groupData?.company_id) {
              await updateCompanyId(groupData.company_id);
              currentCompanyId = groupData.company_id;
            } else {
              return;
            }
          } else {
            return;
          }
        }

        if (!currentCompanyId) return;
        await refetchData(currentCompanyId);
      } catch (error) {
        console.error('データの取得に失敗しました:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [user, router]);

  if (!user || user.role !== 'admin') {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <GroupListTable
      groups={groups}
      activeGroupCount={stats.active}
      inactiveGroupCount={stats.inactive}
      onDataChange={() => {
        if (user?.company_id) {
          refetchData(user.company_id);
        }
      }}
    />
  );
}
