'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { MessageSquare, Send, Smile, Paperclip, Users, Search, Plus } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

import { useAuth } from '@/contexts/auth-context';
import { useCompanyFeatures } from '@/hooks/use-company-features';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import type { ChatMessageData, ChatUserData, ChatListView } from '@/schemas/chat';
import {
  getChats,
  getChatDetail,
  getMessages,
  sendMessage,
  markAsRead,
  createGroupChat,
  getOrCreateDirectChat,
  searchUsers,
  getUserCompanyId,
} from '@/lib/actions/chat';
import { getChatSendKeySetting } from '@/lib/actions/user-settings';

const ChatCreateDialog = dynamic(() => import('@/components/member/chat/ChatCreateDialog'), {
  ssr: false,
  loading: () => <div className="p-4 text-sm text-gray-500">ダイアログを読み込み中...</div>,
});

// Supabaseクライアント（クライアント側）
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: { params: { eventsPerSecond: 10 } },
});

interface User {
  id: string;
  code: string;
  family_name: string;
  first_name: string;
  family_name_kana: string;
  first_name_kana: string;
  email: string;
}

export default function ChatPage() {
  const { user } = useAuth();
  const { features, isLoading: featuresLoading } = useCompanyFeatures(user?.company_id);

  const [chats, setChats] = useState<ChatListView[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatListView | null>(null);
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [chatUsers, setChatUsers] = useState<ChatUserData[]>([]);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newChatType, setNewChatType] = useState<'direct' | 'group'>('direct');
  const [newChatName, setNewChatName] = useState('');
  const [newChatParticipants, setNewChatParticipants] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [realtimeChannel, setRealtimeChannel] = useState<ReturnType<
    typeof supabase.channel
  > | null>(null);
  const [chatSendKeyShiftEnter, setChatSendKeyShiftEnter] = useState<boolean>(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 初期ロード：チャット一覧
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      setIsLoading(true);
      try {
        const chatList = await getChats(user.id);
        setChats(chatList);
        if (chatList.length > 0) setSelectedChat(chatList[0]);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [user?.id]);

  // 選択チャットのメッセージ・参加者
  useEffect(() => {
    if (!selectedChat || !user?.id) return;
    (async () => {
      const messageList = await getMessages(selectedChat.id);
      setMessages(messageList);
      const chatDetail = await getChatDetail(selectedChat.id);
      if (chatDetail) {
        setChatUsers(
          chatDetail.participants.map((p) => ({
            id: `${selectedChat.id}-${p.user_id}`,
            chat_id: selectedChat.id,
            user_id: p.user_id,
            role: p.role,
            last_read_at: p.last_read_at,
            joined_at: p.joined_at,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: undefined,
          }))
        );
      }
      await markAsRead({ chat_id: selectedChat.id, user_id: user.id });
    })();
  }, [selectedChat?.id, user?.id]);

  // 既読スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 送信キー設定
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const setting = await getChatSendKeySetting(user.id);
        setChatSendKeyShiftEnter(setting);
      } catch {}
    })();
  }, [user?.id]);

  // Realtime購読
  useEffect(() => {
    if (featuresLoading || !features?.chat || !user?.id) return;
    if (realtimeChannel) supabase.removeChannel(realtimeChannel);
    const channel = supabase
      .channel('chat_messages')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as ChatMessageData;
            if (newMsg.user_id === user.id) return; // 自分の分は既にUIに反映
            if (selectedChat && newMsg.chat_id === selectedChat.id) {
              setMessages((prev) => [...prev, newMsg]);
              setChats((prev) =>
                prev.map((c) =>
                  c.id === selectedChat.id ? { ...c, last_message_at: newMsg.created_at } : c
                )
              );
            }
          }
        }
      )
      .subscribe();
    setRealtimeChannel(channel);
    return () => {
      supabase.removeChannel(channel);
    };
  }, [featuresLoading, features?.chat, user?.id, selectedChat?.id]);

  // 検索
  const handleSearchUsers = useCallback(
    async (query: string) => {
      if (!user?.id) return;
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const results = await searchUsers(query, user.id);
        setSearchResults(results.filter((u) => u.id !== user.id));
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [user?.id]
  );

  // 事前プリフェッチ
  let __dialogPrefetchStarted = useRef(false);
  const prefetchDialog = () => {
    if (!__dialogPrefetchStarted.current) {
      __dialogPrefetchStarted.current = true;
      import('@/components/member/chat/ChatCreateDialog');
    }
  };

  const getChatDisplayName = useCallback(
    (chat: ChatListView) => {
      if (chat.chat_type === 'group') return chat.name || 'グループチャット';
      const others = chat.participant_names.split(', ').filter((name) => name !== user?.full_name);
      return others[0] || '1対1チャット';
    },
    [user?.full_name]
  );

  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || !selectedChat || !user?.id) return;
    const result = await sendMessage({
      chat_id: selectedChat.id,
      user_id: user.id,
      content: newMessage,
      message_type: 'text',
    });
    setMessages((prev) => [...prev, result]);
    setNewMessage('');
    setChats((prev) =>
      prev.map((c) => (c.id === selectedChat.id ? { ...c, last_message_at: result.created_at } : c))
    );
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }, [newMessage, selectedChat?.id, user?.id]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (chatSendKeyShiftEnter) {
      if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    } else {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    }
  };

  if (!user || (user.role !== 'member' && user.role !== 'admin')) return null;
  if (featuresLoading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">機能を読み込み中...</p>
        </div>
      </div>
    );

  return (
    <div className="h-[calc(100vh-8rem)] flex">
      {/* Sidebar */}
      <div className="w-80 border-r bg-white/70 backdrop-blur-md flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">チャット</h2>
            <Button
              size="sm"
              variant="outline"
              onMouseEnter={prefetchDialog}
              onFocus={prefetchDialog}
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="チャットを検索..." className="pl-10" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">読み込み中...</div>
          ) : chats.length === 0 ? (
            <div className="p-4 text-center text-gray-500">チャットがありません</div>
          ) : (
            chats.map((chat) => (
              <div
                key={chat.id}
                className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedChat?.id === chat.id ? 'bg-blue-50 border-blue-200' : ''
                }`}
                onClick={() => setSelectedChat(chat)}
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-blue-500 text-white">
                        {chat.chat_type === 'group' ? (
                          <Users className="w-5 h-5" />
                        ) : (
                          getChatDisplayName(chat).charAt(0)
                        )}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900 truncate">
                        {getChatDisplayName(chat)}
                      </h3>
                      {chat.last_message_at && (
                        <span className="text-xs text-gray-500">
                          {new Date(chat.last_message_at).toLocaleTimeString('ja-JP', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      {chat.chat_type === 'group' && (
                        <span className="text-xs text-gray-400">
                          {chat.participant_count}人のメンバー
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 flex flex-col bg-white/60 backdrop-blur-md">
        {selectedChat ? (
          <>
            <div className="p-4 border-b bg-white/70 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-blue-500 text-white">
                      {selectedChat.chat_type === 'group' ? (
                        <Users className="w-4 h-4" />
                      ) : (
                        getChatDisplayName(selectedChat).charAt(0)
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium">{getChatDisplayName(selectedChat)}</h3>
                    <p className="text-sm text-gray-500">
                      {selectedChat.chat_type === 'group'
                        ? `${selectedChat.participant_count}人のメンバー`
                        : 'オンライン'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm">
                    <Users className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 mt-8">メッセージがありません</div>
              ) : (
                messages.map((message) => {
                  const isOwn = message.user_id === user.id;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`flex items-end space-x-2 max-w-xs lg:max-w-md ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}
                      >
                        {!isOwn && (
                          <Avatar className="w-6 h-6">
                            <AvatarFallback className="bg-gray-500 text-white text-xs">
                              {(message.user_profiles?.family_name || '送').charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div className="flex flex-col">
                          <div
                            className={`px-3 py-2 rounded-lg ${isOwn ? 'bg-blue-500 text-white' : 'bg-white/80 backdrop-blur-sm text-gray-900 border border-gray-200'}`}
                          >
                            {!isOwn && (
                              <div className="text-xs text-gray-500 mb-1">
                                {message.user_profiles?.family_name || '送信者'}{' '}
                                {message.user_profiles?.first_name || '名前'}
                              </div>
                            )}
                            <div className="text-sm">{message.content}</div>
                          </div>
                          <div
                            className={`flex items-center justify-end mt-1 space-x-2 ${isOwn ? 'flex-row' : 'flex-row-reverse'}`}
                          >
                            <span
                              className={`text-xs ${isOwn ? 'text-gray-500' : 'text-gray-400'}`}
                            >
                              {new Date(message.created_at).toLocaleTimeString('ja-JP', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t bg-white/70 backdrop-blur-md">
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm">
                  <Paperclip className="w-4 h-4" />
                </Button>
                <div className="flex-1 relative">
                  <Textarea
                    ref={textareaRef}
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      if (textareaRef.current) {
                        textareaRef.current.style.height = 'auto';
                        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
                      }
                    }}
                    onKeyPress={handleKeyPress}
                    placeholder="メッセージを入力..."
                    className="pr-10 resize-none min-h-[40px] max-h-[120px] overflow-y-auto"
                    rows={1}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2"
                  >
                    <Smile className="w-4 h-4" />
                  </Button>
                </div>
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">チャットを選択してください</h3>
              <p className="text-gray-500">
                左側のリストからチャットを選択して会話を開始しましょう
              </p>
            </div>
          </div>
        )}
      </div>

      <ChatCreateDialog
        open={isCreateDialogOpen}
        onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (!open) {
            setNewChatType('direct');
            setNewChatName('');
            setNewChatParticipants([]);
            setSearchQuery('');
            setSearchResults([]);
          }
        }}
        newChatType={newChatType}
        onChangeChatType={(v) => setNewChatType(v)}
        newChatName={newChatName}
        onChangeChatName={setNewChatName}
        newChatParticipants={newChatParticipants}
        onRemoveParticipant={(uid) =>
          setNewChatParticipants((prev) => prev.filter((p) => p.id !== uid))
        }
        searchQuery={searchQuery}
        onChangeSearchQuery={setSearchQuery}
        isSearching={isSearching}
        searchResults={searchResults}
        onSearch={handleSearchUsers}
        onSelectUser={(u) => {
          if (newChatType === 'direct') {
            setNewChatParticipants([u]);
          } else {
            setNewChatParticipants((prev) =>
              prev.find((p) => p.id === u.id) ? prev : [...prev, u]
            );
          }
        }}
        onCreate={async () => {
          if (!user?.id) return;
          if (newChatParticipants.length === 0) {
            alert('参加者を選択してください');
            return;
          }
          const companyId = await getUserCompanyId(user.id);
          let chatId: string;
          if (newChatType === 'direct') {
            if (newChatParticipants.length !== 1) {
              alert('1対1チャットには1人の参加者を選択してください');
              return;
            }
            chatId = await getOrCreateDirectChat(user.id, newChatParticipants[0].id, companyId);
          } else {
            if (!newChatName.trim()) {
              alert('グループ名を入力してください');
              return;
            }
            chatId = await createGroupChat({
              company_id: companyId,
              name: newChatName,
              chat_type: 'group',
              participant_ids: [user.id, ...newChatParticipants.map((p) => p.id)],
              settings: {},
            });
          }
          const updatedChats = await getChats(user.id);
          setChats(updatedChats);
          const newChat = updatedChats.find((c) => c.id === chatId);
          if (newChat) setSelectedChat(newChat);
          setIsCreateDialogOpen(false);
          setNewChatType('direct');
          setNewChatName('');
          setNewChatParticipants([]);
          setSearchQuery('');
          setSearchResults([]);
        }}
      />
    </div>
  );
}
