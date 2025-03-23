import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import AvatarPlaceholder from "@/components/ui/avatar-placeholder";
import { getInitials, formatTime } from "@/lib/utils";
import { Message, Chat } from "@shared/schema";
import { Send, Menu } from "lucide-react";

interface ChatInterfaceProps {
  chats: (Chat & { 
    property: { title: string; id: number; } 
    seller?: { firstName: string; lastName: string; id: number; }
    buyer?: { firstName: string; lastName: string; id: number; }
  })[];
  messages: Message[];
  activeChatId: number | null;
  setActiveChatId: (id: number) => void;
  onSendMessage: (chatId: number, content: string) => void;
  onMobileBackClick?: () => void;
  isMobile: boolean;
}

export default function ChatInterface({ 
  chats, 
  messages, 
  activeChatId, 
  setActiveChatId,
  onSendMessage,
  onMobileBackClick,
  isMobile
}: ChatInterfaceProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Scroll to bottom of messages when messages update
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);
  
  // Focus the input field when the component mounts or the active chat changes
  useEffect(() => {
    if (activeChatId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [activeChatId]);
  
  if (!user) return null;
  
  const activeChat = chats.find(chat => chat.id === activeChatId);
  
  // Using useCallback to prevent recreating the handler on every render
  const handleSendMessage = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChatId || !message.trim()) return;
    
    onSendMessage(activeChatId, message);
    setMessage("");
    
    // Refocus the input after sending
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 0);
  }, [activeChatId, message, onSendMessage]);
  
  // Determine the other user in the chat (buyer or seller)
  const getOtherUser = (chat: typeof chats[0]) => {
    if (user.role === "buyer") {
      return chat.seller;
    } else {
      return chat.buyer;
    }
  };
  
  // Chat list sidebar
  const ChatList = () => (
    <div className={`w-full md:w-64 border-r border-neutral-200 bg-white flex-shrink-0 
      ${isMobile && activeChatId ? 'hidden' : 'block'} md:block h-[calc(100vh-4rem)]`}>
      <div className="h-16 flex items-center px-4 border-b border-neutral-200">
        <h2 className="text-lg font-medium text-neutral-900">Messages</h2>
      </div>
      
      <ScrollArea className="h-[calc(100vh-4rem-64px)]">
        <div className="divide-y divide-neutral-200">
          {chats.length === 0 ? (
            <div className="p-4 text-center text-neutral-500">
              No conversations yet
            </div>
          ) : (
            chats.map(chat => {
              const otherUser = getOtherUser(chat);
              const isActive = chat.id === activeChatId;
              
              return (
                <div 
                  key={chat.id}
                  className={`p-4 hover:bg-neutral-50 cursor-pointer ${
                    isActive ? 'border-l-4 border-primary' : ''
                  }`}
                  onClick={() => setActiveChatId(chat.id)}
                >
                  <div className="flex items-center mb-1">
                    <div className="mr-3">
                      <AvatarPlaceholder 
                        initials={getInitials(
                          otherUser?.firstName || "", 
                          otherUser?.lastName || ""
                        )} 
                      />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <h3 className="text-sm font-medium text-neutral-900 truncate">
                        {otherUser?.firstName} {otherUser?.lastName}
                      </h3>
                      <p className="text-xs text-neutral-500 truncate">
                        {chat.property.title}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
  
  // Chat area
  const ChatArea = () => {
    if (!activeChatId || !activeChat) {
      return (
        <div className={`flex-1 flex flex-col items-center justify-center bg-neutral-50 ${
          isMobile && !activeChatId ? 'hidden' : 'flex'
        } md:flex`}>
          <div className="text-center p-6">
            <h3 className="text-lg font-medium text-neutral-900 mb-2">Select a conversation</h3>
            <p className="text-neutral-500">Choose a conversation from the list to start chatting</p>
          </div>
        </div>
      );
    }
    
    const otherUser = getOtherUser(activeChat);
    
    return (
      <div className={`flex-1 flex flex-col ${
        isMobile && !activeChatId ? 'hidden' : 'flex'
      } md:flex`}>
        {/* Chat header */}
        <div className="h-16 flex items-center justify-between px-4 sm:px-6 border-b border-neutral-200 bg-white">
          <div className="flex items-center">
            {isMobile && (
              <button 
                type="button" 
                className="md:hidden mr-2 h-10 w-10 inline-flex items-center justify-center rounded-full text-neutral-500"
                onClick={onMobileBackClick}
              >
                <Menu className="h-5 w-5" />
              </button>
            )}
            <div className="flex items-center">
              <div className="mr-3">
                <AvatarPlaceholder 
                  initials={getInitials(
                    otherUser?.firstName || "", 
                    otherUser?.lastName || ""
                  )} 
                />
              </div>
              <div>
                <h3 className="text-sm font-medium text-neutral-900">
                  {otherUser?.firstName} {otherUser?.lastName}
                </h3>
                <p className="text-xs text-neutral-500">{activeChat.property.title}</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Messages */}
        <ScrollArea className="flex-1 p-4 bg-neutral-50">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center p-6 text-neutral-500">
                No messages yet. Start the conversation!
              </div>
            ) : (
              messages.map(message => {
                const isSender = message.senderId === user.id;
                
                return (
                  <div key={message.id} className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}>
                    {!isSender && (
                      <div className="flex-shrink-0 mr-3">
                        <AvatarPlaceholder 
                          size="sm"
                          initials={getInitials(
                            otherUser?.firstName || "", 
                            otherUser?.lastName || ""
                          )} 
                        />
                      </div>
                    )}
                    <div 
                      className={`p-3 max-w-[75%] rounded-lg ${
                        isSender 
                          ? 'bg-primary text-white rounded-tr-none' 
                          : 'bg-white text-neutral-800 rounded-tl-none shadow-sm'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className={`text-xs mt-1 ${isSender ? 'opacity-80' : 'text-neutral-500'}`}>
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        
        {/* Message input */}
        <div className="border-t border-neutral-200 p-4 bg-white">
          <form onSubmit={handleSendMessage} className="flex items-end">
            <div className="flex-1 mr-3">
              <Input
                ref={inputRef}
                placeholder="Type a message..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                autoFocus
                className="min-h-[42px]"
              />
            </div>
            <Button type="submit" size="icon" className="h-[42px] w-[42px] rounded-full">
              <Send className="h-5 w-5" />
            </Button>
          </form>
        </div>
      </div>
    );
  };
  
  return (
    <div className="flex-1 flex overflow-hidden">
      <ChatList />
      <ChatArea />
    </div>
  );
}
