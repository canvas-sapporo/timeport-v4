import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getSetting } from '@/lib/actions/settings';
import type { CsvExportSetting } from '@/types/settings';

// CSV出力用のAPIエンドポイント
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await request.json();
    const { userId, role, settingId, period, columns, format } = body;

    // ユーザー認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // 権限チェック
    if (user.id !== userId && role !== 'system-admin') {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 });
    }

    // 設定を取得
    let csvSetting: CsvExportSetting;
    if (settingId) {
      const setting = await getSetting(userId, role, 'csv_export', settingId);
      if (!setting) {
        return NextResponse.json({ error: '設定が見つかりません' }, { status: 404 });
      }
      csvSetting = setting.setting_value as CsvExportSetting;
    } else {
      // デフォルト設定を使用
      csvSetting = {
        name: 'デフォルト',
        period: period || { type: 'date_range', start_date: null, end_date: null },
        columns: columns || [
          'date',
          'clock_in',
          'clock_out',
          'work_hours',
          'overtime',
          'break_time',
          'work_type',
          'late',
          'early_leave',
          'status',
          'approval_status',
          'approver',
          'updated_at',
          'notes',
        ],
        format: format || {
          encoding: 'UTF-8',
          delimiter: 'comma',
          date_format: 'YYYY/MM/DD',
          time_format: 'HH:MM',
          empty_value: 'blank',
        },
      };
    }

    // 勤怠データを取得
    let query = supabase
      .from('attendances')
      .select(
        `
        *,
        user_profiles!inner(
          id,
          code,
          family_name,
          first_name,
          role
        ),
        work_types(
          name
        )
      `
      )
      .is('deleted_at', null);

    // 権限による絞り込み
    if (role === 'member') {
      query = query.eq('user_id', userId);
    } else if (role === 'admin') {
      // 所属グループのユーザーの勤怠を取得
      const { data: userGroups } = await supabase
        .from('user_groups')
        .select('group_id')
        .eq('user_id', userId)
        .is('deleted_at', null);

      if (userGroups && userGroups.length > 0) {
        const groupIds = userGroups.map((ug) => ug.group_id);
        const { data: groupUsers } = await supabase
          .from('user_groups')
          .select('user_id')
          .in('group_id', groupIds)
          .is('deleted_at', null);

        if (groupUsers && groupUsers.length > 0) {
          const userIds = groupUsers.map((gu) => gu.user_id);
          query = query.in('user_id', userIds);
        }
      }
    }
    // system-adminは全データを取得

    // 期間フィルター
    if (csvSetting.period.start_date) {
      query = query.gte('work_date', csvSetting.period.start_date);
    }
    if (csvSetting.period.end_date) {
      query = query.lte('work_date', csvSetting.period.end_date);
    }

    const { data: attendances, error } = await query.order('work_date', { ascending: false });

    if (error) {
      console.error('勤怠データ取得エラー:', error);
      return NextResponse.json({ error: 'データの取得に失敗しました' }, { status: 500 });
    }

    if (!attendances || attendances.length === 0) {
      return NextResponse.json({ error: '出力するデータがありません' }, { status: 404 });
    }

    // CSVデータを生成
    const csvData = generateCsvData(attendances, csvSetting);

    // ファイル名を生成
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 14);
    const userProfile = attendances[0]?.user_profiles;
    const fileName = `${timestamp}_${userProfile?.code || 'unknown'}_${userProfile?.family_name}${userProfile?.first_name}_${csvSetting.period.start_date || 'all'}-${csvSetting.period.end_date || 'all'}.csv`;

    // レスポンスヘッダーを設定
    const headers = new Headers();
    headers.set('Content-Type', 'text/csv; charset=utf-8');
    headers.set('Content-Disposition', `attachment; filename="${fileName}"`);

    return new NextResponse(csvData, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('CSV出力エラー:', error);
    return NextResponse.json({ error: 'CSV出力に失敗しました' }, { status: 500 });
  }
}

// CSVデータを生成する関数
function generateCsvData(attendances: any[], setting: CsvExportSetting): string {
  const delimiter = setting.format.delimiter === 'comma' ? ',' : '\t';
  const emptyValue = setting.format.empty_value === 'blank' ? '' : '--';

  // ヘッダー行を生成
  const headers = setting.columns.map((column) => {
    const headerMap: { [key: string]: string } = {
      date: '日付',
      clock_in: '出勤時刻',
      clock_out: '退勤時刻',
      work_hours: '勤務時間',
      overtime: '残業時間',
      break_time: '休憩時間',
      work_type: '勤務タイプ',
      late: '遅刻',
      early_leave: '早退',
      status: 'ステータス',
      approval_status: '承認状態',
      approver: '承認者',
      updated_at: '更新日時',
      notes: '備考',
    };
    return headerMap[column] || column;
  });

  // データ行を生成
  const rows = attendances.map((attendance) => {
    return setting.columns.map((column) => {
      switch (column) {
        case 'date':
          return formatDate(attendance.work_date, setting.format.date_format);
        case 'clock_in':
          return attendance.clock_in_time
            ? formatTime(attendance.clock_in_time, setting.format.time_format)
            : emptyValue;
        case 'clock_out':
          return attendance.clock_out_time
            ? formatTime(attendance.clock_out_time, setting.format.time_format)
            : emptyValue;
        case 'work_hours':
          return attendance.actual_work_minutes
            ? formatMinutes(attendance.actual_work_minutes)
            : emptyValue;
        case 'overtime':
          // 残業時間の計算（8時間を超えた分）
          const workHours = attendance.actual_work_minutes || 0;
          const overtime = Math.max(0, workHours - 480); // 8時間 = 480分
          return overtime > 0 ? formatMinutes(overtime) : emptyValue;
        case 'break_time':
          // 休憩時間の計算
          const breakRecords = attendance.break_records || [];
          const totalBreakMinutes = breakRecords.reduce((total: number, br: any) => {
            if (br.start && br.end) {
              const start = new Date(br.start);
              const end = new Date(br.end);
              return total + Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
            }
            return total;
          }, 0);
          return totalBreakMinutes > 0 ? formatMinutes(totalBreakMinutes) : emptyValue;
        case 'work_type':
          return attendance.work_types?.name || emptyValue;
        case 'late':
          // 遅刻判定（15分以上）
          if (attendance.clock_in_time) {
            const clockIn = new Date(attendance.clock_in_time);
            const workStart = new Date(attendance.work_date);
            workStart.setHours(9, 0, 0, 0); // 9:00開始と仮定
            const lateMinutes = Math.floor((clockIn.getTime() - workStart.getTime()) / (1000 * 60));
            return lateMinutes > 15 ? formatMinutes(lateMinutes) : emptyValue;
          }
          return emptyValue;
        case 'early_leave':
          // 早退判定（30分以上）
          if (attendance.clock_out_time) {
            const clockOut = new Date(attendance.clock_out_time);
            const workEnd = new Date(attendance.work_date);
            workEnd.setHours(18, 0, 0, 0); // 18:00終了と仮定
            const earlyMinutes = Math.floor((workEnd.getTime() - clockOut.getTime()) / (1000 * 60));
            return earlyMinutes > 30 ? formatMinutes(earlyMinutes) : emptyValue;
          }
          return emptyValue;
        case 'status':
          return '正常'; // 仮の値
        case 'approval_status':
          return attendance.approved_by ? '承認済み' : '未承認';
        case 'approver':
          return attendance.approved_by || emptyValue;
        case 'updated_at':
          return attendance.updated_at
            ? formatDateTime(
                attendance.updated_at,
                setting.format.date_format,
                setting.format.time_format
              )
            : emptyValue;
        case 'notes':
          return attendance.description || emptyValue;
        default:
          return emptyValue;
      }
    });
  });

  // CSV文字列を生成
  const csvRows = [headers, ...rows];
  return csvRows.map((row) => row.map((cell) => `"${cell}"`).join(delimiter)).join('\n');
}

// 日付フォーマット関数
function formatDate(dateString: string, format: string): string {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return format.replace('YYYY', String(year)).replace('MM', month).replace('DD', day);
}

// 時刻フォーマット関数
function formatTime(timeString: string, format: string): string {
  const date = new Date(timeString);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return format.replace('HH', hours).replace('MM', minutes);
}

// 日時フォーマット関数
function formatDateTime(dateTimeString: string, dateFormat: string, timeFormat: string): string {
  const date = new Date(dateTimeString);
  const formattedDate = formatDate(date.toISOString().split('T')[0], dateFormat);
  const formattedTime = formatTime(dateTimeString, timeFormat);
  return `${formattedDate} ${formattedTime}`;
}

// 分数フォーマット関数
function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}:${String(mins).padStart(2, '0')}`;
}
