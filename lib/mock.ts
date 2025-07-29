// TimePort Mock Data Provider
// 開発・テスト用のモックデータ実装

import { Attendance } from '@/types/attendance';
import { Request, RequestForm } from '@/types/request';
import { UserProfile } from '@/types/auth';
import { Notification } from '@/types/system';
import { Group } from '@/types/groups';
import { Chat, ChatMessage, ChatUser } from '@/types/chat';
import { Schedule, Todo, CreateScheduleInput, CreateTodoInput } from '@/types/schedule';
import { Report, ReportTemplate } from '@/types/report';

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
    code: 'SA001',
    first_name: 'システム',
    family_name: '管理者',
    email: 'system@timeport.com',
    role: 'system-admin',
    primary_group_id: 'group3',
    work_start_date: '2020-01-01',
    is_active: true,
    created_at: '2020-01-01T00:00:00Z',
    updated_at: '2020-01-01T00:00:00Z',
  },
  {
    id: 'user2',
    code: 'A001',
    first_name: '管理者',
    family_name: '太郎',
    email: 'admin@timeport.com',
    role: 'admin',
    primary_group_id: 'group3',
    work_start_date: '2020-04-01',
    is_active: true,
    created_at: '2020-04-01T00:00:00Z',
    updated_at: '2020-04-01T00:00:00Z',
  },
  {
    id: 'user3',
    code: 'B001',
    first_name: '田中',
    family_name: '花子',
    email: 'member.kyaru@timeport.com',
    role: 'member',
    primary_group_id: 'group7',
    work_start_date: '2021-04-01',
    is_active: true,
    created_at: '2021-04-01T00:00:00Z',
    updated_at: '2021-04-01T00:00:00Z',
  },
  {
    id: 'user4',
    code: 'B002',
    first_name: '佐藤',
    family_name: '次郎',
    email: 'sato@timeport.com',
    role: 'member',
    primary_group_id: 'group8',
    work_start_date: '2021-06-01',
    is_active: true,
    created_at: '2021-06-01T00:00:00Z',
    updated_at: '2021-06-01T00:00:00Z',
  },
  {
    id: 'user5',
    code: 'B003',
    first_name: '山田',
    family_name: '三郎',
    email: 'yamada@timeport.com',
    role: 'member',
    primary_group_id: 'group5',
    work_start_date: '2022-01-01',
    is_active: true,
    created_at: '2022-01-01T00:00:00Z',
    updated_at: '2022-01-01T00:00:00Z',
  },
  {
    id: 'user6',
    code: 'B004',
    first_name: '鈴木',
    family_name: '四郎',
    email: 'suzuki@timeport.com',
    role: 'member',
    primary_group_id: 'group6',
    work_start_date: '2022-04-01',
    is_active: true,
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
export const generateAttendanceRecords = (userId: string): Attendance[] => {
  const records: Attendance[] = [];
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
};

const mockAttendanceRecords = mockUsers.flatMap((user) => generateAttendanceRecords(user.id));

const mockRequests: Request[] = [
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

export const getAttendanceData = async (userId?: string) => {
  await new Promise((resolve) => setTimeout(resolve, 500)); // API遅延をシミュレート

  const records = userId
    ? mockAttendanceRecords.filter((r) => r.user_id === userId)
    : mockAttendanceRecords;

  return { records };
};

export const getTodayAttendance = async (userId: string) => {
  await new Promise((resolve) => setTimeout(resolve, 300));

  const today = new Date().toISOString().split('T')[0];
  const record = mockAttendanceRecords.find((r) => r.user_id === userId && r.work_date === today);

  return record || null;
};

export const clockIn = async (userId: string, time: string) => {
  console.log('モック clockIn 開始:', { userId, time });

  try {
    console.log('モック clockIn: 遅延開始');
    await new Promise((resolve) => setTimeout(resolve, 500));
    console.log('モック clockIn: 遅延完了');

    const today = new Date().toISOString().split('T')[0];
    const recordId = `${userId}-${today}`;
    console.log('モック clockIn: 記録ID:', recordId);

    console.log('モック clockIn: mockAttendanceRecords長さ:', mockAttendanceRecords.length);
    const existingIndex = mockAttendanceRecords.findIndex((r) => r.id === recordId);
    console.log('モック clockIn: 既存記録インデックス:', existingIndex);

    if (existingIndex >= 0) {
      console.log('モック clockIn: 既存記録を更新');
      mockAttendanceRecords[existingIndex].clock_in_time = time;
      mockAttendanceRecords[existingIndex].updated_at = new Date().toISOString();
    } else {
      console.log('モック clockIn: 新規記録を作成');
      const newRecord = {
        id: recordId,
        user_id: userId,
        work_date: today,
        clock_in_time: time,
        break_records: [],
        clock_records: [],
        overtime_minutes: 0,
        late_minutes: 0,
        early_leave_minutes: 0,
        status: 'normal' as const,
        auto_calculated: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      console.log('モック clockIn: 新規記録:', newRecord);
      mockAttendanceRecords.push(newRecord);
    }

    console.log('モック clockIn: 成功');
    return { success: true, message: '出勤しました' };
  } catch (error) {
    console.error('モック clockIn: エラー:', error);
    throw error;
  }
};

export const clockOut = async (userId: string, time: string) => {
  await new Promise((resolve) => setTimeout(resolve, 500));

  const today = new Date().toISOString().split('T')[0];
  const recordId = `${userId}-${today}`;

  const existingIndex = mockAttendanceRecords.findIndex((r) => r.id === recordId);
  if (existingIndex >= 0) {
    const record = mockAttendanceRecords[existingIndex];
    if (record.clock_in_time) {
      const clockInTime = new Date(`${today}T${record.clock_in_time}:00`);
      const clockOutTime = new Date(`${today}T${time}:00`);
      const workMinutes = Math.floor((clockOutTime.getTime() - clockInTime.getTime()) / 60000) - 60;
      const overtimeMinutes = Math.max(0, workMinutes - 480);

      mockAttendanceRecords[existingIndex] = {
        ...record,
        clock_out_time: time,
        overtime_minutes: overtimeMinutes,
        updated_at: new Date().toISOString(),
      };
    }
  }

  return { success: true, message: '退勤しました' };
};

export const startBreak = async (userId: string, time: string) => {
  await new Promise((resolve) => setTimeout(resolve, 300));

  const today = new Date().toISOString().split('T')[0];
  const recordId = `${userId}-${today}`;

  const existingIndex = mockAttendanceRecords.findIndex((r) => r.id === recordId);
  if (existingIndex >= 0) {
    const record = mockAttendanceRecords[existingIndex];
    const newBreakRecord = { break_start: time, break_end: '' };
    mockAttendanceRecords[existingIndex] = {
      ...record,
      break_records: [...record.break_records, newBreakRecord],
      updated_at: new Date().toISOString(),
    };
  }

  return { success: true, message: '休憩を開始しました' };
};

export const endBreak = async (userId: string, time: string) => {
  await new Promise((resolve) => setTimeout(resolve, 300));

  const today = new Date().toISOString().split('T')[0];
  const recordId = `${userId}-${today}`;

  const existingIndex = mockAttendanceRecords.findIndex((r) => r.id === recordId);
  if (existingIndex >= 0) {
    const record = mockAttendanceRecords[existingIndex];
    const updatedBreakRecords = [...record.break_records];
    const lastBreak = updatedBreakRecords[updatedBreakRecords.length - 1];
    if (lastBreak && !lastBreak.break_end) {
      lastBreak.break_end = time;
    }
    mockAttendanceRecords[existingIndex] = {
      ...record,
      break_records: updatedBreakRecords,
      updated_at: new Date().toISOString(),
    };
  }

  return { success: true, message: '休憩を終了しました' };
};

export const getUserData = async () => {
  await new Promise((resolve) => setTimeout(resolve, 400));
  return { users: mockUsers };
};

export const getUserProfile = async (userId: string) => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const user = mockUsers.find((u) => u.id === userId);
  return user || null;
};

export const updateUserProfile = async (userId: string, updates: any) => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const userIndex = mockUsers.findIndex((u) => u.id === userId);
  if (userIndex >= 0) {
    mockUsers[userIndex] = { ...mockUsers[userIndex], ...updates };
    return { success: true, message: 'プロフィールを更新しました' };
  }
  return { success: false, error: 'ユーザーが見つかりません' };
};

export const getRequestData = async (userId?: string) => {
  await new Promise((resolve) => setTimeout(resolve, 400));

  const requests = userId ? mockRequests.filter((a) => a.user_id === userId) : mockRequests;

  return { data: requests };
};

export const createRequest = async (requestData: any) => {
  await new Promise((resolve) => setTimeout(resolve, 600));

  const newRequest = {
    id: `app_${Date.now()}`,
    ...requestData,
    status: 'pending' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  mockRequests.push(newRequest);
  return { success: true, message: '申請を提出しました', data: newRequest };
};

export const updateRequestStatus = async (requestId: string, status: string, updates: any = {}) => {
  await new Promise((resolve) => setTimeout(resolve, 500));

  const appIndex = mockRequests.findIndex((a) => a.id === requestId);
  if (appIndex >= 0) {
    mockRequests[appIndex] = {
      ...mockRequests[appIndex],
      status: status as any,
      updatedAt: new Date().toISOString(),
      ...updates,
    };
    return {
      success: true,
      message: `申請を${status === 'approved' ? '承認' : '却下'}しました`,
    };
  }
  return { success: false, error: '申請が見つかりません' };
};

export const getRequestForms = async (activeOnly: boolean = false) => {
  await new Promise((resolve) => setTimeout(resolve, 300));

  const forms = activeOnly ? mockRequestTypes.filter((t) => t.is_active) : mockRequestTypes;

  return forms;
};

export const getRequestForm = async (id: string) => {
  await new Promise((resolve) => setTimeout(resolve, 300));

  const type = mockRequestTypes.find((t) => t.id === id);
  return type || null;
};

export const createRequestForm = async (formData: any) => {
  await new Promise((resolve) => setTimeout(resolve, 500));

  const newForm = {
    id: `app_form_${Date.now()}`,
    ...formData,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  mockRequestTypes.push(newForm);
  return { success: true, message: '申請フォームを作成しました', data: newForm };
};

export const updateRequestForm = async (id: string, updates: any) => {
  await new Promise((resolve) => setTimeout(resolve, 500));

  const formIndex = mockRequestTypes.findIndex((t) => t.id === id);
  if (formIndex >= 0) {
    mockRequestTypes[formIndex] = {
      ...mockRequestTypes[formIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return {
      success: true,
      message: '申請フォームを更新しました',
      data: mockRequestTypes[formIndex],
    };
  }
  return { success: false, error: '申請フォームが見つかりません' };
};

export const deleteRequestForm = async (id: string) => {
  await new Promise((resolve) => setTimeout(resolve, 400));

  const formIndex = mockRequestTypes.findIndex((t) => t.id === id);
  if (formIndex >= 0) {
    mockRequestTypes.splice(formIndex, 1);
    return { success: true, message: '申請フォームを削除しました' };
  }
  return { success: false, error: '申請フォームが見つかりません' };
};

export const toggleRequestFormStatus = async (id: string, isActive: boolean) => {
  await new Promise((resolve) => setTimeout(resolve, 400));

  const formIndex = mockRequestTypes.findIndex((t) => t.id === id);
  if (formIndex >= 0) {
    mockRequestTypes[formIndex].is_active = isActive;
    mockRequestTypes[formIndex].updated_at = new Date().toISOString();
    const status = isActive ? '有効' : '無効';
    return {
      success: true,
      message: `申請フォームを${status}にしました`,
      data: mockRequestTypes[formIndex],
    };
  }
  return { success: false, error: '申請フォームが見つかりません' };
};

export const getDashboardData = async (userId: string) => {
  await new Promise((resolve) => setTimeout(resolve, 500));

  const userAttendance = mockAttendanceRecords.filter((r) => r.user_id === userId);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const thisMonthRecords = userAttendance.filter((r) => r.work_date?.startsWith(thisMonth));

  const workDays = thisMonthRecords.length;
  const totalOvertimeMinutes = thisMonthRecords.reduce(
    (sum, r) => sum + (r.overtime_minutes || 0),
    0
  );
  const overtimeHours = Math.round((totalOvertimeMinutes / 60) * 10) / 10;

  const userRequests = mockRequests.filter((a) => a.user_id === userId);
  const pendingRequests = userRequests.filter((a) => a.status_id === 'status_pending');

  return {
    stats: {
      workDays,
      overtimeHours,
      vacationDays: 3,
      totalWorkHours: workDays * 8,
    },
    pendingRequests: pendingRequests.length,
    recentActivity: [
      { type: 'clock_in', time: '09:00', date: 'today' },
      { type: 'request', title: '休暇申請', status: 'pending' },
    ],
  };
};

export const getAdminDashboardData = async () => {
  await new Promise((resolve) => setTimeout(resolve, 600));

  const activeUsers = mockUsers.filter((u) => u.is_active).length;
  const pendingRequests = mockRequests.filter((a) => a.status_id === 'status_pending').length;
  const todayAttendance = mockAttendanceRecords.filter(
    (r) => r.work_date === new Date().toISOString().split('T')[0]
  ).length;
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthlyAttendance = mockAttendanceRecords.filter((r) => r.work_date?.startsWith(thisMonth));
  const totalOvertimeHours =
    Math.round(
      (monthlyAttendance.reduce((sum, r) => sum + (r.overtime_minutes || 0), 0) / 60) * 10
    ) / 10;

  return {
    stats: {
      totalUsers: activeUsers,
      pendingRequests,
      todayAttendance,
      monthlyOvertimeHours: totalOvertimeHours,
    },
    recentRequests: mockRequests.slice(0, 5),
    alerts: [{ type: 'info', message: `${pendingRequests}件の申請が承認待ちです` }],
  };
};

export const getSettingsData = async () => {
  await new Promise((resolve) => setTimeout(resolve, 400));

  return {
    features: [
      { code: 'TIME_CLOCK', name: '打刻機能', enabled: true },
      { code: 'REQUESTS', name: '申請機能', enabled: true },
      { code: 'USER_MANAGEMENT', name: 'ユーザー管理', enabled: true },
      { code: 'GROUP_MANAGEMENT', name: 'グループ管理', enabled: true },
      { code: 'ANALYTICS', name: '分析機能', enabled: false },
    ],
    system: {
      companyName: '株式会社TimePort',
      timezone: 'Asia/Tokyo',
      workingHours: { start: '09:00', end: '18:00' },
    },
  };
};

export const updateSettings = async (settingsType: string, data: any) => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  console.log(`Mock: Updating ${settingsType} settings:`, data);
  return { success: true, message: '設定を更新しました' };
};

export const getGroupData = async () => {
  await new Promise((resolve) => setTimeout(resolve, 400));

  return {
    groups: mockGroups,
    users: mockUsers,
  };
};

export const getGroups = async () => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return mockGroups;
};

export const getNotifications = async (userId: string) => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return mockNotifications.filter((n) => n.user_id === userId);
};

export const markNotificationAsRead = async (notificationId: string) => {
  await new Promise((resolve) => setTimeout(resolve, 200));
  const notifIndex = mockNotifications.findIndex((n) => n.id === notificationId);
  if (notifIndex >= 0) {
    mockNotifications[notifIndex].is_read = true;
  }
  return { success: true };
};

export const authenticateUser = async (email: string, password: string) => {
  await new Promise((resolve) => setTimeout(resolve, 800));

  const user = mockUsers.find((u) => u.email === email && u.is_active);
  if (user && password === 'Passw0rd!') {
    return {
      success: true,
      user: {
        id: user.id,
        employee_id: user.code,
        full_name: `${user.family_name} ${user.first_name}`,
        email: user.email,
        role: user.role,
        primary_group_id: user.primary_group_id,
      },
    };
  }

  return {
    success: false,
    error: 'メールアドレスまたはパスワードが正しくありません',
  };
};

export const logoutUser = async () => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return { success: true };
};

// 後方互換性のため
export const getOrganizationData = getGroupData;
export const getDepartments = async () => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return mockGroups.filter((g) => g.id.includes('dept'));
};
export const getWorkplaces = async () => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return mockGroups.filter((g) => g.id.includes('work'));
};

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

export const mockChatMessages: ChatMessage[] = [
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

export const getSchedules = async (userId: string) => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return mockSchedules.filter((s) => s.user_id === userId);
};

export const getTodos = async (userId: string) => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return mockTodos.filter((t) => t.user_id === userId);
};

export const getReports = async (userId: string) => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return mockReports.filter((r) => r.user_id === userId);
};

export const getReportTemplates = async () => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return mockReportTemplates.filter((t) => t.is_active);
};

export const getChats = async (userId: string) => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const userChats = mockChatUsers.filter((cu) => cu.user_id === userId);
  return mockChats.filter((c) => userChats.some((uc) => uc.chat_id === c.id));
};

export const getChatMessages = async (chatId: string) => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return mockChatMessages.filter((m) => m.chat_id === chatId);
};

export const getChatUsers = async () => {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return mockChatUsers;
};

export const createSchedule = async (data: CreateScheduleInput) => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const newSchedule: Schedule = {
    id: `schedule_${Date.now()}`,
    user_id: 'user3', // Current user
    ...data,
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
  return { success: true, data: newSchedule };
};

export const createTodo = async (data: CreateTodoInput) => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const newTodo: Todo = {
    id: `todo_${Date.now()}`,
    user_id: 'user3', // Current user
    ...data,
    priority: data.priority || 'medium',
    status: 'pending',
    tags: data.tags || [],
    completion_rate: 0,
    shared_with_groups: data.shared_with_groups || [],
    is_private: data.is_private || false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  mockTodos.push(newTodo);
  return { success: true, data: newTodo };
};

export const createReport = async (templateId: string, data: Record<string, unknown>) => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const template = mockReportTemplates.find((t) => t.id === templateId);
  if (!template) throw new Error('Template not found');

  const newReport: Report = {
    id: `report_${Date.now()}`,
    company_id: 'company1',
    template_id: templateId,
    user_id: 'user3', // Current user
    title: `${template.name} - ${new Date().toLocaleDateString('ja-JP')}`,
    report_date: new Date().toISOString().split('T')[0],
    content: data as Record<string, string | number | boolean | string[]>,
    current_status_id: 'status1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  mockReports.push(newReport);
  return { success: true, data: newReport };
};

export const sendMessage = async (chatId: string, content: string, userId?: string) => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const newMessage: ChatMessage = {
    id: `message_${Date.now()}`,
    chat_id: chatId,
    user_id: userId || '49c83f3d-7c28-4cd8-9fbc-1c2a1c57a076', // Current user
    message_type: 'text',
    content,
    attachments: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  mockChatMessages.push(newMessage);

  // Update chat last message time
  const chatIndex = mockChats.findIndex((c) => c.id === chatId);
  if (chatIndex >= 0) {
    mockChats[chatIndex].last_message_at = newMessage.created_at;
  }

  return { success: true, data: newMessage };
};
