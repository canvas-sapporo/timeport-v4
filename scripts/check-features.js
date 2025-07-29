const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('環境変数が設定されていません');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkFeatures() {
  try {
    console.log('=== 機能テーブルの状態確認 ===');

    // 1. 全機能を取得
    const { data: allFeatures, error: allFeaturesError } = await supabase
      .from('features')
      .select('*')
      .order('company_id, feature_code');

    if (allFeaturesError) {
      console.error('全機能取得エラー:', allFeaturesError);
      return;
    }

    console.log('全機能数:', allFeatures?.length || 0);
    console.log('機能一覧:');
    allFeatures?.forEach((feature) => {
      console.log(`  - ${feature.company_id} | ${feature.feature_code} | ${feature.is_active}`);
    });

    // 2. 特定の企業の機能を確認
    const targetCompanyId = '1d029bec-497c-4486-bccc-7169ad044e1e';
    const { data: companyFeatures, error: companyFeaturesError } = await supabase
      .from('features')
      .select('*')
      .eq('company_id', targetCompanyId)
      .order('feature_code');

    if (companyFeaturesError) {
      console.error('企業機能取得エラー:', companyFeaturesError);
      return;
    }

    console.log(`\n企業 ${targetCompanyId} の機能:`);
    console.log('機能数:', companyFeatures?.length || 0);
    companyFeatures?.forEach((feature) => {
      console.log(`  - ${feature.feature_code}: ${feature.is_active}`);
    });

    // 3. 企業情報も確認
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', targetCompanyId)
      .single();

    if (companyError) {
      console.error('企業情報取得エラー:', companyError);
      return;
    }

    console.log(`\n企業情報:`);
    console.log(`  - ID: ${company.id}`);
    console.log(`  - 名前: ${company.name}`);
    console.log(`  - アクティブ: ${company.is_active}`);
  } catch (error) {
    console.error('エラー:', error);
  }
}

checkFeatures();
