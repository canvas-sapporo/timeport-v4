-- attendancesテーブルのデータを削除するスクリプト
-- 注意: このスクリプトは全ての勤怠データを削除します

-- 既存のattendancesデータを全て削除
DELETE FROM attendances;

-- 削除結果を確認
SELECT COUNT(*) as remaining_records FROM attendances;

-- 確認メッセージ
DO $$
BEGIN
    RAISE NOTICE 'attendancesテーブルのデータを削除しました';
    RAISE NOTICE '新しいclock_records構造でクリーンな状態になりました';
END $$; 