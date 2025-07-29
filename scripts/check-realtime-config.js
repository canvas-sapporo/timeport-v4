require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('環境変数確認:');
console.log('URL:', supabaseUrl ? '設定済み' : '未設定');
console.log('ANON_KEY:', supabaseAnonKey ? '設定済み' : '未設定');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase環境変数が設定されていません');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkRealtimeConfig() {
  console.log('Supabase Realtime設定を確認中...\n');

  try {
    // 1. チャット関連テーブルの存在確認
    console.log('1. チャット関連テーブルの存在確認:');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['chat_messages', 'chat_users', 'chats', 'chat_message_reactions']);

    if (tablesError) {
      console.error('テーブル確認エラー:', tablesError);
    } else {
      console.log(
        '存在するテーブル:',
        tables.map((t) => t.table_name)
      );
    }

    // 2. RLS設定を確認
    console.log('\n2. RLS設定:');
    const { data: rlsData, error: rlsError } = await supabase
      .from('information_schema.tables')
      .select('table_name, row_security')
      .eq('table_schema', 'public')
      .in('table_name', ['chat_messages', 'chat_users', 'chats', 'chat_message_reactions']);

    if (rlsError) {
      console.error('RLS確認エラー:', rlsError);
    } else {
      console.log('RLS設定:', rlsData);
    }

    // 3. テストメッセージを挿入
    console.log('\n3. テストメッセージ挿入:');
    const { data: insertData, error: insertError } = await supabase
      .from('chat_messages')
      .insert({
        chat_id: '7dd3d89f-3381-460f-a44e-ed6a86e8cf57',
        user_id: '25f05fb9-d2b4-4928-976a-b0b79c456c30',
        content: `テストメッセージ ${new Date().toISOString()}`,
        message_type: 'text',
      })
      .select();

    if (insertError) {
      console.error('メッセージ挿入エラー:', insertError);
    } else {
      console.log('メッセージ挿入成功:', insertData);
    }

    // 4. 現在のメッセージ数を確認
    console.log('\n4. 現在のメッセージ数:');
    const { count, error: countError } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('カウントエラー:', countError);
    } else {
      console.log(`メッセージ数: ${count}`);
    }

    // 5. Realtime接続テスト
    console.log('\n5. Realtime接続テスト:');
    const channel = supabase.channel('test_channel').on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'chat_messages',
      },
      (payload) => {
        console.log('Realtimeイベント受信:', payload);
      }
    );

    const status = await channel.subscribe();
    console.log('Realtime接続ステータス:', status);

    // 6. テストメッセージを挿入してRealtimeをテスト
    console.log('\n6. Realtimeテスト用メッセージ挿入:');
    const { data: testData, error: testError } = await supabase
      .from('chat_messages')
      .insert({
        chat_id: '7dd3d89f-3381-460f-a44e-ed6a86e8cf57',
        user_id: '25f05fb9-d2b4-4928-976a-b0b79c456c30',
        content: `Realtimeテストメッセージ ${new Date().toISOString()}`,
        message_type: 'text',
      })
      .select();

    if (testError) {
      console.error('Realtimeテストメッセージ挿入エラー:', testError);
    } else {
      console.log('Realtimeテストメッセージ挿入成功:', testData);
    }

    // 少し待ってから接続を切断
    setTimeout(async () => {
      await channel.unsubscribe();
      console.log('Realtime接続を切断しました');
      process.exit(0);
    }, 3000);
  } catch (error) {
    console.error('エラー:', error);
    process.exit(1);
  }
}

checkRealtimeConfig();
