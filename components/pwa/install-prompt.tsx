'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// iOS Safari用のnavigator拡張
interface NavigatorStandalone extends Navigator {
  standalone?: boolean;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // iOS Safariかどうかを判定
    const checkIOS = () => {
      const userAgent = navigator.userAgent;
      const isIOSDevice = /iPad|iPhone|iPod/.test(userAgent);
      const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
      setIsIOS(isIOSDevice && isSafari);
    };

    checkIOS();

    // PWAがインストールされているかチェック
    const checkIfInstalled = () => {
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
        return;
      }

      // iOS Safariの場合
      if ((navigator as NavigatorStandalone).standalone) {
        setIsInstalled(true);
        return;
      }
    };

    checkIfInstalled();

    // beforeinstallpromptイベントの監視（Android/PC用）
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    // appinstalledイベントの監視
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    // iOS Safariの場合は、一定時間後にインストール促進UIを表示
    if (isIOS && !isInstalled) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000); // 3秒後に表示

      return () => clearTimeout(timer);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isIOS, isInstalled]);

  const handleInstall = async () => {
    if (isIOS) {
      // iOS Safariの場合は、インストール手順を説明
      alert(
        'Safariの共有ボタン（四角から矢印が出ているアイコン）をタップして「ホーム画面に追加」を選択してください。'
      );
      setShowPrompt(false);
      return;
    }

    if (!deferredPrompt) return;

    try {
      // インストールプロンプトを表示
      await deferredPrompt.prompt();

      // ユーザーの選択を待つ
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        console.log('PWA installation accepted');
        setIsInstalled(true);
      } else {
        console.log('PWA installation dismissed');
      }
    } catch (error) {
      console.error('Error during PWA installation:', error);
    } finally {
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDeferredPrompt(null);
  };

  // インストール済みまたはプロンプトが表示されていない場合は何も表示しない
  if (isInstalled || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <Card className="shadow-lg border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">TimePortをインストール</CardTitle>
            <Button variant="ghost" size="sm" onClick={handleDismiss} className="h-6 w-6 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription className="text-xs">
            {isIOS
              ? 'Safariの共有ボタンからホーム画面に追加できます'
              : 'ホーム画面に追加して、より快適にご利用ください'}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex gap-2">
            <Button onClick={handleInstall} size="sm" className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              {isIOS ? 'インストール方法' : 'インストール'}
            </Button>
            <Button onClick={handleDismiss} variant="outline" size="sm">
              後で
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
