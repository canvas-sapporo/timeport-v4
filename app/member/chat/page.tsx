'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Smile, Paperclip, Users, Search, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/contexts/auth-context';
// import GlobalLoading from '@/components/ui/global-loading';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getChats, getChatMessages, sendMessage, getChatUsers, mockUsers } from '@/lib/mock';
import { Chat, ChatMessage, ChatUser } from '@/types/chat';

export default function MemberChatPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadData = async () => {
      if (user) {
        try {
          const chatsData = await getChats(user.id);
          const chatUsersData = await getChatUsers();
          setChats(chatsData);
          setChatUsers(chatUsersData);
          if (chatsData.length > 0) {
            setSelectedChat(chatsData[0]);
          }
        } catch (error) {
          console.error('Error loading chats:', error);
        } finally {
          setIsDataLoading(false);
        }
      }
    };

    loadData();
  }, [user]);

  useEffect(() => {
    const loadMessages = async () => {
      if (selectedChat) {
        try {
          const messagesData = await getChatMessages(selectedChat.id);
          setMessages(messagesData);
        } catch (error) {
          console.error('Error loading messages:', error);
        }
      }
    };

    loadMessages();
  }, [selectedChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!user || (user.role !== 'member' && user.role !== 'admin')) {
      router.push('/login');
      return;
    }
  }, [user, router]);

  if (!user || (user.role !== 'member' && user.role !== 'admin')) {
    return null;
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;

    try {
      const result = await sendMessage(selectedChat.id, newMessage, user.id);
      if (result.success) {
        setMessages((prev) => [...prev, result.data]);
        setNewMessage('');

        // Update chat last message time
        setChats((prev) =>
          prev.map((chat) =>
            chat.id === selectedChat.id
              ? { ...chat, last_message_at: result.data.created_at }
              : chat
          )
        );
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getChatDisplayName = (chat: Chat) => {
    if (chat.chat_type === 'group') {
      return chat.name || 'グループチャット';
    } else {
      // For direct chats, show the other user's name
      return '管理者太郎'; // This would be dynamically determined
    }
  };

  const getMessageSender = (message: ChatMessage) => {
    return mockUsers.find((u) => u.id === message.user_id);
  };

  const getReadStatus = (message: ChatMessage) => {
    if (message.user_id === user.id) {
      // 自分のメッセージの場合、他の参加者の既読状況を確認
      const chatParticipants = chatUsers.filter(
        (cu) => cu.chat_id === selectedChat?.id && cu.user_id !== user.id
      );
      const readCount = chatParticipants.filter(
        (cu) => new Date(cu.last_read_at) >= new Date(message.created_at)
      ).length;

      if (readCount === 0) return '未読';
      if (readCount === chatParticipants.length) return '既読';
      return `${readCount}人が既読`;
    }
    return null;
  };

  const formatMessageTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex">
      {/* Chat List Sidebar */}
      <div className="w-80 border-r bg-white/70 backdrop-blur-md flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">チャット</h2>
            <Button size="sm" variant="outline">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="チャットを検索..." className="pl-10" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {chats.map((chat) => (
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
                        {formatMessageTime(chat.last_message_at)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 truncate">
                    {(() => {
                      const lastMessage = messages[messages.length - 1];
                      if (!lastMessage || !lastMessage.content) return 'メッセージがありません';
                      return lastMessage.content.length > 30
                        ? `${lastMessage.content.substring(0, 30)}...`
                        : lastMessage.content;
                    })()}
                  </p>
                </div>
                <div className="flex flex-col items-end space-y-1">
                  <Badge variant="secondary" className="text-xs">
                    2
                  </Badge>
                </div>
              </div>
            </div>
          ))}
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
                      {selectedChat.chat_type === 'group' ? '3人のメンバー' : 'オンライン'}
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
              {messages.map((message) => {
                const sender = getMessageSender(message);
                const isOwnMessage = message.user_id === user.id;
                const readStatus = getReadStatus(message);

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
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t bg-white/70 backdrop-blur-md">
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm">
                  <Paperclip className="w-4 h-4" />
                </Button>
                <div className="flex-1 relative">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="メッセージを入力..."
                    className="pr-10"
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
