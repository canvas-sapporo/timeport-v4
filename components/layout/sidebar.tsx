'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { 
  Home, 
  Clock, 
  Calendar, 
  FileText, 
  Users, 
  Settings, 
  LogOut,
  Menu,
  X,
  BarChart3,
  Building
} from 'lucide-react';

const userMenuItems = [
  { href: '/member', icon: Home, label: 'ダッシュボード' },
  { href: '/member/attendance', icon: Clock, label: '勤怠' },
  { href: '/member/requests', icon: FileText, label: '申請' },
  { href: '/member/profile', icon: Users, label: 'プロフィール' },
];

const adminMenuItems = [
  { href: '/admin', icon: Home, label: 'ダッシュボード' },
  { href: '/admin/attendance', icon: Clock, label: '勤怠管理' },
  { href: '/admin/requests', icon: FileText, label: '申請管理' },
  { href: '/admin/users', icon: Users, label: 'ユーザー管理' },
  { href: '/admin/group', icon: Building, label: 'グループ管理' },
  { href: '/admin/settings', icon: Settings, label: '設定' },
];

const superAdminMenuItems = [
  { href: '/super-admin', icon: Home, label: 'ダッシュボード' },
  { href: '/super-admin/company', icon: Building, label: '企業管理' },
  { href: '/super-admin/features', icon: Settings, label: '機能管理' },
  { href: '/super-admin/system', icon: BarChart3, label: 'システム管理' },
];

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();

  if (!user) return null;

  const getMenuItems = () => {
    switch (user.role) {
      case 'super_admin':
        return superAdminMenuItems;
      case 'admin':
        return adminMenuItems;
      case 'member':
      default:
        return userMenuItems;
    }
  };

  const menuItems = getMenuItems();

  return (
    <>
      {/* Mobile overlay */}
      {!isCollapsed && (
        <div 
          className="fixed inset-0 bg-black/50 lg:hidden z-40"
          onClick={() => setIsCollapsed(true)}
        />
      )}
      
      <aside className={cn(
        "fixed left-0 top-0 z-50 h-full min-h-screen timeport-sidebar text-white transition-all duration-300 lg:relative lg:z-0 shadow-2xl",
        isCollapsed ? "w-16" : "w-64"
      )}>
        <div className="flex h-full min-h-screen flex-col relative">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/20">
            <div className={cn("flex items-center space-x-2", isCollapsed && "justify-center")}>
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/30">
                <Clock className="w-5 h-5 text-white" />
              </div>
              {!isCollapsed && (
                <span className="text-xl font-bold text-white gradient-text">TimePort</span>
              )}
            </div>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 rounded-lg hover:bg-white/10 lg:hidden text-white transition-colors"
            >
              {isCollapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
            </button>
          </div>

          {/* User info */}
          <div className="p-4 border-b border-white/20">
            <div className={cn("flex items-center space-x-3", isCollapsed && "justify-center")}>
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/30">
                <span className="text-sm font-medium text-white">{user.name.charAt(0)}</span>
              </div>
              {!isCollapsed && (
                <div>
                  <div className="text-sm font-medium text-white">{user.name}</div>
                  <div className="text-xs text-white/70">{user.employeeId}</div>
                  <div className="text-xs text-white/60">
                    {user.role === 'super_admin' ? 'スーパー管理者' : 
                     user.role === 'admin' ? '管理者' : 'メンバー'}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 group",
                    isActive 
                      ? "bg-white/20 text-white backdrop-blur-sm shadow-lg border border-white/30" 
                      : "text-white/80 hover:bg-white/10 hover:text-white",
                    isCollapsed && "justify-center"
                  )}
                >
                  <Icon className={cn("w-5 h-5 flex-shrink-0", isActive && "animate-pulse")} />
                  {!isCollapsed && <span className="ml-3">{item.label}</span>}
                  {!isCollapsed && isActive && (
                    <div className="ml-auto w-2 h-2 bg-white rounded-full animate-pulse" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-white/20">
            <button
              onClick={logout}
              className={cn(
                "w-full flex items-center px-3 py-3 rounded-xl text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-all duration-200 group",
                isCollapsed && "justify-center"
              )}
            >
              <LogOut className="w-5 h-5 flex-shrink-0 group-hover:animate-pulse" />
              {!isCollapsed && <span className="ml-3">ログアウト</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}