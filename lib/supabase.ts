import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// クライアントサイド用のシングルトンインスタンス
let supabaseClient: ReturnType<typeof createClient> | null = null;

export const supabase = (() => {
  // クライアントサイドでのみシングルトンインスタンスを使用
  if (typeof window !== 'undefined') {
    if (!supabaseClient) {
      supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          flowType: 'pkce',
        },
        global: {
          headers: {
            'X-Client-Info': 'timeport-v4',
          },
        },
        db: {},
      });
    }
    return supabaseClient;
  }

  // サーバーサイドでは新しいインスタンスを作成（SSR用）
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        'X-Client-Info': 'timeport-v4',
      },
    },
    db: {
      schema: 'public',
    },
  });
})();

// サーバーサイド用のクライアント（シングルトン）
// const serverClient: ReturnType<typeof createClient> | null = null;

export function createServerClient() {
  // サーバーサイドでのみ新しいインスタンスを作成
  if (typeof window !== 'undefined') {
    throw new Error('createServerClient should only be called on the server side');
  }

  // 環境変数から正しいAPIキーを取得
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!supabaseUrl || !anonKey) {
    throw new Error('Supabase環境変数が設定されていません');
  }

  return createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    db: {},
  });
}

// Admin用のクライアント（Service Role Key使用）
export function createAdminClient() {
  // サーバーサイドでのみ新しいインスタンスを作成
  if (typeof window !== 'undefined') {
    throw new Error('createAdminClient should only be called on the server side');
  }

  // 環境変数から正しいAPIキーを取得
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase Admin環境変数が設定されていません');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    db: {},
  });
}

// スキーマキャッシュをリフレッシュする関数
export async function refreshSchemaCache() {
  try {
    console.log('スキーマキャッシュリフレッシュ開始');

    // 簡単なクエリでスキーマをリフレッシュ
    const { data, error } = await supabase.from('attendances').select('id, clock_records').limit(1);

    if (error) {
      console.error('スキーマリフレッシュエラー詳細:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      return false;
    }

    console.log('スキーマキャッシュリフレッシュ成功:', { data });
    return true;
  } catch (error) {
    console.error('スキーマリフレッシュ例外エラー:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return false;
  }
}

// Supabase接続テスト用の関数
export async function testSupabaseConnection() {
  try {
    console.log('Supabase接続テスト開始');
    console.log('URL:', supabaseUrl);
    console.log('Anon Key:', supabaseAnonKey ? '設定済み' : '未設定');

    // 簡単なクエリで接続をテスト
    const { data, error } = await supabase.from('user_profiles').select('count').limit(1);

    if (error) {
      console.error('Supabase接続エラー:', error);
      return false;
    }

    console.log('Supabase接続成功');
    return true;
  } catch (error) {
    console.error('Supabase接続テストエラー:', error);
    return false;
  }
}
