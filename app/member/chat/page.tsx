'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, Send, Smile, Paperclip, Users, Search, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

import { useAuth } from '@/contexts/auth-context';
import { useCompanyFeatures } from '@/hooks/use-company-features';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { ChatMessageData, ChatUserData, ChatListView } from '@/schemas/chat';
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

// Supabaseクライアントを直接作成
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// ユーザー型定義
interface User {
  id: string;
  code: string;
  family_name: string;
  first_name: string;
  family_name_kana: string;
  first_name_kana: string;
  email: string;
}

export default function MemberChatPage() {
  const { user } = useAuth();
  const router = useRouter();
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
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [realtimeChannel, setRealtimeChannel] = useState<ReturnType<
    typeof supabase.channel
  > | null>(null);
  const [chatSendKeyShiftEnter, setChatSendKeyShiftEnter] = useState<boolean>(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ユーザー情報のデバッグ
  useEffect(() => {
    console.log('ユーザー情報:', {
      user,
      companyId: user?.company_id,
      hasCompanyId: !!user?.company_id,
    });
  }, [user]);

  console.log('useCompanyFeatures呼び出し前:', {
    user,
    companyId: user?.company_id,
    hasCompanyId: !!user?.company_id,
  });

  const { features, isLoading: featuresLoading, error } = useCompanyFeatures(user?.company_id);

  // 機能チェック
  useEffect(() => {
    console.log('機能チェック実行:', {
      featuresLoading,
      features,
      chatEnabled: features?.chat,
      userCompanyId: user?.company_id,
    });

    if (!featuresLoading && features && !features.chat) {
      console.log('チャット機能が無効です。リダイレクトします。');
      router.push('/member/feature-disabled');
      return;
    }
  }, [features, featuresLoading, router]);

  console.log('useCompanyFeatures呼び出し後:', {
    features,
    isLoading: featuresLoading,
    error,
    userCompanyId: user?.company_id,
  });

  // データ読み込み
  useEffect(() => {
    if (!user?.id) return;

    async function loadData() {
      setIsLoading(true);
      try {
        if (!user) return;
        console.log('Loading chats for user:', user.id);
        const chatList = await getChats(user.id);
        console.log('Chats loaded:', chatList);
        setChats(chatList);
        if (chatList.length > 0) {
          setSelectedChat(chatList[0]);
        }
      } catch (error) {
        console.error('Error loading chats:', error);
        setChats([]);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [user]);

  // メッセージ読み込み
  useEffect(() => {
    if (!selectedChat || !user?.id) return;

    async function loadMessages() {
      try {
        if (!selectedChat) return;
        const messageList = await getMessages(selectedChat.id);
        setMessages(messageList);

        // チャット参加者情報を取得
        const chatDetail = await getChatDetail(selectedChat.id);
        if (chatDetail) {
          setChatUsers(
            chatDetail.participants.map((p) => ({
              id: `${selectedChat.id}-${p.user_id}`, // 仮のID
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

        // 既読マーク
        if (selectedChat.id) {
          if (!user) return;
          await markAsRead({
            chat_id: selectedChat.id,
            user_id: user.id,
          });
        }
      } catch (error) {
        console.error('Error loading messages:', error);
      }
    }

    loadMessages();
  }, [selectedChat, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!user || (user.role !== 'member' && user.role !== 'admin')) {
      router.push('/login');
      return;
    }
  }, [user, router]);

  // 機能チェック
  useEffect(() => {
    if (features && !features.chat) {
      router.push('/member/feature-disabled');
      return;
    }
  }, [features, router]);

  // チャット送信キー設定を読み込み
  useEffect(() => {
    async function loadChatSettings() {
      if (!user?.id) return;

      try {
        const setting = await getChatSendKeySetting(user.id);
        setChatSendKeyShiftEnter(setting);
      } catch (error) {
        console.error('Error loading chat settings:', error);
      }
    }

    loadChatSettings();
  }, [user?.id]);

  // リアルタイム機能の初期化
  useEffect(() => {
    console.log('機能フラグチェック:', {
      features,
      chatEnabled: features?.chat,
      isLoading: featuresLoading,
      error,
    });

    // 機能フラグの読み込みが完了するまで待つ
    if (featuresLoading) {
      console.log('機能フラグの読み込み中...');
      return;
    }

    if (!features?.chat) {
      console.log('チャット機能が無効です。リダイレクトします。');
      router.push('/member/feature-disabled');
      return;
    }

    console.log('チャット機能が有効です。リアルタイム機能を初期化します。');

    // 既存のチャンネルをクリーンアップ
    if (realtimeChannel) {
      console.log('既存のリアルタイムチャンネルを切断します');
      supabase.removeChannel(realtimeChannel);
    }

    // 新しいリアルタイムチャンネルを設定
    if (user?.id) {
      console.log('リアルタイムチャンネルを設定中...', {
        userId: user.id,
        selectedChatId: selectedChat?.id,
      });

      const channel = supabase
        .channel('chat_messages')
        .on(
          'postgres_changes',
          {
            event: '*', // すべてのイベントを監視
            schema: 'public',
            table: 'chat_messages',
          },
          (payload) => {
            console.log('Realtimeイベント受信:', {
              eventType: payload.eventType,
              table: payload.table,
              new: payload.new,
              old: payload.old,
              selectedChatId: selectedChat?.id,
              messageChatId: (payload.new as ChatMessageData)?.chat_id,
              currentUserId: user.id,
            });

            // INSERTイベントの場合のみ処理
            if (payload.eventType === 'INSERT') {
              const newMessage = payload.new as ChatMessageData;

              // 自分のメッセージは除外（既にUIに追加済み）
              if (newMessage.user_id === user.id) {
                console.log('自分のメッセージをスキップ:', newMessage.id);
                return;
              }

              // 現在選択されているチャットのメッセージの場合のみ追加
              if (selectedChat && newMessage.chat_id === selectedChat.id) {
                console.log('メッセージを状態に追加:', newMessage);
                setMessages((prev) => {
                  const updated = [...prev, newMessage];
                  console.log('更新後のメッセージ数:', updated.length);
                  return updated;
                });

                // チャット一覧の最終メッセージ時刻を更新
                setChats((prev) =>
                  prev.map((chat) =>
                    chat.id === selectedChat.id
                      ? { ...chat, last_message_at: newMessage.created_at }
                      : chat
                  )
                );
              } else {
                console.log('メッセージをスキップ:', {
                  selectedChatId: selectedChat?.id,
                  messageChatId: newMessage.chat_id,
                  isMatch: selectedChat && newMessage.chat_id === selectedChat.id,
                });
              }
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'chat_messages',
          },
          (payload) => {
            console.log('メッセージ更新を受信:', payload);
            const updatedMessage = payload.new as ChatMessageData;

            // 現在選択されているチャットのメッセージの場合のみ更新
            if (selectedChat && updatedMessage.chat_id === selectedChat.id) {
              setMessages((prev) =>
                prev.map((msg) => (msg.id === updatedMessage.id ? updatedMessage : msg))
              );
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'chat_users',
          },
          (payload: { new: { chat_id: string; user_id: string; last_read_at: string } }) => {
            console.log('チャット参加者更新を受信:', payload);
            const updatedChatUser = payload.new;

            // 現在選択されているチャットの参加者情報を更新
            if (selectedChat && updatedChatUser.chat_id === selectedChat.id) {
              setChatUsers((prev) =>
                prev.map((cu) =>
                  cu.chat_id === updatedChatUser.chat_id && cu.user_id === updatedChatUser.user_id
                    ? { ...cu, last_read_at: updatedChatUser.last_read_at }
                    : cu
                )
              );
            }
          }
        )
        .subscribe((status) => {
          console.log('リアルタイムチャンネル購読ステータス:', status);
          if (status === 'SUBSCRIBED') {
            console.log('リアルタイムチャンネルが正常に購読されました');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('リアルタイムチャンネルエラーが発生しました');
          }
        });

      setRealtimeChannel(channel);
    }

    // クリーンアップ関数
    return () => {
      if (realtimeChannel) {
        console.log('リアルタイムチャンネルをクリーンアップします');
        supabase.removeChannel(realtimeChannel);
      }
    };
  }, [features, featuresLoading, error, router, user?.id, selectedChat?.id]);

  // 検索結果の変更を監視
  useEffect(() => {
    console.log('Search results changed:', searchResults);
  }, [searchResults]);

  // クリーンアップ処理
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // 参加者の変更を監視
  useEffect(() => {
    console.log('Participants changed:', newChatParticipants);
  }, [newChatParticipants]);

  // ユーザー検索
  const handleSearchUsers = useCallback(
    async (query: string) => {
      console.log('handleSearchUsers called with query:', query);
      if (!user?.id) {
        console.log('No user ID, returning early');
        return;
      }

      // 空のクエリの場合は検索結果をクリア
      if (!query.trim()) {
        console.log('Empty query, clearing results');
        setSearchResults([]);
        return;
      }

      console.log('Starting search for query:', query);
      setIsSearching(true);
      // 検索開始時に結果をクリアしない（初回表示の問題を回避）

      try {
        console.log('Searching users for current user:', user.id);
        console.log('Search query:', query);
        const results = await searchUsers(query, user.id);
        console.log('Search results from server:', results);
        // 自分を除外
        const filteredResults = results.filter((u) => u.id !== user.id);
        console.log('Filtered results (excluding self):', filteredResults);
        console.log('Setting search results:', filteredResults);
        setSearchResults(filteredResults);
      } catch (error) {
        console.error('Error searching users:', error);
        setSearchResults([]);
      } finally {
        console.log('Search completed, setting isSearching to false');
        setIsSearching(false);
      }
    },
    [user?.id]
  );

  // 参加者追加
  function handleAddParticipant(selectedUser: User) {
    console.log('Adding participant:', selectedUser);
    console.log('Current participants:', newChatParticipants);
    console.log('Chat type:', newChatType);

    if (newChatType === 'direct' && newChatParticipants.length >= 1) {
      // 1対1チャットの場合は1人のみ
      console.log('Setting direct chat participant');
      setNewChatParticipants([selectedUser]);
    } else {
      // グループチャットの場合は複数人追加可能
      if (!newChatParticipants.find((p) => p.id === selectedUser.id)) {
        console.log('Adding to group chat participants');
        setNewChatParticipants([...newChatParticipants, selectedUser]);
      } else {
        console.log('User already in participants');
      }
    }
    setSearchQuery('');
    setSearchResults([]);
  }

  // 参加者削除
  function handleRemoveParticipant(userId: string) {
    setNewChatParticipants((prev) => prev.filter((p) => p.id !== userId));
  }

  if (!user || (user.role !== 'member' && user.role !== 'admin')) {
    return null;
  }

  // 機能フラグの読み込み中はローディング表示
  if (featuresLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">機能を読み込み中...</p>
        </div>
      </div>
    );
  }

  async function handleCreateChat() {
    if (!user?.id) {
      console.error('User ID not found');
      return;
    }

    console.log('Creating chat with participants:', newChatParticipants);
    console.log('Participants length:', newChatParticipants.length);

    if (newChatParticipants.length === 0) {
      alert('参加者を選択してください');
      return;
    }

    try {
      // 現在のユーザーのcompany_idを取得
      const companyId = await getUserCompanyId(user.id);
      console.log('Company ID for chat creation:', companyId);

      let chatId: string;

      if (newChatType === 'direct') {
        // 1対1チャットの場合、参加者が1人のみ
        if (newChatParticipants.length !== 1) {
          alert('1対1チャットには1人の参加者を選択してください');
          return;
        }
        chatId = await getOrCreateDirectChat(user.id, newChatParticipants[0].id, companyId);
      } else {
        // グループチャットの場合
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

      // チャット一覧を再読み込み
      const updatedChats = await getChats(user.id);
      setChats(updatedChats);

      // 新しく作成されたチャットを選択
      const newChat = updatedChats.find((chat) => chat.id === chatId);
      if (newChat) {
        setSelectedChat(newChat);
      }

      // ダイアログを閉じる
      setIsCreateDialogOpen(false);
      setNewChatType('direct');
      setNewChatName('');
      setNewChatParticipants([]);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error creating chat:', error);
      alert('チャットの作成に失敗しました');
    }
  }

  async function handleSendMessage() {
    if (!newMessage.trim() || !selectedChat || !user?.id) return;

    console.log('メッセージ送信開始:', {
      content: newMessage,
      chatId: selectedChat.id,
      userId: user.id,
    });

    try {
      const result = await sendMessage({
        chat_id: selectedChat.id,
        user_id: user.id,
        content: newMessage,
        message_type: 'text',
      });

      console.log('メッセージ送信成功:', result);

      // 自分のメッセージは即座にUIに追加（リアルタイムで受信しないため）
      setMessages((prev) => {
        const updated = [...prev, result];
        console.log('メッセージ状態更新:', { prevCount: prev.length, newCount: updated.length });
        return updated;
      });
      setNewMessage('');

      // textareaの高さをリセット
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }

      // チャット一覧の最終メッセージ時刻を更新
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === selectedChat.id ? { ...chat, last_message_at: result.created_at } : chat
        )
      );
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }

  // textareaの高さを自動調整
  function adjustTextareaHeight() {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }

  function handleKeyPress(e: React.KeyboardEvent) {
    if (chatSendKeyShiftEnter) {
      // Shift + Enter で送信の場合
      if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    } else {
      // Enter で送信の場合
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    }
  }

  function getChatDisplayName(chat: ChatListView) {
    if (chat.chat_type === 'group') {
      return chat.name || 'グループチャット';
    } else {
      // 1対1チャットの場合、他の参加者の名前を表示
      const otherParticipants = chat.participant_names
        .split(', ')
        .filter((name) => name !== user?.full_name);
      return otherParticipants[0] || '1対1チャット';
    }
  }

  function getMessageSender(message: ChatMessageData) {
    // メッセージに送信者情報が含まれている場合はそれを使用
    if (message.user_profiles) {
      return {
        id: message.user_id,
        family_name: message.user_profiles.family_name,
        first_name: message.user_profiles.first_name,
      };
    }

    // フォールバック
    return {
      id: message.user_id,
      family_name: '送信者',
      first_name: '名前',
    };
  }

  function getReadStatus(message: ChatMessageData) {
    if (!user) return null;

    if (message.user_id === user.id) {
      // 自分のメッセージの場合、他の参加者の既読状況を確認
      const chatParticipants = chatUsers.filter(
        (cu) => cu.chat_id === selectedChat?.id && cu.user_id !== user.id
      );

      if (chatParticipants.length === 0) return '未読';

      const readCount = chatParticipants.filter(
        (cu) => cu.last_read_at && new Date(cu.last_read_at) >= new Date(message.created_at)
      ).length;

      if (readCount === 0) return '未読';
      if (readCount === chatParticipants.length) return '既読';
      return `${readCount}人が既読`;
    }
    return null;
  }

  function formatMessageTime(timestamp: string) {
    return new Date(timestamp).toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatLastMessageTime(timestamp: string | null) {
    if (!timestamp) return '';

    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else {
      return date.toLocaleDateString('ja-JP', {
        month: 'short',
        day: 'numeric',
      });
    }
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex">
      {/* Chat List Sidebar */}
      <div className="w-80 border-r bg-white/70 backdrop-blur-md flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">チャット</h2>
            <Dialog
              open={isCreateDialogOpen}
              onOpenChange={(open) => {
                setIsCreateDialogOpen(open);
                if (!open) {
                  // ダイアログが閉じられた時に状態をリセット
                  setNewChatType('direct');
                  setNewChatName('');
                  setNewChatParticipants([]);
                  setSearchQuery('');
                  setSearchResults([]);
                }
              }}
            >
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>新しいチャットを作成</DialogTitle>
                  <DialogDescription>
                    1対1チャットまたはグループチャットを作成できます。参加者を選択してチャットを開始しましょう。
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="chat-type" className="text-right">
                      チャットタイプ
                    </Label>
                    <Select
                      value={newChatType}
                      onValueChange={(value: 'direct' | 'group') => setNewChatType(value)}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="direct">1対1チャット</SelectItem>
                        <SelectItem value="group">グループチャット</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {newChatType === 'group' && (
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="chat-name" className="text-right">
                        チャット名
                      </Label>
                      <Input
                        id="chat-name"
                        value={newChatName}
                        onChange={(e) => setNewChatName(e.target.value)}
                        placeholder="グループ名を入力"
                        className="col-span-3"
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">参加者</Label>
                    <div className="col-span-3 space-y-2">
                      {/* 参加者選択 */}
                      <div className="space-y-2">
                        {/* 検索入力フィールド */}
                        <Command className="border rounded-md">
                          <CommandInput
                            placeholder="名前、個人コード、かなで検索..."
                            value={searchQuery}
                            onValueChange={(value) => {
                              console.log('CommandInput onValueChange called with:', value);
                              setSearchQuery(value);
                              handleSearchUsers(value);
                            }}
                          />
                          <CommandList>
                            {isSearching ? (
                              <div className="p-4 text-center text-gray-500">検索中...</div>
                            ) : searchResults.length > 0 ? (
                              <CommandGroup>
                                {searchResults.map((user) => (
                                  <CommandItem
                                    key={user.id}
                                    onSelect={() => handleAddParticipant(user)}
                                    className="cursor-pointer"
                                  >
                                    <div className="flex items-center space-x-2">
                                      <Avatar className="w-6 h-6">
                                        <AvatarFallback className="text-xs">
                                          {user.family_name.charAt(0)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="flex-1">
                                        <div className="text-sm font-medium">
                                          {user.family_name} {user.first_name}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          {user.code} • {user.email}
                                        </div>
                                      </div>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            ) : searchQuery.trim() ? (
                              <CommandEmpty>ユーザーが見つかりません</CommandEmpty>
                            ) : (
                              <div className="p-4 text-center text-gray-500">
                                検索を開始してください
                              </div>
                            )}
                          </CommandList>
                        </Command>
                      </div>

                      {/* 選択された参加者一覧 */}
                      {newChatParticipants.length > 0 && (
                        <div className="space-y-1">
                          <Label className="text-sm text-gray-600">選択された参加者:</Label>
                          {newChatParticipants.map((participant) => (
                            <div
                              key={participant.id}
                              className="flex items-center justify-between p-2 bg-gray-50 rounded"
                            >
                              <div className="flex items-center space-x-2">
                                <Avatar className="w-6 h-6">
                                  <AvatarFallback className="text-xs">
                                    {participant.family_name.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm">
                                  {participant.family_name} {participant.first_name}
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveParticipant(participant.id)}
                                className="h-6 w-6 p-0"
                              >
                                ×
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsCreateDialogOpen(false);
                      setNewChatType('direct');
                      setNewChatName('');
                      setNewChatParticipants([]);
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                  >
                    キャンセル
                  </Button>
                  <Button onClick={handleCreateChat}>作成</Button>
                </div>
              </DialogContent>
            </Dialog>
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
                    {chat.chat_type === 'group' && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900 truncate">
                        {getChatDisplayName(chat)}
                      </h3>
                      {chat.last_message_at && (
                        <span className="text-xs text-gray-500">
                          {formatLastMessageTime(chat.last_message_at)}
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
                  <div className="flex flex-col items-end space-y-1">
                    {/* 未読メッセージ数バッジ（実装予定） */}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 flex flex-col bg-white/60 backdrop-blur-md">
        {selectedChat ? (
          <>
            {/* Chat Header */}
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

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 mt-8">メッセージがありません</div>
              ) : (
                messages.map((message) => {
                  const sender = getMessageSender(message);
                  const isOwnMessage = message.user_id === user.id;
                  const readStatus = getReadStatus(message);

                  // デバッグログ
                  console.log('Message:', {
                    id: message.id,
                    content: message.content,
                    user_id: message.user_id,
                    current_user_id: user.id,
                    sender: sender,
                    isOwnMessage: isOwnMessage,
                    user_profiles: message.user_profiles,
                  });

                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`flex items-end space-x-2 max-w-xs lg:max-w-md ${isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''}`}
                      >
                        {!isOwnMessage && (
                          <Avatar className="w-6 h-6">
                            <AvatarFallback className="bg-gray-500 text-white text-xs">
                              {sender?.family_name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div className="flex flex-col">
                          <div
                            className={`px-3 py-2 rounded-lg ${
                              isOwnMessage
                                ? 'bg-blue-500 text-white'
                                : 'bg-white/80 backdrop-blur-sm text-gray-900 border border-gray-200'
                            }`}
                          >
                            {!isOwnMessage && (
                              <div className="text-xs text-gray-500 mb-1">
                                {sender?.family_name} {sender?.first_name}
                              </div>
                            )}
                            <div className="text-sm">{message.content}</div>
                          </div>
                          {/* 日時と既読ステータス */}
                          <div
                            className={`flex items-center justify-end mt-1 space-x-2 ${isOwnMessage ? 'flex-row' : 'flex-row-reverse'}`}
                          >
                            {isOwnMessage && readStatus && (
                              <span className="text-xs text-gray-500">{readStatus}</span>
                            )}
                            <span
                              className={`text-xs ${isOwnMessage ? 'text-gray-500' : 'text-gray-400'}`}
                            >
                              {formatMessageTime(message.created_at)}
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

            {/* Message Input */}
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
                      adjustTextareaHeight();
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
    </div>
  );
}
