'use client';

import { useState } from 'react';
import { Bell, Search, Menu } from 'lucide-react';

import { useAuth } from '@/contexts/auth-context';
import { useData } from '@/contexts/data-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Header() {
  const { user } = useAuth();
  const { notifications, markNotificationAsRead } = useData();
  const [searchQuery, setSearchQuery] = useState('');

  const unreadNotifications = notifications.filter((n) => !n.is_read && n.user_id === user?.id);

  const handleNotificationClick = (notificationId: string) => {
    markNotificationAsRead(notificationId);
  };

  return (
    <header className="h-16 timeport-header text-white flex items-center justify-between px-6 shadow-lg relative z-20">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" className="lg:hidden text-white hover:bg-white/10">
          <Menu className="w-5 h-5" />
        </Button>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/60" />
          <Input
            placeholder="検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 w-64 bg-white/10 border-white/20 text-white placeholder:text-white/70 focus:bg-white/20 focus:border-white/40 backdrop-blur-sm"
          />
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative text-white hover:bg-white/10">
              <Bell className="w-5 h-5" />
              {unreadNotifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                  {unreadNotifications.length}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 glass-effect">
            <div className="p-2">
              <h3 className="font-medium text-gray-900 mb-2">通知</h3>
              {unreadNotifications.length === 0 ? (
                <p className="text-sm text-gray-500">新しい通知はありません</p>
              ) : (
                <div className="space-y-2">
                  {unreadNotifications.slice(0, 3).map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification.id)}
                      className="p-3 cursor-pointer rounded-lg hover:bg-white/50"
                    >
                      <div>
                        <div className="font-medium text-sm">{notification.title}</div>
                        <div className="text-xs text-gray-500 mt-1">{notification.message}</div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </div>
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/30">
            <span className="text-sm font-medium text-white">{user?.full_name.charAt(0)}</span>
          </div>
          <div className="hidden md:block">
            <div className="text-sm font-medium text-white">{user?.full_name}</div>
            <div className="text-xs text-white/70">
              {user?.role === 'system-admin'
                ? 'システム管理者'
                : user?.role === 'admin'
                  ? '管理者'
                  : 'メンバー'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
