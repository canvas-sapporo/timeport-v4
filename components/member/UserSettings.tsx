'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Settings, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getChatSendKeySetting, updateChatSendKeySetting } from '@/lib/actions/user-settings';
import { useAuth } from '@/contexts/auth-context';

export default function UserSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [chatSendKeyShiftEnter, setChatSendKeyShiftEnter] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // 初期設定を読み込み
  useEffect(() => {
    const loadSettings = async () => {
      if (!user?.id) return;

      try {
        const setting = await getChatSendKeySetting(user.id);
        setChatSendKeyShiftEnter(setting);
      } catch (error) {
        console.error('Error loading settings:', error);
        toast({
          title: 'エラー',
          description: '設定の読み込みに失敗しました',
          variant: 'destructive',
        });
      }
    };

    loadSettings();
  }, [user?.id, toast]);

  // チャット送信キー設定を更新
  const handleChatSendKeyChange = async (useShiftEnter: boolean) => {
    if (!user?.id) return;

    setIsLoading(true);

    try {
      const result = await updateChatSendKeySetting(user.id, useShiftEnter);

      if (result.success) {
        setChatSendKeyShiftEnter(useShiftEnter);
        toast({
          title: '設定を更新しました',
          description: 'チャット送信キーの設定が保存されました',
        });
      } else {
        toast({
          title: 'エラー',
          description: result.error || '設定の更新に失敗しました',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error updating chat send key setting:', error);
      toast({
        title: 'エラー',
        description: '設定の更新に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          設定
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* チャット設定 */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            <Label className="text-base font-medium">チャット設定</Label>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">メッセージ送信キー</Label>
              <Switch
                checked={chatSendKeyShiftEnter}
                onCheckedChange={handleChatSendKeyChange}
                disabled={isLoading}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              {chatSendKeyShiftEnter
                ? 'Shift + Enter でメッセージを送信し、Enter で改行します'
                : 'Enter でメッセージを送信し、Shift + Enter で改行します'}
            </p>
          </div>
        </div>

        {/* 将来的に他の設定項目を追加 */}
        {/* 
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            <Label className="text-base font-medium">通知設定</Label>
          </div>
          // 通知設定の内容
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            <Label className="text-base font-medium">テーマ設定</Label>
          </div>
          // テーマ設定の内容
        </div>
        */}
      </CardContent>
    </Card>
  );
}
