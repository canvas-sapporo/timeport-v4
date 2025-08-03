# TimePort - 勤怠管理システム

<div align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js" alt="Next.js">
  <img src="https://img.shields.io/badge/TypeScript-blue?style=for-the-badge&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase">
  <img src="https://img.shields.io/badge/Tailwind%20CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL">
</div>

## 📋 概要

TimePortは、現代の企業ニーズに応える高機能な勤怠管理システムです。システム管理者、管理者、メンバーの3つの役割に対応し、柔軟な設定機能と直感的なUIを提供します。

### ✨ 主な特徴

- 🕐 **リアルタイム打刻** - 正確な勤怠記録と休憩管理
- 📊 **ダッシュボード** - 勤怠状況の可視化と統計
- 📝 **動的申請フォーム** - カスタマイズ可能な申請システム
- 👥 **階層的ユーザー管理** - 企業・グループ・個人の3層構造
- ⚙️ **柔軟な設定** - 機能ON/OFF、勤務時間、通知設定
- 📱 **レスポンシブデザイン** - あらゆるデバイスに対応
- 🔐 **Row Level Security** - データセキュリティの確保

## 🏗️ 技術スタック

### フロントエンド

- **Next.js 15** (App Router)
- **TypeScript 5.2** - 型安全性
- **Tailwind CSS 3.3** - スタイリング
- **shadcn/ui** - UIコンポーネントライブラリ
- **React Hook Form 7.60** + **Zod 3.25** - フォーム管理・バリデーション
- **date-fns 3.6** - 日付処理
- **Lucide React 0.446** - アイコン
- **Recharts 2.12** - チャート・グラフ
- **Sonner 2.0** - トースト通知

### バックエンド

- **Supabase 2.50** - データベース・認証・リアルタイム
- **PostgreSQL** - データストレージ
- **Row Level Security (RLS)** - データセキュリティ
- **Supabase Auth** - 認証システム

### 開発ツール

- **ESLint 8.49** + **Prettier 3.6** - コード品質
- **TypeScript ESLint 8.36** - TypeScript用リント
- **pnpm** - パッケージマネージャー

## 🚀 クイックスタート

### 前提条件

- **Node.js 22以上**
- **pnpm** (推奨) または npm
- **Supabaseアカウント** (本番環境用)

### インストール

1. **リポジトリのクローン**

```bash
git clone https://github.com/canvas-sapporo/timeport-v4.git
cd timeport-v4
```

2. **依存関係のインストール**

```bash
pnpm install
```

3. **環境変数の設定**

```bash
cp .env.example .env.local
```

`.env.local` を編集：

```env
# データソース切り替え（開発初期はモック使用）
NEXT_PUBLIC_USE_SUPABASE=true

# Supabase設定（本番環境用）
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

4. **開発サーバーの起動**

```bash
pnpm dev
```

アプリケーションは `http://localhost:3000` で起動します。

## 📁 プロジェクト構造

```
timeport-v4/
├── app/                              # Next.js App Router
│   ├── admin/                       # 管理者ページ
│   │   ├── attendance/              # 勤怠管理
│   │   ├── group/                   # グループ管理
│   │   ├── request-forms/           # 申請フォーム管理
│   │   ├── requests/                # 申請管理
│   │   ├── settings/                # 設定管理
│   │   └── users/                   # ユーザー管理
│   ├── api/                         # API Routes
│   │   └── csv-export/              # CSV出力API
│   ├── login/                       # ログインページ
│   ├── member/                      # メンバーページ
│   │   ├── attendance/              # 勤怠記録
│   │   ├── profile/                 # プロフィール
│   │   └── requests/                # 申請機能
│   ├── system-admin/                # システム管理者ページ
│   │   ├── company/                 # 企業管理
│   │   ├── features/                # 機能管理
│   │   └── system/                  # システム設定
│   └── debug/                       # デバッグページ
├── components/                       # 再利用可能コンポーネント
│   ├── admin/                       # 管理者用コンポーネント
│   ├── auth/                        # 認証関連
│   ├── forms/                       # フォーム関連
│   ├── layout/                      # レイアウト関連
│   ├── member/                      # メンバー用コンポーネント
│   ├── notifications/               # 通知システム
│   ├── system-admin/                # システム管理者用
│   └── ui/                          # 基本UIコンポーネント
├── contexts/                        # React Context
│   ├── auth-context.tsx             # 認証状態管理
│   ├── data-context.tsx             # データ状態管理
│   └── page-transition-context.tsx  # ページ遷移管理
├── hooks/                           # カスタムフック
│   └── use-toast.ts                 # トースト通知
├── lib/                             # ユーティリティ・設定
│   ├── actions/                     # Server Actions
│   │   ├── admin/                   # 管理者用アクション
│   │   ├── attendance.ts            # 勤怠関連
│   │   ├── auth.ts                  # 認証関連
│   │   ├── settings.ts              # 設定関連
│   │   └── system-admin/            # システム管理者用
│   ├── provider.ts                  # データプロバイダー
│   ├── mock.ts                      # モックデータ
│   ├── supabase-provider.ts         # Supabase接続
│   ├── supabase.ts                  # Supabase設定
│   └── utils/                       # ヘルパー関数
├── scripts/                         # スクリプト
│   ├── setup-test-users.js          # テストユーザー作成
│   ├── insert-test-attendance.js    # テスト勤怠データ作成
│   └── check-user-work-type.js      # 勤務タイプチェック
├── supabase/                        # データベース
│   └── migrations/                  # マイグレーションファイル
├── types/                           # TypeScript型定義
└── doc/                             # ドキュメント
    ├── data-provider-guide.md       # データプロバイダー設計
    └── db_design.svg                # データベース設計図
```

## 🔧 データプロバイダー設計

TimePortは開発段階に応じてモックデータとSupabaseを切り替える設計を採用しています。

### 切り替え方法

**開発初期（モックデータ使用）:**

```env
NEXT_PUBLIC_USE_SUPABASE=false
```

**本番環境（Supabase使用）:**

```env
NEXT_PUBLIC_USE_SUPABASE=true
```

### 使用例

```typescript
import { getAttendanceData, createRequest } from '@/lib/provider';

// データソースに関係なく同じAPIで使用
const attendanceData = await getAttendanceData(userId);
const result = await createRequest(requestData);
```

詳細は [データプロバイダー設計ガイド](./doc/data-provider-guide.md) を参照してください。

## 🎯 主要機能

### 👨‍💼 管理者機能

- **ダッシュボード** - 全社統計・未処理申請の確認
- **勤怠管理** - 全メンバーの勤怠データ管理・CSV出力
- **申請管理** - 申請の承認・却下処理
- **ユーザー管理** - アカウント作成・編集・削除
- **グループ管理** - 組織構造の管理
- **申請フォーム管理** - 動的フォームの作成・編集
- **設定管理**
  - システム設定（企業情報・タイムゾーン）
  - 通知設定
  - 勤務時間設定
  - 雇用形態・勤務パターン管理

### 👤 メンバー機能

- **ダッシュボード** - 個人統計・クイックアクション
- **打刻** - 出勤・退勤・休憩の記録
- **勤怠一覧** - 個人の勤怠履歴確認
- **申請** - 動的フォームによる各種申請
- **申請一覧** - 申請状況の確認
- **プロフィール** - 個人情報の管理

### 🔧 システム管理者機能

- **企業管理** - 複数企業の管理
- **機能管理** - 機能のON/OFF制御
- **システム設定** - 全体設定の管理

## 🔧 申請フォームビルダー

管理者が自由に申請フォームを作成できる動的フォーム機能：

### サポートする入力タイプ

- テキスト（一行・複数行）
- 数値・日付・時刻・日時
- メールアドレス・電話番号
- 選択肢（ドロップダウン・ラジオボタン）
- チェックボックス・ファイル

### 入力規則設定

- 必須/任意の設定
- 文字数制限・数値範囲
- 正規表現パターン
- カスタムエラーメッセージ

## 🗄️ データベース設計

### 主要テーブル

- **companies** - 企業情報
- **groups** - グループ・組織情報
- **user_profiles** - ユーザー情報
- **user_groups** - ユーザーとグループの関連
- **attendances** - 勤怠記録
- **request_forms** - 申請フォーム定義
- **requests** - 申請データ
- **request_statuses** - 申請ステータス
- **work_types** - 勤務パターン
- **employment_types** - 雇用形態
- **leave_types** - 休暇種別
- **notifications** - 通知データ
- **features** - 機能設定

### 組織階層

```
企業 (companies)
├── グループ (groups)
│   ├── 子グループ
│   └── ユーザー (user_profiles)
└── 機能設定 (features)
```

### セキュリティ

- **Row Level Security (RLS)** - データアクセス制御
- **認証** - Supabase Auth による安全な認証
- **権限管理** - 役割ベースのアクセス制御

## 🚀 本番デプロイ

### Supabaseプロジェクトの準備

1. [Supabase](https://supabase.com/) でプロジェクト作成
2. データベーススキーマの適用:

```bash
# Supabase CLIを使用
supabase db reset --db-url YOUR_DATABASE_URL

# または手動でマイグレーション実行
# supabase/migrations/ 内のSQLファイルを順次実行
```

3. 環境変数の更新:

```env
NEXT_PUBLIC_USE_SUPABASE=true
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Vercelへのデプロイ

```bash
pnpm build
pnpm start
```

または、Vercelに直接デプロイ：

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/canvas-sapporo/timeport-v4)

## 🛠️ 開発

### 推奨開発フロー

1. **モックデータで開発開始** (`NEXT_PUBLIC_USE_SUPABASE=false`)
2. **UI/UX の完成**
3. **Supabase設定** (`NEXT_PUBLIC_USE_SUPABASE=true`)
4. **本番デプロイ**

### 利用可能なスクリプト

```bash
# 開発サーバー起動
pnpm dev

# ビルド
pnpm build

# 本番サーバー起動
pnpm start

# リント
pnpm lint

# 型チェック
pnpm type-check

# テストユーザー作成
pnpm setup-users
```

### コード品質

- **TypeScript** - 型安全性の確保
- **ESLint + Prettier** - コード品質の維持
- **shadcn/ui** - 一貫したUIコンポーネント

## 📝 ライセンス

© 2025, 株式企業テクレア

## 🤝 コントリビューション

### ブランチ戦略

TimePort v4は以下のブランチ戦略を採用しています：

```
main (本番環境)
  ↑
stage (疑似本番環境・テスト・レビュー)
  ↑
dev (開発環境)
  ↑
dev/username/YYYYMMDD-XX (機能ブランチ)
```

### 開発フロー

1. **機能ブランチの作成**

   ```bash
   git checkout stage
   git pull origin stage
   git checkout -b dev/yourname/YYYYMMDD-XX
   ```

   例：`dev/yonezawamasahiro/250731-00`

2. **開発・コミット**

   ```bash
   # 開発作業
   git add .
   git commit -m 'Add: 新機能の追加'
   git push origin dev/yourname/YYYYMMDD-XX
   ```

3. **devブランチへのマージ**

   ```bash
   git checkout dev
   git pull origin dev
   git merge dev/yourname/YYYYMMDD-XX
   git push origin dev
   ```

4. **stageブランチへのマージ**

   ```bash
   git checkout stage
   git pull origin stage
   git merge dev
   git push origin stage
   ```

   - ステージング環境でテスト・レビューを実施
   - 問題がなければ次のステップへ

5. **mainブランチへのマージ（リリース）**

   ```bash
   git checkout main
   git pull origin main
   git merge stage
   git push origin main
   ```

   - 本番環境へのリリース

### コミットメッセージ規約

- **feat**: 新機能
- **fix**: バグ修正
- **docs**: ドキュメント更新
- **style**: コードスタイル修正
- **refactor**: リファクタリング
- **test**: テスト追加・修正
- **chore**: その他の変更

例：`feat: 勤怠打刻機能の追加`

### プルリクエスト

1. 機能ブランチから`dev`ブランチへのプルリクエストを作成
2. コードレビューを実施
3. 承認後にマージ

### 注意事項

- 直接`main`ブランチにコミットしない
- 機能ブランチは`stage`から分岐する
- テスト・レビューは`stage`環境で実施
- リリースは`stage`から`main`へのマージで行う

## 📞 サポート

- **Issues** - [GitHub Issues](https://github.com/canvas-sapporo/timeport-v4/issues)
- **Discussions** - [GitHub Discussions](https://github.com/canvas-sapporo/timeport-v4/discussions)

## 📚 関連ドキュメント

- [データプロバイダー設計ガイド](./doc/data-provider-guide.md)
- [Supabase設定ガイド](./README-SUPABASE-SETUP.md)
- [データベース設計図](./doc/db_design.svg)

---

<div align="center">
  Made with ❤️ by Canvas Sapporo Team
</div>
