import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

// 機能のデフォルト値（ローディング中やエラー時のフォールバック）
const DEFAULT_FEATURES = {
  chat: false,
  report: false,
  schedule: false,
};

// メモリキャッシュ
const featureCache = new Map<string, { features: typeof DEFAULT_FEATURES; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5分

export const useCompanyFeatures = (companyId: string | undefined) => {
  const [features, setFeatures] = useState<{ [key: string]: boolean }>(DEFAULT_FEATURES);
  const [isLoading, setIsLoading] = useState(true); // 初期状態をtrueに変更
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) {
      setFeatures(DEFAULT_FEATURES);
      setIsLoading(false);
      setError(null);
      return;
    }

    // キャッシュをチェック
    const cached = featureCache.get(companyId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('機能キャッシュを使用:', companyId);
      setFeatures(cached.features);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const fetchFeatures = async () => {
      try {
        console.log('機能取得開始:', companyId);

        // タイムアウトを設定（5秒）
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('機能取得タイムアウト')), 5000);
        });

        const fetchPromise = supabase
          .from('features')
          .select('feature_code, is_active')
          .eq('company_id', companyId);

        const { data, error } = (await Promise.race([fetchPromise, timeoutPromise])) as { data: { feature_code: string; is_active: boolean }[] | null; error: { message: string } | null };

        if (error) {
          console.error('機能取得エラー:', error);
          setError(error.message);
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

          console.log('機能取得成功:', companyId, map);
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
        setFeatures(DEFAULT_FEATURES);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeatures().then(() => {});
  }, [companyId]);

  return { features, isLoading, error };
};
