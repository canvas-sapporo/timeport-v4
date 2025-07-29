# 勤怠計算ロジック修正

## 概要

遅刻・早退時間の計算ロジックとステータス判定ロジックを根本的に修正しました。

## 問題点

### 1. 遅刻時間の計算問題

- **問題**: 遅刻許容時間（15分）が考慮されていない
- **影響**: 遅刻しているのに「正常」ステータスになっていた

### 2. 早退時間の計算問題

- **問題**: 早退時間の計算ロジックが実装されていない
- **影響**: 早退しているのに「正常」ステータスになっていた

### 3. ステータス判定の優先順位問題

- **問題**: 遅刻・早退の判定が正常判定より優先されていない
- **影響**: 遅刻・早退しているのに「正常」ステータスになっていた

## 修正内容

### 1. 遅刻時間の計算ロジック修正

**修正前:**

```typescript
const lateMinutesCalc = Math.floor(timeDiff / (1000 * 60));
if (lateMinutesCalc > lateThreshold) {
  lateMinutes = lateMinutesCalc; // 遅刻許容時間を差し引いていない
}
```

**修正後:**

```typescript
const lateMinutesCalc = Math.floor(timeDiff / (1000 * 60));
if (lateMinutesCalc > lateThreshold) {
  lateMinutes = lateMinutesCalc - lateThreshold; // 遅刻許容時間を差し引く
}
```

### 2. 早退時間の計算ロジック追加

**新規実装:**

```typescript
// 早退時間を計算
let earlyLeaveMinutes = 0;
if (workType && attendance.clock_records && attendance.clock_records.length > 0) {
  const lastClockOut = attendance.clock_records[attendance.clock_records.length - 1]?.out_time;
  if (lastClockOut && workType.work_end_time) {
    const clockOutDate = new Date(lastClockOut);
    const workDate = new Date(attendance.work_date);

    // 勤務形態の終了時刻を取得
    const [endHour, endMinute] = workType.work_end_time.split(':').map(Number);
    const workEndTime = new Date(workDate);
    workEndTime.setHours(endHour, endMinute, 0, 0);

    // 早退判定（勤務形態の設定に基づく）
    const timeDiff = workEndTime.getTime() - clockOutDate.getTime();
    const earlyLeaveMinutesCalc = Math.floor(timeDiff / (1000 * 60));

    if (earlyLeaveMinutesCalc > 0) {
      earlyLeaveMinutes = earlyLeaveMinutesCalc;
    }
  }
}
```

### 3. ステータス判定の優先順位修正

**修正前:**

```typescript
// 遅刻判定のみ
if (record.late_minutes && record.late_minutes > 0) {
  return 'late';
}
return 'normal';
```

**修正後:**

```typescript
// ステータス判定の優先順位（重要度順）
// 1. 遅刻判定（late_minutesフィールドを使用）
if (record.late_minutes && record.late_minutes > 0) {
  return 'late';
}

// 2. 早退判定（early_leave_minutesフィールドを使用）
if (record.early_leave_minutes && record.early_leave_minutes > 0) {
  return 'early_leave';
}

return 'normal';
```

### 4. データベースクエリの修正

**修正内容:**

- `work_types`テーブルから`work_end_time`も取得するように修正
- `early_leave_minutes`を返り値に追加

## 修正されたファイル

### 1. アプリケーションコード

- `lib/actions/attendance.ts` - 遅刻・早退時間の計算ロジック修正
- `app/admin/attendance/page.tsx` - ステータス判定の優先順位修正

### 2. データベース修正スクリプト

- `scripts/fix-attendance-calculations.sql` - 既存データの再計算

## 計算例

### 遅刻の例

- **勤務開始時刻**: 10:00
- **出勤時刻**: 13:11
- **遅刻許容時間**: 15分
- **計算**: 13:11 - 10:00 - 15分 = 2時間56分（176分）
- **結果**: 遅刻ステータス

### 早退の例

- **勤務終了時刻**: 15:00
- **退勤時刻**: 13:33
- **計算**: 15:00 - 13:33 = 1時間27分（87分）
- **結果**: 早退ステータス

## 適用手順

### 1. アプリケーションコードの適用

```bash
# コードの変更は既に適用済み
```

### 2. データベースの修正

Supabaseの管理画面のSQL Editorで以下を実行：

```sql
-- scripts/fix-attendance-calculations.sql の内容を実行
```

### 3. 動作確認

1. 管理者画面で勤怠一覧を確認
2. 遅刻・早退の記録が正しく表示されることを確認
3. ステータスが正しく判定されることを確認

## 期待される結果

### 修正前の問題

- 出勤時刻13:11（勤務開始10:00より3時間11分遅刻）→ ステータス「正常」
- 退勤時刻13:33（勤務終了15:00より1時間27分早退）→ ステータス「正常」

### 修正後の結果

- 出勤時刻13:11（遅刻許容時間15分を差し引いて2時間56分遅刻）→ ステータス「遅刻」
- 退勤時刻13:33（1時間27分早退）→ ステータス「早退」

## 注意事項

1. **遅刻と早退の両方が発生した場合**: 遅刻を優先して「遅刻」ステータスになります
2. **遅刻許容時間**: 勤務形態の設定に基づいて動的に変更されます
3. **既存データ**: 修正スクリプトで既存のデータも正しく再計算されます
4. **新規データ**: 今後作成される勤怠記録は修正されたロジックで計算されます

## トラブルシューティング

### 問題: 修正後も正しく表示されない

**確認事項:**

1. データベースの修正スクリプトが実行されているか
2. 勤務形態の設定が正しいか
3. `clock_records`のデータが正しいか

**解決方法:**

```sql
-- 特定の勤怠記録の詳細を確認
SELECT
    a.id,
    a.work_date,
    a.clock_records,
    a.late_minutes,
    a.early_leave_minutes,
    a.status,
    wt.work_start_time,
    wt.work_end_time,
    wt.late_threshold_minutes
FROM attendances a
LEFT JOIN work_types wt ON a.work_type_id = wt.id
WHERE a.id = '対象のID';
```

### 問題: 遅刻許容時間が反映されない

**確認事項:**

1. `work_types`テーブルの`late_threshold_minutes`が設定されているか
2. 勤務形態が正しく設定されているか

**解決方法:**

```sql
-- 勤務形態の設定を確認
SELECT
    id,
    name,
    work_start_time,
    work_end_time,
    late_threshold_minutes
FROM work_types
WHERE deleted_at IS NULL;
```
