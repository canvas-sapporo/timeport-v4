import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    
    const { data, error } = await supabase
      .from('log_settings')
      .select('*')
      .order('setting_key');

    if (error) {
      return NextResponse.json(
        { error: `Failed to fetch log settings: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('Error fetching log settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, value, description } = body;

    const supabase = createAdminClient();
    
    const { error } = await supabase
      .from('log_settings')
      .upsert({
        setting_key: key,
        setting_value: value,
        description,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      return NextResponse.json(
        { error: `Failed to update log setting: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating log setting:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 