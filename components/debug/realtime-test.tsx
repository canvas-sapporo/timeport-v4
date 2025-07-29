'use client';

import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function RealtimeTest() {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, `${new Date().toISOString()}: ${message}`]);
  };

  const testRealtimeConnection = async () => {
    try {
      addLog('Realtime接続テストを開始...');

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
            addLog(`Realtimeイベント受信: ${payload.eventType} - ${payload.table}`);
            setMessages((prev) => [...prev, payload]);
          }
        )
        .on('system', { event: 'disconnect' }, () => {
          addLog('Realtime接続が切断されました');
          setIsConnected(false);
        })
        .on('system', { event: 'reconnect' }, () => {
          addLog('Realtime接続が再接続されました');
          setIsConnected(true);
        })
        .on('system', { event: 'error' }, (error) => {
          addLog(`Realtimeエラー: ${error.message || '不明なエラー'}`);
        });

      const status = await channel.subscribe();
      addLog(`チャンネル購読ステータス: ${status}`);

      setIsConnected(true);
      addLog('Realtime接続が確立されました');
    } catch (error) {
      addLog(`Realtime接続エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  };

  const testMessageInsert = async () => {
    try {
      addLog('テストメッセージを挿入中...');

      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          chat_id: '7dd3d89f-3381-460f-a44e-ed6a86e8cf57', // 既存のチャットID
          user_id: '25f05fb9-d2b4-4928-976a-b0b79c456c30', // 既存のユーザーID
          content: `Realtimeテストメッセージ ${new Date().toISOString()}`,
          message_type: 'text',
        })
        .select();

      if (error) {
        addLog(`メッセージ挿入エラー: ${error.message}`);
      } else {
        addLog(`メッセージ挿入成功: ${data?.length || 0}件`);
      }
    } catch (error) {
      addLog(`メッセージ挿入エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  };

  const clearLogs = () => {
    setLogs([]);
    setMessages([]);
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Realtime接続テスト</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={testRealtimeConnection} disabled={isConnected}>
            Realtime接続テスト
          </Button>
          <Button onClick={testMessageInsert} disabled={!isConnected}>
            テストメッセージ挿入
          </Button>
          <Button onClick={clearLogs} variant="outline">
            ログクリア
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold mb-2">接続状態</h3>
            <div
              className={`p-2 rounded ${isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
            >
              {isConnected ? '接続中' : '未接続'}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">受信メッセージ数</h3>
            <div className="p-2 bg-gray-100 rounded">{messages.length}</div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">ログ</h3>
          <div className="h-64 overflow-y-auto bg-gray-50 p-2 rounded text-sm font-mono">
            {logs.map((log, index) => (
              <div key={index} className="mb-1">
                {log}
              </div>
            ))}
          </div>
        </div>

        {messages.length > 0 && (
          <div>
            <h3 className="font-semibold mb-2">受信したメッセージ</h3>
            <div className="h-32 overflow-y-auto bg-gray-50 p-2 rounded text-sm">
              {messages.map((msg, index) => (
                <div key={index} className="mb-1">
                  {JSON.stringify(msg, null, 2)}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
