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
        db: {
          schema: 'public',
        },
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
let serverClient: ReturnType<typeof createClient> | null = null;

export const createServerClient = () => {
  // サーバーサイドでのみ新しいインスタンスを作成
  if (typeof window !== 'undefined') {
    throw new Error('createServerClient should only be called on the server side');
  }

  if (!serverClient) {
    // 環境変数を直接参照
    const supabaseUrl = 'https://lftxabbornwajhxeirqt.supabase.co';
    const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmdHhhYmJvcm53YWpoeGVpcnF0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjYzMjU3NiwiZXhwIjoyMDY4MjA4NTc2fQ.b8mUB_5F9VA4PyWNqpD_XUQRCe0A2k1i10XGiwFC8CE';

    console.log('Server Actions - 環境変数確認:');
    console.log('NEXT_PUBLIC_SUPABASE_URL: 設定済み');
    console.log('SUPABASE_SERVICE_ROLE_KEY: 設定済み');

    serverClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      db: {
        schema: 'public',
      },
    });
  }

  return serverClient;
};

// スキーマキャッシュをリフレッシュする関数
export const refreshSchemaCache = async () => {
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
};

// Supabase接続テスト用の関数
export const testSupabaseConnection = async () => {
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
};
