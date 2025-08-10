'use client';

import React from 'react';
import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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

interface User {
  id: string;
  code: string;
  family_name: string;
  first_name: string;
  family_name_kana: string;
  first_name_kana: string;
  email: string;
}

interface ChatCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newChatType: 'direct' | 'group';
  onChangeChatType: (type: 'direct' | 'group') => void;
  newChatName: string;
  onChangeChatName: (name: string) => void;
  newChatParticipants: User[];
  onRemoveParticipant: (userId: string) => void;
  searchQuery: string;
  onChangeSearchQuery: (q: string) => void;
  isSearching: boolean;
  searchResults: User[];
  onSearch: (q: string) => void;
  onSelectUser: (u: User) => void;
  onCreate: () => void;
}

export default function ChatCreateDialog(props: ChatCreateDialogProps) {
  const {
    open,
    onOpenChange,
    newChatType,
    onChangeChatType,
    newChatName,
    onChangeChatName,
    newChatParticipants,
    onRemoveParticipant,
    searchQuery,
    onChangeSearchQuery,
    isSearching,
    searchResults,
    onSearch,
    onSelectUser,
    onCreate,
  } = props;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            <Select value={newChatType} onValueChange={onChangeChatType}>
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
                onChange={(e) => onChangeChatName(e.target.value)}
                placeholder="グループ名を入力"
                className="col-span-3"
              />
            </div>
          )}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">参加者</Label>
            <div className="col-span-3 space-y-2">
              <div className="space-y-2">
                <Command className="border rounded-md">
                  <CommandInput
                    placeholder="名前、個人コード、かなで検索..."
                    value={searchQuery}
                    onValueChange={(value) => {
                      onChangeSearchQuery(value);
                      onSearch(value);
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
                            onSelect={() => onSelectUser(user)}
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
                      <div className="p-4 text-center text-gray-500">検索を開始してください</div>
                    )}
                  </CommandList>
                </Command>
              </div>
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
                        onClick={() => onRemoveParticipant(participant.id)}
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button onClick={onCreate}>作成</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
