import { AuthUser } from "@/types/auth";
import { supabase } from "./supabase";

export const loginUser = async (
  email: string,
  password: string,
): Promise<{
  id: string;
  employee_id: string;
  full_name: string;
  email: string;
  role: "system-admin" | "admin" | "member";
  primary_group_id: string;
} | null> => {
  try {
    console.log("ログイン開始:", email);

    // Supabase認証でログイン
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    console.log("認証結果:", { authData, authError });

    if (authError) {
      console.error("認証エラー:", authError);
      return null;
    }

    if (!authData.user) {
      console.error("ユーザーデータが取得できませんでした");
      return null;
    }

    console.log("認証成功、プロフィール取得中...");

    // ユーザープロフィール情報を取得
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
      .eq("id", authData.user.id)
      .eq("is_active", true)
      .single();

    console.log("プロフィール取得結果:", { profileData, profileError });

    if (profileError || !profileData) {
      console.error("プロフィール取得エラー:", profileError);
      return null;
    }

    console.log("グループ情報取得中...");

    // ユーザーの主所属グループを取得（system-admin以外）
    let groupData = null;
    if (profileData.role !== "system-admin") {
      const { data: groupResult, error: groupError } = await supabase
        .from("user_groups")
        .select("group_id")
        .eq("user_id", authData.user.id)
        .limit(1)
        .single();

      console.log("グループ取得結果:", { groupResult, groupError });
      groupData = groupResult;
    }

    const result = {
      id: profileData.id,
      employee_id: profileData.code || "",
      full_name: `${profileData.family_name} ${profileData.first_name}`,
      email: profileData.email,
      role: profileData.role as "system-admin" | "admin" | "member",
      primary_group_id: groupData?.group_id || "",
    };

    console.log("ログイン成功:", result);
    return result;
  } catch (error) {
    console.error("ログインエラー:", error);
    return null;
  }
};

export const logoutUser = async (): Promise<void> => {
  try {
    await supabase.auth.signOut();
    localStorage.removeItem("auth-user");
  } catch (error) {
    console.error("ログアウトエラー:", error);
  }
};

export const getCurrentUser = (): AuthUser | null => {
  try {
    const stored = localStorage.getItem("auth-user");
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

export const setCurrentUser = (user: AuthUser): void => {
  localStorage.setItem("auth-user", JSON.stringify(user));
};
