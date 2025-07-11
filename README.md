# TimePort - 勤怠管理システム

<div align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js" alt="Next.js">
  <img src="https://img.shields.io/badge/TypeScript-blue?style=for-the-badge&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase">
  <img src="https://img.shields.io/badge/Tailwind%20CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS">
</div>

## 📋 概要

TimePortは、現代の企業ニーズに応える高機能な勤怠管理システムです。スーパー管理者と管理者、一般ユーザーの両方に対応し、柔軟な設定機能と直感的なUIを提供します。

### ✨ 主な特徴

- 🕐 **リアルタイム打刻** - 正確な勤怠記録
- 📊 **ダッシュボード** - 勤怠状況の可視化
- 📝 **動的申請フォーム** - カスタマイズ可能な申請システム
- 👥 **ユーザー管理** - 組織階層に応じた権限管理
- ⚙️ **柔軟な設定** - 会社・グループ・個人レベルでの設定
- 📱 **レスポンシブデザイン** - あらゆるデバイスに対応

## 🏗️ 技術スタック

### フロントエンド
- **Next.js 15** (App Router)
- **TypeScript** - 型安全性
- **Tailwind CSS** - スタイリング
- **shadcn/ui** - UIコンポーネント
- **React Hook Form + Zod** - フォーム管理・バリデーション

### バックエンド
- **Supabase** - データベース・認証
- **PostgreSQL** - データストレージ
- **Row Level Security** - データセキュリティ

### 開発ツール
- **date-fns** - 日付処理
- **Lucide React** - アイコン
- **React Query/SWR** - データフェッチング

## 🚀 クイックスタート

### 前提条件

- Node.js 22以上
- npm または yarn、pnpm
- Vercelアカウント
- Supabaseアカウント（本番環境用）

### インストール

1. **リポジトリのクローン**
```bash
git clone https://github.com/canvas-sapporo/timeport-v4.git
cd timeport-v4
```

2. **依存関係のインストール**
```bash
npm install
# または
yarn install
# または
pnpm install
```

3. **環境変数の設定**
```bash
cp .env.example .env.development
```

`.env.development` を編集：
```env
# データソース切り替え（開発初期はモック使用）
NEXT_PUBLIC_USE_SUPABASE=false

# Supabase設定（将来使用）
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

4. **開発サーバーの起動**
```bash
npm run dev
# または
yarn dev
# または
pnpm run dev
```

アプリケーションは `http://localhost:3000` で起動します。

## 📁 プロジェクト構造

```
src/
├── app/                              # Next.js App Router
│   ├── admin/                       # 管理者ページ
│   ├── login/                       # ログインページ
│   ├── member/                      # 一般ユーザーページ
│   └── super-admin/                 # スーパー管理者ページ
├── components/                       # 再利用可能コンポーネント
│   ├── form/                        # フォーム関連
│   ├── layout/                      # レイアウト関連
│   └── ui/                           # UI関連
├── contexts/                        # グローバルな値
│   ├── auth-context.tsx             # 認証関連
│   ├── data-context.tsx             # その他データ
│   └── page-transition-context.tsx  # ローディング関連
├── doc/
│   └── data-provider-guide.md       # データプロバイダー設計ガイド
├── hooks/                            # カスタムフック
│   └── use-toast.ts                 # 通知システム（成功、エラー、警告、情報などの一時的なメッセージを表示）
├── lib/                              # ユーティリティ・設定
│   ├── provider.ts                  # 認証
│   ├── provider.ts                 # データプロバイダー（モック/Supabase切り替え）
│   ├── mock.ts                     # モックデータ
│   ├── supabase.ts                 # Supabase接続
│   └── utils/                      # ヘルパー関数
├── supabase/                              # データベース
│   └── migrations/                 # データベース構築用SQL
└── types/                           # TypeScript型定義

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
import { getAttendanceData, getUserData } from '@/lib/provider';

// データソースに関係なく同じAPIで使用
const attendanceData = await getAttendanceData();
const userData = await getUserData();
```

詳細は [データプロバイダー設計ガイド](./doc/data-provider-guide.md) を参照してください。

## 🎯 主要機能

### 👨‍💼 管理者機能

- **ダッシュボード** - 全社統計・未処理申請の確認
- **勤怠管理** - 全社員の勤怠データ管理・Excel出力
- **申請管理** - 申請の承認・却下処理
- **ユーザー管理** - アカウント作成・編集・削除
- **設定**
  - システム設定（会社情報・タイムゾーン）
  - 通知設定
  - 申請フォームビルダー（動的フォーム作成）
  - 組織設定（会社・部署・個人階層）

### 👤 一般ユーザー機能

- **ダッシュボード** - 個人統計・クイックアクション
- **打刻** - 出勤・退勤・休憩の記録
- **勤怠一覧** - 個人の勤怠履歴確認
- **申請** - 動的フォームによる各種申請
- **申請一覧** - 申請状況の確認

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

- **user_profiles** - ユーザー情報
- **attendance_records** - 勤怠記録
- **requests** - 申請データ
- **request_types** - 申請種別（動的フォーム定義）
- **feature_settings** - 機能ON/OFF設定
- **work_time_settings** - 勤務時間設定

組織階層：`会社 < グループ < 個人`

詳細なスキーマは [00_initial.sql](./doc/sql/00_initial.sql) を参照してください。

## 🚀 本番デプロイ

### Supabaseプロジェクトの準備

1. [Supabase](https://supabase.com/) でプロジェクト作成
2. データベーススキーマの適用:
```bash
# Supabase CLIを使用
supabase db reset --db-url YOUR_DATABASE_URL
```

3. 環境変数の更新:
```env
NEXT_PUBLIC_USE_SUPABASE=true
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Vercelへのデプロイ

```bash
npm run build
npm run start
```

または、Vercelに直接デプロイ：

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/canvas-sapporo/timeport-v4)

## 🔐 セキュリティ

- **Row Level Security** - Supabaseによるデータアクセス制御
- **認証** - Supabase Auth による安全な認証
- **権限管理** - 管理者・一般ユーザーの明確な権限分離
- **入力検証** - Zodによる厳密なバリデーション

## 🛠️ 開発

### 推奨開発フロー

1. **モックデータで開発開始** (`NEXT_PUBLIC_USE_SUPABASE=false`)
2. **UI/UX の完成**
3. **Supabase設定** (`NEXT_PUBLIC_USE_SUPABASE=true`)
4. **本番デプロイ**

### コード品質

- **TypeScript** - 型安全性の確保
- **ESLint + Prettier** - コード品質の維持
- **Husky** - コミット前チェック

## 📝 ライセンス

© 2025, 株式会社テクレア

## 🤝 コントリビューション

1. このリポジトリをフォーク
2. 新しいブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. Pull Request を作成

## 📞 サポート

- **Issues** - [GitHub Issues](https://github.com/canvas-sapporo/timeport-v4/issues)
- **Discussions** - [GitHub Discussions](https://github.com/canvas-sapporo/timeport-v4/discussions)

## 📚 関連ドキュメント

- [データプロバイダー設計ガイド](./doc/data-provider-guide.md)
- [API仕様書](./doc/api-specification.md)
- [デプロイメントガイド](./doc/deployment-guide.md)

---

<div align="center">
  Made with ❤️ by Canvas Sapporo Team
</div>