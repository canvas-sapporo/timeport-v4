'use client';

import { useEffect, useState } from 'react';
import { Bell, Check, X, MessageSquare, FileText } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'request_approval' | 'request_rejection' | 'request_comment' | 'request_created' | 'system';
  related_request_id?: string;
  is_read: boolean;
  created_at: string;
  metadata?: Record<string, string | number | boolean | undefined>;
}

interface NotificationSystemProps {
  onNotificationClick?: (notification: Notification) => void;
}

export default function NotificationSystem({ onNotificationClick }: NotificationSystemProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadNotifications();
      subscribeToNotifications();
    }
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('通知の読み込みエラー:', error);
        return;
      }

      setNotifications(data || []);
      setUnreadCount((data || []).filter((n) => !n.is_read).length);
    } catch (err) {
      console.error('通知の読み込みエラー:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeToNotifications = () => {
    if (!user) return;

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications((prev) => [newNotification, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('通知の更新エラー:', err);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('通知の一括更新エラー:', err);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    if (onNotificationClick) {
      onNotificationClick(notification);
    }

    setIsOpen(false);
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'request_approval':
        return <Check className="w-4 h-4 text-green-600" />;
      case 'request_rejection':
        return <X className="w-4 h-4 text-red-600" />;
      case 'request_comment':
        return <MessageSquare className="w-4 h-4 text-blue-600" />;
      case 'request_created':
        return <FileText className="w-4 h-4 text-purple-600" />;
      default:
        return <Bell className="w-4 h-4 text-gray-600" />;
    }
  };

  const getNotificationBadge = (type: Notification['type']) => {
    switch (type) {
      case 'request_approval':
        return (
          <Badge variant="default" className="text-xs">
            承認
          </Badge>
        );
      case 'request_rejection':
        return (
          <Badge variant="destructive" className="text-xs">
            却下
          </Badge>
        );
      case 'request_comment':
        return (
          <Badge variant="secondary" className="text-xs">
            コメント
          </Badge>
        );
      case 'request_created':
        return (
          <Badge variant="outline" className="text-xs">
            作成
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs">
            システム
          </Badge>
        );
    }
  };

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <div className="flex items-center justify-between p-2 border-b">
            <h3 className="font-medium">通知</h3>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs">
                すべて既読
              </Button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-muted-foreground mt-2">読み込み中...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center">
                <Bell className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">通知はありません</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className="p-3 cursor-pointer hover:bg-muted"
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3 w-full">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium truncate">{notification.title}</p>
                        {getNotificationBadge(notification.type)}
                        {!notification.is_read && (
                          <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(notification.created_at).toLocaleString('ja-JP')}
                      </p>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>通知一覧</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {notifications.map((notification) => (
              <Card
                key={notification.id}
                className={`cursor-pointer transition-colors ${
                  !notification.is_read ? 'bg-muted/50' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getNotificationIcon(notification.type)}
                      <CardTitle className="text-base">{notification.title}</CardTitle>
                      {getNotificationBadge(notification.type)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(notification.created_at).toLocaleString('ja-JP')}
                    </p>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{notification.message}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// 通知送信ユーティリティ関数
export const sendNotification = async (
  userId: string,
  title: string,
  message: string,
  type: Notification['type'],
  relatedRequestId?: string,
  metadata?: Record<string, string | number | boolean | undefined>
) => {
  try {
    const { error } = await supabase.from('notifications').insert({
      user_id: userId,
      title,
      message,
      type,
      related_request_id: relatedRequestId,
      is_read: false,
      metadata,
    });

    if (error) {
      console.error('通知送信エラー:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('通知送信エラー:', err);
    return false;
  }
};

// リクエスト関連の通知送信関数
export const sendRequestApprovalNotification = async (
  requestId: string,
  approverId: string,
  requestTitle: string,
  comment?: string
) => {
  const message = comment
    ? `リクエスト「${requestTitle}」が承認されました。コメント: ${comment}`
    : `リクエスト「${requestTitle}」が承認されました。`;

  return sendNotification(approverId, 'リクエスト承認', message, 'request_approval', requestId, {
    comment,
  });
};

export const sendRequestRejectionNotification = async (
  requestId: string,
  rejectorId: string,
  requestTitle: string,
  reason?: string
) => {
  const message = reason
    ? `リクエスト「${requestTitle}」が却下されました。理由: ${reason}`
    : `リクエスト「${requestTitle}」が却下されました。`;

  return sendNotification(rejectorId, 'リクエスト却下', message, 'request_rejection', requestId, {
    reason,
  });
};

export const sendRequestCommentNotification = async (
  requestId: string,
  userId: string,
  requestTitle: string,
  comment: string
) => {
  return sendNotification(
    userId,
    '新しいコメント',
    `リクエスト「${requestTitle}」に新しいコメントが追加されました: ${comment}`,
    'request_comment',
    requestId,
    { comment }
  );
};

export const sendRequestCreatedNotification = async (
  requestId: string,
  approverId: string,
  requestTitle: string,
  applicantName: string
) => {
  return sendNotification(
    approverId,
    '新しいリクエスト',
    `${applicantName}さんがリクエスト「${requestTitle}」を作成しました。承認をお願いします。`,
    'request_created',
    requestId,
    { applicant_name: applicantName }
  );
};
