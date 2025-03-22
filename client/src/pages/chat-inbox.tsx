import { useState, useEffect } from "react";
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
  
  // Get chat ID from URL query parameter if present
  const query = new URLSearchParams(location.split("?")[1] || "");
  const chatIdFromUrl = query.get("chatId");
  
  useEffect(() => {
    if (chatIdFromUrl) {
      setActiveChatId(parseInt(chatIdFromUrl));
    }
  }, [chatIdFromUrl]);

  // Fetch user's chats
  const {
    data: chats,
    isLoading: isChatsLoading,
    error: chatsError,
  } = useQuery<ExtendedChat[]>({
    queryKey: ["/api/chats"],
    enabled: !!user,
  });

  // Fetch messages for active chat
  const {
    data: messages,
    isLoading: isMessagesLoading,
    error: messagesError,
  } = useQuery<Message[]>({
    queryKey: [`/api/chats/${activeChatId}/messages`],
    enabled: !!activeChatId,
    refetchInterval: 5000, // Poll every 5 seconds for new messages
  });

  // Send message mutation
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
    onSuccess: () => {
      // Invalidate the messages query to refetch
      if (activeChatId) {
        queryClient.invalidateQueries({ queryKey: [`/api/chats/${activeChatId}/messages`] });
      }
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
    return null; // Protected route will handle redirect
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
