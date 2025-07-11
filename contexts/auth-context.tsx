'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { AuthUser } from '@/types';
import { getCurrentUser, setCurrentUser } from '@/lib/auth';

interface AuthContextType {
  user: AuthUser | null;
  login: (user: AuthUser) => void;
  logout: () => void;
  isLoading: boolean;
  isLoggingOut: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const storedUser = getCurrentUser();
    setUser(storedUser);
    setIsLoading(false);
  }, []);

  const login = (userData: AuthUser) => {
    setUser(userData);
    setCurrentUser(userData);
  };

  const logout = async () => {
    setIsLoggingOut(true);
    
    try {
      // 少し待機してローディングアニメーションを表示
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // ユーザー状態をクリア
      setUser(null);
      localStorage.removeItem('auth-user');
      
      // Next.jsのrouterを使用してスムーズに遷移
      router.push('/login');
      
      // 追加の待機時間でスムーズな遷移を確保
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('Logout error:', error);
      // エラーが発生した場合は従来の方法を使用
      window.location.href = '/login';
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, isLoggingOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};