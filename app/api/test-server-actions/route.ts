import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 環境変数の確認
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const envCheck = {
      supabaseUrl: supabaseUrl ? '設定済み' : '未設定',
      serviceRoleKey: serviceRoleKey ? '設定済み' : '未設定',
      anonKey: anonKey ? '設定済み' : '未設定',
      nodeEnv: process.env.NODE_ENV,
    };

    // Supabase接続テスト
    let supabaseTest = null;
    if (supabaseUrl && serviceRoleKey) {
      try {
        const supabase = createClient(supabaseUrl, serviceRoleKey);
        const { data, error } = await supabase.from('user_profiles').select('count').limit(1);

        supabaseTest = {
          success: !error,
          error: error?.message || null,
          data: data ? '接続成功' : null,
        };
      } catch (error) {
        supabaseTest = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          data: null,
        };
      }
    } else {
      supabaseTest = {
        success: false,
        error: '環境変数が設定されていません',
        data: null,
      };
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      environment: envCheck,
      supabaseTest,
      requestBody: body,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
