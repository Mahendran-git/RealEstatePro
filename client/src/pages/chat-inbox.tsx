
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import MainLayout from "@/components/layout/main-layout";
import ChatInterface from "@/components/chat/chat-interface";
import { Chat, Message } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

type ExtendedChat = Chat & {
  property: { title: string; id: number };
  seller?: { firstName: string; lastName: string; id: number };
  buyer?: { firstName: string; lastName: string; id: number };
};

export default function ChatInbox() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [location] = useLocation();
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  
  const query = new URLSearchParams(location.split("?")[1] || "");
  const chatIdFromUrl = query.get("chatId");
  
  useEffect(() => {
    if (chatIdFromUrl) {
      setActiveChatId(parseInt(chatIdFromUrl));
    }
  }, [chatIdFromUrl]);

  useEffect(() => {
    if (!user) return;

    const ws = new WebSocket(`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/chat?userId=${user.id}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      queryClient.invalidateQueries({ queryKey: [`/api/chats/${message.chatId}/messages`] });
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      toast({
        title: "Connection Error",
        description: "Failed to connect to chat server",
        variant: "destructive",
      });
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [user, toast]);

  const {
    data: chats,
    isLoading: isChatsLoading,
    error: chatsError,
  } = useQuery<ExtendedChat[]>({
    queryKey: ["/api/chats"],
    enabled: !!user,
  });

  const {
    data: messages,
    isLoading: isMessagesLoading,
    error: messagesError,
  } = useQuery<Message[]>({
    queryKey: [`/api/chats/${activeChatId}/messages`],
    enabled: !!activeChatId,
    refetchInterval: 0, // Disable polling since we're using WebSocket
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ chatId, content }: { chatId: number; content: string }) => {
      if (!user) throw new Error("User not authenticated");
      
      const response = await apiRequest("POST", `/api/messages`, {
        chatId,
        senderId: user.id,
        content,
      });
      
      return response.json();
    },
    onSuccess: (newMessage) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(newMessage));
      }
      queryClient.invalidateQueries({ queryKey: [`/api/chats/${newMessage.chatId}/messages`] });
    },
    onError: (error) => {
      toast({
        title: "Error sending message",
        description: (error as Error).message,
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = (chatId: number, content: string) => {
    sendMessageMutation.mutate({ chatId, content });
  };

  const handleMobileBackClick = () => {
    setActiveChatId(null);
  };

  if (!user) {
    return null;
  }

  if (isChatsLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (chatsError) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="bg-red-50 p-6 rounded-lg text-center">
            <h2 className="text-xl font-bold text-red-800 mb-2">Error Loading Chats</h2>
            <p className="text-red-700">Failed to load your conversations. Please try again later.</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="h-[calc(100vh-4rem)]">
        <ChatInterface
          chats={chats || []}
          messages={messages || []}
          activeChatId={activeChatId}
          setActiveChatId={setActiveChatId}
          onSendMessage={handleSendMessage}
          onMobileBackClick={handleMobileBackClick}
          isMobile={isMobile}
        />
      </div>
    </MainLayout>
  );
}
