import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

// 機能のデフォルト値（ローディング中やエラー時のフォールバック）
const DEFAULT_FEATURES = {
  chat: true,
  report: true,
  schedule: true,
};

// メモリキャッシュ
const featureCache = new Map<string, { features: typeof DEFAULT_FEATURES; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5分

// キャッシュクリア関数（外部から呼び出し可能）
export const clearFeatureCache = (companyId?: string) => {
  if (companyId) {
    featureCache.delete(companyId);
  } else {
    featureCache.clear();
  }
};

// 機能更新イベント
export const triggerFeatureUpdate = (companyId: string) => {
  // カスタムイベントを発火
  window.dispatchEvent(new CustomEvent('feature-updated', { detail: { companyId } }));
};

export const useCompanyFeatures = (companyId: string | undefined) => {
  const [features, setFeatures] = useState<{ [key: string]: boolean } | null>(null);
  const [isLoading, setIsLoading] = useState(false); // 初期状態をfalseに変更
  const [error, setError] = useState<string | null>(null);

  const fetchFeatures = async () => {
    if (!companyId) {
      setFeatures(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    // キャッシュをチェック
    const cached = featureCache.get(companyId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setFeatures(cached.features);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {

      // タイムアウトを設定（10秒に延長）
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('機能取得タイムアウト')), 10000);
      });

      const fetchPromise = supabase
        .from('features')
        .select('feature_code, is_active')
        .eq('company_id', companyId);

      const { data, error } = (await Promise.race([fetchPromise, timeoutPromise])) as {
        data: { feature_code: string; is_active: boolean }[] | null;
        error: { message: string } | null;
      };

      if (error) {
        console.error('機能取得エラー:', error);
        setError(error.message);
        // エラー時はデフォルト値を使用（メニュー表示を維持）
        setFeatures(DEFAULT_FEATURES);
        // エラー時もキャッシュに保存して、再試行を防ぐ
        featureCache.set(companyId, {
          features: DEFAULT_FEATURES,
          timestamp: Date.now(),
        });
      } else {
        const map = { ...DEFAULT_FEATURES };
        data?.forEach((f: { feature_code: string; is_active: boolean }) => {
          if (f.feature_code in map) {
            map[f.feature_code as keyof typeof DEFAULT_FEATURES] = f.is_active;
          }
        });

        setFeatures(map);

        // キャッシュに保存
        featureCache.set(companyId, {
          features: map,
          timestamp: Date.now(),
        });
      }
    } catch (err) {
      console.error('機能取得エラー:', err);
      setError(err instanceof Error ? err.message : '不明なエラー');
      // エラー時はデフォルト値を使用（メニュー表示を維持）
      setFeatures(DEFAULT_FEATURES);
      // エラー時もキャッシュに保存して、再試行を防ぐ
      featureCache.set(companyId, {
        features: DEFAULT_FEATURES,
        timestamp: Date.now(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 手動更新関数
  const refetch = async () => {
    if (companyId) {
      clearFeatureCache(companyId);
      await fetchFeatures();
    }
  };

  useEffect(() => {
    fetchFeatures();
  }, [companyId]);

  // 定期的なポーリングで機能の変更を監視（60秒間隔に延長）
  useEffect(() => {
    if (!companyId) return;

    const interval = setInterval(() => {
      // エラーが発生している場合はポーリングをスキップ
      if (error) {
        return;
      }
      // キャッシュをクリアして最新データを取得
      clearFeatureCache(companyId);
      fetchFeatures();
    }, 60000); // 60秒間隔に延長

    return () => {
      clearInterval(interval);
    };
  }, [companyId, error]);

  // ページフォーカス時に機能を再取得
  useEffect(() => {
    if (!companyId) return;

    const handleFocus = () => {
      clearFeatureCache(companyId);
      fetchFeatures();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [companyId]);

  // 機能更新イベントのリスナー（ローカル用）
  useEffect(() => {
    const handleFeatureUpdate = (event: CustomEvent) => {
      if (event.detail.companyId === companyId) {
        // キャッシュをクリアして再取得
        clearFeatureCache(companyId);
        fetchFeatures();
      }
    };

    window.addEventListener('feature-updated', handleFeatureUpdate as EventListener);

    return () => {
      window.removeEventListener('feature-updated', handleFeatureUpdate as EventListener);
    };
  }, [companyId]);

  return { features, isLoading, error, refetch };
};
