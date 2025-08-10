'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Building, Calendar, FileText, Save, Users } from 'lucide-react';
import dynamic from 'next/dynamic';

import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  getCompanyInfo,
  getUserProfile,
  updateUserProfile,
  getUserGroups,
} from '@/lib/actions/user-settings';
import { getUserCompanyId } from '@/lib/actions/user';
import { getEmploymentTypes } from '@/lib/actions/admin/employment-types';
import { getWorkTypes } from '@/lib/actions/admin/work-types';
import type { CompanyInfo } from '@/schemas/user_profile';

// 遅延読み込み（初期バンドル削減）
const UserSettings = dynamic(() => import('@/components/member/settings/UserSettings'), {
  ssr: false,
  loading: () => (
    <div className="mt-6 p-4 text-center text-gray-600">設定を読み込んでいます...</div>
  ),
});

export default function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    family_name: '',
    first_name: '',
    family_name_kana: '',
    first_name_kana: '',
    phone: '',
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
  const [employmentTypes, setEmploymentTypes] = useState<{ id: string; name: string }[]>([]);
  const [workTypes, setWorkTypes] = useState<{ id: string; name: string }[]>([]);
  const [userGroups, setUserGroups] = useState<
    {
      id: string;
      code?: string;
      name: string;
      description?: string;
      is_active: boolean;
      created_at: string;
      updated_at: string;
    }[]
  >([]);
  const [isUserGroupsLoading, setIsUserGroupsLoading] = useState(false);

  useEffect(() => {
    if (!user || (user.role !== 'member' && user.role !== 'admin')) {
      router.push('/login');
      return;
    }
  }, [user, router]);

  // ユーザープロフィール読み込み
  useEffect(() => {
    async function loadUserData() {
      if (!user?.id) return;

      try {
        const profile = await getUserProfile(user.id);
        if (profile) {
          setUserProfile(profile);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    }

    loadUserData();
  }, [user?.id]);

  // 企業情報読み込み
  useEffect(() => {
    async function loadCompanyInfo() {
      if (!user?.id) return;

      try {
        const companyId = await getUserCompanyId(user.id);
        if (!companyId) {
          console.error('企業IDが取得できませんでした');
          return;
        }

        const company = await getCompanyInfo(companyId);
        if (company) {
          setCompanyInfo(company);
        }

        const [employmentResult, workTypesResult] = await Promise.all([
          getEmploymentTypes(companyId),
          getWorkTypes(companyId),
        ]);

        if (employmentResult?.success && employmentResult.data?.employment_types) {
          setEmploymentTypes(
            employmentResult.data.employment_types.map((et) => ({ id: et.id, name: et.name }))
          );
        }

        if (workTypesResult?.success && workTypesResult.data?.work_types) {
          setWorkTypes(workTypesResult.data.work_types.map((wt) => ({ id: wt.id, name: wt.name })));
        }
      } catch (error) {
        console.error('Error loading company info:', error);
      }
    }

    loadCompanyInfo();
  }, [user?.id]);

  // ユーザー所属グループ読み込み
  useEffect(() => {
    async function loadUserGroups() {
      if (!user?.id) return;

      setIsUserGroupsLoading(true);
      try {
        const groups = await getUserGroups(user.id);
        const sortedGroups = groups.sort((a, b) => (a.code || '').localeCompare(b.code || ''));
        setUserGroups(sortedGroups);
      } catch (error) {
        console.error('Error loading user groups:', error);
      } finally {
        setIsUserGroupsLoading(false);
      }
    }

    loadUserGroups();
  }, [user?.id]);

  if (!user || (user.role !== 'member' && user.role !== 'admin')) {
    return null;
  }

  function getEmploymentTypeName(id: string) {
    const employmentType = employmentTypes.find((et) => et.id === id);
    return employmentType ? employmentType.name : '-';
  }

  function getWorkTypeName(id: string) {
    const workType = workTypes.find((wt) => wt.id === id);
    return workType ? workType.name : '-';
  }

  function handleEdit() {
    setEditData({
      family_name: userProfile?.family_name || '',
      first_name: userProfile?.first_name || '',
      family_name_kana: userProfile?.family_name_kana || '',
      first_name_kana: userProfile?.first_name_kana || '',
      phone: userProfile?.phone || '',
    });
    setIsEditing(true);
  }

  async function handleSave() {
    if (!user?.id) return;

    try {
      const result = await updateUserProfile(user.id, editData, user.id);
      if (result?.success) {
        const updatedProfile = await getUserProfile(user.id);
        if (updatedProfile) {
          setUserProfile(updatedProfile);
        }
        setIsEditing(false);
      } else {
        console.error('プロフィール更新エラー:', result?.error || 'Unknown error');
      }
    } catch (error) {
      console.error('プロフィール更新中にエラーが発生しました:', error);
    }
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

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="company" className="flex items-center space-x-2">
            <Building className="w-4 h-4" />
            <span>会社情報</span>
          </TabsTrigger>
          <TabsTrigger value="basic" className="flex items-center space-x-2">
            <User className="w-4 h-4" />
            <span>ユーザー情報</span>
          </TabsTrigger>
          <TabsTrigger value="group" className="flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span>グループ情報</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building className="w-5 h-5" />
                <span>企業情報</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm font-semibold text-gray-900 mb-1">企業名</div>
                      <div className="text-base text-gray-600">{companyInfo?.name || '-'}</div>
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-gray-900 mb-1">コード</div>
                      <div className="text-base text-gray-600">{companyInfo?.code || '-'}</div>
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-gray-900 mb-1">住所</div>
                      <div className="text-base text-gray-600">{companyInfo?.address || '-'}</div>
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-gray-900 mb-1">電話番号</div>
                      <div className="text-base text-gray-600">{companyInfo?.phone || '-'}</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="text-sm font-semibold text-gray-900 mb-1">ステータス</div>
                      <div className="text-base text-gray-600">
                        {companyInfo?.is_active ? '有効' : '無効'}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-gray-900 mb-1">作成日</div>
                      <div className="text-base text-gray-600">
                        {companyInfo?.created_at
                          ? new Date(companyInfo.created_at).toLocaleDateString('ja-JP')
                          : '-'}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-gray-900 mb-1">編集日</div>
                      <div className="text-base text-gray-600">
                        {companyInfo?.updated_at
                          ? new Date(companyInfo.updated_at).toLocaleDateString('ja-JP')
                          : '-'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>ユーザー情報</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm font-semibold text-gray-900 mb-1">個人コード</div>
                      <div className="text-base text-gray-600">{userProfile?.code || '-'}</div>
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-gray-900 mb-1">姓</div>
                      {isEditing ? (
                        <Input
                          id="family_name"
                          value={editData.family_name}
                          onChange={(e) =>
                            setEditData((prev) => ({ ...prev, family_name: e.target.value }))
                          }
                        />
                      ) : (
                        <div className="text-base text-gray-600">
                          {userProfile?.family_name || '-'}
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-gray-900 mb-1">名</div>
                      {isEditing ? (
                        <Input
                          id="first_name"
                          value={editData.first_name}
                          onChange={(e) =>
                            setEditData((prev) => ({ ...prev, first_name: e.target.value }))
                          }
                        />
                      ) : (
                        <div className="text-base text-gray-600">
                          {userProfile?.first_name || '-'}
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-gray-900 mb-1">姓（カナ）</div>
                      {isEditing ? (
                        <Input
                          id="family_name_kana"
                          value={editData.family_name_kana}
                          onChange={(e) =>
                            setEditData((prev) => ({ ...prev, family_name_kana: e.target.value }))
                          }
                        />
                      ) : (
                        <div className="text-base text-gray-600">
                          {userProfile?.family_name_kana || '-'}
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-gray-900 mb-1">名（カナ）</div>
                      {isEditing ? (
                        <Input
                          id="first_name_kana"
                          value={editData.first_name_kana}
                          onChange={(e) =>
                            setEditData((prev) => ({ ...prev, first_name_kana: e.target.value }))
                          }
                        />
                      ) : (
                        <div className="text-base text-gray-600">
                          {userProfile?.first_name_kana || '-'}
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-gray-900 mb-1">メールアドレス</div>
                      <div className="text-base text-gray-600">{userProfile?.email || '-'}</div>
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-gray-900 mb-1">電話番号</div>
                      {isEditing ? (
                        <Input
                          id="phone"
                          value={editData.phone}
                          onChange={(e) =>
                            setEditData((prev) => ({ ...prev, phone: e.target.value }))
                          }
                        />
                      ) : (
                        <div className="text-base text-gray-600">{userProfile?.phone || '-'}</div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="text-sm font-semibold text-gray-900 mb-1">権限</div>
                      <div
                        className={`text-base ${isEditing ? 'text-gray-400 bg-gray-50 p-2 rounded' : 'text-gray-600'}`}
                      >
                        {userProfile?.role === 'admin'
                          ? '管理者'
                          : userProfile?.role === 'member'
                            ? 'メンバー'
                            : userProfile?.role === 'system-admin'
                              ? 'システム管理者'
                              : '-'}
                        {isEditing && (
                          <span className="ml-2 text-xs text-gray-500">（編集不可）</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-gray-900 mb-1">雇用形態</div>
                      <div
                        className={`text-base ${isEditing ? 'text-gray-400 bg-gray-50 p-2 rounded' : 'text-gray-600'}`}
                      >
                        {userProfile?.employment_type_id
                          ? getEmploymentTypeName(userProfile.employment_type_id)
                          : '-'}
                        {isEditing && (
                          <span className="ml-2 text-xs text-gray-500">（編集不可）</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-gray-900 mb-1">勤務形態</div>
                      <div
                        className={`text-base ${isEditing ? 'text-gray-400 bg-gray-50 p-2 rounded' : 'text-gray-600'}`}
                      >
                        {userProfile?.current_work_type_id
                          ? getWorkTypeName(userProfile.current_work_type_id)
                          : '-'}
                        {isEditing && (
                          <span className="ml-2 text-xs text-gray-500">（編集不可）</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-gray-900 mb-1">ステータス</div>
                      <div
                        className={`text-base ${isEditing ? 'text-gray-400 bg-gray-50 p-2 rounded' : 'text-gray-600'}`}
                      >
                        {userProfile?.is_active ? '有効' : '無効'}
                        {isEditing && (
                          <span className="ml-2 text-xs text-gray-500">（編集不可）</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-gray-900 mb-1">作成日</div>
                      <div
                        className={`text-base ${isEditing ? 'text-gray-400 bg-gray-50 p-2 rounded' : 'text-gray-600'}`}
                      >
                        {userProfile?.created_at
                          ? new Date(userProfile.created_at).toLocaleDateString('ja-JP')
                          : '-'}
                        {isEditing && (
                          <span className="ml-2 text-xs text-gray-500">（編集不可）</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-gray-900 mb-1">編集日</div>
                      <div
                        className={`text-base ${isEditing ? 'text-gray-400 bg-gray-50 p-2 rounded' : 'text-gray-600'}`}
                      >
                        {userProfile?.updated_at
                          ? new Date(userProfile.updated_at).toLocaleDateString('ja-JP')
                          : '-'}
                        {isEditing && (
                          <span className="ml-2 text-xs text-gray-500">（編集不可）</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 mt-6">
                  {isEditing ? (
                    <>
                      <Button onClick={handleCancel} variant="outline" size="sm">
                        キャンセル
                      </Button>
                      <Button
                        onClick={handleSave}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        保存
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={handleEdit}
                      size="sm"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      編集
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="group" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>グループ情報</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isUserGroupsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                    <span className="text-gray-600">グループ情報を読み込み中...</span>
                  </div>
                </div>
              ) : userGroups.length > 0 ? (
                <div className="space-y-4">
                  {userGroups.map((group) => (
                    <div key={group.id} className="border rounded-md p-4 space-y-3">
                      <div>
                        <div className="text-sm font-semibold text-gray-900 mb-1">
                          グループコード
                        </div>
                        <div className="text-base text-gray-600">{group.code || '-'}</div>
                      </div>

                      <div>
                        <div className="text-sm font-semibold text-gray-900 mb-1">グループ名</div>
                        <div className="text-base text-gray-600">{group.name || '-'}</div>
                      </div>

                      <div>
                        <div className="text-sm font-semibold text-gray-900 mb-1">説明</div>
                        <div className="text-base text-gray-600">{group.description || '-'}</div>
                      </div>

                      <div>
                        <div className="text-sm font-semibold text-gray-900 mb-1">ステータス</div>
                        <div className="text-base text-gray-600">
                          {group.is_active ? '有効' : '無効'}
                        </div>
                      </div>

                      <div>
                        <div className="text-sm font-semibold text-gray-900 mb-1">作成日</div>
                        <div className="text-base text-gray-600">
                          {group.created_at
                            ? new Date(group.created_at).toLocaleDateString('ja-JP')
                            : '-'}
                        </div>
                      </div>

                      <div>
                        <div className="text-sm font-semibold text-gray-900 mb-1">編集日</div>
                        <div className="text-base text-gray-600">
                          {group.updated_at
                            ? new Date(group.updated_at).toLocaleDateString('ja-JP')
                            : '-'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-base text-gray-900 text-center py-8">
                  所属グループがありません
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>操作ログ</span>
          </CardTitle>
          <CardDescription>最近の操作履歴を表示します</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div>
                  <p className="font-medium">プロフィール更新</p>
                  <p className="text-sm text-gray-600">基本情報を更新しました</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">2024/01/15 14:30</p>
                <p className="text-xs text-gray-500">IP: 192.168.1.100</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="font-medium">勤怠記録</p>
                  <p className="text-sm text-gray-600">出勤を記録しました</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">2024/01/15 09:00</p>
                <p className="text-xs text-gray-500">IP: 192.168.1.100</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <div>
                  <p className="font-medium">申請提出</p>
                  <p className="text-sm text-gray-600">有給申請を提出しました</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">2024/01/14 16:45</p>
                <p className="text-xs text-gray-500">IP: 192.168.1.100</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <div>
                  <p className="font-medium">ログイン</p>
                  <p className="text-sm text-gray-600">システムにログインしました</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">2024/01/14 08:30</p>
                <p className="text-xs text-gray-500">IP: 192.168.1.100</p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-between items-center">
            <div className="text-sm text-gray-600">表示期間: 過去30日間</div>
            <Button variant="outline" size="sm">
              <FileText className="w-4 h-4 mr-2" />
              詳細ログを表示
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 設定セクション（遅延読込） */}
      <UserSettings />
    </div>
  );
}
