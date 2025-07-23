'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function DebugPage() {
  const { toast } = useToast();
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<string>('');

  const envVars = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '設定済み' : '未設定',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ? '設定済み'
      : '未設定',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '設定済み' : '未設定',
    NEXT_PUBLIC_USE_SUPABASE: process.env.NEXT_PUBLIC_USE_SUPABASE || '未設定',
    NODE_ENV: process.env.NODE_ENV,
  };

  const testServerActions = async () => {
    setIsTesting(true);
    setTestResult('');

    try {
      // 簡単なServer Actionsのテスト
      const response = await fetch('/api/test-server-actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ test: true }),
      });

      const result = await response.json();
      setTestResult(JSON.stringify(result, null, 2));

      toast({
        title: 'テスト完了',
        description: 'Server Actionsのテストが完了しました',
      });
    } catch (error) {
      setTestResult(`エラー: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast({
        title: 'テスト失敗',
        description: 'Server Actionsのテストに失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold mb-6">デバッグ情報</h1>

      <Card>
        <CardHeader>
          <CardTitle>環境変数</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p>
            <strong>NEXT_PUBLIC_SUPABASE_URL:</strong> {envVars.NEXT_PUBLIC_SUPABASE_URL}
          </p>
          <p>
            <strong>NEXT_PUBLIC_SUPABASE_ANON_KEY:</strong> {envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY}
          </p>
          <p>
            <strong>SUPABASE_SERVICE_ROLE_KEY:</strong> {envVars.SUPABASE_SERVICE_ROLE_KEY}
          </p>
          <p>
            <strong>NEXT_PUBLIC_USE_SUPABASE:</strong> {envVars.NEXT_PUBLIC_USE_SUPABASE}
          </p>
          <p>
            <strong>NODE_ENV:</strong> {envVars.NODE_ENV}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Server Actions テスト</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={testServerActions} disabled={isTesting} className="w-full">
            {isTesting ? 'テスト中...' : 'Server Actions テスト実行'}
          </Button>

          {testResult && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">テスト結果:</h3>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">{testResult}</pre>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>トラブルシューティング</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">本番環境で打刻ができない場合の確認事項:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Vercelの環境変数設定でSupabase関連の変数が正しく設定されているか</li>
              <li>Supabase Auth設定で本番ドメインが許可されているか</li>
              <li>Server Actionsが本番環境で有効になっているか</li>
              <li>データベースのRLSポリシーが正しく設定されているか</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
