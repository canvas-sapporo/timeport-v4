"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { AuthUser, UserRole } from "@/types/auth";
import { supabase } from "@/lib/supabase";
import { getCurrentUser, setCurrentUser } from "@/lib/auth";

interface AuthContextType {
  user: AuthUser | null;
  login: (user: AuthUser) => void;
  logout: () => void;
  isLoading: boolean;
  isLoggingOut: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Supabaseの認証状態を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        // ユーザーがサインインした場合、プロフィール情報を取得
        try {
          const { data: profileData, error: profileError } = await supabase
            .from("user_profiles")
            .select(
              `
                id,
                code,
                family_name,
                first_name,
                email,
                role,
                current_work_type_id
              `,
            )
            .eq("id", session.user.id)
            .eq("is_active", true)
            .single();

          if (profileError || !profileData) {
            console.error("プロフィール取得エラー:", profileError);
            return;
          }

          // ユーザーの主所属グループを取得（system-admin以外）
          let groupData = null;
          if (profileData.role !== "system-admin") {
            const { data: groupResult } = await supabase
              .from("user_groups")
              .select("group_id")
              .eq("user_id", session.user.id)
              .limit(1)
              .single();
            groupData = groupResult;
          }

          const authUser: AuthUser = {
            id: profileData.id,
            employee_id: profileData.code || "",
            full_name: `${profileData.family_name} ${profileData.first_name}`,
            email: profileData.email,
            role: profileData.role as UserRole,
            primary_group_id: groupData?.group_id,
          };

          setUser(authUser);
          setCurrentUser(authUser);
        } catch (error) {
          console.error("認証状態更新エラー:", error);
        }
      } else if (event === "SIGNED_OUT") {
        // ユーザーがサインアウトした場合
        setUser(null);
        localStorage.removeItem("auth-user");
      }
      setIsLoading(false);
    });

    // 初期状態でローカルストレージからユーザー情報を取得
    const storedUser = getCurrentUser();
    if (storedUser) {
      setUser(storedUser);
    }
    setIsLoading(false);

    return () => subscription.unsubscribe();
  }, []);

  const login = (userData: AuthUser) => {
    setUser(userData);
    setCurrentUser(userData);
  };

  const logout = async () => {
    setIsLoggingOut(true);

    try {
      // Supabaseでサインアウト
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Supabase signOut error:", error);
      }

      // ユーザー状態をクリア
      setUser(null);
      localStorage.removeItem("auth-user");

      // 直接window.locationを使用して確実にリダイレクト
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout error:", error);
      // エラーが発生した場合も確実にリダイレクト
      window.location.href = "/login";
    }
    // finallyブロックを削除 - リダイレクト後に状態管理は不要
  };

  return (
    <AuthContext.Provider
      value={{ user, login, logout, isLoading, isLoggingOut }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
