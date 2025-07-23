import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
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

// サーバーサイド用のクライアント
export const createServerClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase URL and Service Role Key are required for server operations');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    db: {
      schema: 'public',
    },
  });
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
