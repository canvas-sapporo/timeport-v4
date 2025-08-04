# PWA (Progressive Web App) セットアップガイド

## 概要

TimePortシステムにPWA機能を追加しました。以下の機能が利用可能です：

- **オフライン対応**: データの読み取り機能
- **プッシュ通知**: リアルタイム通知
- **インストール可能**: ホーム画面に追加可能
- **オフライン表示**: ネットワーク状態の表示

## セットアップ手順

### 1. 依存関係のインストール

```bash
npm install web-push
# または
pnpm add web-push
```

### 2. VAPIDキーの生成

プッシュ通知に必要なVAPIDキーを生成します：

```bash
npx web-push generate-vapid-keys
```

生成されたキーを`.env.local`に設定：

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_generated_public_key
VAPID_PRIVATE_KEY=your_generated_private_key
```

### 3. データベースマイグレーション

Supabaseでマイグレーションを実行：

```bash
supabase db push
```

または、以下のSQLを直接実行：

```sql
-- プッシュ通知購読テーブルの作成
CREATE TABLE public.push_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  subscription_data jsonb NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone NULL,
  CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE
);

-- インデックスとポリシーの設定
-- (詳細は supabase/migrations/20250805000000_create_push_subscriptions_table.sql を参照)
```

### 4. 環境変数の設定

`.env.local`ファイルに以下を追加：

```env
# PWA設定
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5. アプリケーションのビルドと起動

```bash
npm run build
npm start
```

## 機能の説明

### Service Worker

- **ファイル**: `public/sw.js`
- **機能**:
  - オフライン時のキャッシュ管理
  - プッシュ通知の受信
  - バックグラウンド同期

### プッシュ通知

- **初期化**: 初回アクセス時に通知権限を要求
- **送信**: リクエスト承認、システム通知など
- **表示**: ブラウザ通知として表示

### オフライン機能

- **データキャッシュ**: APIレスポンスをキャッシュ
- **オフライン表示**: ネットワーク状態を表示
- **データ読み取り**: キャッシュされたデータを表示

### PWAインストール

- **自動検出**: インストール可能な場合にプロンプト表示
- **手動インストール**: ブラウザのインストール機能を使用

## 使用方法

### プッシュ通知の送信

```typescript
import { sendPushNotification } from '@/lib/pwa/push-notification';

// 単一ユーザーに通知
await sendPushNotification(
  userId,
  'タイトル',
  'メッセージ',
  'request_created',
  '/member/requests/123'
);

// リクエスト承認通知
await sendRequestApprovalNotification(requestId, approverId, requestTitle);
```

### オフライン状態の監視

```typescript
// オフライン状態の変更を監視
window.addEventListener('online-status-changed', (event) => {
  const { online } = event.detail;
  if (online) {
    // オンライン復帰時の処理
  } else {
    // オフライン時の処理
  }
});
```

## ブラウザ対応

- **Chrome**: 完全対応
- **Safari**: 基本対応（一部制限あり）
- **Firefox**: 完全対応
- **Edge**: 完全対応

## トラブルシューティング

### プッシュ通知が受信されない

1. VAPIDキーが正しく設定されているか確認
2. 通知権限が許可されているか確認
3. Service Workerが正常に登録されているか確認

### オフライン機能が動作しない

1. Service Workerが正常に登録されているか確認
2. キャッシュが正しく設定されているか確認
3. ブラウザの開発者ツールでエラーを確認

### PWAがインストールできない

1. `manifest.json`が正しく設定されているか確認
2. HTTPSでアクセスしているか確認
3. Service Workerが登録されているか確認

## 開発時の注意事項

- **HTTPS必須**: PWA機能はHTTPS環境でのみ動作
- **Service Worker**: 開発時はキャッシュをクリアしてテスト
- **プッシュ通知**: ローカル環境では制限がある場合がある

## 本番環境での設定

1. **HTTPS**: SSL証明書の設定
2. **VAPIDキー**: 本番用のキーを生成
3. **ドメイン**: `manifest.json`のURLを本番ドメインに変更
4. **キャッシュ**: 適切なキャッシュ戦略の設定
