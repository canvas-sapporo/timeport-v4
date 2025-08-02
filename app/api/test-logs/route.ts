import { NextRequest, NextResponse } from 'next/server';
import { logSystem, logAudit, logInfo, logError } from '@/lib/utils/log-system';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, message, data } = body;

    switch (type) {
      case 'system':
        await logSystem('info', message || 'テストシステムログ', data);
        break;
      case 'audit':
        await logAudit(message || 'テスト監査ログ', {
          user_id: 'test-user',
          company_id: 'test-company',
          target_type: 'test',
          target_id: 'test-id',
          before_data: undefined,
          after_data: data,
          details: { test: true },
        });
        break;
      case 'info':
        await logInfo(message || 'テスト情報ログ', data);
        break;
      case 'error':
        await logError(message || 'テストエラーログ', new Error('テストエラー'), data);
        break;
      default:
        return NextResponse.json({ error: 'Invalid log type' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'ログが記録されました' });
  } catch (error) {
    console.error('Test log error:', error);
    return NextResponse.json({ error: 'ログ記録に失敗しました' }, { status: 500 });
  }
} 