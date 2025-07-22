'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

import { AuthUser, UserRole } from '@/types/auth';
import { supabase } from '@/lib/supabase';
import { getCurrentUser, setCurrentUser } from '@/lib/auth';

interface AuthContextType {
  user: AuthUser | null;
  login: (user: AuthUser) => void;
  logout: () => void;
  updateCompanyId: (newCompanyId: string) => Promise<void>;
  isLoading: boolean;
  isLoggingOut: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // クライアントサイドでのみ実行
    if (typeof window === 'undefined') return;

    console.log('AuthContext初期化開始');

    // 初期状態でローカルストレージからユーザー情報を取得（クライアントサイドでのみ）
    const storedUser = getCurrentUser();
    if (storedUser && !isInitialized) {
      console.log('ローカルストレージからユーザー情報を復元:', storedUser);
      setUser(storedUser);
      setIsInitialized(true);
      setIsLoading(false); // ローカルストレージから復元した場合はローディングを終了
    }

    // Supabaseの認証状態を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('認証状態変更:', event, session?.user?.email);

      // リフレッシュトークンエラーは正常な動作なので、ログレベルを下げる
      if (event === 'TOKEN_REFRESHED') {
        console.log('トークンリフレッシュ成功');
        return;
      }

      if (event === 'SIGNED_IN' && session?.user) {
        // ユーザーがサインインした場合、プロフィール情報を取得
        try {
          console.log('プロフィール取得開始, user_id:', session.user.id);

          let profileData = null;
          let profileError = null;

          try {
            const result = await supabase
              .from('user_profiles')
              .select(
                `
                id,
                code,
                family_name,
                first_name,
                email,
                role,
                current_work_type_id
              `
              )
              .eq('id', session.user.id)
              .is('deleted_at', null)
              .single();

            profileData = result.data;
            profileError = result.error;
            console.log('プロフィール取得結果:', { profileData, profileError });
          } catch (error) {
            console.error('プロフィール取得で例外が発生:', error);
            return;
          }

          if (profileError || !profileData) {
            console.error('プロフィール取得エラー:', profileError);
            console.error('プロフィールデータ:', profileData);

            // プロファイル取得に失敗した場合でも、基本的なユーザー情報でログインを許可
            console.log('プロフィール取得失敗、基本的なユーザー情報でログインを試行');
            const basicAuthUser: AuthUser = {
              id: session.user.id,
              employee_id: '',
              full_name:
                session.user.user_metadata?.full_name || session.user.email || 'Unknown User',
              email: session.user.email || '',
              role: 'member' as UserRole, // デフォルトでメンバーとして扱う
              primary_group_id: undefined,
              company_id: undefined,
            };

            console.log('基本的な認証ユーザーオブジェクト作成:', basicAuthUser);
            setUser(basicAuthUser);
            setCurrentUser(basicAuthUser);
            setIsLoading(false);
            return;
          }

          // ユーザーの主所属グループと企業IDを取得（system-admin以外）
          let groupData = null;
          let companyId = null;
          console.log('ユーザーロール:', profileData.role);
          console.log('認証コンテキスト開始 - user_id:', session.user.id);

          if (profileData.role !== 'system-admin') {
            console.log('ユーザーグループ取得開始, user_id:', session.user.id);

            // まずユーザーの所属グループを取得（グループに所属していない場合も許可）
            const { data: userGroupResult, error: userGroupError } = await supabase
              .from('user_groups')
              .select('group_id')
              .eq('user_id', session.user.id)
              .limit(1)
              .maybeSingle();

            console.log('ユーザーグループ取得結果:', { userGroupResult, userGroupError });

            if (userGroupError) {
              console.error('ユーザーグループ取得エラー:', userGroupError);
            } else if (userGroupResult) {
              groupData = userGroupResult;
              console.log('グループID取得成功:', userGroupResult.group_id);

              // 次にグループの企業IDを取得
              console.log('グループ企業ID取得開始, group_id:', userGroupResult.group_id);

              // より確実な方法でcompany_idを取得
              let groupResult = null;
              let groupError = null;

              // まずsingle()で試行
              try {
                const result = await supabase
                  .from('groups')
                  .select('company_id')
                  .eq('id', userGroupResult.group_id)
                  .single();

                groupResult = result.data;
                groupError = result.error;
              } catch (error) {
                console.error('single()でエラー:', error);
                groupError = error;
              }

              console.log('グループ企業ID取得結果:', { groupResult, groupError });
              console.log(
                'グループ企業ID取得SQL:',
                `SELECT company_id FROM groups WHERE id = '${userGroupResult.group_id}'`
              );

              if (groupError) {
                console.error('グループ企業ID取得エラー:', groupError);
                console.error('エラー詳細:', groupError);

                // フォールバック: maybeSingle()で再試行
                console.log('フォールバック: maybeSingle()で再試行');
                try {
                  const fallbackResult = await supabase
                    .from('groups')
                    .select('company_id')
                    .eq('id', userGroupResult.group_id)
                    .maybeSingle();

                  console.log('フォールバック結果:', fallbackResult);

                  if (fallbackResult.data && fallbackResult.data.company_id) {
                    companyId = fallbackResult.data.company_id;
                    console.log('フォールバックで企業ID取得成功:', companyId);
                  } else {
                    console.error('フォールバックでもcompany_idが取得できませんでした');
                  }
                } catch (fallbackError) {
                  console.error('フォールバックエラー:', fallbackError);
                }
              } else if (groupResult && groupResult.company_id) {
                companyId = groupResult.company_id;
                console.log('企業ID取得成功:', companyId);
              } else {
                console.error('グループ企業IDがnullまたはundefined:', groupResult);
              }
            } else {
              console.log('ユーザーはグループに所属していません。企業IDは後で設定されます。');
            }
          } else {
            console.log('system-adminユーザーのため、企業ID取得をスキップ');
            console.log('system-adminユーザー処理続行中...');
          }

          console.log('認証ユーザーオブジェクト作成開始');
          const authUser: AuthUser = {
            id: profileData.id,
            employee_id: profileData.code || '',
            full_name:
              `${profileData.family_name || ''} ${profileData.first_name || ''}`.trim() ||
              'Unknown User',
            email: profileData.email,
            role: profileData.role as UserRole,
            primary_group_id: groupData?.group_id || undefined,
            company_id: companyId || undefined,
          };
          console.log('認証ユーザーオブジェクト作成完了');

          console.log('認証ユーザー設定:', authUser);
          console.log('company_id詳細:', {
            companyId,
            groupData,
            profileDataRole: profileData.role,
          });
          console.log('最終的なcompany_id:', companyId);
          console.log('認証コンテキスト - ユーザー状態を更新中...');
          setUser(authUser);
          setCurrentUser(authUser);
          console.log('認証コンテキスト - ユーザー状態更新完了');
        } catch (error) {
          console.error('認証状態更新エラー:', error);
        }
      } else if (event === 'SIGNED_OUT') {
        // ユーザーがサインアウトした場合
        console.log('Supabase認証状態変更: SIGNED_OUT');
        setUser(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth-user');
        }
        setIsLoggingOut(false);
      }

      // 初期化完了をマーク
      if (!isInitialized) {
        setIsInitialized(true);
      }
      setIsLoading(false);
      console.log('AuthContext: 認証状態変更によるローディング終了');
    });

    // 初期化が完了していない場合は、一定時間後にローディングを終了
    if (!isInitialized) {
      const timer = setTimeout(() => {
        console.log('AuthContext: タイマーによる初期化完了');
        setIsLoading(false);
        setIsInitialized(true);
      }, 2000);

      return () => {
        clearTimeout(timer);
        subscription.unsubscribe();
      };
    }

    return () => subscription.unsubscribe();
  }, [isInitialized]);

  const login = (userData: AuthUser) => {
    setUser(userData);
    setCurrentUser(userData);
  };

  // company_idを更新する関数
  const updateCompanyId = async (newCompanyId: string) => {
    if (user) {
      const updatedUser = { ...user, company_id: newCompanyId };
      setUser(updatedUser);
      setCurrentUser(updatedUser);
      console.log('company_idを更新しました:', newCompanyId);
    }
  };

  const logout = async () => {
    console.log('ログアウト処理開始');
    setIsLoggingOut(true);

    try {
      // ユーザー状態を即座にクリア（UIを即座に更新）
      setUser(null);

      // クライアントサイドでのみlocalStorageを操作
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth-user');
      }

      // Supabaseでサインアウト（非同期で実行、結果を待たない）
      supabase.auth
        .signOut()
        .then(() => {
          console.log('Supabase signOut 完了');
        })
        .catch((error) => {
          console.error('Supabase signOut error:', error);
        });

      // 即座にログインページにリダイレクト
      console.log('ログインページにリダイレクト');
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // エラーが発生した場合も確実にリダイレクト
      router.push('/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateCompanyId, isLoading, isLoggingOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
