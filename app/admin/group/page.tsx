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

  // データ再取得関数
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
        // デバッグ用：ユーザー情報をログ出力
        console.log('現在のユーザー情報:', user);
        console.log('ユーザーのcompany_id:', user?.company_id);
        console.log('ユーザーのprimary_group_id:', user?.primary_group_id);

        // ユーザーの企業IDを直接使用
        let currentCompanyId = user?.company_id;

        if (!currentCompanyId) {
          console.log('user.company_idが未設定、primary_group_idから取得を試行');

          // primary_group_idがある場合は、直接groupsテーブルからcompany_idを取得
          if (user?.primary_group_id) {
            console.log('primary_group_idからcompany_idを取得を試行:', user.primary_group_id);

            const { data: groupData, error: groupError } = await supabase
              .from('groups')
              .select('company_id')
              .eq('id', user.primary_group_id)
              .single();

            console.log('直接取得結果:', { groupData, groupError });

            if (groupData?.company_id) {
              console.log('直接取得でcompany_id取得成功:', groupData.company_id);

              // 認証コンテキストのcompany_idを更新
              await updateCompanyId(groupData.company_id);

              currentCompanyId = groupData.company_id;
            } else {
              console.error('company_idの取得に失敗しました');
              return;
            }
          } else {
            console.error('primary_group_idも設定されていません');
            return;
          }
        }

        // currentCompanyIdが設定されていることを確認
        if (!currentCompanyId) {
          console.error('currentCompanyIdが設定されていません');
          return;
        }

        // グループ一覧と統計を取得
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
