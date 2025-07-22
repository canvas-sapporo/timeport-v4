'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

import { Attendance } from '@/types/attendance';
import { Request, RequestForm } from '@/types/request';
import { UserProfile } from '@/types/auth';
import { Notification } from '@/types/system';
import { Group } from '@/types/groups';
import { users, requests, notifications, groups, generateAttendanceRecords } from '@/lib/mock';
import { getRequestForms } from '@/lib/actions/admin/request-forms';
import * as provider from '@/lib/provider';

interface DataContextType {
  attendanceRecords: Attendance[];
  requests: Request[];
  requestForms: RequestForm[];
  notifications: Notification[];
  users: UserProfile[];
  groups: Group[];
  updateAttendance: (record: Attendance) => void;
  createRequest: (request: Omit<Request, 'id' | 'created_at' | 'updated_at'>) => void;
  updateRequest: (id: string, updates: Partial<Request> & { rejection_reason?: string }) => void;
  markNotificationAsRead: (id: string) => void;
  getTodayAttendance: (userId: string) => Attendance | null;
  getUserAttendance: (userId: string) => Attendance[];
  clockIn: (userId: string, time: string) => void;
  clockOut: (userId: string, time: string) => void;
  startBreak: (userId: string, time: string) => void;
  endBreak: (userId: string, time: string) => void;
  // 後方互換性のため
  departments: Group[];
  workplaces: Group[];
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [requestsState, setRequests] = useState<Request[]>(requests);
  const [notificationsState, setNotifications] = useState<Notification[]>(notifications);
  const [requestFormsState, setRequestForms] = useState<RequestForm[]>([]);

  useEffect(() => {
    // Generate attendance records for all users
    const allRecords: Attendance[] = [];
    users.forEach((user) => {
      const userRecords = generateAttendanceRecords(user.id);
      allRecords.push(...userRecords);
    });
    setAttendanceRecords(allRecords);
  }, []);

  // 申請フォームを取得
  useEffect(() => {
    const fetchRequestForms = async () => {
      try {
        const result = await getRequestForms();
        if (result.success && result.data) {
          // deleted_atが設定されているフォームを除外
          const activeForms = result.data.filter((form: RequestForm) => !form.deleted_at);
          setRequestForms(activeForms);
        }
      } catch (error) {
        console.error('申請フォーム取得エラー:', error);
      }
    };

    fetchRequestForms();
  }, []);

  const updateAttendance = (record: Attendance) => {
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

  const createRequest = async (request: Omit<Request, 'id' | 'created_at' | 'updated_at'>) => {
    console.log('data-context createRequest: 開始', request);
    try {
      const result = await provider.createRequest(request);
      console.log('data-context createRequest: 成功', result);
      // 必要ならローカルstateにもpush（省略可）
    } catch (error) {
      console.error('data-context createRequest: エラー', error);
      throw error;
    }
  };

  const updateRequest = (id: string, updates: Partial<Request> & { rejection_reason?: string }) => {
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

  const getTodayAttendance = (userId: string): Attendance | null => {
    const today = new Date().toISOString().split('T')[0];
    return attendanceRecords.find((r) => r.user_id === userId && r.work_date === today) || null;
  };

  const getUserAttendance = (userId: string): Attendance[] => {
    return attendanceRecords.filter((r) => r.user_id === userId);
  };

  const clockIn = (userId: string, time: string) => {
    const today = new Date().toISOString().split('T')[0];
    const recordId = `${userId}-${today}`;

    const existingRecord = attendanceRecords.find((r) => r.id === recordId);
    if (existingRecord) {
      updateAttendance({
        ...existingRecord,
        clock_in_time: time,
        updated_at: new Date().toISOString(),
      });
    } else {
      const newRecord: Attendance = {
        id: recordId,
        user_id: userId,
        work_date: today,
        clock_in_time: time,
        break_records: [],
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
    const today = new Date().toISOString().split('T')[0];
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
    const today = new Date().toISOString().split('T')[0];
    const recordId = `${userId}-${today}`;

    const existingRecord = attendanceRecords.find((r) => r.id === recordId);
    if (existingRecord) {
      const newBreakRecord = { start: time, end: '' };
      updateAttendance({
        ...existingRecord,
        break_records: [...existingRecord.break_records, newBreakRecord],
        updated_at: new Date().toISOString(),
      });
    }
  };

  const endBreak = (userId: string, time: string) => {
    const today = new Date().toISOString().split('T')[0];
    const recordId = `${userId}-${today}`;

    const existingRecord = attendanceRecords.find((r) => r.id === recordId);
    if (existingRecord) {
      const updatedBreakRecords = [...existingRecord.break_records];
      const lastBreak = updatedBreakRecords[updatedBreakRecords.length - 1];
      if (lastBreak && !lastBreak.end) {
        lastBreak.end = time;
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
        users,
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
