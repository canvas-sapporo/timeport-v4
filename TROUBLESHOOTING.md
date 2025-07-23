# 本番環境での打刻問題 トラブルシューティングガイド

## 問題の概要

開発環境では打刻が正常に動作するが、本番環境（Vercel）では打刻ができない問題。

## 確認手順

### 1. 環境変数の確認

#### Vercelでの環境変数設定

1. Vercelダッシュボードにアクセス
2. プロジェクトを選択
3. Settings > Environment Variables を確認

**必要な環境変数:**

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_USE_SUPABASE=true
```

#### デバッグページでの確認

1. 本番環境の `/debug` ページにアクセス
2. 環境変数の設定状況を確認

### 2. Supabase設定の確認

#### Supabase Auth設定

1. Supabase Dashboard > Authentication > Settings
2. Site URL に本番ドメインが設定されているか確認
3. Redirect URLs に本番ドメインが含まれているか確認

**本番環境の設定例:**

```
Site URL: https://timeport-v4.vercel.app
Redirect URLs: https://timeport-v4.vercel.app/**
```

#### RLS (Row Level Security) ポリシー

1. Supabase Dashboard > Authentication > Policies
2. `attendances` テーブルのポリシーを確認
3. ユーザーが自分の勤怠記録にアクセスできるポリシーが設定されているか

### 3. Server Actions設定の確認

#### next.config.js

```javascript
experimental: {
  serverActions: {
    allowedOrigins: ['localhost:3000', '*.vercel.app'],
  },
},
```

#### Vercel Functions設定

1. Vercelダッシュボード > Functions
2. Server Actionsが正常にデプロイされているか確認

### 4. データベース接続の確認

#### 接続テスト

1. 本番環境の `/debug` ページで「Server Actions テスト実行」をクリック
2. Supabase接続テストの結果を確認

#### テーブル構造

1. Supabase Dashboard > Table Editor
2. `attendances` テーブルが正しく作成されているか確認
3. 必要なカラムが存在するか確認

### 5. ブラウザコンソールでのエラー確認

#### 開発者ツール

1. ブラウザの開発者ツールを開く
2. Console タブでエラーメッセージを確認
3. Network タブでAPIリクエストの状況を確認

### 6. Vercelログの確認

#### デプロイログ

1. Vercelダッシュボード > Deployments
2. 最新のデプロイログを確認
3. ビルドエラーがないか確認

#### 関数ログ

1. Vercelダッシュボード > Functions
2. Server Actionsの実行ログを確認

## よくある問題と解決策

### 問題1: 環境変数が設定されていない

**症状:** デバッグページで「未設定」と表示される
**解決策:** Vercelで環境変数を正しく設定

### 問題2: Supabase Auth設定が不適切

**症状:** ログインはできるが打刻でエラー
**解決策:** Supabase Auth設定で本番ドメインを追加

### 問題3: RLSポリシーが設定されていない

**症状:** データベースアクセスエラー
**解決策:** 適切なRLSポリシーを設定

### 問題4: Server Actionsが無効

**症状:** 打刻ボタンを押しても何も起こらない
**解決策:** next.config.jsの設定を確認

### 問題5: データベース接続エラー

**症状:** Supabase接続テストでエラー
**解決策:** 環境変数の値が正しいか確認

## デバッグ用の追加情報

### ログ出力の確認

打刻処理では詳細なログが出力されます。Vercelの関数ログで以下を確認：

1. `clockIn 開始:` ログ
2. 環境変数確認ログ
3. バリデーション結果ログ
4. Supabase操作ログ
5. エラーメッセージ

### テスト用のAPIエンドポイント

`/api/test-server-actions` エンドポイントを使用して：

- 環境変数の設定状況
- Supabase接続状況
- Server Actionsの動作状況

を確認できます。

## 緊急時の対処法

### 一時的な回避策

1. 開発環境で動作確認
2. 本番環境の設定を開発環境と同じにする
3. 段階的に設定を変更して問題を特定

### サポート情報

問題が解決しない場合は、以下を収集してサポートに連絡：

- デバッグページの出力
- ブラウザコンソールのエラー
- Vercelの関数ログ
- Supabaseのログ
