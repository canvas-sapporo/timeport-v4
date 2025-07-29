require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Supabaseクライアントの初期化
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createTestReportTemplates() {
  try {
    console.log('テストレポートテンプレートの作成を開始します...');

    // 会社IDを取得（最初の会社を使用）
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id')
      .limit(1);

    if (companiesError || !companies.length) {
      console.error('会社が見つかりません');
      return;
    }

    const companyId = companies[0].id;
    console.log('会社ID:', companyId);

    // 日報テンプレート
    const dailyReportTemplate = {
      company_id: companyId,
      name: '日報テンプレート',
      description: '毎日の業務報告用',
      form_config: [
        {
          id: 'work_content',
          type: 'textarea',
          label: '今日の作業内容',
          required: true,
          placeholder: '本日実施した作業を記入してください',
          options: {
            markdown: true,
            preview: true,
            rows: 5,
          },
        },
        {
          id: 'tomorrow_plan',
          type: 'textarea',
          label: '明日の予定',
          required: true,
          placeholder: '明日の作業予定を記入してください',
          options: {
            markdown: true,
            preview: true,
            rows: 3,
          },
        },
        {
          id: 'issues',
          type: 'textarea',
          label: '課題・問題点',
          required: false,
          placeholder: '課題や問題点があれば記入してください',
          options: {
            markdown: true,
            preview: true,
            rows: 3,
          },
        },
        {
          id: 'work_hours',
          type: 'number',
          label: '作業時間',
          required: true,
          default_value: 8.0,
          options: {
            min: 0,
            max: 24,
            step: 0.5,
          },
        },
      ],
      approval_flow: {
        type: 'static',
        approvers: [],
      },
      status_flow: {
        transitions: [
          { from: '作成中', to: '提出済み', action: 'submit' },
          { from: '提出済み', to: '未読', action: 'auto' },
          { from: '未読', to: '既読', action: 'read' },
          { from: '既読', to: 'レビュー', action: 'review' },
          { from: 'レビュー', to: '完了', action: 'approve' },
          { from: 'レビュー', to: '再提出', action: 'reject' },
          { from: '再提出', to: '提出済み', action: 'resubmit' },
        ],
      },
      is_active: true,
    };

    // 週報テンプレート
    const weeklyReportTemplate = {
      company_id: companyId,
      name: '週報テンプレート',
      description: '週次の業務報告用',
      form_config: [
        {
          id: 'weekly_summary',
          type: 'textarea',
          label: '今週の業務サマリー',
          required: true,
          placeholder: '今週実施した業務の概要を記入してください',
          options: {
            markdown: true,
            preview: true,
            rows: 6,
          },
        },
        {
          id: 'next_week_plan',
          type: 'textarea',
          label: '来週の予定',
          required: true,
          placeholder: '来週の業務予定を記入してください',
          options: {
            markdown: true,
            preview: true,
            rows: 4,
          },
        },
        {
          id: 'achievements',
          type: 'textarea',
          label: '成果・達成事項',
          required: false,
          placeholder: '今週達成した成果があれば記入してください',
          options: {
            markdown: true,
            preview: true,
            rows: 3,
          },
        },
      ],
      approval_flow: {
        type: 'static',
        approvers: [],
      },
      status_flow: {
        transitions: [
          { from: '作成中', to: '提出済み', action: 'submit' },
          { from: '提出済み', to: '未読', action: 'auto' },
          { from: '未読', to: '既読', action: 'read' },
          { from: '既読', to: 'レビュー', action: 'review' },
          { from: 'レビュー', to: '完了', action: 'approve' },
          { from: 'レビュー', to: '再提出', action: 'reject' },
          { from: '再提出', to: '提出済み', action: 'resubmit' },
        ],
      },
      is_active: true,
    };

    // テンプレートを作成
    const { data: dailyResult, error: dailyError } = await supabase
      .from('report_templates')
      .insert(dailyReportTemplate)
      .select()
      .single();

    if (dailyError) {
      console.error('日報テンプレート作成エラー:', dailyError);
    } else {
      console.log('日報テンプレート作成成功:', dailyResult.id);
    }

    const { data: weeklyResult, error: weeklyError } = await supabase
      .from('report_templates')
      .insert(weeklyReportTemplate)
      .select()
      .single();

    if (weeklyError) {
      console.error('週報テンプレート作成エラー:', weeklyError);
    } else {
      console.log('週報テンプレート作成成功:', weeklyResult.id);
    }

    console.log('テストレポートテンプレートの作成が完了しました');
  } catch (error) {
    console.error('エラーが発生しました:', error);
  }
}

// スクリプトを実行
createTestReportTemplates();
