'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Building, Calendar } from 'lucide-react';

import { useAuth } from '@/contexts/auth-context';
import { useData } from '@/contexts/data-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import UserSettings from '@/components/member/UserSettings';
import { getCompanyInfo, getUserProfile } from '@/lib/actions/user-settings';
import { getUserCompanyId } from '@/lib/actions/user';
import type { CompanyInfo } from '@/schemas/user_profile';

export default function MemberProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const { groups } = useData();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    family_name: '',
    first_name: '',
  });
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [userProfile, setUserProfile] = useState<{
    id: string;
    code: string;
    family_name: string;
    first_name: string;
    family_name_kana: string;
    first_name_kana: string;
    email: string;
    phone?: string;
    role: string;
    employment_type_id?: string;
    current_work_type_id?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  } | null>(null);

  useEffect(() => {
    if (!user || (user.role !== 'member' && user.role !== 'admin')) {
      router.push('/login');
      return;
    }
  }, [user, router]);

  // ユーザープロフィールとグループ情報を読み込み
  useEffect(() => {
    async function loadUserData() {
      if (!user?.id) return;

      try {
        const profile = await getUserProfile(user.id);

        console.log('プロフィールページ - 取得したプロフィール:', profile);

        setUserProfile(profile);
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    }

    loadUserData();
  }, [user?.id]);

  // 企業情報を読み込み
  useEffect(() => {
    async function loadCompanyInfo() {
      if (!user?.id) return;

      try {
        // ユーザーIDから企業IDを取得
        const companyId = await getUserCompanyId(user.id);
        if (!companyId) {
          console.error('企業IDが取得できませんでした');
          return;
        }

        console.log('取得した企業ID:', companyId);
        const company = await getCompanyInfo(companyId);
        console.log('取得した企業情報:', company);
        setCompanyInfo(company);
      } catch (error) {
        console.error('Error loading company info:', error);
      }
    }

    loadCompanyInfo();
  }, [user?.id]);

  if (!user || (user.role !== 'member' && user.role !== 'admin')) {
    return null;
  }

  // const userGroup = groups.find((g) => g.id === user.primary_group_id);

  function getGroupPath(groupId: string) {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return '';
    return group.name;
  }

  // ユーザーが所属するグループを取得
  const userGroups = groups.filter((group) => group.id === user?.primary_group_id);

  function handleEdit() {
    setEditData({
      family_name: userProfile?.family_name || '',
      first_name: userProfile?.first_name || '',
    });
    setIsEditing(true);
  }

  function handleSave() {
    // In a real app, this would update the user data
    setIsEditing(false);
  }

  function handleCancel() {
    setIsEditing(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">プロフィール</h1>
        <p className="text-gray-600">ユーザー情報を確認・編集できます</p>
      </div>

      {/* 企業情報 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building className="w-5 h-5" />
            <span>企業情報</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 左列 */}
            <div className="space-y-4">
              <div>
                <Label>企業名</Label>
                <div className="mt-1 text-sm text-gray-900">{companyInfo?.name || '-'}</div>
              </div>

              <div>
                <Label>コード</Label>
                <div className="mt-1 text-sm text-gray-900">{companyInfo?.code || '-'}</div>
              </div>

              <div>
                <Label>住所</Label>
                <div className="mt-1 text-sm text-gray-900">{companyInfo?.address || '-'}</div>
              </div>

              <div>
                <Label>電話番号</Label>
                <div className="mt-1 text-sm text-gray-900">{companyInfo?.phone || '-'}</div>
              </div>
            </div>

            {/* 右列 */}
            <div className="space-y-4">
              <div>
                <Label>ステータス</Label>
                <div className="mt-1 text-sm text-gray-900">
                  {companyInfo?.is_active ? '有効' : '無効'}
                </div>
              </div>

              <div>
                <Label>作成日</Label>
                <div className="mt-1 text-sm text-gray-900">
                  {companyInfo?.created_at
                    ? new Date(companyInfo.created_at).toLocaleDateString('ja-JP')
                    : '-'}
                </div>
              </div>

              <div>
                <Label>編集日</Label>
                <div className="mt-1 text-sm text-gray-900">
                  {companyInfo?.updated_at
                    ? new Date(companyInfo.updated_at).toLocaleDateString('ja-JP')
                    : '-'}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>基本情報</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>個人コード</Label>
              <div className="mt-1 text-sm text-gray-900">{userProfile?.code || '-'}</div>
            </div>

            <div>
              <Label htmlFor="family_name">姓</Label>
              {isEditing ? (
                <Input
                  id="family_name"
                  value={editData.family_name}
                  onChange={(e) =>
                    setEditData((prev) => ({ ...prev, family_name: e.target.value }))
                  }
                />
              ) : (
                <div className="mt-1 text-sm text-gray-900">{userProfile?.family_name || '-'}</div>
              )}
            </div>

            <div>
              <Label htmlFor="first_name">名</Label>
              {isEditing ? (
                <Input
                  id="first_name"
                  value={editData.first_name}
                  onChange={(e) => setEditData((prev) => ({ ...prev, first_name: e.target.value }))}
                />
              ) : (
                <div className="mt-1 text-sm text-gray-900">{userProfile?.first_name || '-'}</div>
              )}
            </div>

            <div>
              <Label>姓（カナ）</Label>
              <div className="mt-1 text-sm text-gray-900">
                {userProfile?.family_name_kana || '-'}
              </div>
            </div>

            <div>
              <Label>名（カナ）</Label>
              <div className="mt-1 text-sm text-gray-900">
                {userProfile?.first_name_kana || '-'}
              </div>
            </div>

            <div>
              <Label>メールアドレス</Label>
              <div className="mt-1 text-sm text-gray-900">{userProfile?.email || '-'}</div>
            </div>

            <div>
              <Label>電話番号</Label>
              <div className="mt-1 text-sm text-gray-900">{userProfile?.phone || '-'}</div>
            </div>

            <div>
              <Label>権限</Label>
              <div className="mt-1 text-sm text-gray-900">
                {userProfile?.role === 'admin'
                  ? '管理者'
                  : userProfile?.role === 'member'
                    ? 'メンバー'
                    : userProfile?.role === 'system-admin'
                      ? 'システム管理者'
                      : '-'}
              </div>
            </div>

            <div>
              <Label>雇用形態</Label>
              <div className="mt-1 text-sm text-gray-900">
                {userProfile?.employment_type_id || '-'}
              </div>
            </div>

            <div>
              <Label>現在の勤務形態</Label>
              <div className="mt-1 text-sm text-gray-900">
                {userProfile?.current_work_type_id || '-'}
              </div>
            </div>

            <div>
              <Label>ステータス</Label>
              <div className="mt-1 text-sm text-gray-900">
                {userProfile?.is_active ? '有効' : '無効'}
              </div>
            </div>

            <div>
              <Label>作成日</Label>
              <div className="mt-1 text-sm text-gray-900">
                {userProfile?.created_at
                  ? new Date(userProfile.created_at).toLocaleDateString('ja-JP')
                  : '-'}
              </div>
            </div>

            <div>
              <Label>編集日</Label>
              <div className="mt-1 text-sm text-gray-900">
                {userProfile?.updated_at
                  ? new Date(userProfile.updated_at).toLocaleDateString('ja-JP')
                  : '-'}
              </div>
            </div>

            <div className="flex space-x-2">
              {isEditing ? (
                <>
                  <Button onClick={handleSave} size="sm">
                    保存
                  </Button>
                  <Button onClick={handleCancel} variant="outline" size="sm">
                    キャンセル
                  </Button>
                </>
              ) : (
                <Button onClick={handleEdit} size="sm">
                  編集
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>グループ情報</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {userGroups.length > 0 ? (
              <div className="space-y-4">
                {userGroups.map((group) => (
                  <div key={group.id} className="border rounded-md p-4 space-y-3">
                    <div>
                      <Label>グループコード</Label>
                      <div className="mt-1 text-sm text-gray-900">{group.code || '-'}</div>
                    </div>

                    <div>
                      <Label>グループ名</Label>
                      <div className="mt-1 text-sm text-gray-900">{group.name || '-'}</div>
                    </div>

                    <div>
                      <Label>説明</Label>
                      <div className="mt-1 text-sm text-gray-900">{group.description || '-'}</div>
                    </div>

                    <div>
                      <Label>ステータス</Label>
                      <div className="mt-1 text-sm text-gray-900">
                        {group.is_active ? '有効' : '無効'}
                      </div>
                    </div>

                    <div>
                      <Label>作成日</Label>
                      <div className="mt-1 text-sm text-gray-900">
                        {group.created_at
                          ? new Date(group.created_at).toLocaleDateString('ja-JP')
                          : '-'}
                      </div>
                    </div>

                    <div>
                      <Label>編集日</Label>
                      <div className="mt-1 text-sm text-gray-900">
                        {group.updated_at
                          ? new Date(group.updated_at).toLocaleDateString('ja-JP')
                          : '-'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-900">所属グループがありません</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>勤怠サマリー</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">19</div>
              <div className="text-sm text-blue-600">今月出勤日数</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">152</div>
              <div className="text-sm text-green-600">今月勤務時間</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">8.5</div>
              <div className="text-sm text-yellow-600">今月残業時間</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">3</div>
              <div className="text-sm text-purple-600">今月有給取得</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 設定セクション */}
      <UserSettings />
    </div>
  );
}
