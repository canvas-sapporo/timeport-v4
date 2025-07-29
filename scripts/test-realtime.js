require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase環境変数が設定されていません');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRealtime() {
  console.log('Realtime機能テスト開始...\n');

  try {
    // 1. 現在のメッセージを確認
    console.log('1. 現在のメッセージを確認:');
    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('*')
      .limit(5);

    if (messagesError) {
      console.error('メッセージ取得エラー:', messagesError);
    } else {
      console.log('メッセージ数:', messages.length);
      console.log('最新メッセージ:', messages[0]);
    }

    // 2. Realtime接続を設定
    console.log('\n2. Realtime接続を設定:');
    const channel = supabase
      .channel('test_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          console.log('Realtimeイベント受信:', {
            eventType: payload.eventType,
            table: payload.table,
            new: payload.new,
            old: payload.old,
          });
        }
      )
      .on('system', { event: 'disconnect' }, () => {
        console.log('Realtime接続が切断されました');
      })
      .on('system', { event: 'reconnect' }, () => {
        console.log('Realtime接続が再接続されました');
      })
      .on('system', { event: 'error' }, (error) => {
        console.error('Realtimeエラー:', error);
      });

    const status = await channel.subscribe();
    console.log('Realtime接続ステータス:', status);

    // 3. テストメッセージを挿入
    console.log('\n3. テストメッセージを挿入:');
    const { data: insertData, error: insertError } = await supabase
      .from('chat_messages')
      .insert({
        chat_id: '7dd3d89f-3381-460f-a44e-ed6a86e8cf57',
        user_id: '25f05fb9-d2b4-4928-976a-b0b79c456c30',
        content: `Realtimeテストメッセージ ${new Date().toISOString()}`,
        message_type: 'text',
      })
      .select();

    if (insertError) {
      console.error('メッセージ挿入エラー:', insertError);
    } else {
      console.log('メッセージ挿入成功:', insertData[0]);
    }

    // 4. 少し待ってから接続を切断
    setTimeout(async () => {
      console.log('\n4. Realtime接続を切断:');
      await channel.unsubscribe();
      console.log('テスト完了');
      process.exit(0);
    }, 3000);
  } catch (error) {
    console.error('テストエラー:', error);
    process.exit(1);
  }
}

testRealtime();
