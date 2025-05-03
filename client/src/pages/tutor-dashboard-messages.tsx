import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, MessageSquare, Send, ArrowLeft, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import TutorDashboardLayout from "@/components/layout/TutorDashboardLayout";
import { Separator } from "@/components/ui/separator";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

export default function TutorDashboardMessages() {
  const { id: conversationId } = useParams();
  const { user } = useSelector((state: RootState) => state.auth);
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Get tutor profile
  const { data: tutorProfile, isLoading: profileLoading } = useQuery({
    queryKey: [`/api/v1/tutors/profile`],
    retry: false,
  });

  // Get all conversations
  const { data: conversations, isLoading: conversationsLoading } = useQuery({
    queryKey: [`/api/v1/conversations`],
    enabled: !!tutorProfile,
  });

  // Get a specific conversation if ID is provided
  const { data: conversation, isLoading: conversationLoading } = useQuery({
    queryKey: [`/api/v1/conversations/${conversationId}`],
    enabled: !!conversationId && !!tutorProfile,
  });

  // Send a message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string; content: string }) => {
      const res = await apiRequest("POST", `/api/v1/conversations/${conversationId}/messages`, { content });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/v1/conversations/${conversationId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/v1/conversations`] });
      setMessage("");
    },
  });

  // Scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversation?.messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !conversationId) return;
    
    try {
      await sendMessageMutation.mutateAsync({ conversationId, content: message });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const isLoading = profileLoading || (conversationId && conversationLoading);

  // Format date to display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format date for conversation list
  const formatMessageDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // If today
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    }
    
    // If yesterday
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Hôm qua';
    }
    
    // Otherwise show date
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  };

  if (isLoading) {
    return (
      <TutorDashboardLayout activePage="messages">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <span className="ml-2 text-xl">Loading...</span>
        </div>
      </TutorDashboardLayout>
    );
  }

  return (
    <TutorDashboardLayout activePage="messages">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversations list */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Hội thoại</CardTitle>
              <CardDescription>
                Tin nhắn từ học viên của bạn
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              {conversationsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : conversations && conversations.length > 0 ? (
                <div className="space-y-2">
                  {conversations.map((conv: any) => (
                    <Link key={conv.id} href={`/dashboard/tutor/messages/${conv.id}`}>
                      <a className={`flex items-center p-4 border rounded-lg transition-colors hover:border-primary ${conversationId === conv.id.toString() ? 'border-primary bg-primary/5' : ''}`}>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={conv.student?.avatar} alt={conv.student?.firstName} />
                          <AvatarFallback>
                            {conv.student?.firstName?.[0]}{conv.student?.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="ml-4 flex-1 overflow-hidden">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium truncate">
                              {conv.student?.firstName} {conv.student?.lastName}
                            </h4>
                            <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                              {formatMessageDate(conv.last_message_at)}
                            </span>
                          </div>
                          
                          <p className="text-sm text-muted-foreground truncate">
                            {conv.last_message?.content || "Bắt đầu cuộc trò chuyện"}
                          </p>
                        </div>
                        
                        {conv.unread_count > 0 && (
                          <Badge className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                            {conv.unread_count}
                          </Badge>
                        )}
                      </a>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground" />
                  <h2 className="mt-4 text-xl font-medium">Không có tin nhắn</h2>
                  <p className="mt-2 text-muted-foreground max-w-md mx-auto">
                    Bạn chưa nhận được tin nhắn từ học viên. Hoàn thiện hồ sơ và tạo thông báo dạy để học viên liên hệ.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Message content */}
        <div className="lg:col-span-2">
          {conversationId && conversation ? (
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center">
                  <Link href="/dashboard/tutor/messages">
                    <a className="mr-2 lg:hidden">
                      <ArrowLeft className="h-5 w-5" />
                    </a>
                  </Link>
                  
                  <Avatar className="h-10 w-10">
                    <AvatarImage 
                      src={user?.role === 'tutor' ? conversation.student?.avatar : conversation.tutor?.avatar} 
                      alt={user?.role === 'tutor' ? conversation.student?.firstName : conversation.tutor?.firstName} 
                    />
                    <AvatarFallback>
                      {user?.role === 'tutor' 
                        ? `${conversation.student?.firstName?.[0]}${conversation.student?.lastName?.[0]}`
                        : `${conversation.tutor?.firstName?.[0]}${conversation.tutor?.lastName?.[0]}`
                      }
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="ml-3">
                    <CardTitle className="text-base">
                      {user?.role === 'tutor' 
                        ? `${conversation.student?.firstName} ${conversation.student?.lastName}`
                        : `${conversation.tutor?.firstName} ${conversation.tutor?.lastName}`
                      }
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {user?.role === 'tutor' 
                        ? conversation.student?.email
                        : conversation.tutor?.email
                      }
                    </p>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                {conversation.messages?.length > 0 ? (
                  conversation.messages.map((msg: any) => (
                    <div 
                      key={msg.id}
                      className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.sender_id !== user?.id && (
                        <Avatar className="h-8 w-8 mr-2 mt-1">
                          <AvatarImage 
                            src={user?.role === 'tutor' ? conversation.student?.avatar : conversation.tutor?.avatar} 
                            alt="Avatar" 
                          />
                          <AvatarFallback>
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                      
                      <div className={`max-w-[75%] ${msg.sender_id === user?.id ? 'bg-primary text-primary-foreground' : 'bg-muted'} rounded-lg p-3`}>
                        <p>{msg.content}</p>
                        <p className={`text-xs mt-1 ${msg.sender_id === user?.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                          {formatDate(msg.created_at)}
                        </p>
                      </div>
                      
                      {msg.sender_id === user?.id && (
                        <Avatar className="h-8 w-8 ml-2 mt-1">
                          <AvatarImage src={user?.avatar} alt="Your avatar" />
                          <AvatarFallback>
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground" />
                    <h2 className="mt-4 text-lg font-medium">Không có tin nhắn</h2>
                    <p className="mt-2 text-muted-foreground max-w-md mx-auto">
                      Bắt đầu cuộc trò chuyện với học viên
                    </p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </CardContent>
              
              <CardFooter className="p-4 border-t">
                <form onSubmit={handleSendMessage} className="flex w-full gap-2">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Nhập tin nhắn..."
                    className="flex-1"
                  />
                  <Button 
                    type="submit" 
                    disabled={!message.trim() || sendMessageMutation.isPending}
                  >
                    {sendMessageMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    <span className="ml-2 sr-only md:not-sr-only">Gửi</span>
                  </Button>
                </form>
              </CardFooter>
            </Card>
          ) : (
            <div className="h-full flex items-center justify-center bg-muted/30 rounded-lg p-6">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-xl font-medium mb-2">Chọn một cuộc trò chuyện</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Chọn một cuộc trò chuyện từ danh sách bên trái để xem tin nhắn
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </TutorDashboardLayout>
  );
}