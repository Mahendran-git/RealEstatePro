import { create } from 'zustand';
import { Chat, Message } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';

interface ExtendedChat extends Chat {
  property: {
    title: string;
    id: number;
  };
  seller?: {
    firstName: string;
    lastName: string;
    id: number;
  };
  buyer?: {
    firstName: string;
    lastName: string;
    id: number;
  };
}

interface ChatState {
  isLoading: boolean;
  error: string | null;
  chats: ExtendedChat[];
  activeChat: ExtendedChat | null;
  messages: Message[];
  
  // Actions
  fetchChats: () => Promise<void>;
  fetchMessages: (chatId: number) => Promise<void>;
  setActiveChat: (chatId: number) => void;
  sendMessage: (chatId: number, content: string, senderId: number) => Promise<boolean>;
  initChat: (buyerId: number, sellerId: number, propertyId: number) => Promise<number | null>;
}

const useChatStore = create<ChatState>((set, get) => ({
  isLoading: false,
  error: null,
  chats: [],
  activeChat: null,
  messages: [],
  
  fetchChats: async () => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await fetch('/api/chats', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch chats');
      }
      
      const data: ExtendedChat[] = await response.json();
      
      set({
        chats: data,
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: (error as Error).message,
      });
    }
  },
  
  fetchMessages: async (chatId: number) => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await fetch(`/api/chats/${chatId}/messages`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      
      const data: Message[] = await response.json();
      
      set({
        messages: data,
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: (error as Error).message,
      });
    }
  },
  
  setActiveChat: (chatId: number) => {
    const { chats } = get();
    const activeChat = chats.find(chat => chat.id === chatId) || null;
    set({ activeChat });
    
    if (activeChat) {
      get().fetchMessages(chatId);
    }
  },
  
  sendMessage: async (chatId: number, content: string, senderId: number) => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await apiRequest('POST', '/api/messages', {
        chatId,
        senderId,
        content,
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      const message: Message = await response.json();
      
      // Add the new message to the messages array
      set(state => ({
        messages: [...state.messages, message],
        isLoading: false,
      }));
      
      return true;
    } catch (error) {
      set({
        isLoading: false,
        error: (error as Error).message,
      });
      return false;
    }
  },
  
  initChat: async (buyerId: number, sellerId: number, propertyId: number) => {
    try {
      set({ isLoading: true, error: null });
      
      // Check if chat already exists
      const { chats } = get();
      const existingChat = chats.find(
        chat => chat.buyerId === buyerId && 
               chat.sellerId === sellerId && 
               chat.propertyId === propertyId
      );
      
      if (existingChat) {
        set({ 
          activeChat: existingChat,
          isLoading: false,
        });
        get().fetchMessages(existingChat.id);
        return existingChat.id;
      }
      
      // Create new chat
      const response = await apiRequest('POST', '/api/chats', {
        buyerId,
        sellerId,
        propertyId,
      });
      
      if (!response.ok) {
        throw new Error('Failed to create chat');
      }
      
      const chat: Chat = await response.json();
      
      // Refetch all chats to get the extended chat with property and user details
      await get().fetchChats();
      
      // Set the new chat as active
      get().setActiveChat(chat.id);
      
      return chat.id;
    } catch (error) {
      set({
        isLoading: false,
        error: (error as Error).message,
      });
      return null;
    }
  },
}));

export default useChatStore;
