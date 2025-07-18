import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// サーバーサイド用のクライアント
export const createServerClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
};

// Supabase接続テスト用の関数
export const testSupabaseConnection = async () => {
  try {
    console.log("Supabase接続テスト開始");
    console.log("URL:", supabaseUrl);
    console.log("Anon Key:", supabaseAnonKey ? "設定済み" : "未設定");

    // 簡単なクエリで接続をテスト
    const { data, error } = await supabase
      .from("user_profiles")
      .select("count")
      .limit(1);

    if (error) {
      console.error("Supabase接続エラー:", error);
      return false;
    }

    console.log("Supabase接続成功");
    return true;
  } catch (error) {
    console.error("Supabase接続テストエラー:", error);
    return false;
  }
};
