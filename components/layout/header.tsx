'use client';

import { useState } from 'react';
import { Search, Menu, Users, Settings } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';

import { useAuth } from '@/contexts/auth-context';
import { useData } from '@/contexts/data-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import NotificationSystem from '@/components/notifications/notification-system';

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { user } = useAuth();
  const { notifications, markNotificationAsRead } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const pathname = usePathname();

  // 画面切り替えボタンの表示条件をチェック
  const showMemberButton = pathname.startsWith('/admin'); // 一時的に条件を緩和
  const showAdminButton = pathname.startsWith('/member'); // 一時的に条件を緩和

  const handleMemberView = () => {
    router.push('/member');
  };

  const handleAdminView = () => {
    if (user?.role === 'system-admin') {
      router.push('/system-admin');
    } else {
      router.push('/admin');
    }
  };

  return (
    <header className="h-16 timeport-header text-white flex items-center justify-between px-4 lg:px-6 shadow-lg relative z-20 overflow-hidden">
      <div className="flex items-center space-x-2 lg:space-x-4 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden text-white hover:bg-white/10 flex-shrink-0"
          onClick={onMenuClick}
        >
          <Menu className="w-5 h-5" />
        </Button>

        <div className="relative flex-shrink-0">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/60" />
          <Input
            placeholder="検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 w-48 lg:w-64 bg-white/10 border-white/20 text-white placeholder:text-white/70 focus:bg-white/20 focus:border-white/40 backdrop-blur-sm"
          />
        </div>
      </div>

      <div className="flex items-center space-x-1 lg:space-x-2 min-w-0">
        {/* 画面切り替えボタン - 通知マークの左側に配置（スマホでは非表示） */}
        {showMemberButton && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMemberView}
            className="hidden lg:flex bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/40 backdrop-blur-sm flex-shrink-0"
          >
            <Users className="w-4 h-4 mr-2" />
            メンバー画面
          </Button>
        )}

        {showAdminButton && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleAdminView}
            className="hidden lg:flex bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/40 backdrop-blur-sm flex-shrink-0"
          >
            <Settings className="w-4 h-4 mr-2" />
            管理者画面
          </Button>
        )}

        <div className="flex-shrink-0">
          <NotificationSystem
            onNotificationClick={(notification) => {
              if (notification.related_request_id) {
                router.push(`/member/requests/${notification.related_request_id}`);
              }
            }}
          />
        </div>

        <div className="flex items-center space-x-1 lg:space-x-2 min-w-0">
          <div className="w-7 h-7 lg:w-8 lg:h-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/30 flex-shrink-0">
            <span className="text-xs font-medium text-white">
              {user?.full_name?.charAt(0) || 'U'}
            </span>
          </div>
          <div className="hidden sm:block min-w-0">
            <div className="text-xs lg:text-sm font-medium text-white truncate">
              {user?.full_name}
            </div>
            <div className="text-xs text-white/70 truncate">
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
