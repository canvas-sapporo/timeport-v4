require("dotenv").config({ path: ".env.development" });
const { createClient } = require("@supabase/supabase-js");

// 環境変数から設定を取得
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("環境変数チェック:");
console.log("NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? "設定済み" : "未設定");
console.log(
  "SUPABASE_SERVICE_ROLE_KEY:",
  supabaseServiceKey ? "設定済み" : "未設定",
);

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("環境変数が設定されていません:");
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL:",
    supabaseUrl ? "設定済み" : "未設定",
  );
  console.error(
    "SUPABASE_SERVICE_ROLE_KEY:",
    supabaseServiceKey ? "設定済み" : "未設定",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// テストユーザーデータ
const testUsers = [
  {
    email: "system@timeport.com",
    password: "Passw0rd!",
    profile: {
      code: "SA001",
      family_name: "システム",
      first_name: "管理者",
      family_name_kana: "システム",
      first_name_kana: "カンリシャ",
      email: "system@timeport.com",
      role: "system-admin",
      is_active: true,
    },
  },
  {
    email: "admin@timeport.com",
    password: "Passw0rd!",
    profile: {
      code: "A001",
      family_name: "管理者",
      first_name: "太郎",
      family_name_kana: "カンリシャ",
      first_name_kana: "タロウ",
      email: "admin@timeport.com",
      role: "admin",
      is_active: true,
    },
  },
  {
    email: "tanaka@timeport.com",
    password: "Passw0rd!",
    profile: {
      code: "B001",
      family_name: "田中",
      first_name: "花子",
      family_name_kana: "タナカ",
      first_name_kana: "ハナコ",
      email: "tanaka@timeport.com",
      role: "member",
      is_active: true,
    },
  },
];

async function setupTestUsers() {
  console.log("テストユーザーの作成を開始します...");

  for (const userData of testUsers) {
    try {
      console.log(`ユーザー作成中: ${userData.email}`);

      // 1. Supabase Authでユーザーを作成
      const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
          email: userData.email,
          password: userData.password,
          email_confirm: true,
        });

      if (authError) {
        if (authError.message.includes("already registered")) {
          console.log(`ユーザーは既に存在します: ${userData.email}`);
          continue;
        }
        throw authError;
      }

      if (!authData.user) {
        throw new Error("ユーザー作成に失敗しました");
      }

      // 2. ユーザープロフィールを作成
      const { error: profileError } = await supabase
        .from("user_profiles")
        .insert({
          id: authData.user.id,
          ...userData.profile,
        });

      if (profileError) {
        console.error(
          `プロフィール作成エラー (${userData.email}):`,
          profileError,
        );
        // 認証ユーザーを削除
        await supabase.auth.admin.deleteUser(authData.user.id);
        continue;
      }

      console.log(`✅ ユーザー作成完了: ${userData.email}`);
    } catch (error) {
      console.error(`❌ ユーザー作成エラー (${userData.email}):`, error);
    }
  }

  console.log("テストユーザーの作成が完了しました。");
}

// スクリプト実行
setupTestUsers().catch(console.error);
