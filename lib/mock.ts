// TimePort Mock Data Provider
// 開発・テスト用のモックデータ実装

import { Attendance } from '@/types/attendance';
import { Request, RequestForm } from '@/types/request';
import { UserProfile } from '@/types/auth';
import { Notification } from '@/types/system';
import { Group } from '@/types/groups';

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
      break_records: [{ start: '12:00', end: '13:00' }],
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

let mockAttendanceRecords = mockUsers.flatMap((user) => generateAttendanceRecords(user.id));

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
    const newBreakRecord = { start: time, end: '' };
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
    if (lastBreak && !lastBreak.end) {
      lastBreak.end = time;
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
