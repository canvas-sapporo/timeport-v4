# TimePort データプロバイダー設計ガイド

## 概要

TimePortは開発段階に応じてモックデータとSupabaseを切り替える設計を採用しています。これにより、データベースの準備を待たずにフロントエンド開発を進めることができ、本番環境への移行もスムーズに行えます。

## 技術設計

### アーキテクチャ

```
lib/
├── provider.ts          # データ取得の統一インターフェース
├── mock.ts             # 開発・テスト用モックデータ
└── supabase-provider.ts # 本番用データベース接続
```

### データ切り替えメカニズム

環境変数 `NEXT_PUBLIC_USE_SUPABASE` で制御：

- `false`: モックデータを使用（開発初期）
- `true`: Supabaseを使用（本番環境）

### 統一インターフェース

`provider.ts` がハブとして機能し、環境変数に基づいて適切な実装を選択：

```typescript
const USE_SUPABASE = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';

export const getAttendanceData = USE_SUPABASE
  ? require('./supabase-provider').getAttendanceData
  : require('./mock').getAttendanceData;
```

## 実装されている機能

### 勤怠管理

- `getAttendanceData()` - 勤怠記録取得
- `getTodayAttendance()` - 当日勤怠取得
- `clockIn()` - 出勤打刻
- `clockOut()` - 退勤打刻
- `startBreak()` - 休憩開始
- `endBreak()` - 休憩終了

### ユーザー管理

- `getUserData()` - ユーザー一覧取得
- `getUserProfile()` - ユーザープロフィール取得
- `updateUserProfile()` - プロフィール更新

### 申請管理

- `getApplicationData()` - 申請データ取得
- `createApplication()` - 申請作成
- `updateApplicationStatus()` - 申請ステータス更新
- `getApplicationTypes()` - 申請種別取得

### ダッシュボード

- `getDashboardData()` - ユーザーダッシュボード
- `getAdminDashboardData()` - 管理者ダッシュボード

### 設定・組織

- `getSettingsData()` - 設定データ取得
- `getOrganizationData()` - 組織データ取得
- `getDepartments()` - グループ一覧取得
- `getWorkplaces()` - 勤務地一覧取得

### 通知

- `getNotifications()` - 通知取得
- `markNotificationAsRead()` - 通知既読化

### 認証

- `authenticateUser()` - ユーザー認証
- `logoutUser()` - ログアウト

## 使用方法

### 画面コンポーネントでの使用例

```typescript
import { getDashboardData, getAttendanceData } from '@/lib/provider';

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getDashboardData(userId);
        setDashboardData(data);
      } catch (error) {
        console.error('データ取得エラー:', error);
      }
    };

    fetchData();
  }, [userId]);

  return (
    <div>
      {/* ダッシュボード表示 */}
    </div>
  );
}
```

## 切り替え手順

### 1. 開発初期（モック使用）

```bash
# .env.development
NEXT_PUBLIC_USE_SUPABASE=false
```

この設定で、すべてのデータ取得がモックデータから行われます。

### 2. Supabaseへ移行

```bash
# 1. Supabaseプロジェクト作成
# 2. テーブル作成（supabase/migrations/を使用）
# 3. 環境変数更新

# .env.production
NEXT_PUBLIC_USE_SUPABASE=true
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## モックデータの特徴

### リアルなデータ生成

- 過去30日分の勤怠データを自動生成
- ランダムな出退勤時刻とバリエーション
- 現実的な残業時間計算

### API遅延シミュレーション

```typescript
export const getAttendanceData = async (userId?: string) => {
  await new Promise((resolve) => setTimeout(resolve, 500)); // API遅延をシミュレート
  // データ処理...
};
```

### データ永続化シミュレーション

モック環境でも打刻や申請作成などの操作結果が一時的に保持されます。

## メリット

### 開発効率の向上

- データベース準備を待たずにUI/UX開発可能
- フロントエンドとバックエンドの並行開発
- テスト環境の迅速な構築

### 本番移行の容易さ

- 環境変数の変更のみで切り替え可能
- インターフェースの統一により修正箇所が最小限
- 段階的な移行が可能

### テスト・デバッグの効率化

- 予測可能なモックデータでテスト
- ネットワーク遅延の影響を受けない
- エラーケースの再現が容易

## 注意点

### データ構造の統一

モックデータとSupabaseのデータ構造を一致させる必要があります：

```typescript
// モック
const mockUser = {
  id: 'user1',
  employeeId: 'A001',
  name: '田中太郎',
};

// Supabase
const supabaseUser = {
  id: 'uuid',
  employee_id: 'A001', // スネークケース
  name: '田中太郎',
};
```

### 環境変数の設定漏れ

本番環境で `NEXT_PUBLIC_USE_SUPABASE=true` の設定を忘れないよう注意してください。

### エラーハンドリング

両方の実装で一貫したエラーハンドリングを実装してください：

```typescript
try {
  const data = await getAttendanceData(userId);
  // 成功処理
} catch (error) {
  console.error('データ取得エラー:', error);
  // エラー処理
}
```

## 拡張方法

新しい機能を追加する場合：

1. `provider.ts` にインターフェースを追加
2. `mock.ts` にモック実装を追加
3. `supabase-provider.ts` にSupabase実装を追加

```typescript
// provider.ts
export const getNewFeatureData = USE_SUPABASE
  ? require('./supabase-provider').getNewFeatureData
  : require('./mock').getNewFeatureData;

// mock.ts
export const getNewFeatureData = async () => {
  await new Promise((resolve) => setTimeout(resolve, 400));
  return { data: mockNewFeatureData };
};

// supabase-provider.ts
export const getNewFeatureData = async () => {
  const { data, error } = await supabase.from('new_feature_table').select('*');

  if (error) throw error;
  return { data: data || [] };
};
```

## まとめ

このデータプロバイダー設計により、TimePortは開発効率と本番品質の両方を実現しています。モックデータでの迅速な開発から、Supabaseを使った本格的なデータベース運用まで、シームレスな移行が可能です。
