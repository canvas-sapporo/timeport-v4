-- プッシュ通知購読テーブルの作成
CREATE TABLE public.push_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  subscription_data jsonb NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone NULL,
  CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE
);

-- インデックスの作成
CREATE INDEX idx_push_subscriptions_user_id ON public.push_subscriptions USING btree (user_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_push_subscriptions_endpoint ON public.push_subscriptions USING btree (endpoint) WHERE (deleted_at IS NULL);
CREATE INDEX idx_push_subscriptions_is_active ON public.push_subscriptions USING btree (is_active) WHERE (deleted_at IS NULL);

-- ユニーク制約（同じユーザーの同じエンドポイントは重複不可）
CREATE UNIQUE INDEX idx_push_subscriptions_user_endpoint ON public.push_subscriptions USING btree (user_id, endpoint) WHERE (deleted_at IS NULL);

-- RLSポリシーの設定
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分の購読のみアクセス可能
CREATE POLICY "Users can view their own push subscriptions" ON public.push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- ユーザーは自分の購読のみ作成可能
CREATE POLICY "Users can insert their own push subscriptions" ON public.push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ユーザーは自分の購読のみ更新可能
CREATE POLICY "Users can update their own push subscriptions" ON public.push_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- ユーザーは自分の購読のみ削除可能
CREATE POLICY "Users can delete their own push subscriptions" ON public.push_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

-- 更新トリガーの作成
CREATE OR REPLACE FUNCTION update_push_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_push_subscriptions_updated_at();

-- notificationsテーブルにPWA特有の通知タイプを追加
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_type_check CHECK (
  (type)::text = any (
    (
      array[
        'request_approval'::character varying,
        'request_rejection'::character varying,
        'request_comment'::character varying,
        'request_created'::character varying,
        'system'::character varying,
        'attendance'::character varying,
        'general'::character varying,
        'pwa_install_prompt'::character varying,
        'pwa_update_available'::character varying,
        'pwa_offline_reminder'::character varying
      ]
    )::text[]
  )
); 