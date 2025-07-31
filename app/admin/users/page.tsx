'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Bug } from 'lucide-react';

import { useAuth } from '@/contexts/auth-context';
import { getUsers, getUserStats, debugDatabaseState } from '@/lib/actions/admin/users';
import { getGroups } from '@/lib/actions/admin/groups';
import UserListTable from '@/components/admin/users/UserListTable';
import { Button } from '@/components/ui/button';
import type { UserProfile } from '@/schemas/user_profile';
import type { Group } from '@/schemas/group';

export default function AdminUsersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<(UserProfile & { groups: Group[] })[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    admin: 0,
    member: 0,
  });

  // データ取得関数
  async function fetchData() {
    if (!user?.company_id) return;

    try {
      console.log('データ取得開始:', user.company_id);
      setIsLoading(true);
      const [usersResult, groupsResult, statsResult] = await Promise.all([
        getUsers(user.company_id),
        getGroups(user.company_id),
        getUserStats(user.company_id),
      ]);

      console.log('データ取得結果:', {
        users: usersResult,
        groups: groupsResult,
        stats: statsResult,
      });

      if (usersResult.success) {
        setUsers(
          (usersResult.data as unknown as { users: (UserProfile & { groups: Group[] })[] }).users
        );
        console.log(
          'ユーザー一覧更新:',
          (usersResult.data as unknown as { users: (UserProfile & { groups: Group[] })[] }).users
        );
      } else {
        console.error('ユーザー取得失敗:', usersResult.error);
      }

      if (groupsResult.success) {
        setGroups(groupsResult.data.groups);
      } else {
        console.error('グループ取得失敗:', groupsResult.error);
      }

      if (statsResult.success) {
        setStats(statsResult.data);
      } else {
        console.error('統計取得失敗:', statsResult.error);
      }
    } catch (error) {
      console.error('データ取得エラー:', error);
    } finally {
      setIsLoading(false);
    }
  }

  // デバッグ関数
  async function handleDebug() {
    if (!user?.company_id) return;

    try {
      console.log('デバッグ開始...');
      const result = await debugDatabaseState(user.company_id);
      if (result.success) {
        console.log('デバッグ結果:', result.data);
      } else {
        console.error('デバッグエラー:', result.error);
      }
    } catch (error) {
      console.error('デバッグ実行エラー:', error);
    }
  }

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/login');
      return;
    }

    fetchData();
  }, [user, router]);

  if (!user || user.role !== 'admin') {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>データを読み込み中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ユーザー管理</h1>
          <p className="text-gray-600">システムユーザーの管理を行います</p>
        </div>
        <Button variant="outline" onClick={handleDebug}>
          <Bug className="w-4 h-4 mr-2" />
          デバッグ
        </Button>
      </div>

      <UserListTable
        users={users}
        groups={groups}
        companyId={user.company_id!}
        stats={stats}
        onRefreshAction={fetchData}
      />
    </div>
  );
}
