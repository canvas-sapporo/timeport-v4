# Supabase設定ガイド

このガイドでは、TimePortアプリケーションでSupabase認証を使用するための設定手順を説明します。

## 1. 環境変数の設定

プロジェクトルートに `.env.local` ファイルを作成し、以下の環境変数を設定してください：

```env
# Supabase設定
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 環境変数の取得方法

1. [Supabase Dashboard](https://supabase.com/dashboard) にアクセス
2. プロジェクトを選択（または新規作成）
3. Settings > API から以下を取得：
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role secret → `SUPABASE_SERVICE_ROLE_KEY`

## 2. データベースのセットアップ

### マイグレーションの実行

```bash
# Supabase CLIがインストールされていない場合
npm install -g supabase

# プロジェクトにログイン
supabase login

# プロジェクトをリンク
supabase link --project-ref your_project_ref

# マイグレーションを実行
supabase db push
```

### 手動でSQLを実行する場合

Supabase DashboardのSQL Editorで以下のファイルの内容を実行：

1. `supabase/migrations/20250709043653_setup_database.sql`
2. `supabase/migrations/20250711000000_add_is_active_to_companies.sql`
3. `supabase/migrations/20250712000000_enable_service_role_rls.sql`
4. `supabase/migrations/20250713000000_setup_rls_policies.sql`

## 3. テストユーザーの作成

環境変数を設定後、以下のコマンドでテストユーザーを作成できます：

```bash
npm run setup-users
```

### 作成されるテストユーザー

| メールアドレス      | パスワード | 役割           |
| ------------------- | ---------- | -------------- |
| system@timeport.com | Passw0rd!  | システム管理者 |
| admin@timeport.com  | Passw0rd!  | 管理者         |
| tanaka@timeport.com | Passw0rd!  | メンバー       |

## 4. 認証設定の確認

### Supabase Auth設定

1. Supabase Dashboard > Authentication > Settings
2. 以下を確認・設定：
   - Site URL: `http://localhost:3000` (開発環境)
   - Redirect URLs: `http://localhost:3000/**`
   - Email confirmations: 必要に応じて無効化（開発環境）

### RLS (Row Level Security) の確認

データベースの各テーブルでRLSが有効になっていることを確認：

```sql
-- 例：user_profilesテーブル
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
```

## 5. アプリケーションの起動

```bash
npm run dev
```

## 6. トラブルシューティング

### よくある問題

1. **認証エラーが発生する場合**
   - 環境変数が正しく設定されているか確認
   - SupabaseプロジェクトのURLとキーが正しいか確認

2. **ユーザー作成に失敗する場合**
   - Service Role Keyが正しく設定されているか確認
   - データベースのマイグレーションが完了しているか確認

3. **プロフィール取得エラーが発生する場合**
   - `user_profiles`テーブルが正しく作成されているか確認
   - RLSポリシーが適切に設定されているか確認

### ログの確認

ブラウザの開発者ツールのコンソールでエラーメッセージを確認してください。

## 7. 本番環境での設定

本番環境では以下を設定してください：

1. **環境変数**
   - `NEXT_PUBLIC_SUPABASE_URL`: 本番プロジェクトのURL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: 本番プロジェクトのanon key
   - `SUPABASE_SERVICE_ROLE_KEY`: 本番プロジェクトのservice role key

2. **Supabase Auth設定**
   - Site URL: 本番ドメイン
   - Redirect URLs: 本番ドメインのパス

3. **セキュリティ設定**
   - 適切なRLSポリシーの設定
   - 本番環境用のパスワードポリシー
   - 多要素認証の設定（必要に応じて）

## 8. 追加の設定

### メール認証の設定

本番環境では、Supabaseのメール認証機能を設定することをお勧めします：

1. Supabase Dashboard > Authentication > Email Templates
2. メールテンプレートをカスタマイズ
3. SMTP設定（必要に応じて）

### ソーシャルログインの設定

必要に応じて、Google、GitHub等のソーシャルログインを設定できます：

1. Supabase Dashboard > Authentication > Providers
2. 必要なプロバイダーを有効化
3. クライアントIDとシークレットを設定
