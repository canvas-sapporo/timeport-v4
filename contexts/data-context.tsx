'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

import { AttendanceData, ClockBreakRecord } from '@/schemas/attendance';
import { RequestData, RequestForm } from '@/schemas/request';
import { UserProfile } from '@/schemas/user_profile';
import { Notification } from '@/schemas/database/feature';
import { Group } from '@/schemas/group';
import { notifications, groups, generateAttendanceRecords } from '@/lib/mock';
import { getRequestForms } from '@/lib/actions/admin/request-forms';
import { getRequests, createRequest as createRequestAction } from '@/lib/actions/requests';
import * as provider from '@/lib/provider';
import { supabase } from '@/lib/supabase';
import { getJSTDate } from '@/lib/utils';

import { useAuth } from './auth-context';

interface DataContextType {
  attendanceRecords: AttendanceData[];
  requests: RequestData[];
  requestForms: RequestForm[];
  notifications: Notification[];
  users: UserProfile[];
  groups: Group[];
  updateAttendance: (record: AttendanceData) => void;
  createRequest: (
    request: Omit<RequestData, 'id' | 'created_at' | 'updated_at'> & { status_code?: string }
  ) => void;
  updateRequest: (
    id: string,
    updates: Partial<RequestData> & { rejection_reason?: string }
  ) => void;
  markNotificationAsRead: (id: string) => void;
  getTodayAttendance: (userId: string) => AttendanceData | null;
  getUserAttendance: (userId: string) => AttendanceData[];
  clockIn: (userId: string, time: string) => void;
  clockOut: (userId: string, time: string) => void;
  startBreak: (userId: string, time: string) => void;
  endBreak: (userId: string, time: string) => void;
  refreshRequests: () => Promise<void>;
  // 後方互換性のため
  departments: Group[];
  workplaces: Group[];
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceData[]>([]);
  const [requestsState, setRequests] = useState<RequestData[]>([]);
  const [notificationsState, setNotifications] = useState<Notification[]>(notifications);
  const [requestFormsState, setRequestForms] = useState<RequestForm[]>([]);
  const [usersState, setUsers] = useState<UserProfile[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // AuthContextからユーザー情報を取得
  const { user } = useAuth();

  // ユーザーIDが変更されたときにcurrentUserIdを更新
  useEffect(() => {
    if (user?.id) {
      console.log('DataProvider: ユーザーID更新:', user.id);
      setCurrentUserId(user.id);
    } else {
      console.log('DataProvider: ユーザーIDクリア');
      setCurrentUserId(null);
    }
  }, [user?.id]);

  useEffect(() => {
    // Generate attendance records for all users
    const allRecords: AttendanceData[] = [];
    usersState.forEach((user) => {
      const userRecords = generateAttendanceRecords(user.id);
      allRecords.push(...userRecords);
    });
    setAttendanceRecords(allRecords);
  }, [usersState]);

  // ユーザー情報を取得
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // クライアントサイドでは直接Supabaseクライアントを使用
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          console.error('認証エラー:', userError);
          return;
        }

        console.log('デバッグ: 現在のユーザーID:', user.id);

        // まず現在のユーザーのプロフィール情報を取得
        const { data: userProfile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('ユーザープロフィール取得エラー:', profileError);
          return;
        }

        // system-adminの場合はグループ情報を取得せずに全ユーザーを取得
        if (userProfile?.role === 'system-admin') {
          console.log('system-adminユーザーのため、全てのユーザーを取得します');
          const { data: allUsers, error: allUsersError } = await supabase
            .from('user_profiles')
            .select('*')
            .is('deleted_at', null)
            .order('code', { ascending: true });

          if (allUsersError) {
            console.error('全ユーザー取得エラー:', allUsersError);
            return;
          }

          setUsers(allUsers || []);
          return;
        }

        // 一般ユーザーとadminの場合はグループ情報を取得
        const { data: userGroups, error: groupsError } = await supabase
          .from('user_groups')
          .select(
            `
            group_id,
            groups!inner (
              company_id
            )
          `
          )
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .limit(1)
          .single();

        console.log('デバッグ: userGroups結果:', { userGroups, groupsError });
        console.log('デバッグ: userGroups.groups:', userGroups?.groups);
        console.log('デバッグ: userGroups.groups型:', typeof userGroups?.groups);

        if (groupsError || !userGroups?.groups) {
          console.error('ユーザーの会社情報が見つかりません');
          console.error('デバッグ: groupsError:', groupsError);
          console.error('デバッグ: userGroups:', userGroups);

          // adminの場合は全てのユーザーを表示
          if (userProfile?.role === 'admin') {
            console.log('adminユーザーのため、全てのユーザーを取得します');
            const { data: allUsers, error: allUsersError } = await supabase
              .from('user_profiles')
              .select('*')
              .is('deleted_at', null)
              .order('code', { ascending: true });

            if (allUsersError) {
              console.error('全ユーザー取得エラー:', allUsersError);
              return;
            }

            setUsers(allUsers || []);
            return;
          }

          return;
        }

        // 会社IDを安全に取得
        const groupsData = userGroups.groups as unknown as { company_id: string };
        const companyId = groupsData?.company_id;

        if (!companyId) {
          console.error('会社IDが見つかりません');
          return;
        }
        console.log('デバッグ: 会社ID:', companyId);

        // 会社内のユーザーを取得
        const { data: users, error: usersError } = await supabase
          .from('user_profiles')
          .select('*')
          .is('deleted_at', null)
          .order('code', { ascending: true });

        if (usersError) {
          console.error('ユーザー取得エラー:', usersError);
          return;
        }

        // より効率的な方法：一度に全てのユーザーとグループ情報を取得
        const { data: allUserGroups, error: allUserGroupsError } = await supabase
          .from('user_groups')
          .select(
            `
            user_id,
            groups!inner (
              company_id
            )
          `
          )
          .is('deleted_at', null);

        if (allUserGroupsError) {
          console.error('全ユーザーグループ取得エラー:', allUserGroupsError);
          return;
        }

        // 会社IDでフィルタリング
        const companyUserIds =
          allUserGroups
            ?.filter(
              (ug) => (ug.groups as unknown as { company_id: string })?.company_id === companyId
            )
            .map((ug) => ug.user_id) || [];

        const filteredUsers = (users || []).filter((userProfile) =>
          companyUserIds.includes(userProfile.id)
        );

        console.log('デバッグ: フィルタリング後のユーザー数:', filteredUsers.length);
        setUsers(filteredUsers);
      } catch (error) {
        console.error('ユーザーデータ取得エラー:', error);
      }
    };

    // ユーザー情報が利用可能になったら実行
    if (user) {
      fetchUsers();
    }
  }, [user]);

  // 申請フォームを取得（全ページで実行）
  useEffect(() => {
    const fetchRequestForms = async () => {
      try {
        const result = await getRequestForms();
        if (result.success && result.data) {
          // deleted_atが設定されているフォームを除外
          const activeForms = result.data.filter((form: RequestForm) => !form.deleted_at);

          // 重複を除去（IDでフィルタリング）
          const uniqueForms = activeForms.filter(
            (form, index, self) => index === self.findIndex((f) => f.id === form.id)
          );

          console.log('申請フォーム取得結果:', {
            total: result.data.length,
            active: activeForms.length,
            unique: uniqueForms.length,
          });

          setRequestForms(uniqueForms);
        }
      } catch (error) {
        console.error('申請フォーム取得エラー:', error);
      }
    };

    fetchRequestForms();
  }, []);

  // 申請データを取得（全ページで実行）
  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const result = await getRequests(currentUserId || undefined);

        if (result.success && result.data) {
          // 重複を除去（IDでフィルタリング）
          const uniqueRequests = result.data.filter(
            (request, index, self) => index === self.findIndex((r) => r.id === request.id)
          );

          setRequests(uniqueRequests);
        } else {
          console.error('申請データ取得失敗:', result.error);
        }
      } catch (error) {
        console.error('申請データ取得エラー:', error);
        console.error('エラーの詳細:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          error: error,
        });
      }
    };

    // currentUserIdが設定されている場合のみ実行
    if (currentUserId) {
      fetchRequests();
    }
  }, [currentUserId]);

  const updateAttendance = (record: AttendanceData) => {
    setAttendanceRecords((prev) => {
      const existing = prev.findIndex((r) => r.id === record.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = record;
        return updated;
      }
      return [...prev, record];
    });
  };

  const createRequest = async (
    request: Omit<RequestData, 'id' | 'created_at' | 'updated_at'> & { status_code?: string }
  ) => {
    console.log('data-context createRequest: 開始', request);

    if (!currentUserId) {
      console.error('data-context createRequest: ユーザーIDが取得できません');
      throw new Error('ユーザーIDが取得できません');
    }

    try {
      // Server Actionを使用して申請を作成
      const result = await createRequestAction(
        {
          user_id: request.user_id!,
          request_form_id: request.request_form_id!,
          title: request.title!,
          form_data: request.form_data!,
          target_date: request.target_date,
          start_date: request.start_date,
          end_date: request.end_date,
          submission_comment: request.submission_comment,
        },
        currentUserId
      );
      console.log('data-context createRequest: 成功', result);

      if (result.success && result.data) {
        // 成功した場合は申請リストを更新
        await refreshRequests();
      }

      return result;
    } catch (error) {
      console.error('data-context createRequest: エラー', error);
      throw error;
    }
  };

  const refreshRequests = async () => {
    console.log('data-context refreshRequests: 開始');
    try {
      const result = await getRequests(currentUserId || undefined);
      console.log('data-context refreshRequests: 結果:', result);

      if (result.success && result.data) {
        console.log('data-context refreshRequests: 申請データ更新:', result.data);
        setRequests(result.data);
      } else {
        console.error('申請データ再取得失敗:', result.error);
      }
    } catch (error) {
      console.error('申請データ再取得エラー:', error);
    }
  };

  const updateRequest = (
    id: string,
    updates: Partial<RequestData> & { rejection_reason?: string }
  ) => {
    setRequests((prev) =>
      prev.map((app) =>
        app.id === id ? { ...app, ...updates, updatedAt: new Date().toISOString() } : app
      )
    );
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((notif) => (notif.id === id ? { ...notif, isRead: true } : notif))
    );
  };

  const getTodayAttendance = (userId: string): AttendanceData | null => {
    const today = new Date().toISOString().split('T')[0];
    return attendanceRecords.find((r) => r.user_id === userId && r.work_date === today) || null;
  };

  const getUserAttendance = (userId: string): AttendanceData[] => {
    return attendanceRecords.filter((r) => r.user_id === userId);
  };

  const clockIn = (userId: string, time: string) => {
    const today = getJSTDate();
    const recordId = `${userId}-${today}`;

    const existingRecord = attendanceRecords.find((r) => r.id === recordId);
    if (existingRecord) {
      updateAttendance({
        ...existingRecord,
        clock_in_time: time,
        updated_at: new Date().toISOString(),
      });
    } else {
      const newRecord: AttendanceData = {
        id: recordId,
        user_id: userId,
        work_date: today,
        clock_in_time: time,
        break_records: [],
        clock_records: [],
        overtime_minutes: 0,
        late_minutes: 0,
        early_leave_minutes: 0,
        status: 'normal',
        auto_calculated: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      updateAttendance(newRecord);
    }
  };

  const clockOut = (userId: string, time: string) => {
    const today = getJSTDate();
    const recordId = `${userId}-${today}`;

    const existingRecord = attendanceRecords.find((r) => r.id === recordId);
    if (existingRecord && existingRecord.clock_in_time) {
      const clockInTime = new Date(`${today}T${existingRecord.clock_in_time}:00`);
      const clockOutTime = new Date(`${today}T${time}:00`);
      const workMinutes = Math.floor((clockOutTime.getTime() - clockInTime.getTime()) / 60000) - 60;
      const overtimeMinutes = Math.max(0, workMinutes - 480);

      updateAttendance({
        ...existingRecord,
        clock_out_time: time,
        actual_work_minutes: workMinutes,
        overtime_minutes: overtimeMinutes,
        updated_at: new Date().toISOString(),
      });
    }
  };

  const startBreak = (userId: string, time: string) => {
    const today = getJSTDate();
    const recordId = `${userId}-${today}`;

    const existingRecord = attendanceRecords.find((r) => r.id === recordId);
    if (existingRecord) {
      const newBreakRecord: ClockBreakRecord = {
        break_start: time,
        break_end: '',
      };
      updateAttendance({
        ...existingRecord,
        break_records: [...existingRecord.break_records, newBreakRecord],
        updated_at: new Date().toISOString(),
      });
    }
  };

  const endBreak = (userId: string, time: string) => {
    const today = getJSTDate();
    const recordId = `${userId}-${today}`;

    const existingRecord = attendanceRecords.find((r) => r.id === recordId);
    if (existingRecord) {
      const updatedBreakRecords = [...existingRecord.break_records];
      const lastBreak = updatedBreakRecords[updatedBreakRecords.length - 1];
      if (lastBreak && !lastBreak.break_end) {
        lastBreak.break_end = time;
      }
      updateAttendance({
        ...existingRecord,
        break_records: updatedBreakRecords,
        updated_at: new Date().toISOString(),
      });
    }
  };

  return (
    <DataContext.Provider
      value={{
        attendanceRecords,
        requests: requestsState,
        requestForms: requestFormsState,
        notifications: notificationsState,
        users: usersState,
        groups,
        // 後方互換性のため
        departments: groups.filter((g) => g.id.includes('dept')),
        workplaces: groups.filter((g) => g.id.includes('work')),
        updateAttendance,
        createRequest,
        updateRequest,
        markNotificationAsRead,
        getTodayAttendance,
        getUserAttendance,
        clockIn,
        clockOut,
        startBreak,
        endBreak,
        refreshRequests,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
