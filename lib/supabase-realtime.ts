import { createClient, RealtimeChannel } from '@supabase/supabase-js';

import { ChatMessageData, ChatMessageReactionData } from '@/schemas/chat';

// Supabase Realtime ペイロード型
interface RealtimePayload {
  eventType: string;
  new: Record<string, unknown> | null;
  old: Record<string, unknown> | null;
}

// 既読イベント型
interface ReadEvent {
  type: 'read_updated';
  chat_id: string;
  user_id?: string;
  last_read_at?: string;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// クライアントサイド用のSupabaseクライアント
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'X-Client-Info': 'timeport-chat-realtime',
    },
  },
});

// デバッグ用：Supabaseクライアントの設定をログ出力
console.log('Supabase client configuration:', {
  url: supabaseUrl,
  hasAnonKey: !!supabaseAnonKey,
  realtimeConfig: {
    eventsPerSecond: 10,
  },
});

// ================================
// リアルタイムイベントハンドラー型
// ================================

export type MessageEventHandler = (event: ChatMessageData) => void;
export type ReadEventHandler = (event: ReadEvent) => void;
export type ReactionEventHandler = (event: ChatMessageReactionData) => void;

// ================================
// リアルタイム接続管理
// ================================

class ChatRealtimeManager {
  private messageHandlers: Map<string, MessageEventHandler[]> = new Map();
  private readHandlers: Map<string, ReadEventHandler[]> = new Map();
  private reactionHandlers: Map<string, ReactionEventHandler[]> = new Map();
  private isConnected = false;
  private channel: RealtimeChannel | null = null;

  /**
   * リアルタイム接続を開始
   */
  async connect() {
    if (this.isConnected) {
      console.log('Already connected to realtime');
      return;
    }

    try {
      console.log('Attempting to connect to realtime...');

      // チャットメッセージの変更を監視
      this.channel = supabase
        .channel('chat_messages')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'chat_messages',
          },
          (payload) => {
            console.log('Raw message change payload received:', payload);
            this.handleMessageChange(payload);
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'chat_users',
          },
          (payload) => {
            console.log('Raw read change payload received:', payload);
            this.handleReadChange(payload);
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'chat_message_reactions',
          },
          (payload) => {
            console.log('Raw reaction change payload received:', payload);
            this.handleReactionChange(payload);
          }
        );

      // 接続状態を監視
      if (this.channel) {
        this.channel.on('system', { event: 'disconnect' }, () => {
          console.log('Realtime connection disconnected');
          this.isConnected = false;
        });

        this.channel.on('system', { event: 'reconnect' }, () => {
          console.log('Realtime connection reconnected');
          this.isConnected = true;
        });

        this.channel.on('system', { event: 'error' }, (error: unknown) => {
          console.error('Realtime connection error:', error);
        });
      }

      const status = await this.channel?.subscribe();
      console.log('Channel subscription status:', status);

      this.isConnected = true;
      console.log('Chat realtime connection established successfully');
    } catch (error) {
      console.error('Failed to establish realtime connection:', error);
      this.isConnected = false;
    }
  }

  /**
   * リアルタイム接続を切断
   */
  async disconnect() {
    if (!this.isConnected) return;

    try {
      if (this.channel) {
        await this.channel.unsubscribe();
        this.channel = null;
      }
      this.isConnected = false;
      console.log('Chat realtime connection disconnected');
    } catch (error) {
      console.error('Error disconnecting from realtime:', error);
    }
  }

  /**
   * メッセージ変更イベントを処理
   */
  private handleMessageChange(payload: unknown) {
    const { eventType, new: newRecord, old: oldRecord } = payload as RealtimePayload;
    const chatId = (newRecord?.chat_id || oldRecord?.chat_id) as string;

    if (!chatId) return;

    const handlers = this.messageHandlers.get(chatId);
    if (!handlers) {
      console.log('No handlers found for chat ID:', chatId);
      return;
    }

    const event: ChatMessageData = {
      ...newRecord,
      chat_id: chatId,
    } as ChatMessageData;

    console.log('Dispatching event to handlers:', event);
    handlers.forEach((handler) => handler(event));
  }

  /**
   * 既読変更イベントを処理
   */
  private handleReadChange(payload: unknown) {
    const { eventType, new: newRecord, old: oldRecord } = payload as RealtimePayload;
    const chatId = newRecord?.chat_id || oldRecord?.chat_id;

    if (!chatId) return;

    const handlers = this.readHandlers.get(chatId as string);
    if (!handlers) return;

    const event: ReadEvent = {
      type: 'read_updated',
      chat_id: chatId as string,
      user_id: newRecord?.user_id as string,
      last_read_at: newRecord?.last_read_at as string,
    };

    handlers.forEach((handler) => handler(event));
  }

  /**
   * リアクション変更イベントを処理
   */
  private handleReactionChange(payload: unknown) {
    const { eventType, new: newRecord, old: oldRecord } = payload as RealtimePayload;
    const messageId = newRecord?.message_id || oldRecord?.message_id;

    if (!messageId) return;

    const handlers = this.reactionHandlers.get(messageId as string);
    if (!handlers) return;

    const event: ChatMessageReactionData = {
      ...newRecord,
      message_id: messageId as string,
    } as ChatMessageReactionData;

    handlers.forEach((handler) => handler(event));
  }

  /**
   * イベントタイプをマッピング
   */
  private mapEventType(
    eventType: string
  ): 'message_created' | 'message_updated' | 'message_deleted' {
    switch (eventType) {
      case 'INSERT':
        return 'message_created';
      case 'UPDATE':
        return 'message_updated';
      case 'DELETE':
        return 'message_deleted';
      default:
        return 'message_updated';
    }
  }

  /**
   * メッセージイベントハンドラーを登録
   */
  subscribeToMessages(chatId: string, handler: MessageEventHandler) {
    if (!this.messageHandlers.has(chatId)) {
      this.messageHandlers.set(chatId, []);
    }
    this.messageHandlers.get(chatId)!.push(handler);

    return () => {
      const handlers = this.messageHandlers.get(chatId);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
        if (handlers.length === 0) {
          this.messageHandlers.delete(chatId);
        }
      }
    };
  }

  /**
   * 既読イベントハンドラーを登録
   */
  subscribeToReadUpdates(chatId: string, handler: ReadEventHandler) {
    if (!this.readHandlers.has(chatId)) {
      this.readHandlers.set(chatId, []);
    }
    this.readHandlers.get(chatId)!.push(handler);

    return () => {
      const handlers = this.readHandlers.get(chatId);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
        if (handlers.length === 0) {
          this.readHandlers.delete(chatId);
        }
      }
    };
  }

  /**
   * リアクションイベントハンドラーを登録
   */
  subscribeToReactions(messageId: string, handler: ReactionEventHandler) {
    if (!this.reactionHandlers.has(messageId)) {
      this.reactionHandlers.set(messageId, []);
    }
    this.reactionHandlers.get(messageId)!.push(handler);

    return () => {
      const handlers = this.reactionHandlers.get(messageId);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
        if (handlers.length === 0) {
          this.reactionHandlers.delete(messageId);
        }
      }
    };
  }
}

// シングルトンインスタンス
export const chatRealtimeManager = new ChatRealtimeManager();

// ================================
// React Hook
// ================================

import { useEffect, useRef } from 'react';

/**
 * チャットリアルタイム機能のReact Hook
 */
export function useChatRealtime(chatId: string) {
  const messageHandlers = useRef<MessageEventHandler[]>([]);
  const readHandlers = useRef<ReadEventHandler[]>([]);
  const reactionHandlers = useRef<Map<string, ReactionEventHandler[]>>(new Map());

  useEffect(() => {
    // 接続を開始
    chatRealtimeManager.connect();

    // クリーンアップ関数
    return () => {
      // 接続を切断（他のチャットが使用中でない場合）
      if (
        messageHandlers.current.length === 0 &&
        readHandlers.current.length === 0 &&
        reactionHandlers.current.size === 0
      ) {
        chatRealtimeManager.disconnect();
      }
    };
  }, []);

  /**
   * メッセージイベントを購読
   */
  function subscribeToMessages(handler: MessageEventHandler) {
    messageHandlers.current.push(handler);
    return chatRealtimeManager.subscribeToMessages(chatId, handler);
  }

  /**
   * 既読イベントを購読
   */
  function subscribeToReadUpdates(handler: ReadEventHandler) {
    readHandlers.current.push(handler);
    return chatRealtimeManager.subscribeToReadUpdates(chatId, handler);
  }

  /**
   * リアクションイベントを購読
   */
  function subscribeToReactions(messageId: string, handler: ReactionEventHandler) {
    if (!reactionHandlers.current.has(messageId)) {
      reactionHandlers.current.set(messageId, []);
    }
    reactionHandlers.current.get(messageId)!.push(handler);
    return chatRealtimeManager.subscribeToReactions(messageId, handler);
  }

  return {
    subscribeToMessages,
    subscribeToReadUpdates,
    subscribeToReactions,
    isConnected: () => chatRealtimeManager['isConnected'],
  };
}

// ================================
// ユーティリティ関数
// ================================

/**
 * リアルタイム接続の状態を確認
 */
export function isRealtimeConnected(): boolean {
  return chatRealtimeManager['isConnected'];
}

/**
 * 手動でリアルタイム接続を開始
 */
export async function connectRealtime(): Promise<void> {
  await chatRealtimeManager.connect();
}

/**
 * 手動でリアルタイム接続を切断
 */
export async function disconnectRealtime(): Promise<void> {
  await chatRealtimeManager.disconnect();
}
