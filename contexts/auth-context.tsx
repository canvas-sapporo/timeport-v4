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
  const [isTabActive, setIsTabActive] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // クライアントサイドでのみ実行
    if (typeof window === 'undefined') return;

    console.log('AuthContext初期化開始');

    // タブの可視性変更を監視
    const handleVisibilityChange = () => {
      setIsTabActive(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 初期状態でローカルストレージからユーザー情報を取得（クライアントサイドでのみ）
    const storedUser = getCurrentUser();
    if (storedUser && !isInitialized) {
      console.log('ローカルストレージからユーザー情報を復元:', storedUser);

      // 復元したユーザー情報が有効かチェック
      if (storedUser.id && storedUser.email) {
        setUser(storedUser);
        setIsInitialized(true);
        setIsLoading(false); // ローカルストレージから復元した場合はローディングを終了
      } else {
        console.log('無効なユーザー情報を検出、クリアします');
        localStorage.removeItem('auth-user');
        setIsInitialized(true);
        setIsLoading(false);
      }
    }

    // Supabaseの認証状態を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('認証状態変更:', event, session?.user?.email);

      // タブが非アクティブな場合は処理をスキップ
      if (!isTabActive) {
        console.log('タブが非アクティブなため、認証状態変更処理をスキップ');
        return;
      }

      // リフレッシュトークンエラーは正常な動作なので、ログレベルを下げる
      if (event === 'TOKEN_REFRESHED') {
        console.log('トークンリフレッシュ成功');
        return;
      }

      // 既にユーザーが設定されている場合は、不要な再処理を避ける
      if (user && event === 'SIGNED_IN' && session?.user?.id === user.id) {
        console.log('既に同じユーザーが設定されているため、処理をスキップ');
        return;
      }

      if (event === 'SIGNED_IN' && session?.user) {
        // ユーザーがサインインした場合、プロフィール情報を取得
        // 既にローディング中の場合は設定しない
        if (!isLoading) {
          setIsLoading(true); // ローディング状態を開始
        }
        try {
          console.log('プロフィール取得開始, user_id:', session.user.id);

          let profileData = null;
          let profileError = null;

          try {
            console.log('プロフィール取得クエリ開始');
            console.log('ユーザーID:', session.user.id);

            // まず、テーブルが存在するかテスト
            const testResult = await supabase.from('user_profiles').select('count').limit(1);

            console.log('テーブル存在テスト結果:', testResult);

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

            if (profileError) {
              console.error('プロフィール取得エラー詳細:', {
                message: profileError.message,
                code: profileError.code,
                details: profileError.details,
                hint: profileError.hint,
              });
            }
          } catch (error) {
            console.error('プロフィール取得で例外が発生:', error);
            console.error('例外詳細:', {
              name: error instanceof Error ? error.name : 'Unknown',
              message: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined,
            });
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
            console.log('基本的な認証ユーザー設定完了');
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
          setIsLoading(false);
        } catch (error) {
          console.error('認証状態更新エラー:', error);
          console.error('エラー詳細:', {
            name: error instanceof Error ? error.name : 'Unknown',
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          });
          setIsLoading(false);
        }
      } else if (event === 'SIGNED_OUT') {
        // ユーザーがサインアウトした場合
        console.log('Supabase認証状態変更: SIGNED_OUT');
        setUser(null);
        if (typeof window !== 'undefined') {
          // アプリケーション固有のユーザー情報を削除
          localStorage.removeItem('auth-user');

          // Supabase関連のすべてのトークンを削除
          Object.keys(localStorage).forEach((key) => {
            if (key.startsWith('sb-')) {
              console.log('SIGNED_OUT: Supabaseトークンを削除:', key);
              localStorage.removeItem(key);
            }
          });

          // セッションストレージもクリア
          sessionStorage.clear();

          // ブラウザのキャッシュもクリア
          if ('caches' in window) {
            try {
              const cacheNames = await caches.keys();
              await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
              console.log('SIGNED_OUT: ブラウザキャッシュをクリアしました');
            } catch (cacheError) {
              console.log('SIGNED_OUT: キャッシュクリアエラー（無視）:', cacheError);
            }
          }

          // IndexedDBもクリア（もし存在する場合）
          if ('indexedDB' in window) {
            try {
              const databases = await indexedDB.databases();
              await Promise.all(
                databases.map((db) => {
                  if (db.name && typeof db.name === 'string') {
                    return new Promise((resolve) => {
                      const request = indexedDB.deleteDatabase(db.name as string);
                      request.onsuccess = () => resolve(undefined);
                      request.onerror = () => resolve(undefined);
                    });
                  }
                  return Promise.resolve();
                })
              );
              console.log('SIGNED_OUT: IndexedDBをクリアしました');
            } catch (indexedDBError) {
              console.log('SIGNED_OUT: IndexedDBクリアエラー（無視）:', indexedDBError);
            }
          }
        }
        setIsLoggingOut(false);
      }

      // 初期化完了をマーク
      if (!isInitialized) {
        setIsInitialized(true);
        setIsLoading(false);
        console.log('AuthContext: 初期化完了によるローディング終了');
      }
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
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isInitialized, user, isLoading, isTabActive]);

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
      // まずSupabaseでサインアウト
      const { error } = await supabase.auth.signOut({ scope: 'global' });

      if (error) {
        console.error('Supabase signOut error:', error);
      } else {
        console.log('Supabase signOut 完了');
      }

      // 認証状態をクリア
      setUser(null);
      // localStorageから直接削除
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth-user');
      }

      // ブラウザストレージのクリア処理（最小限に制限）
      if (typeof window !== 'undefined') {
        // アプリケーション固有のユーザー情報を削除
        localStorage.removeItem('auth-user');

        // Supabase関連のトークンのみ削除（IndexedDBは保持）
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith('sb-')) {
            console.log('Supabaseトークンを削除:', key);
            localStorage.removeItem(key);
          }
        });

        // セッションストレージもクリア
        sessionStorage.clear();
      }

      // ログインページにリダイレクト
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
