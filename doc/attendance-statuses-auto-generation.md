# Attendance Statuses 自動生成機能

## 概要

企業作成時に`attendance_statuses`テーブルにデフォルトの勤怠ステータスが自動生成される機能を実装しました。

## 実装内容

### 1. データベーストリガー方式

企業作成時に`attendance_statuses`を自動生成するために、以下のコンポーネントを実装しました：

#### 1.1 関数: `create_default_attendance_statuses(company_id UUID)`

- **目的**: 指定された企業IDに対してデフォルトの勤怠ステータスを作成
- **重複チェック**: 既に`attendance_statuses`が存在する場合はスキップ
- **作成されるステータス**:
  - `normal` (正常) - 青枠・青文字・白背景
  - `late` (遅刻) - 赤背景・白文字
  - `early_leave` (早退) - オレンジ背景・白文字
  - `absent` (欠勤) - グレー枠・グレー文字・白背景

#### 1.2 トリガー関数: `trigger_create_default_attendance_statuses()`

- **目的**: `companies`テーブルのINSERT操作を監視
- **動作**: 新しい企業が作成された際に`create_default_attendance_statuses`を実行

#### 1.3 トリガー: `create_default_attendance_statuses_trigger`

- **対象テーブル**: `companies`
- **タイミング**: `AFTER INSERT`
- **実行条件**: 各行（`FOR EACH ROW`）

### 2. デフォルトステータスの詳細

| ステータス名  | 表示名 | 色設定                             | ソート順 | 必須 |
| ------------- | ------ | ---------------------------------- | -------- | ---- |
| `normal`      | 正常   | `outline` + 青文字・白背景         | 1        | ✅   |
| `late`        | 遅刻   | `destructive` + 白文字・赤背景     | 2        | ✅   |
| `early_leave` | 早退   | `secondary` + 白文字・オレンジ背景 | 3        | ✅   |
| `absent`      | 欠勤   | `outline` + グレー文字・白背景     | 4        | ✅   |

### 3. ロジック設定

各ステータスには判定ロジックが設定されています：

- **正常**: 勤務セッションがあり、完了したセッションがある
- **遅刻**: 勤務セッションがあり、遅刻時間が0より大きい
- **早退**: 勤務セッションがあり、早退時間が0より大きい
- **欠勤**: 勤務記録が空

## ファイル構成

### マイグレーションファイル

- `supabase/migrations/20250731000040_add_attendance_statuses_trigger.sql`

### 手動実行用スクリプト

- `scripts/create-attendance-statuses-trigger.sql` - トリガー作成・既存企業への適用
- `scripts/test-attendance-statuses-trigger.sql` - トリガーのテスト

## 使用方法

### 1. トリガーの適用

Supabaseの管理画面のSQL Editorで以下を実行：

```sql
-- scripts/create-attendance-statuses-trigger.sql の内容を実行
```

### 2. テスト

トリガーが正しく動作するかをテスト：

```sql
-- scripts/test-attendance-statuses-trigger.sql の内容を実行
```

### 3. 確認

企業ごとの`attendance_statuses`状況を確認：

```sql
SELECT
    c.name as company_name,
    COUNT(as.id) as status_count
FROM companies c
LEFT JOIN attendance_statuses as ON c.id = as.company_id AND as.deleted_at IS NULL
WHERE c.deleted_at IS NULL
GROUP BY c.id, c.name
ORDER BY c.name;
```

## 動作フロー

1. **企業作成**: システム管理者が新しい企業を作成
2. **トリガー発火**: `companies`テーブルにINSERTが実行される
3. **自動生成**: `create_default_attendance_statuses`関数が実行される
4. **ステータス作成**: 4つのデフォルトステータスが作成される
5. **完了**: 企業が正常に作成され、勤怠ステータスが利用可能になる

## 注意事項

- **重複防止**: 既に`attendance_statuses`が存在する企業には作成されません
- **必須ステータス**: 作成されるステータスは全て`is_required = true`で設定されます
- **削除保護**: 必須ステータスは削除できません（既存のトリガーで保護）
- **既存企業**: トリガー適用時に既存の企業にも自動的に`attendance_statuses`が作成されます

## 既存の機能との統合

この実装により、以下の既存機能と統合されます：

- **雇用形態の自動生成**: `employment_types`の自動生成トリガーと同様の仕組み
- **企業機能の自動生成**: `features`テーブルの自動生成（アプリケーション側）
- **勤怠ステータス管理**: 管理者が後からカスタムステータスを追加可能

## トラブルシューティング

### 問題: 企業作成時に`attendance_statuses`が作成されない

**確認事項**:

1. トリガーが正しく作成されているか
2. `attendance_statuses`テーブルが存在するか
3. 権限設定が正しいか

**解決方法**:

```sql
-- トリガーの存在確認
SELECT * FROM information_schema.triggers
WHERE trigger_name = 'create_default_attendance_statuses_trigger';

-- 手動で関数を実行
SELECT create_default_attendance_statuses('企業ID');
```

### 問題: 既存企業に`attendance_statuses`が作成されない

**解決方法**:

```sql
-- 既存企業に対して手動実行
DO $$
DECLARE
    company_record RECORD;
BEGIN
    FOR company_record IN SELECT id FROM companies WHERE deleted_at IS NULL
    LOOP
        PERFORM create_default_attendance_statuses(company_record.id);
    END LOOP;
END $$;
```
