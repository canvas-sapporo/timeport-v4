-- Fix settings RLS policies with simplified company access control
-- Drop existing policies
DROP POLICY IF EXISTS "Users can read their own settings" ON settings;
DROP POLICY IF EXISTS "Users can read role default settings" ON settings;
DROP POLICY IF EXISTS "Users can read system default settings" ON settings;
DROP POLICY IF EXISTS "Admins can read company settings" ON settings;
DROP POLICY IF EXISTS "Users can manage their own settings" ON settings;
DROP POLICY IF EXISTS "Admins can manage role default settings" ON settings;
DROP POLICY IF EXISTS "Company admins can manage company settings" ON settings;
DROP POLICY IF EXISTS "System admins can manage all settings" ON settings;

-- Create simplified policies that use user_profiles.company_id

-- 個人設定の読み取り（自分の設定のみ）
CREATE POLICY "Users can read their own settings" ON settings
    FOR SELECT USING (
        auth.uid() = user_id AND deleted_at IS NULL
    );

-- ロール別デフォルト設定の読み取り
CREATE POLICY "Users can read role default settings" ON settings
    FOR SELECT USING (
        user_id IS NULL AND company_id IS NULL AND role = (
            SELECT role FROM user_profiles WHERE id = auth.uid()
        ) AND deleted_at IS NULL
    );

-- システムデフォルト設定の読み取り（全ユーザー）
CREATE POLICY "Users can read system default settings" ON settings
    FOR SELECT USING (
        role = 'system-admin' AND user_id IS NULL AND company_id IS NULL AND deleted_at IS NULL
    );

-- 企業固有設定の読み取り（同じ企業のユーザーのみ）
CREATE POLICY "Users can read company settings" ON settings
    FOR SELECT USING (
        company_id IS NOT NULL AND
        company_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid())
        AND deleted_at IS NULL
    );

-- 個人設定の作成・更新・削除（自分の設定のみ）
CREATE POLICY "Users can manage their own settings" ON settings
    FOR ALL USING (
        auth.uid() = user_id AND deleted_at IS NULL
    );

-- 管理者はロール別デフォルト設定を管理可能
CREATE POLICY "Admins can manage role default settings" ON settings
    FOR ALL USING (
        user_id IS NULL AND company_id IS NULL AND role = (
            SELECT role FROM user_profiles WHERE id = auth.uid()
        ) AND deleted_at IS NULL
    );

-- 企業管理者は企業固有設定を管理可能（同じ企業の管理者のみ）
CREATE POLICY "Company admins can manage company settings" ON settings
    FOR ALL USING (
        company_id IS NOT NULL AND
        company_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid()) AND
        (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('admin', 'system-admin') AND
        deleted_at IS NULL
    );

-- システム管理者は全設定を管理可能
CREATE POLICY "System admins can manage all settings" ON settings
    FOR ALL USING (
        (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'system-admin' AND deleted_at IS NULL
    ); 