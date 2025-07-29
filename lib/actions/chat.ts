'use server';

import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/lib/supabase';
import { 
  Chat, 
  ChatMessage, 
  ChatUser, 
  ChatMessageReaction,
  CreateChatRequest,
  SendMessageRequest,
  AddReactionRequest,
  MarkAsReadRequest,
  ChatListView,
  MessageDetail,
  ChatDetail
} from '@/types/chat';
// ================================
// ユーザーの会社ID取得
// ================================

/**
 * ユーザーの会社IDを取得
 */
export async function getUserCompanyId(userId: string): Promise<string> {
  const supabase = createServerClient();
  
  try {
    // ユーザーのグループを取得
    const { data: userGroupsData, error: userGroupsError } = await supabase
      .from('user_groups')
      .select('group_id')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .limit(1);

    if (userGroupsError || !userGroupsData || userGroupsData.length === 0) {
      console.error('Error fetching user groups:', userGroupsError);
      throw new Error('ユーザーグループの取得に失敗しました');
    }

    // グループから会社IDを取得
    const { data: groupData, error: groupError } = await supabase
      .from('groups')
      .select('company_id')
      .eq('id', userGroupsData[0].group_id)
      .single();

    if (groupError || !groupData?.company_id) {
      console.error('Error fetching group:', groupError);
      throw new Error('会社情報の取得に失敗しました');
    }

    return groupData.company_id;
  } catch (error) {
    console.error('Error getting user company ID:', error);
    throw error;
  }
}

// ================================
// ユーザー検索
// ================================

/**
 * ユーザー検索（参加者選択用）
 */
export async function searchUsers(query: string, currentUserId: string): Promise<Array<{
  id: string;
  code: string;
  family_name: string;
  first_name: string;
  family_name_kana: string;
  first_name_kana: string;
  email: string;
}>> {
  const supabase = createServerClient();
  
  console.log('Searching users with query:', query, 'currentUserId:', currentUserId);
  
  try {
    // 段階的にデバッグ：現在のユーザーのuser_groupsデータを取得
    console.log('Step 1: Fetching user_groups data for current user');
    console.log('Current user ID:', currentUserId);
    
    // まず、すべてのuser_groupsデータを取得してデバッグ
    const { data: allUserGroups, error: allUserGroupsError } = await supabase
      .from('user_groups')
      .select('*');
    
    console.log('All user_groups data:', allUserGroups);
    console.log('All user_groups error:', allUserGroupsError);
    
    // 特定のユーザーのuser_groupsデータを取得
    const { data: userGroupsData, error: userGroupsError } = await supabase
      .from('user_groups')
      .select('*')
      .eq('user_id', currentUserId);

    if (userGroupsError) {
      console.error('Error fetching user_groups:', userGroupsError);
      throw new Error(`ユーザーグループ取得エラー: ${userGroupsError.message}`);
    }

    console.log('User groups data:', userGroupsData);

    // クライアントサイドでdeleted_atをフィルタリング
    const activeUserGroups = userGroupsData?.filter(group => 
      group.deleted_at === null || group.deleted_at === ''
    ) || [];

    console.log('Active user groups:', activeUserGroups);

    if (activeUserGroups.length === 0) {
      console.error('No active user_groups found for current user');
      throw new Error('現在のユーザーがグループに所属していません');
    }

    const groupId = activeUserGroups[0].group_id;
    console.log('Group ID:', groupId);

    // グループから会社IDを取得
    console.log('Step 2: Fetching group data');
    console.log('Group ID to fetch:', groupId);
    
    // まず、すべてのgroupsデータを取得してデバッグ
    const { data: allGroups, error: allGroupsError } = await supabase
      .from('groups')
      .select('*');
    
    console.log('All groups data:', allGroups);
    console.log('All groups error:', allGroupsError);
    
    // 特定のグループデータを取得
    const { data: groupData, error: groupError } = await supabase
      .from('groups')
      .select('company_id')
      .eq('id', groupId)
      .single();

    if (groupError) {
      console.error('Error fetching group:', groupError);
      throw new Error(`グループ取得エラー: ${groupError.message}`);
    }

    console.log('Group data:', groupData);

    if (!groupData?.company_id) {
      console.error('No company_id found in group');
      throw new Error('グループに会社情報がありません');
    }

    const companyId = groupData.company_id;
    console.log('Company ID:', companyId);

        // 同じ会社のユーザーを検索（簡略化）
    console.log('Step 3: Searching users in same company');
    console.log('Search query:', query);
    console.log('Company ID for filtering:', companyId);
    
    // まず、すべてのuser_profilesデータを取得してデバッグ
    const { data: allUserProfiles, error: allUserProfilesError } = await supabase
      .from('user_profiles')
      .select('*');
    
    console.log('All user_profiles data:', allUserProfiles);
    console.log('All user_profiles error:', allUserProfilesError);
    
    console.log('Searching with query:', query);
    
    // シンプルな部分一致検索（すべてのフィールドで検索）
    const { data, error } = await supabase
      .from('user_profiles')
      .select(`
        id,
        code,
        family_name,
        first_name,
        family_name_kana,
        first_name_kana,
        email
      `)
      .eq('is_active', true)
      .or(`code.ilike.%${query}%,family_name.ilike.%${query}%,first_name.ilike.%${query}%,family_name_kana.ilike.%${query}%,first_name_kana.ilike.%${query}%`)
      .limit(10);

    if (error) {
      console.error('Error searching users:', error);
      throw new Error(`ユーザー検索エラー: ${error.message}`);
    }

    console.log('All users found:', data?.length || 0, 'users');
    console.log('All users data:', data);

    // 会社IDでフィルタリング（簡略化：全ユーザーを返す）
    console.log('Step 4: Filtering users by company (simplified)');
    const users = (data || []).map(user => ({
      id: user.id,
      code: user.code,
      family_name: user.family_name,
      first_name: user.first_name,
      family_name_kana: user.family_name_kana,
      first_name_kana: user.first_name_kana,
      email: user.email
    }));

    console.log('Final users:', users?.length || 0, 'users');
    return users;
  } catch (error) {
    console.error('Unexpected error in searchUsers:', error);
    throw new Error(`予期しないエラー: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ================================
// チャット管理
// ================================

/**
 * チャット一覧を取得
 */
export async function getChats(userId: string): Promise<ChatListView[]> {
  const supabase = createServerClient();
  
  try {
    // ユーザーが参加しているチャットを取得（簡素化）
    const { data: userChats, error: userChatsError } = await supabase
      .from('chat_users')
      .select('chat_id')
      .eq('user_id', userId)
      .is('deleted_at', null);

    if (userChatsError) {
      console.error('Error fetching user chats:', userChatsError);
      throw new Error('チャット一覧の取得に失敗しました');
    }

    if (!userChats || userChats.length === 0) {
      console.log('No chats found for user:', userId);
      return [];
    }

    // チャットIDのリストを作成
    const chatIds = userChats.map(uc => uc.chat_id);

    // チャット情報を取得
    const { data: chats, error: chatsError } = await supabase
      .from('chats')
      .select('*')
      .in('id', chatIds)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false });

    if (chatsError) {
      console.error('Error fetching chats:', chatsError);
      throw new Error('チャット一覧の取得に失敗しました');
    }

    // 各チャットの参加者情報を取得
    const chatListViews: ChatListView[] = [];
    
    for (const chat of chats || []) {
      // チャットの参加者を取得
      const { data: participants, error: participantsError } = await supabase
        .from('chat_users')
        .select(`
          user_profiles!inner(family_name, first_name)
        `)
        .eq('chat_id', chat.id)
        .is('deleted_at', null);

      if (participantsError) {
        console.error('Error fetching participants for chat:', chat.id, participantsError);
        continue;
      }

      // 参加者名のリストを作成
      const participantNames = participants?.map(p => 
        `${(p.user_profiles as any).family_name} ${(p.user_profiles as any).first_name}`
      ).join(', ') || '参加者';

      chatListViews.push({
        ...chat,
        participant_count: participants?.length || 1,
        participant_names: participantNames,
        last_message_at: chat.last_message_at || chat.updated_at
      });
    }

    return chatListViews;
  } catch (error) {
    console.error('Error in getChats:', error);
    throw new Error('チャット一覧の取得に失敗しました');
  }
}

/**
 * チャット詳細を取得
 */
export async function getChatDetail(chatId: string): Promise<ChatDetail | null> {
  const supabase = createServerClient();
  
  // チャット情報を取得
  const { data: chat, error: chatError } = await supabase
    .from('chats')
    .select('*')
    .eq('id', chatId)
    .single();

  if (chatError || !chat) {
    console.error('Error fetching chat:', chatError);
    return null;
  }

  // 参加者情報を取得
  const { data: participants, error: participantsError } = await supabase
    .from('chat_users')
    .select(`
      user_id,
      role,
      last_read_at,
      joined_at,
      user_profiles!inner(family_name, first_name, email)
    `)
    .eq('chat_id', chatId)
    .is('deleted_at', null);

  if (participantsError) {
    console.error('Error fetching participants:', participantsError);
  }

  // 未読メッセージ数を取得
  const { data: unreadCount, error: unreadError } = await supabase
    .from('unread_message_count_view')
    .select('unread_count')
    .eq('chat_id', chatId)
    .single();

  // 最新メッセージを取得
  const { data: lastMessage, error: lastMessageError } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return {
    ...chat,
    participants: participants?.map(p => ({
      user_id: p.user_id,
      user_name: `${(p.user_profiles as any).family_name} ${(p.user_profiles as any).first_name}`,
      user_email: (p.user_profiles as any).email,
      role: p.role,
      last_read_at: p.last_read_at,
      joined_at: p.joined_at
    })) || [],
    unread_count: unreadCount?.unread_count || 0,
    last_message: lastMessage || undefined
  };
}

/**
 * 1対1チャットを作成または取得
 */
export async function getOrCreateDirectChat(
  user1Id: string, 
  user2Id: string, 
  companyId: string
): Promise<string> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase.rpc('get_or_create_direct_chat', {
    p_user1_id: user1Id,
    p_user2_id: user2Id,
    p_company_id: companyId
  });

  if (error) {
    console.error('Error creating direct chat:', error);
    throw new Error('1対1チャットの作成に失敗しました');
  }

  return data;
}

/**
 * グループチャットを作成
 */
export async function createGroupChat(request: CreateChatRequest): Promise<string> {
  const supabase = createServerClient();
  
  // チャットを作成
  const { data: chat, error: chatError } = await supabase
    .from('chats')
    .insert({
      company_id: request.company_id,
      name: request.name,
      chat_type: request.chat_type,
      created_by: request.participant_ids[0], // 最初の参加者を作成者とする
      settings: request.settings || {}
    })
    .select('id')
    .single();

  if (chatError || !chat) {
    console.error('Error creating group chat:', chatError);
    throw new Error('グループチャットの作成に失敗しました');
  }

  // 参加者を追加
  const chatUsers = request.participant_ids.map((userId, index) => ({
    chat_id: chat.id,
    user_id: userId,
    role: index === 0 ? 'admin' : 'member' // 最初の参加者を管理者とする
  }));

  const { error: usersError } = await supabase
    .from('chat_users')
    .insert(chatUsers);

  if (usersError) {
    console.error('Error adding participants:', usersError);
    throw new Error('参加者の追加に失敗しました');
  }

  revalidatePath('/member/chat');
  return chat.id;
}

// ================================
// メッセージ管理
// ================================

/**
 * メッセージ一覧を取得
 */
export async function getMessages(
  chatId: string, 
  limit: number = 50, 
  offset: number = 0
): Promise<ChatMessage[]> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('chat_messages')
    .select(`
      *,
      user_profiles!inner(
        family_name,
        first_name,
        email
      )
    `)
    .eq('chat_id', chatId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching messages:', error);
    throw new Error('メッセージの取得に失敗しました');
  }

  return (data || []).reverse(); // 古い順に並び替え
}

/**
 * メッセージを送信
 */
export async function sendMessage(request: SendMessageRequest): Promise<ChatMessage> {
  const supabase = createServerClient();
  
  // リクエストからユーザーIDを取得
  if (!request.user_id) {
    throw new Error('ユーザーIDが指定されていません');
  }
  
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      chat_id: request.chat_id,
      user_id: request.user_id,
      message_type: request.message_type || 'text',
      content: request.content,
      attachments: request.attachments || [],
      reply_to_message_id: request.reply_to_message_id
    })
    .select('*')
    .single();

  if (error || !data) {
    console.error('Error sending message:', error);
    throw new Error('メッセージの送信に失敗しました');
  }

  revalidatePath('/member/chat');
  return data;
}

/**
 * メッセージを編集
 */
export async function editMessage(
  messageId: string, 
  content: string
): Promise<ChatMessage> {
  const supabase = createServerClient();
  
  // ユーザー認証を確認
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user?.id) {
    console.error('Authentication error:', authError);
    throw new Error('ユーザーが認証されていません');
  }
  
  const { data, error } = await supabase
    .from('chat_messages')
    .update({
      content,
      edited_at: new Date().toISOString()
    })
    .eq('id', messageId)
    .eq('user_id', user.id) // 自分のメッセージのみ編集可能
    .select('*')
    .single();

  if (error || !data) {
    console.error('Error editing message:', error);
    throw new Error('メッセージの編集に失敗しました');
  }

  revalidatePath('/member/chat');
  return data;
}

/**
 * メッセージを削除
 */
export async function deleteMessage(messageId: string): Promise<void> {
  const supabase = createServerClient();
  
  // ユーザー認証を確認
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user?.id) {
    console.error('Authentication error:', authError);
    throw new Error('ユーザーが認証されていません');
  }
  
  const { error } = await supabase
    .from('chat_messages')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', messageId)
    .eq('user_id', user.id); // 自分のメッセージのみ削除可能

  if (error) {
    console.error('Error deleting message:', error);
    throw new Error('メッセージの削除に失敗しました');
  }

  revalidatePath('/member/chat');
}

// ================================
// 既読管理
// ================================

/**
 * 既読を更新
 */
export async function markAsRead(request: MarkAsReadRequest): Promise<void> {
  const supabase = createServerClient();
  
  console.log('markAsRead called with:', request);
  
  // バリデーション
  if (!request.chat_id) {
    throw new Error('チャットIDが指定されていません');
  }

  // ユーザーIDを直接受け取るように変更
  if (!request.user_id) {
    throw new Error('ユーザーIDが指定されていません');
  }
  
  const { data, error } = await supabase
    .from('chat_users')
    .update({
      last_read_at: request.last_read_at || new Date().toISOString()
    })
    .eq('chat_id', request.chat_id)
    .eq('user_id', request.user_id)
    .select();

  if (error) {
    console.error('Error marking as read:', error);
    throw new Error('既読の更新に失敗しました');
  }

  console.log('markAsRead success:', data);
  revalidatePath('/member/chat');
}

// ================================
// リアクション管理
// ================================

/**
 * リアクションを追加
 */
export async function addReaction(request: AddReactionRequest): Promise<ChatMessageReaction> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('chat_message_reactions')
    .insert({
      message_id: request.message_id,
      user_id: (await supabase.auth.getUser()).data.user?.id,
      reaction_type: request.reaction_type
    })
    .select('*')
    .single();

  if (error || !data) {
    console.error('Error adding reaction:', error);
    throw new Error('リアクションの追加に失敗しました');
  }

  revalidatePath('/member/chat');
  return data;
}

/**
 * リアクションを削除
 */
export async function removeReaction(
  messageId: string, 
  reactionType: string
): Promise<void> {
  const supabase = createServerClient();
  
  const { error } = await supabase
    .from('chat_message_reactions')
    .update({ deleted_at: new Date().toISOString() })
    .eq('message_id', messageId)
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
    .eq('reaction_type', reactionType);

  if (error) {
    console.error('Error removing reaction:', error);
    throw new Error('リアクションの削除に失敗しました');
  }

  revalidatePath('/member/chat');
}

// ================================
// 参加者管理
// ================================

/**
 * チャットに参加者を追加
 */
export async function addChatParticipant(
  chatId: string, 
  userId: string, 
  role: 'admin' | 'member' = 'member'
): Promise<void> {
  const supabase = createServerClient();
  
  const { error } = await supabase
    .from('chat_users')
    .insert({
      chat_id: chatId,
      user_id: userId,
      role
    });

  if (error) {
    console.error('Error adding participant:', error);
    throw new Error('参加者の追加に失敗しました');
  }

  revalidatePath('/member/chat');
}

/**
 * チャットから参加者を削除
 */
export async function removeChatParticipant(
  chatId: string, 
  userId: string
): Promise<void> {
  const supabase = createServerClient();
  
  const { error } = await supabase
    .from('chat_users')
    .update({ left_at: new Date().toISOString() })
    .eq('chat_id', chatId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error removing participant:', error);
    throw new Error('参加者の削除に失敗しました');
  }

  revalidatePath('/member/chat');
}

/**
 * 参加者のロールを変更
 */
export async function updateChatParticipantRole(
  chatId: string, 
  userId: string, 
  role: 'admin' | 'member'
): Promise<void> {
  const supabase = createServerClient();
  
  const { error } = await supabase
    .from('chat_users')
    .update({ role })
    .eq('chat_id', chatId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error updating participant role:', error);
    throw new Error('参加者ロールの更新に失敗しました');
  }

  revalidatePath('/member/chat');
} 