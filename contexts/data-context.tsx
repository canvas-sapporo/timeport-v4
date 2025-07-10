'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  AttendanceRecord, 
  Request, 
  RequestType, 
  Notification, 
  User,
  Group
} from '@/types';
import { 
  users, 
  requests, 
  requestTypes, 
  notifications, 
  groups,
  generateAttendanceRecords 
} from '@/lib/mock';

interface DataContextType {
  attendanceRecords: AttendanceRecord[];
  requests: Request[];
  requestTypes: RequestType[];
  notifications: Notification[];
  users: User[];
  groups: Group[];
  updateAttendance: (record: AttendanceRecord) => void;
  createRequest: (request: Omit<Request, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateRequest: (id: string, updates: Partial<Request>) => void;
  markNotificationAsRead: (id: string) => void;
  getTodayAttendance: (userId: string) => AttendanceRecord | null;
  getUserAttendance: (userId: string) => AttendanceRecord[];
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
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [requestsState, setRequests] = useState<Request[]>(requests);
  const [notificationsState, setNotifications] = useState<Notification[]>(notifications);

  useEffect(() => {
    // Generate attendance records for all users
    const allRecords: AttendanceRecord[] = [];
    users.forEach(user => {
      const userRecords = generateAttendanceRecords(user.id);
      allRecords.push(...userRecords);
    });
    setAttendanceRecords(allRecords);
  }, []);

  const updateAttendance = (record: AttendanceRecord) => {
    setAttendanceRecords(prev => {
      const existing = prev.findIndex(r => r.id === record.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = record;
        return updated;
      }
      return [...prev, record];
    });
  };

  const createRequest = (request: Omit<Request, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newRequest: Request = {
      ...request,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setRequests(prev => [...prev, newRequest]);
  };

  const updateRequest = (id: string, updates: Partial<Request>) => {
    setRequests(prev => 
      prev.map(app => app.id === id ? { ...app, ...updates, updatedAt: new Date().toISOString() } : app)
    );
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notif => notif.id === id ? { ...notif, isRead: true } : notif)
    );
  };

  const getTodayAttendance = (userId: string): AttendanceRecord | null => {
    const today = new Date().toISOString().split('T')[0];
    return attendanceRecords.find(r => r.userId === userId && r.workDate === today) || null;
  };

  const getUserAttendance = (userId: string): AttendanceRecord[] => {
    return attendanceRecords.filter(r => r.userId === userId);
  };

  const clockIn = (userId: string, time: string) => {
    const today = new Date().toISOString().split('T')[0];
    const recordId = `${userId}-${today}`;
    
    const existingRecord = attendanceRecords.find(r => r.id === recordId);
    if (existingRecord) {
      updateAttendance({ ...existingRecord, clockInTime: time, updatedAt: new Date().toISOString() });
    } else {
      const newRecord: AttendanceRecord = {
        id: recordId,
        userId,
        workDate: today,
        clockInTime: time,
        breakRecords: [],
        overtimeMinutes: 0,
        status: 'normal',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      updateAttendance(newRecord);
    }
  };

  const clockOut = (userId: string, time: string) => {
    const today = new Date().toISOString().split('T')[0];
    const recordId = `${userId}-${today}`;
    
    const existingRecord = attendanceRecords.find(r => r.id === recordId);
    if (existingRecord && existingRecord.clockInTime) {
      const clockInTime = new Date(`${today}T${existingRecord.clockInTime}:00`);
      const clockOutTime = new Date(`${today}T${time}:00`);
      const workMinutes = Math.floor((clockOutTime.getTime() - clockInTime.getTime()) / 60000) - 60;
      const overtimeMinutes = Math.max(0, workMinutes - 480);
      
      updateAttendance({
        ...existingRecord,
        clockOutTime: time,
        actualWorkMinutes: workMinutes,
        overtimeMinutes,
        updatedAt: new Date().toISOString()
      });
    }
  };

  const startBreak = (userId: string, time: string) => {
    const today = new Date().toISOString().split('T')[0];
    const recordId = `${userId}-${today}`;
    
    const existingRecord = attendanceRecords.find(r => r.id === recordId);
    if (existingRecord) {
      const newBreakRecord = { start: time, end: '' };
      updateAttendance({
        ...existingRecord,
        breakRecords: [...existingRecord.breakRecords, newBreakRecord],
        updatedAt: new Date().toISOString()
      });
    }
  };

  const endBreak = (userId: string, time: string) => {
    const today = new Date().toISOString().split('T')[0];
    const recordId = `${userId}-${today}`;
    
    const existingRecord = attendanceRecords.find(r => r.id === recordId);
    if (existingRecord) {
      const updatedBreakRecords = [...existingRecord.breakRecords];
      const lastBreak = updatedBreakRecords[updatedBreakRecords.length - 1];
      if (lastBreak && !lastBreak.end) {
        lastBreak.end = time;
      }
      updateAttendance({
        ...existingRecord,
        breakRecords: updatedBreakRecords,
        updatedAt: new Date().toISOString()
      });
    }
  };

  return (
    <DataContext.Provider
      value={{
        attendanceRecords,
        requests: requestsState,
        requestTypes,
        notifications: notificationsState,
        users,
        groups,
        // 後方互換性のため
        departments: groups.filter(g => g.level === 2),
        workplaces: groups.filter(g => g.level === 1),
        updateAttendance,
        createRequest,
        updateRequest,
        markNotificationAsRead,
        getTodayAttendance,
        getUserAttendance,
        clockIn,
        clockOut,
        startBreak,
        endBreak
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