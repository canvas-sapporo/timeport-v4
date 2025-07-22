// TimePort Data Provider Hub
// データソースの切り替えを管理する統一インターフェース

import * as mockProvider from './mock';
import * as supabaseProvider from './supabase-provider';

const USE_SUPABASE = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';

// 勤怠データ
export const getAttendanceData = USE_SUPABASE
  ? supabaseProvider.getAttendanceData
  : mockProvider.getAttendanceData;

export const getTodayAttendance = USE_SUPABASE
  ? supabaseProvider.getTodayAttendance
  : mockProvider.getTodayAttendance;

export const clockIn = USE_SUPABASE ? supabaseProvider.clockIn : mockProvider.clockIn;

export const clockOut = USE_SUPABASE ? supabaseProvider.clockOut : mockProvider.clockOut;

export const startBreak = USE_SUPABASE ? supabaseProvider.startBreak : mockProvider.startBreak;

export const endBreak = USE_SUPABASE ? supabaseProvider.endBreak : mockProvider.endBreak;

// ユーザーデータ
export const getUserData = USE_SUPABASE ? supabaseProvider.getUserData : mockProvider.getUserData;

export const getUserProfile = USE_SUPABASE
  ? supabaseProvider.getUserProfile
  : mockProvider.getUserProfile;

export const updateUserProfile = USE_SUPABASE
  ? supabaseProvider.updateUserProfile
  : mockProvider.updateUserProfile;

// 申請データ
export const getRequestData = USE_SUPABASE
  ? supabaseProvider.getRequestData
  : mockProvider.getRequestData;

export const createRequest = USE_SUPABASE
  ? supabaseProvider.createRequest
  : mockProvider.createRequest;

export const updateRequestStatus = USE_SUPABASE
  ? supabaseProvider.updateRequestStatus
  : mockProvider.updateRequestStatus;

export const getRequestForms = USE_SUPABASE
  ? supabaseProvider.getRequestForms
  : mockProvider.getRequestForms;

export const getRequestForm = USE_SUPABASE
  ? supabaseProvider.getRequestForm
  : mockProvider.getRequestForm;

export const createRequestForm = USE_SUPABASE
  ? supabaseProvider.createRequestForm
  : mockProvider.createRequestForm;

export const updateRequestForm = USE_SUPABASE
  ? supabaseProvider.updateRequestForm
  : mockProvider.updateRequestForm;

export const deleteRequestForm = USE_SUPABASE
  ? supabaseProvider.deleteRequestForm
  : mockProvider.deleteRequestForm;

export const toggleRequestFormStatus = USE_SUPABASE
  ? supabaseProvider.toggleRequestFormStatus
  : mockProvider.toggleRequestFormStatus;

// ダッシュボードデータ
export const getDashboardData = USE_SUPABASE
  ? supabaseProvider.getDashboardData
  : mockProvider.getDashboardData;

export const getAdminDashboardData = USE_SUPABASE
  ? supabaseProvider.getAdminDashboardData
  : mockProvider.getAdminDashboardData;

// 設定データ
export const getSettingsData = USE_SUPABASE
  ? supabaseProvider.getSettingsData
  : mockProvider.getSettingsData;

export const updateSettings = USE_SUPABASE
  ? supabaseProvider.updateSettings
  : mockProvider.updateSettings;

// グループデータ
export const getGroupData = USE_SUPABASE
  ? supabaseProvider.getGroupData
  : mockProvider.getGroupData;

export const getGroups = USE_SUPABASE ? supabaseProvider.getGroups : mockProvider.getGroups;

// 通知データ
export const getNotifications = USE_SUPABASE
  ? supabaseProvider.getNotifications
  : mockProvider.getNotifications;

export const markNotificationAsRead = USE_SUPABASE
  ? supabaseProvider.markNotificationAsRead
  : mockProvider.markNotificationAsRead;

// 認証
export const authenticateUser = USE_SUPABASE
  ? supabaseProvider.authenticateUser
  : mockProvider.authenticateUser;

export const logoutUser = USE_SUPABASE ? supabaseProvider.logoutUser : mockProvider.logoutUser;

// 後方互換性のため（段階的移行用）
export const getOrganizationData = USE_SUPABASE
  ? supabaseProvider.getOrganizationData
  : mockProvider.getOrganizationData;

export const getDepartments = USE_SUPABASE
  ? supabaseProvider.getDepartments
  : mockProvider.getDepartments;

export const getWorkplaces = USE_SUPABASE
  ? supabaseProvider.getWorkplaces
  : mockProvider.getWorkplaces;
