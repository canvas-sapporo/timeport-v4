// TimePort Supabase Data Provider
// 本番環境用のSupabase接続実装

import { supabase } from './supabase';

// Helper function to convert snake_case to camelCase
const toCamelCase = (obj: any): any => {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(toCamelCase);
  }

  const camelObj: any = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      camelObj[camelKey] = toCamelCase(obj[key]);
    }
  }
  return camelObj;
};

// Helper function to convert camelCase to snake_case
const toSnakeCase = (obj: any): any => {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(toSnakeCase);
  }

  const snakeObj: any = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      snakeObj[snakeKey] = toSnakeCase(obj[key]);
    }
  }
  return snakeObj;
};

// 勤怠データ
export const getAttendanceData = async (userId?: string) => {
  if (!supabase) throw new Error('Supabase not configured');

  let query = supabase.from('attendances').select('*').order('work_date', { ascending: false });

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return { records: toCamelCase(data || []) };
};

export const getTodayAttendance = async (userId: string) => {
  if (!supabase) throw new Error('Supabase not configured');

  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('attendances')
    .select('*')
    .eq('user_id', userId)
    .eq('work_date', today)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data ? toCamelCase(data) : null;
};

export const clockIn = async (userId: string, time: string) => {
  if (!supabase) throw new Error('Supabase not configured');

  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('attendances')
    .upsert({
      user_id: userId,
      work_date: today,
      clock_in_time: time,
      break_records: [],
      overtime_minutes: 0,
      status: 'normal',
    })
    .select()
    .single();

  if (error) throw error;
  return { success: true, message: '出勤しました', data: toCamelCase(data) };
};

export const clockOut = async (userId: string, time: string) => {
  if (!supabase) throw new Error('Supabase not configured');

  const today = new Date().toISOString().split('T')[0];

  const existingRecord = await getTodayAttendance(userId);
  if (!existingRecord || !existingRecord.clockInTime) {
    throw new Error('出勤記録が見つかりません');
  }

  const clockInTime = new Date(`${today}T${existingRecord.clockInTime}:00`);
  const clockOutTime = new Date(`${today}T${time}:00`);
  const workMinutes = Math.floor((clockOutTime.getTime() - clockInTime.getTime()) / 60000) - 60;
  const overtimeMinutes = Math.max(0, workMinutes - 480);

  const { data, error } = await supabase
    .from('attendances')
    .update({
      clock_out_time: time,
      actual_work_minutes: workMinutes,
      overtime_minutes: overtimeMinutes,
    })
    .eq('id', existingRecord.id)
    .select()
    .single();

  if (error) throw error;
  return { success: true, message: '退勤しました', data: toCamelCase(data) };
};

export const startBreak = async (userId: string, time: string) => {
  if (!supabase) throw new Error('Supabase not configured');

  const existingRecord = await getTodayAttendance(userId);
  if (!existingRecord) {
    throw new Error('出勤記録が見つかりません');
  }

  const breakRecords = [...(existingRecord.breakRecords || [])];
  breakRecords.push({ start: time, end: '' });

  const { data, error } = await supabase
    .from('attendances')
    .update({ break_records: breakRecords })
    .eq('id', existingRecord.id)
    .select()
    .single();

  if (error) throw error;
  return { success: true, message: '休憩を開始しました', data: toCamelCase(data) };
};

export const endBreak = async (userId: string, time: string) => {
  if (!supabase) throw new Error('Supabase not configured');

  const existingRecord = await getTodayAttendance(userId);
  if (!existingRecord) {
    throw new Error('出勤記録が見つかりません');
  }

  const breakRecords = [...(existingRecord.breakRecords || [])];
  const lastBreak = breakRecords[breakRecords.length - 1];

  if (!lastBreak || lastBreak.end) {
    throw new Error('開始中の休憩が見つかりません');
  }

  lastBreak.end = time;

  const { data, error } = await supabase
    .from('attendances')
    .update({ break_records: breakRecords })
    .eq('id', existingRecord.id)
    .select()
    .single();

  if (error) throw error;
  return { success: true, message: '休憩を終了しました', data: toCamelCase(data) };
};

// ユーザーデータ
export const getUserData = async () => {
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase.from('users').select('*').eq('is_active', true);

  if (error) throw error;
  return { users: toCamelCase(data || []) };
};

export const getUserProfile = async (userId: string) => {
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();

  if (error && error.code !== 'PGRST116') throw error;
  return data ? toCamelCase(data) : null;
};

export const updateUserProfile = async (userId: string, updates: any) => {
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('users')
    .update(toSnakeCase(updates))
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return { success: true, message: 'プロフィールを更新しました', data: toCamelCase(data) };
};

// 申請データ
export const getRequestData = async (userId?: string) => {
  if (!supabase) throw new Error('Supabase not configured');

  let query = supabase
    .from('requests')
    .select(
      `
      *,
      users!requests_user_id_fkey(name, employee_id),
      request_forms!requests_request_form_id_fkey(name)
    `
    )
    .order('created_at', { ascending: false });

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return { data: toCamelCase(data || []) };
};

export const createRequest = async (requestData: any) => {
  console.log('supabase-provider createRequest: 開始', requestData);

  if (!supabase) throw new Error('Supabase not configured');

  const snakeCaseData = toSnakeCase(requestData);
  console.log('supabase-provider createRequest: snakeCaseData', snakeCaseData);

  const { data, error } = await supabase.from('requests').insert([snakeCaseData]).select().single();

  console.log('supabase-provider createRequest: 結果', { data, error });

  if (error) {
    console.error('supabase-provider createRequest: エラー', error);
    throw error;
  }

  console.log('supabase-provider createRequest: 成功', data);
  return { success: true, message: '申請を提出しました', data: toCamelCase(data) };
};

export const updateRequestStatus = async (requestId: string, status: string, updates: any = {}) => {
  if (!supabase) throw new Error('Supabase not configured');

  const updateData = {
    status,
    updated_at: new Date().toISOString(),
    ...toSnakeCase(updates),
  };

  const { data, error } = await supabase
    .from('requests')
    .update(updateData)
    .eq('id', requestId)
    .select()
    .single();

  if (error) throw error;
  return {
    success: true,
    message: `申請を${status === 'approved' ? '承認' : '却下'}しました`,
    data: toCamelCase(data),
  };
};

export const getRequestForms = async (activeOnly: boolean = false) => {
  if (!supabase) throw new Error('Supabase not configured');

  let query = supabase.from('request_forms').select('*').order('created_at', { ascending: false });

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) throw error;
  return toCamelCase(data || []);
};

export const getRequestForm = async (id: string) => {
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase.from('request_forms').select('*').eq('id', id).single();

  if (error && error.code !== 'PGRST116') throw error;
  return data ? toCamelCase(data) : null;
};

export const createRequestForm = async (formData: any) => {
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('request_forms')
    .insert([toSnakeCase(formData)])
    .select()
    .single();

  if (error) throw error;
  return { success: true, message: '申請フォームを作成しました', data: toCamelCase(data) };
};

export const updateRequestForm = async (id: string, updates: any) => {
  if (!supabase) throw new Error('Supabase not configured');

  const updateData = {
    ...toSnakeCase(updates),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('request_forms')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return { success: true, message: '申請フォームを更新しました', data: toCamelCase(data) };
};

export const deleteRequestForm = async (id: string) => {
  if (!supabase) throw new Error('Supabase not configured');

  const { error } = await supabase.from('request_forms').delete().eq('id', id);

  if (error) throw error;
  return { success: true, message: '申請フォームを削除しました' };
};

export const toggleRequestFormStatus = async (id: string, isActive: boolean) => {
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('request_forms')
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  const status = isActive ? '有効' : '無効';
  return { success: true, message: `申請フォームを${status}にしました`, data: toCamelCase(data) };
};

// ダッシュボードデータ
export const getDashboardData = async (userId: string) => {
  if (!supabase) throw new Error('Supabase not configured');

  // 複数のクエリを並行実行
  const [attendanceResult, requestsResult] = await Promise.all([
    getAttendanceData(userId),
    getRequestData(userId),
  ]);

  const thisMonth = new Date().toISOString().slice(0, 7);
  const thisMonthRecords = attendanceResult.records.filter((r: any) =>
    r.workDate.startsWith(thisMonth)
  );

  const workDays = thisMonthRecords.length;
  const totalOvertimeMinutes = thisMonthRecords.reduce(
    (sum: number, r: any) => sum + (r.overtimeMinutes || 0),
    0
  );
  const overtimeHours = Math.round((totalOvertimeMinutes / 60) * 10) / 10;

  const pendingRequests = requestsResult.data.filter((a: any) => a.status === 'pending');

  return {
    stats: {
      workDays,
      overtimeHours,
      vacationDays: 3, // 計算ロジックを実装
      totalWorkHours: workDays * 8,
    },
    pendingRequests: pendingRequests.length,
    recentActivity: [], // 実装
  };
};

export const getAdminDashboardData = async () => {
  if (!supabase) throw new Error('Supabase not configured');

  const [usersResult, requestsResult, attendanceResult] = await Promise.all([
    getUserData(),
    getRequestData(),
    getAttendanceData(),
  ]);

  const activeUsers = usersResult.users.filter((u: any) => u.isActive).length;
  const pendingRequests = requestsResult.data.filter((a: any) => a.status === 'pending').length;
  const today = new Date().toISOString().split('T')[0];
  const todayAttendance = attendanceResult.records.filter((r: any) => r.workDate === today).length;

  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthlyAttendance = attendanceResult.records.filter((r: any) =>
    r.workDate.startsWith(thisMonth)
  );
  const totalOvertimeHours =
    Math.round(
      (monthlyAttendance.reduce((sum: number, r: any) => sum + (r.overtimeMinutes || 0), 0) / 60) *
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
};

// 設定データ
export const getSettingsData = async () => {
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase.from('feature_settings').select('*');

  if (error) throw error;

  return {
    features:
      data?.map((item: any) => ({
        code: item.feature_code,
        name: item.feature_name,
        enabled: item.is_enabled,
      })) || [],
    system: {
      companyName: '株式会社TimePort',
      timezone: 'Asia/Tokyo',
      workingHours: { start: '09:00', end: '18:00' },
    },
  };
};

export const updateSettings = async (settingsType: string, data: any) => {
  if (!supabase) throw new Error('Supabase not configured');

  // 設定更新のロジックを実装
  console.log(`Supabase: Updating ${settingsType} settings:`, data);
  return { success: true, message: '設定を更新しました' };
};

// グループデータ
export const getGroupData = async () => {
  if (!supabase) throw new Error('Supabase not configured');

  const [groupsResult, usersResult] = await Promise.all([
    supabase.from('groups').select('*'),
    supabase.from('users').select('*').eq('is_active', true),
  ]);

  return {
    groups: toCamelCase(groupsResult.data || []),
    users: toCamelCase(usersResult.data || []),
  };
};

export const getGroups = async () => {
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase.from('groups').select('*').order('path');

  if (error) throw error;
  return toCamelCase(data || []);
};

// 通知データ
export const getNotifications = async (userId: string) => {
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return toCamelCase(data || []);
};

export const markNotificationAsRead = async (notificationId: string) => {
  if (!supabase) throw new Error('Supabase not configured');

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);

  if (error) throw error;
  return { success: true };
};

// 認証
export const authenticateUser = async (email: string, password: string) => {
  if (!supabase) throw new Error('Supabase not configured');

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) {
    return { success: false, error: 'メールアドレスまたはパスワードが正しくありません' };
  }

  if (!authData.user) {
    return { success: false, error: 'ログインに失敗しました' };
  }

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .eq('is_active', true)
    .single();

  if (userError || !userData) {
    return { success: false, error: 'ユーザー情報の取得に失敗しました' };
  }

  const camelUserData = toCamelCase(userData);

  return {
    success: true,
    user: {
      id: camelUserData.id,
      employeeId: camelUserData.employeeId,
      name: camelUserData.name,
      email: camelUserData.email,
      role: camelUserData.role,
      groupId: camelUserData.groupId,
    },
  };
};

export const logoutUser = async () => {
  if (!supabase) throw new Error('Supabase not configured');

  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  return { success: true };
};

// 後方互換性のため
export const getOrganizationData = getGroupData;
export const getDepartments = () =>
  getGroups().then((groups: any) => groups.filter((g: any) => g.level === 2));
export const getWorkplaces = () =>
  getGroups().then((groups: any) => groups.filter((g: any) => g.level === 1));

// デフォルトステータスを取得する関数
export const getDefaultStatus = async (category: string = 'request', code: string = 'draft') => {
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('statuses')
    .select('id')
    .eq('category', category)
    .eq('code', code)
    .single();

  if (error) {
    console.warn('デフォルトステータスの取得に失敗:', error);
    return null;
  }

  return data?.id;
};
