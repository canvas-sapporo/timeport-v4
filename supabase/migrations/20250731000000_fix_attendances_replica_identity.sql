-- attendancesテーブルのreplica identityを設定
-- リアルタイム更新の問題を解決するため

-- 既存のreplica identityを削除（存在する場合）
ALTER TABLE attendances REPLICA IDENTITY NOTHING;

-- 新しいreplica identityを設定（主キーのみ）
ALTER TABLE attendances REPLICA IDENTITY DEFAULT;

-- 確認用のクエリ
DO $$
BEGIN
    RAISE NOTICE 'attendancesテーブルのreplica identity設定完了';
    RAISE NOTICE 'replica identity: %', (SELECT relreplident FROM pg_class WHERE relname = 'attendances');
END $$;