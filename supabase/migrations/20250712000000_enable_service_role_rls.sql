-- サービスロールキーでuser_profilesとuser_groupsにINSERT/SELECTできるRLSポリシー

-- user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role insert" ON user_profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Allow service role select" ON user_profiles
  FOR SELECT
  TO service_role
  USING (true);

-- user_groups
ALTER TABLE user_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role insert" ON user_groups
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Allow service role select" ON user_groups
  FOR SELECT
  TO service_role
  USING (true); 