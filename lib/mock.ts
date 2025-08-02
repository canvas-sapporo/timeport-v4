// TimePort Mock Data Provider
// 開発・テスト用のモックデータ実装

import { AttendanceData } from '@/schemas/attendance';
import { RequestData, RequestForm, FormFieldConfig, ApprovalStep } from '@/schemas/request';
import { UserProfile } from '@/schemas/user_profile';
import { getJSTDate } from '@/lib/utils';
import { Notification } from '@/schemas/database/feature';
import { Group } from '@/schemas/group';
import { ChatMessageData } from '@/schemas/chat';
import { Schedule, Todo, CreateScheduleInput, CreateTodoInput } from '@/schemas/schedule';
import { Report } from '@/schemas/report';

// ===== マスターデータ定義 =====

export const mockGroups: Group[] = [
  {
    id: 'group1',
    company_id: 'company1',
    name: '本社',
    description: '東京都渋谷区1-1-1',
    is_active: true,
    created_at: '2020-01-01T00:00:00Z',
    updated_at: '2020-01-01T00:00:00Z',
  },
  {
    id: 'group2',
    company_id: 'company1',
    name: '大阪支社',
    description: '大阪府大阪市北区2-2-2',
    is_active: true,
    created_at: '2020-01-01T00:00:00Z',
    updated_at: '2020-01-01T00:00:00Z',
  },
  {
    id: 'group3',
    company_id: 'company1',
    parent_group_id: 'group1',
    name: '開発部',
    description: 'システム開発を担当',
    is_active: true,
    created_at: '2020-01-01T00:00:00Z',
    updated_at: '2020-01-01T00:00:00Z',
  },
  {
    id: 'group4',
    company_id: 'company1',
    parent_group_id: 'group1',
    name: '営業部',
    description: '営業活動を担当',
    is_active: true,
    created_at: '2020-01-01T00:00:00Z',
    updated_at: '2020-01-01T00:00:00Z',
  },
  {
    id: 'group5',
    company_id: 'company1',
    parent_group_id: 'group2',
    name: '開発部',
    description: 'システム開発を担当',
    is_active: true,
    created_at: '2020-01-01T00:00:00Z',
    updated_at: '2020-01-01T00:00:00Z',
  },
  {
    id: 'group6',
    company_id: 'company1',
    parent_group_id: 'group2',
    name: '営業部',
    description: '営業活動を担当',
    is_active: true,
    created_at: '2020-01-01T00:00:00Z',
    updated_at: '2020-01-01T00:00:00Z',
  },
  {
    id: 'group7',
    company_id: 'company1',
    parent_group_id: 'group3',
    name: 'フロントエンドチーム',
    description: 'UI/UX開発チーム',
    is_active: true,
    created_at: '2020-01-01T00:00:00Z',
    updated_at: '2020-01-01T00:00:00Z',
  },
  {
    id: 'group8',
    company_id: 'company1',
    parent_group_id: 'group3',
    name: 'バックエンドチーム',
    description: 'サーバーサイド開発チーム',
    is_active: true,
    created_at: '2020-01-01T00:00:00Z',
    updated_at: '2020-01-01T00:00:00Z',
  },
];

export const mockUsers: UserProfile[] = [
  {
    id: 'user1',
    code: 'SYS001',
    first_name: 'システム',
    family_name: '管理者',
    family_name_kana: 'システム',
    first_name_kana: 'カンリシャ',
    email: 'system@timeport.com',
    role: 'system-admin',
    is_active: true,
    chat_send_key_shift_enter: false,
    created_at: '2020-01-01T00:00:00Z',
    updated_at: '2020-01-01T00:00:00Z',
  },
  {
    id: 'user2',
    code: 'A001',
    first_name: '管理者',
    family_name: '太郎',
    family_name_kana: 'カンリシャ',
    first_name_kana: 'タロウ',
    email: 'admin@timeport.com',
    role: 'admin',
    is_active: true,
    chat_send_key_shift_enter: false,
    created_at: '2020-04-01T00:00:00Z',
    updated_at: '2020-04-01T00:00:00Z',
  },
  {
    id: 'user3',
    code: 'B001',
    first_name: '田中',
    family_name: '花子',
    family_name_kana: 'タナカ',
    first_name_kana: 'ハナコ',
    email: 'member.kyaru@timeport.com',
    role: 'member',
    is_active: true,
    chat_send_key_shift_enter: false,
    created_at: '2021-04-01T00:00:00Z',
    updated_at: '2021-04-01T00:00:00Z',
  },
  {
    id: 'user4',
    code: 'B002',
    first_name: '佐藤',
    family_name: '次郎',
    family_name_kana: 'サトウ',
    first_name_kana: 'ジロウ',
    email: 'sato@timeport.com',
    role: 'member',
    is_active: true,
    chat_send_key_shift_enter: false,
    created_at: '2021-06-01T00:00:00Z',
    updated_at: '2021-06-01T00:00:00Z',
  },
  {
    id: 'user5',
    code: 'B003',
    first_name: '山田',
    family_name: '三郎',
    family_name_kana: 'ヤマダ',
    first_name_kana: 'サブロウ',
    email: 'yamada@timeport.com',
    role: 'member',
    is_active: true,
    chat_send_key_shift_enter: false,
    created_at: '2022-01-01T00:00:00Z',
    updated_at: '2022-01-01T00:00:00Z',
  },
  {
    id: 'user6',
    code: 'B004',
    first_name: '鈴木',
    family_name: '四郎',
    family_name_kana: 'スズキ',
    first_name_kana: 'シロウ',
    email: 'suzuki@timeport.com',
    role: 'member',
    is_active: true,
    chat_send_key_shift_enter: false,
    created_at: '2022-04-01T00:00:00Z',
    updated_at: '2022-04-01T00:00:00Z',
  },
];

export const mockRequestTypes: RequestForm[] = [
  {
    id: 'app_type_1',
    code: 'vacation',
    name: '休暇申請',
    description: '年次有給休暇や特別休暇の申請',
    category: 'leave',
    approval_flow: [
      {
        step: 1,
        name: '直属上司承認',
        description: '直属上司による承認',
        approver_role: 'manager',
        required: true,
        auto_approve: false,
        parallel: false,
        timeout_hours: 72,
      },
      {
        step: 2,
        name: '人事承認',
        description: '人事部による最終承認',
        approver_role: 'hr',
        required: true,
        auto_approve: false,
        parallel: false,
        timeout_hours: 72,
      },
    ],
    display_order: 1,
    form_config: [
      {
        id: 'vacation_type',
        name: 'vacation_type',
        type: 'select' as const,
        label: '休暇種別',
        placeholder: '',
        required: true,
        validation_rules: [],
        options: ['年次有給休暇', '病気休暇', '特別休暇'],
        order: 1,
      },
      {
        id: 'start_date',
        name: 'start_date',
        type: 'date' as const,
        label: '開始日',
        placeholder: '',
        required: true,
        validation_rules: [],
        options: [],
        order: 2,
      },
      {
        id: 'end_date',
        name: 'end_date',
        type: 'date' as const,
        label: '終了日',
        placeholder: '',
        required: true,
        validation_rules: [],
        options: [],
        order: 3,
      },
      {
        id: 'reason',
        name: 'reason',
        type: 'textarea' as const,
        label: '理由',
        placeholder: '休暇の理由を入力してください',
        required: true,
        validation_rules: [],
        options: [],
        order: 4,
      },
    ],
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'app_type_2',
    code: 'overtime',
    name: '残業申請',
    description: '時間外労働の事前申請',
    category: 'overtime',
    approval_flow: [
      {
        step: 1,
        name: '直属上司承認',
        description: '直属上司による承認',
        approver_role: 'manager',
        required: true,
        auto_approve: false,
        parallel: false,
        timeout_hours: 72,
      },
    ],
    display_order: 2,
    form_config: [
      {
        id: 'target_date',
        name: 'target_date',
        type: 'date' as const,
        label: '対象日',
        placeholder: '',
        required: true,
        validation_rules: [],
        options: [],
        order: 1,
      },
      {
        id: 'start_time',
        name: 'start_time',
        type: 'time' as const,
        label: '開始時刻',
        placeholder: '',
        required: true,
        validation_rules: [],
        options: [],
        order: 2,
      },
      {
        id: 'end_time',
        name: 'end_time',
        type: 'time' as const,
        label: '終了時刻',
        placeholder: '',
        required: true,
        validation_rules: [],
        options: [],
        order: 3,
      },
      {
        id: 'reason',
        name: 'reason',
        type: 'textarea' as const,
        label: '理由',
        placeholder: '残業の理由を入力してください',
        required: true,
        validation_rules: [],
        options: [],
        order: 4,
      },
    ],
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

// 勤怠データ生成関数
export function generateAttendanceRecords(userId: string): AttendanceData[] {
  const records: AttendanceData[] = [];
  const today = new Date();

  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    // 土日をスキップ
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    const workDate = date.toISOString().split('T')[0];
    const baseClockIn = new Date(date.setHours(9, 0, 0, 0));
    const baseClockOut = new Date(date.setHours(18, 0, 0, 0));

    // バリエーション追加
    const clockInVariation = Math.random() * 30 - 15; // -15 to +15 minutes
    const clockOutVariation = Math.random() * 60; // 0 to 60 minutes overtime

    const clockInTime = new Date(baseClockIn.getTime() + clockInVariation * 60000);
    const clockOutTime = new Date(baseClockOut.getTime() + clockOutVariation * 60000);

    const workMinutes = Math.floor((clockOutTime.getTime() - clockInTime.getTime()) / 60000) - 60;
    const overtimeMinutes = Math.max(0, workMinutes - 480);

    records.push({
      id: `${userId}-${workDate}`,
      user_id: userId,
      work_date: workDate,
      clock_in_time: clockInTime.toTimeString().slice(0, 5),
      clock_out_time: clockOutTime.toTimeString().slice(0, 5),
      break_records: [{ break_start: '12:00', break_end: '13:00' }],
      clock_records: [],
      actual_work_minutes: workMinutes,
      overtime_minutes: overtimeMinutes,
      late_minutes: clockInVariation > 0 ? Math.abs(clockInVariation) : 0,
      early_leave_minutes: 0,
      status: clockInVariation > 0 ? 'late' : 'normal',
      auto_calculated: true,
      description: clockInVariation > 0 ? '遅刻' : undefined,
      created_at: date.toISOString(),
      updated_at: date.toISOString(),
    });
  }

  return records;
}

const mockAttendanceRecords = mockUsers.flatMap((user) => generateAttendanceRecords(user.id));

const mockRequests: RequestData[] = [
  {
    id: 'app1',
    user_id: 'user3',
    request_form_id: 'app_type_1',
    title: '休暇申請',
    form_data: {
      vacation_type: '年次有給休暇',
      start_date: '2024-02-01',
      end_date: '2024-02-02',
      reason: '家族旅行のため',
    },
    target_date: '2024-02-01',
    start_date: '2024-02-01',
    end_date: '2024-02-02',
    status_id: 'status_pending',
    current_approval_step: 1,
    submission_comment: '家族旅行のため',
    comments: [],
    attachments: [],
    created_at: '2024-01-20T10:00:00Z',
    updated_at: '2024-01-20T10:00:00Z',
  },
  {
    id: 'app2',
    user_id: 'user4',
    request_form_id: 'app_type_2',
    title: '残業申請',
    form_data: {
      target_date: '2024-01-25',
      start_time: '18:00',
      end_time: '20:00',
      reason: 'プロジェクト締切対応のため',
    },
    target_date: '2024-01-25',
    start_date: '2024-01-25',
    end_date: '2024-01-25',
    status_id: 'status_approved',
    current_approval_step: 1,
    submission_comment: 'プロジェクト締切対応のため',
    comments: [],
    attachments: [],
    created_at: '2024-01-24T15:00:00Z',
    updated_at: '2024-01-24T16:00:00Z',
  },
];

const mockNotifications: Notification[] = [
  {
    id: 'notif1',
    user_id: 'user2',
    title: '新規申請',
    message: '田中花子さんから休暇申請が提出されました',
    type: 'info' as const,
    priority: 'normal',
    is_read: false,
    created_at: '2024-01-20T10:00:00Z',
    updated_at: '2024-01-20T10:00:00Z',
  },
  {
    id: 'notif2',
    user_id: 'user3',
    title: '申請承認',
    message: 'あなたの休暇申請が承認されました',
    type: 'success' as const,
    priority: 'normal',
    is_read: true,
    created_at: '2024-01-19T14:30:00Z',
    updated_at: '2024-01-19T14:30:00Z',
  },
];

// ===== API実装 =====

export async function getAttendanceData(userId?: string) {
  await new Promise((resolve) => setTimeout(resolve, 500)); // API遅延をシミュレート

  const records = userId
    ? mockAttendanceRecords.filter((r) => r.user_id === userId)
    : mockAttendanceRecords;

  return { records };
}

export async function getTodayAttendance(userId: string) {
  await new Promise((resolve) => setTimeout(resolve, 300));

  const today = getJSTDate();
  const record = mockAttendanceRecords.find((r) => r.user_id === userId && r.work_date === today);

  return record || null;
}

export async function clockIn(userId: string, time: string) {
  const today = getJSTDate();
  const existingRecord = mockAttendanceRecords.find(
    (r) => r.user_id === userId && r.work_date === today
  );

  if (existingRecord) {
    existingRecord.clock_in_time = time;
    return { success: true, message: '出勤しました', data: existingRecord };
  }

  const newRecord: AttendanceData = {
    id: `att_${Date.now()}`,
    user_id: userId,
    work_date: today,
    clock_in_time: time,
    clock_out_time: undefined,
    break_records: [],
    clock_records: [],
    actual_work_minutes: 0,
    overtime_minutes: 0,
    late_minutes: 0,
    early_leave_minutes: 0,
    status: 'normal',
    auto_calculated: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  mockAttendanceRecords.push(newRecord);
  return { success: true, message: '出勤しました', data: newRecord };
}

export async function clockOut(userId: string, time: string) {
  const today = getJSTDate();
  const record = mockAttendanceRecords.find((r) => r.user_id === userId && r.work_date === today);

  if (!record || !record.clock_in_time) {
    throw new Error('出勤記録が見つかりません');
  }

  record.clock_out_time = time;

  // 勤務時間計算
  const clockInTime = new Date(`${today}T${record.clock_in_time}:00`);
  const clockOutTime = new Date(`${today}T${time}:00`);
  const workMinutes = Math.floor((clockOutTime.getTime() - clockInTime.getTime()) / 60000) - 60;
  const overtimeMinutes = Math.max(0, workMinutes - 480);

  record.actual_work_minutes = workMinutes;
  record.overtime_minutes = overtimeMinutes;
  record.updated_at = new Date().toISOString();

  return { success: true, message: '退勤しました', data: record };
}

export async function startBreak(userId: string, time: string) {
  const today = getJSTDate();
  const record = mockAttendanceRecords.find((r) => r.user_id === userId && r.work_date === today);

  if (!record) {
    throw new Error('出勤記録が見つかりません');
  }

  record.break_records.push({ break_start: time, break_end: '' });
  record.updated_at = new Date().toISOString();

  return { success: true, message: '休憩を開始しました', data: record };
}

export async function endBreak(userId: string, time: string) {
  const today = getJSTDate();
  const record = mockAttendanceRecords.find((r) => r.user_id === userId && r.work_date === today);

  if (!record) {
    throw new Error('出勤記録が見つかりません');
  }

  const lastBreak = record.break_records[record.break_records.length - 1];
  if (!lastBreak || lastBreak.break_end) {
    throw new Error('開始中の休憩が見つかりません');
  }

  lastBreak.break_end = time;
  record.updated_at = new Date().toISOString();

  return { success: true, message: '休憩を終了しました', data: record };
}

export async function getUserData() {
  return { users: mockUsers };
}

export async function getUserProfile(userId: string) {
  return mockUsers.find((u) => u.id === userId) || null;
}

export async function updateUserProfile(userId: string, updates: Record<string, unknown>) {
  const user = mockUsers.find((u) => u.id === userId);
  if (!user) {
    throw new Error('ユーザーが見つかりません');
  }

  Object.assign(user, updates);
  user.updated_at = new Date().toISOString();

  return { success: true, message: 'プロフィールを更新しました', data: user };
}

export async function getRequestData(userId?: string) {
  let requests = mockRequests;

  if (userId) {
    requests = mockRequests.filter((r) => r.user_id === userId);
  }

  return { data: requests };
}

export async function createRequest(requestData: Record<string, unknown>, currentUserId?: string) {
  const newRequest: RequestData = {
    id: `req_${Date.now()}`,
    request_form_id: requestData.request_form_id as string,
    user_id: requestData.user_id as string,
    title: requestData.title as string,
    form_data: requestData.form_data as Record<string, string | number | boolean | Date | string[]>,
    target_date: requestData.target_date as string,
    start_date: requestData.start_date as string,
    end_date: requestData.end_date as string,
    current_approval_step: 1,
    submission_comment: requestData.submission_comment as string,
    comments: [],
    attachments: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  mockRequests.push(newRequest);
  
  // 監査ログを記録（モック環境ではコンソールに出力）
  if (currentUserId) {
    console.log('監査ログ記録（モック）: request_created', {
      user_id: currentUserId,
      target_type: 'requests',
      target_id: newRequest.id,
      before_data: undefined,
      after_data: newRequest,
      details: { 
        request_form_id: newRequest.request_form_id,
        user_id: newRequest.user_id,
      },
    });
  }

  return { success: true, message: '申請を提出しました', data: newRequest };
}

export async function updateRequestStatus(
  requestId: string,
  status: string,
  updates: Record<string, unknown> = {},
  currentUserId?: string
) {
  const request = mockRequests.find((r) => r.id === requestId);
  if (!request) {
    throw new Error('申請が見つかりません');
  }

  const beforeData = { ...request };

  // status_idを更新
  request.status_id = status;
  Object.assign(request, updates);
  request.updated_at = new Date().toISOString();

  // 監査ログを記録（モック環境ではコンソールに出力）
  if (currentUserId) {
    console.log('監査ログ記録（モック）: request_updated', {
      user_id: currentUserId,
      target_type: 'requests',
      target_id: requestId,
      before_data: beforeData,
      after_data: request,
      details: { 
        action_type: 'status_update',
        status: status,
        updated_fields: Object.keys(updates),
      },
    });
  }

  return {
    success: true,
    message: `申請を${status === 'approved' ? '承認' : '却下'}しました`,
    data: request,
  };
}

export async function getRequestForms(activeOnly: boolean = false) {
  let forms = mockRequestTypes;

  if (activeOnly) {
    forms = mockRequestTypes.filter((f) => f.is_active);
  }

  return forms;
}

export async function getRequestForm(id: string) {
  return mockRequestTypes.find((f) => f.id === id) || null;
}

export async function createRequestForm(formData: Record<string, unknown>) {
  const newForm: RequestForm = {
    id: `form_${Date.now()}`,
    name: formData.name as string,
    description: formData.description as string,
    category: formData.category as string,
    form_config: formData.form_config as FormFieldConfig[],
    approval_flow: formData.approval_flow as ApprovalStep[],
    is_active: true,
    display_order: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  mockRequestTypes.push(newForm);
  return { success: true, message: '申請フォームを作成しました', data: newForm };
}

export async function updateRequestForm(id: string, updates: Record<string, unknown>) {
  const form = mockRequestTypes.find((f) => f.id === id);
  if (!form) {
    throw new Error('申請フォームが見つかりません');
  }

  Object.assign(form, updates);
  form.updated_at = new Date().toISOString();

  return { success: true, message: '申請フォームを更新しました', data: form };
}

export async function deleteRequestForm(id: string) {
  const index = mockRequestTypes.findIndex((f) => f.id === id);
  if (index === -1) {
    throw new Error('申請フォームが見つかりません');
  }

  mockRequestTypes.splice(index, 1);
  return { success: true, message: '申請フォームを削除しました' };
}

export async function toggleRequestFormStatus(id: string, isActive: boolean) {
  const form = mockRequestTypes.find((f) => f.id === id);
  if (!form) {
    throw new Error('申請フォームが見つかりません');
  }

  form.is_active = isActive;
  form.updated_at = new Date().toISOString();

  const status = isActive ? '有効' : '無効';
  return { success: true, message: `申請フォームを${status}にしました`, data: form };
}

export async function getDashboardData(userId: string) {
  const [attendanceResult, requestsResult] = await Promise.all([
    getAttendanceData(userId),
    getRequestData(userId),
  ]);

  const thisMonth = new Date().toISOString().slice(0, 7);
  const thisMonthRecords = attendanceResult.records.filter((r: AttendanceData) =>
    r.work_date.startsWith(thisMonth)
  );

  const workDays = thisMonthRecords.length;
  const totalOvertimeMinutes = thisMonthRecords.reduce(
    (sum: number, r: AttendanceData) => sum + (r.overtime_minutes || 0),
    0
  );
  const overtimeHours = Math.round((totalOvertimeMinutes / 60) * 10) / 10;

  const pendingRequests = requestsResult.data.filter((a: RequestData) => a.status_id === 'pending');

  return {
    stats: {
      workDays,
      overtimeHours,
      vacationDays: 3,
      totalWorkHours: workDays * 8,
    },
    pendingRequests: pendingRequests.length,
    recentActivity: [],
  };
}

export async function getAdminDashboardData() {
  const [usersResult, requestsResult, attendanceResult] = await Promise.all([
    getUserData(),
    getRequestData(),
    getAttendanceData(),
  ]);

  const activeUsers = usersResult.users.filter((u: UserProfile) => u.is_active).length;
  const pendingRequests = requestsResult.data.filter(
    (a: RequestData) => a.status_id === 'pending'
  ).length;
  const today = getJSTDate();
  const todayAttendance = attendanceResult.records.filter(
    (r: AttendanceData) => r.work_date === today
  ).length;

  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthlyAttendance = attendanceResult.records.filter((r: AttendanceData) =>
    r.work_date.startsWith(thisMonth)
  );
  const totalOvertimeHours =
    Math.round(
      (monthlyAttendance.reduce(
        (sum: number, r: AttendanceData) => sum + (r.overtime_minutes || 0),
        0
      ) /
        60) *
        10
    ) / 10;

  return {
    stats: {
      totalUsers: activeUsers,
      pendingRequests,
      todayAttendance,
      monthlyOvertimeHours: totalOvertimeHours,
    },
    recentRequests: requestsResult.data.slice(0, 5),
    alerts: [{ type: 'info', message: `${pendingRequests}件の申請が承認待ちです` }],
  };
}

export async function getSettingsData() {
  return {
    features: [
      { code: 'attendance', name: '勤怠管理', enabled: true },
      { code: 'requests', name: '申請管理', enabled: true },
      { code: 'reports', name: 'レポート', enabled: true },
      { code: 'chat', name: 'チャット', enabled: true },
    ],
    system: {
      companyName: '株式会社TimePort',
      timezone: 'Asia/Tokyo',
      workingHours: { start: '09:00', end: '18:00' },
    },
  };
}

export async function updateSettings(settingsType: string, data: Record<string, unknown>) {
  console.log(`Mock: Updating ${settingsType} settings:`, data);
  return { success: true, message: '設定を更新しました' };
}

export async function getGroupData() {
  return {
    groups: mockGroups,
    users: mockUsers,
  };
}

export async function getGroups() {
  return mockGroups;
}

export async function getNotifications(userId: string) {
  return mockNotifications.filter((n) => n.user_id === userId);
}

export async function markNotificationAsRead(notificationId: string) {
  const notification = mockNotifications.find((n) => n.id === notificationId);
  if (notification) {
    notification.is_read = true;
  }
  return { success: true };
}

export async function authenticateUser(email: string, password: string) {
  const user = mockUsers.find((u) => u.email === email && u.is_active);

  if (!user) {
    return { success: false, error: 'メールアドレスまたはパスワードが正しくありません' };
  }

  return {
    success: true,
    user: {
      id: user.id,
      employeeId: user.code,
      name: `${user.first_name} ${user.family_name}`,
      email: user.email,
      role: user.role,
    },
  };
}

export async function logoutUser() {
  return { success: true };
}

export async function getDepartments() {
  return mockGroups.filter((g) => g.id.includes('dept'));
}

export async function getWorkplaces() {
  return mockGroups.filter((g) => g.id.includes('work'));
}

export async function getOrganizationData() {
  return {
    workplaces: mockGroups.filter((g) => g.id.includes('work')),
    departments: mockGroups.filter((g) => g.id.includes('dept')),
    users: mockUsers,
  };
}

// エクスポート用のエイリアス（後方互換性）
export const users = mockUsers;
export const groups = mockGroups;
export const requests = mockRequests;
export const requestForms = mockRequestTypes;
export const notifications = mockNotifications;

// 旧名称でのエクスポート（段階的移行用）
export const workplaces = mockGroups.filter((g) => g.id.includes('work'));
export const departments = mockGroups.filter((g) => g.id.includes('dept'));

// ================================
// スケジュールモックデータ
// ================================

export const mockSchedules: Schedule[] = [
  {
    id: 'schedule1',
    user_id: 'user3',
    title: 'チーム会議',
    description: '週次進捗確認',
    start_datetime: '2025-01-15T10:00:00Z',
    end_datetime: '2025-01-15T11:00:00Z',
    location: '会議室A',
    url: 'https://zoom.us/j/123456789',
    is_all_day: false,
    recurrence_type: 'weekly',
    recurrence_interval: 1,
    shared_with_groups: ['group7'],
    is_private: false,
    color: '#3B82F6',
    created_at: '2024-01-20T00:00:00Z',
    updated_at: '2024-01-20T00:00:00Z',
  },
  {
    id: 'schedule2',
    user_id: 'user3',
    title: 'プロジェクト締切',
    description: 'フロントエンド開発完了',
    start_datetime: '2025-01-16T00:00:00Z',
    end_datetime: '2025-01-16T23:59:59Z',
    is_all_day: true,
    recurrence_type: 'none',
    recurrence_interval: 1,
    shared_with_groups: [],
    is_private: false,
    color: '#EF4444',
    created_at: '2024-01-20T00:00:00Z',
    updated_at: '2024-01-20T00:00:00Z',
  },
  {
    id: 'schedule3',
    user_id: 'user3',
    title: 'クライアント打ち合わせ',
    description: '新機能の要件確認',
    start_datetime: '2025-01-17T14:00:00Z',
    end_datetime: '2025-01-17T15:30:00Z',
    location: 'オンライン',
    url: 'https://meet.google.com/abc-defg-hij',
    is_all_day: false,
    recurrence_type: 'none',
    recurrence_interval: 1,
    shared_with_groups: ['group7'],
    is_private: false,
    color: '#10B981',
    created_at: '2024-01-20T00:00:00Z',
    updated_at: '2024-01-20T00:00:00Z',
  },
  {
    id: 'schedule4',
    user_id: 'user3',
    title: '社内研修',
    description: 'React 19の新機能について',
    start_datetime: '2025-01-18T13:00:00Z',
    end_datetime: '2025-01-18T17:00:00Z',
    location: '大会議室',
    is_all_day: false,
    recurrence_type: 'none',
    recurrence_interval: 1,
    shared_with_groups: ['group3'],
    is_private: false,
    color: '#8B5CF6',
    created_at: '2024-01-20T00:00:00Z',
    updated_at: '2024-01-20T00:00:00Z',
  },
];

// ================================
// Todoモックデータ
// ================================

export const mockTodos: Todo[] = [
  {
    id: 'todo1',
    user_id: 'user3',
    title: 'ユーザー画面のデザイン修正',
    description: 'レスポンシブ対応とアクセシビリティ改善',
    due_date: '2025-08-15',
    due_time: '17:00',
    priority: 'high',
    status: 'in_progress',
    category: 'デザイン',
    tags: ['UI/UX', 'レスポンシブ'],
    estimated_hours: 4.0,
    actual_hours: 2.5,
    completion_rate: 60,
    shared_with_groups: ['group7'],
    is_private: false,
    created_at: '2024-01-20T00:00:00Z',
    updated_at: '2024-01-21T00:00:00Z',
  },
  {
    id: 'todo2',
    user_id: 'user3',
    title: 'API仕様書の確認',
    description: 'バックエンドチームとの仕様確認',
    due_date: '2025-07-16',
    priority: 'medium',
    status: 'pending',
    category: '仕様確認',
    tags: ['API', 'ドキュメント'],
    estimated_hours: 1.5,
    completion_rate: 0,
    shared_with_groups: [],
    is_private: false,
    created_at: '2024-01-20T00:00:00Z',
    updated_at: '2024-01-20T00:00:00Z',
  },
  {
    id: 'todo3',
    user_id: 'user3',
    title: 'コードレビュー',
    description: '新機能のコードレビュー実施',
    due_date: '2025-06-14',
    priority: 'medium',
    status: 'completed',
    category: 'レビュー',
    tags: ['コードレビュー'],
    estimated_hours: 2.0,
    actual_hours: 1.8,
    completion_rate: 100,
    shared_with_groups: [],
    is_private: false,
    completed_at: '2024-01-21T16:30:00Z',
    created_at: '2024-01-19T00:00:00Z',
    updated_at: '2024-01-21T16:30:00Z',
  },
  {
    id: 'todo4',
    user_id: 'user3',
    title: 'データベース設計書の作成',
    description: '新機能のテーブル設計とER図作成',
    due_date: '2025-07-17',
    due_time: '18:00',
    priority: 'high',
    status: 'pending',
    category: '設計',
    tags: ['データベース', '設計書'],
    estimated_hours: 3.0,
    completion_rate: 0,
    shared_with_groups: ['group7'],
    is_private: false,
    created_at: '2024-01-20T00:00:00Z',
    updated_at: '2024-01-20T00:00:00Z',
  },
  {
    id: 'todo5',
    user_id: 'user3',
    title: 'テストケース作成',
    description: 'ユニットテストとE2Eテストの作成',
    due_date: '2025-07-28',
    due_time: '16:00',
    priority: 'medium',
    status: 'in_progress',
    category: 'テスト',
    tags: ['テスト', 'Jest', 'Playwright'],
    estimated_hours: 5.0,
    actual_hours: 2.0,
    completion_rate: 40,
    shared_with_groups: [],
    is_private: false,
    created_at: '2024-01-20T00:00:00Z',
    updated_at: '2024-01-21T00:00:00Z',
  },
  {
    id: 'todo6',
    user_id: 'user3',
    title: 'プレゼン資料作成',
    description: '来週の成果発表用資料作成',
    due_date: '2025-08-19',
    priority: 'low',
    status: 'pending',
    category: '資料作成',
    tags: ['プレゼン', 'PowerPoint'],
    estimated_hours: 2.0,
    completion_rate: 0,
    shared_with_groups: [],
    is_private: true,
    created_at: '2024-01-20T00:00:00Z',
    updated_at: '2024-01-20T00:00:00Z',
  },
];

// ================================
// レポートテンプレートモックデータ
// ================================

export const mockReportTemplates = [
  {
    id: 'template1',
    company_id: 'company1',
    name: '日報テンプレート',
    description: '毎日の業務報告用',
    form_config: [
      {
        id: 'today_tasks',
        type: 'textarea',
        label: '今日の作業内容',
        placeholder: '本日実施した作業を記入してください',
        required: true,
      },
      {
        id: 'tomorrow_tasks',
        type: 'textarea',
        label: '明日の予定',
        placeholder: '明日の作業予定を記入してください',
        required: true,
      },
      {
        id: 'issues',
        type: 'textarea',
        label: '課題・問題点',
        placeholder: '課題や問題点があれば記入してください',
        required: false,
      },
      {
        id: 'work_hours',
        type: 'number',
        label: '作業時間',
        placeholder: '8.0',
        required: true,
      },
    ],
    approval_flow: {
      type: 'static',
      approvers: [],
    },
    status_flow: {
      transitions: [],
    },
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'template2',
    company_id: 'company1',
    name: '週報テンプレート',
    description: '週次の業務報告用',
    template_type: 'weekly',
    form_fields: [
      {
        id: 'week_summary',
        name: 'week_summary',
        type: 'textarea',
        label: '今週のサマリー',
        placeholder: '今週の主な成果を記入してください',
        required: true,
        validation: { minLength: 20, maxLength: 1000 },
        order: 1,
      },
      {
        id: 'achievements',
        name: 'achievements',
        type: 'textarea',
        label: '達成事項',
        placeholder: '完了したタスクや成果を記入してください',
        required: true,
        validation: { minLength: 10, maxLength: 500 },
        order: 2,
      },
      {
        id: 'next_week_goals',
        name: 'next_week_goals',
        type: 'textarea',
        label: '来週の目標',
        placeholder: '来週の目標や計画を記入してください',
        required: true,
        validation: { minLength: 10, maxLength: 500 },
        order: 3,
      },
    ],
    is_active: true,
    display_order: 2,
    created_by: 'user2',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

// ================================
// レポートモックデータ
// ================================

export const mockReports: Report[] = [
  {
    id: 'report1',
    company_id: 'company1',
    template_id: 'template1',
    user_id: 'user3',
    title: '2024年1月20日 日報',
    report_date: '2024-01-20',
    content: {
      today_tasks: 'ユーザー画面のレスポンシブ対応を実施。スマートフォン表示の調整を完了。',
      tomorrow_tasks: 'API仕様書の確認とバックエンドチームとの打ち合わせ。',
      issues: '特になし',
      work_hours: 8.0,
    },
    current_status_id: 'status1',
    submitted_at: '2024-01-20T18:00:00Z',
    created_at: '2024-01-20T17:30:00Z',
    updated_at: '2024-01-20T18:00:00Z',
  },
  {
    id: 'report2',
    company_id: 'company1',
    template_id: 'template1',
    user_id: 'user3',
    title: '2024年1月19日 日報',
    report_date: '2024-01-19',
    content: {
      today_tasks: 'コードレビューの実施。新機能のテスト実行。',
      tomorrow_tasks: 'ユーザー画面のデザイン修正作業。',
      issues: 'テスト環境でのパフォーマンス問題を確認',
      work_hours: 7.5,
    },
    current_status_id: 'status2',
    submitted_at: '2024-01-19T18:00:00Z',
    created_at: '2024-01-19T17:30:00Z',
    updated_at: '2024-01-20T09:00:00Z',
  },
];

// ================================
// チャットモックデータ
// ================================

export const mockChats = [
  {
    id: 'chat1',
    name: 'フロントエンドチーム',
    description: 'フロントエンド開発チームのグループチャット',
    chat_type: 'group',
    created_by: 'user2',
    is_active: true,
    last_message_at: '2024-01-21T15:30:00Z',
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-21T15:30:00Z',
  },
  {
    id: 'chat2',
    chat_type: 'direct',
    created_by: 'user3',
    is_active: true,
    last_message_at: '2024-01-21T14:20:00Z',
    created_at: '2024-01-18T00:00:00Z',
    updated_at: '2024-01-21T14:20:00Z',
  },
];

export const mockChatUsers = [
  {
    id: 'chatuser1',
    chat_id: 'chat1',
    user_id: '49c83f3d-7c28-4cd8-9fbc-1c2a1c57a076',
    joined_at: '2024-01-15T00:00:00Z',
    last_read_at: '2024-01-21T15:30:00Z',
    is_admin: false,
    is_muted: false,
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-21T15:30:00Z',
  },
  {
    id: 'chatuser2',
    chat_id: 'chat1',
    user_id: 'user4',
    joined_at: '2024-01-15T00:00:00Z',
    last_read_at: '2024-01-21T15:25:00Z',
    is_admin: true,
    is_muted: false,
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-21T15:25:00Z',
  },
  {
    id: 'chatuser3',
    chat_id: 'chat2',
    user_id: '49c83f3d-7c28-4cd8-9fbc-1c2a1c57a076',
    joined_at: '2024-01-18T00:00:00Z',
    last_read_at: '2024-01-21T14:20:00Z',
    is_admin: false,
    is_muted: false,
    created_at: '2024-01-18T00:00:00Z',
    updated_at: '2024-01-21T14:20:00Z',
  },
  {
    id: 'chatuser4',
    chat_id: 'chat2',
    user_id: 'user2',
    joined_at: '2024-01-18T00:00:00Z',
    last_read_at: '2024-01-21T14:10:00Z',
    is_admin: false,
    is_muted: false,
    created_at: '2024-01-18T00:00:00Z',
    updated_at: '2024-01-21T14:10:00Z',
  },
];

export const mockChatMessages: ChatMessageData[] = [
  {
    id: 'message1',
    chat_id: 'chat1',
    user_id: 'user4',
    message_type: 'text',
    content: 'お疲れ様です！今日の進捗はいかがですか？',
    attachments: [],
    created_at: '2024-01-21T15:30:00Z',
    updated_at: '2024-01-21T15:30:00Z',
  },
  {
    id: 'message2',
    chat_id: 'chat1',
    user_id: '49c83f3d-7c28-4cd8-9fbc-1c2a1c57a076',
    message_type: 'text',
    content: 'お疲れ様です！レスポンシブ対応が完了しました👍',
    attachments: [],
    created_at: '2024-01-21T15:25:00Z',
    updated_at: '2024-01-21T15:25:00Z',
  },
  {
    id: 'message3',
    chat_id: 'chat1',
    user_id: '49c83f3d-7c28-4cd8-9fbc-1c2a1c57a076',
    message_type: 'text',
    content: 'ありがとうございます！次はバックエンドのAPI連携を進めます',
    attachments: [],
    created_at: '2024-01-21T15:20:00Z',
    updated_at: '2024-01-21T15:20:00Z',
  },
  {
    id: 'message4',
    chat_id: 'chat1',
    user_id: 'user4',
    message_type: 'text',
    content: '素晴らしいですね！進捗を共有していただきありがとうございます',
    attachments: [],
    created_at: '2024-01-21T15:15:00Z',
    updated_at: '2024-01-21T15:15:00Z',
  },
  {
    id: 'message5',
    chat_id: 'chat1',
    user_id: '49c83f3d-7c28-4cd8-9fbc-1c2a1c57a076',
    message_type: 'text',
    content: '明日のデモの準備も進めています',
    attachments: [],
    created_at: '2024-01-21T15:10:00Z',
    updated_at: '2024-01-21T15:10:00Z',
  },
  {
    id: 'message6',
    chat_id: 'chat2',
    user_id: 'user2',
    message_type: 'text',
    content: '明日の会議の件でご相談があります',
    attachments: [],
    created_at: '2024-01-21T14:20:00Z',
    updated_at: '2024-01-21T14:20:00Z',
  },
  {
    id: 'message7',
    chat_id: 'chat2',
    user_id: '49c83f3d-7c28-4cd8-9fbc-1c2a1c57a076',
    message_type: 'text',
    content: 'はい、どのような件でしょうか？',
    attachments: [],
    created_at: '2024-01-21T14:15:00Z',
    updated_at: '2024-01-21T14:15:00Z',
  },
  {
    id: 'message8',
    chat_id: 'chat2',
    user_id: 'user2',
    message_type: 'text',
    content: '新しいプロジェクトの立ち上げについてです',
    attachments: [],
    created_at: '2024-01-21T14:10:00Z',
    updated_at: '2024-01-21T14:10:00Z',
  },
  {
    id: 'message9',
    chat_id: 'chat2',
    user_id: '49c83f3d-7c28-4cd8-9fbc-1c2a1c57a076',
    message_type: 'text',
    content: '承知いたしました。詳細を教えていただけますか？',
    attachments: [],
    created_at: '2024-01-21T14:05:00Z',
    updated_at: '2024-01-21T14:05:00Z',
  },
  {
    id: 'message10',
    chat_id: 'chat2',
    user_id: 'user2',
    message_type: 'text',
    content: '明日の会議で詳しく説明させていただきます',
    attachments: [],
    created_at: '2024-01-21T14:00:00Z',
    updated_at: '2024-01-21T14:00:00Z',
  },
];

// ================================
// API関数
// ================================

export async function getSchedules(userId: string) {
  return mockSchedules.filter((s) => s.user_id === userId);
}

export async function getTodos(userId: string) {
  return mockTodos.filter((t) => t.user_id === userId);
}

export async function getReports(userId: string) {
  return mockReports.filter((r) => r.user_id === userId);
}

export async function getReportTemplates() {
  return mockReportTemplates;
}

export async function getChats(userId: string) {
  // モックデータの構造に合わせて修正
  return mockChats.filter((c) => c.created_by === userId);
}

export async function getChatMessages(chatId: string) {
  return mockChatMessages.filter((m) => m.chat_id === chatId);
}

export async function getChatUsers() {
  return mockUsers.map((u) => ({
    id: u.id,
    name: `${u.first_name} ${u.family_name}`,
    avatar: undefined, // UserProfileにはavatarプロパティがない
  }));
}

export async function createSchedule(data: CreateScheduleInput) {
  const newSchedule: Schedule = {
    id: `schedule_${Date.now()}`,
    user_id: 'user1', // デフォルトユーザーID
    title: data.title,
    description: data.description || '',
    start_datetime: data.start_datetime,
    end_datetime: data.end_datetime,
    location: data.location || '',
    url: data.url || '',
    is_all_day: data.is_all_day || false,
    recurrence_type: data.recurrence_type || 'none',
    recurrence_interval: data.recurrence_interval || 1,
    shared_with_groups: data.shared_with_groups || [],
    is_private: data.is_private || false,
    color: data.color || '#3B82F6',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  mockSchedules.push(newSchedule);
  return { success: true, message: 'スケジュールを作成しました', data: newSchedule };
}

export async function createTodo(data: CreateTodoInput) {
  const newTodo: Todo = {
    id: `todo_${Date.now()}`,
    user_id: 'user1', // デフォルトユーザーID
    title: data.title,
    description: data.description || '',
    due_date: data.due_date,
    priority: data.priority || 'medium',
    status: 'pending',
    shared_with_groups: [],
    is_private: false,
    tags: [],
    completion_rate: 0,
    completed_at: undefined,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  mockTodos.push(newTodo);
  return { success: true, message: 'タスクを作成しました', data: newTodo };
}

export async function createReport(templateId: string, data: Record<string, unknown>) {
  const newReport: Report = {
    id: `report_${Date.now()}`,
    company_id: 'company1', // デフォルト企業ID
    user_id: 'user1', // デフォルトユーザーID
    template_id: templateId,
    title: data.title as string,
    content: data.content as Record<string, string | number | boolean | string[]>,
    current_status_id: 'draft',
    report_date: getJSTDate(),
    submitted_at: undefined,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  mockReports.push(newReport);
  return { success: true, message: 'レポートを作成しました', data: newReport };
}

export async function sendMessage(chatId: string, content: string, userId?: string) {
  const newMessage: ChatMessageData = {
    id: `msg_${Date.now()}`,
    chat_id: chatId,
    user_id: userId || 'user1',
    content,
    attachments: [],
    message_type: 'text',
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  mockChatMessages.push(newMessage);
  return { success: true, message: 'メッセージを送信しました', data: newMessage };
}
