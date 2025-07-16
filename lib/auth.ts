import { AuthUser } from '@/types';
import { users } from './mock';

export const loginUser = async (email: string, password: string): Promise<{
  id: string;
  employeeId: string;
  name: string;
  email: string;
  role: "system-admin" | "admin" | "member";
  groupId: string;
} | null> => {
  // Mock authentication - in real app, this would call an API
  const user = users.find(u => u.email === email && u.isActive);
  
  if (user && password === 'Passw0rd!') {
    return {
      id: user.id,
      employeeId: user.employeeId,
      name: user.name,
      email: user.email,
      role: user.role,
      groupId: user.groupId
    };
  }
  
  return null;
};

export const logoutUser = async (): Promise<void> => {
  // Mock logout - in real app, this would clear tokens
  localStorage.removeItem('auth-user');
};

export const getCurrentUser = (): AuthUser | null => {
  try {
    const stored = localStorage.getItem('auth-user');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

export const setCurrentUser = (user: AuthUser): void => {
  localStorage.setItem('auth-user', JSON.stringify(user));
};