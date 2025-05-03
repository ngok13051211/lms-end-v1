import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Loader2, Send, ChevronRight, MessageSquare, Search } from "lucide-react";
import { Link, useRoute, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function StudentDashboardMessages() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/dashboard/student/messages/:id");
  const { toast } = useToast();
  const conversationId = match ? params.id : null;
  const [messageContent, setMessageContent] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Get conversations list
  const { data: conversations, isLoading: conversationsLoading } = useQuery({
    queryKey: ['/api/v1/conversations'],
  });
  
  // Get selected conversation details if ID is provided
  const { data: conversation, isLoading: conversationLoading } = useQuery({
    queryKey: ['/api/v1/conversations', conversationId],
    enabled: !!conversationId,
  });

  // Filter conversations by search query
  const filteredConversations = conversations 
    ? conversations.filter((conv: any) => {
        const tutorName = `${conv.tutor?.first_name || ''} ${conv.tutor?.last_name || ''}`.toLowerCase();
        const searchLower = searchQuery.toLowerCase();
        // Search by tutor name or last message content
        return tutorName.includes(searchLower) || 
               (conv.lastMessage?.content && conv.lastMessage.content.toLowerCase().includes(searchLower));
      })
    : [];
  
  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ content }: { content: string }) => {
      if (!conversationId) throw new Error("No conversation selected");
      return apiRequest("POST", `/api/v1/conversations/${conversationId}/messages`, { content });
    },
    onSuccess: () => {
      setMessageContent("");
      queryClient.invalidateQueries({ queryKey: ['/api/v1/conversations', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/conversations'] });
    },
    onError: (error: any) => {
      toast({
        title: "Lỗi gửi tin nhắn",
        description: error.message || "Không thể gửi tin nhắn. Vui lòng thử lại sau.",
        variant: "destructive",
      });
    }
  });
  
  // Scroll to bottom of messages when conversation changes or new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversation]);
  
  // Handle send message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageContent.trim()) return;
    sendMessageMutation.mutate({ content: messageContent });
  };
  
  // Format date for display
  const formatMessageDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    
    // If today, show time only
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // If this year, show month and day
    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
    
    // Full date otherwise
    return date.toLocaleDateString();
  };
  
  if (conversationsLoading || (conversationId && conversationLoading)) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <span className="ml-2 text-xl">Đang tải tin nhắn...</span>
        </div>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-medium">Tin nhắn</h1>
          <div className="flex gap-2">
            <Link href="/dashboard/student/profile">
              <Button variant="outline">Hồ sơ</Button>
            </Link>
            <Link href="/dashboard/student/tutors">
              <Button variant="outline">Gia sư yêu thích</Button>
            </Link>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Conversations list */}
          <Card className="md:col-span-1 overflow-hidden">
            <CardHeader className="p-4">
              <CardTitle className="text-lg">Cuộc trò chuyện</CardTitle>
              <div className="relative mt-2">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm cuộc trò chuyện..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </CardHeader>
            
            <ScrollArea className="h-[calc(80vh-13rem)]">
              <CardContent className="p-0">
                {filteredConversations.length > 0 ? (
                  <div className="divide-y">
                    {filteredConversations.map((conv: any) => (
                      <div 
                        key={conv.id} 
                        className={`p-4 hover:bg-muted cursor-pointer ${conversationId === conv.id ? 'bg-muted' : ''}`}
                        onClick={() => navigate(`/dashboard/student/messages/${conv.id}`)}
                      >
                        <div className="flex items-center">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={conv.tutor?.avatar} alt={conv.tutor?.first_name} />
                            <AvatarFallback>
                              {conv.tutor?.first_name?.[0]}{conv.tutor?.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="ml-3 flex-1 overflow-hidden">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium truncate">
                                {conv.tutor?.first_name} {conv.tutor?.last_name}
                              </h4>
                              <span className="text-xs text-muted-foreground">
                                {formatMessageDate(conv.lastMessageAt || conv.createdAt)}
                              </span>
                            </div>
                            
                            <p className="text-sm text-muted-foreground truncate">
                              {conv.lastMessage?.content || "Bắt đầu cuộc trò chuyện"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : searchQuery ? (
                  <div className="text-center py-8">
                    <Search className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      Không tìm thấy cuộc trò chuyện nào với "{searchQuery}"
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      Chưa có cuộc trò chuyện nào
                    </p>
                  </div>
                )}
              </CardContent>
            </ScrollArea>
          </Card>
          
          {/* Selected conversation or empty state */}
          <Card className="md:col-span-2 flex flex-col">
            {conversationId && conversation ? (
              <>
                <CardHeader className="p-4 border-b">
                  <div className="flex items-center">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={conversation.tutor?.avatar} alt={conversation.tutor?.first_name} />
                      <AvatarFallback>
                        {conversation.tutor?.first_name?.[0]}{conversation.tutor?.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="ml-3">
                      <CardTitle className="text-lg">{conversation.tutor?.first_name} {conversation.tutor?.last_name}</CardTitle>
                      <CardDescription>
                        {conversation.tutor?.bio ? conversation.tutor.bio.substring(0, 50) + (conversation.tutor.bio.length > 50 ? '...' : '') : 'Gia sư'}
                      </CardDescription>
                    </div>
                    
                    <Link href={`/tutors/${conversation.tutor?.id}`} className="ml-auto">
                      <Button variant="ghost" size="sm" className="gap-1">
                        Xem hồ sơ <ChevronRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                
                <CardContent className="p-0 flex-1 overflow-hidden">
                  <ScrollArea className="h-[calc(80vh-17rem)]">
                    <div className="p-4 space-y-4">
                      {conversation.messages && conversation.messages.length > 0 ? (
                        conversation.messages.map((message: any) => {
                          const isCurrentUser = message.senderId === user?.id;
                          
                          return (
                            <div 
                              key={message.id} 
                              className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                            >
                              <div className="flex items-end gap-2">
                                {!isCurrentUser && (
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={conversation.tutor?.avatar} alt={conversation.tutor?.first_name} />
                                    <AvatarFallback>
                                      {conversation.tutor?.first_name?.[0]}{conversation.tutor?.last_name?.[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                )}
                                
                                <div 
                                  className={`px-4 py-2 rounded-lg max-w-md break-words ${
                                    isCurrentUser 
                                      ? 'bg-primary text-primary-foreground' 
                                      : 'bg-muted'
                                  }`}
                                >
                                  <p>{message.content}</p>
                                  <div 
                                    className={`text-xs mt-1 ${
                                      isCurrentUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
                                    }`}
                                  >
                                    {formatMessageDate(message.createdAt)}
                                  </div>
                                </div>
                                
                                {isCurrentUser && (
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={user?.avatar} alt={user?.firstName} />
                                    <AvatarFallback>
                                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-8">
                          <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground" />
                          <p className="mt-2 text-muted-foreground">
                            Bắt đầu cuộc trò chuyện với {conversation.tutor?.first_name} {conversation.tutor?.last_name}
                          </p>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>
                </CardContent>
                
                <CardFooter className="p-4 border-t">
                  <form onSubmit={handleSendMessage} className="flex gap-2 w-full">
                    <Input
                      placeholder="Nhập tin nhắn..."
                      value={messageContent}
                      onChange={(e) => setMessageContent(e.target.value)}
                      disabled={sendMessageMutation.isPending}
                    />
                    <Button type="submit" disabled={!messageContent.trim() || sendMessageMutation.isPending}>
                      {sendMessageMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </form>
                </CardFooter>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-[calc(80vh-13rem)]">
                <MessageSquare className="h-16 w-16 text-muted-foreground" />
                <h2 className="mt-4 text-xl font-medium">Chọn một cuộc trò chuyện</h2>
                <p className="mt-2 text-center text-muted-foreground max-w-sm">
                  Chọn một cuộc trò chuyện từ danh sách bên trái hoặc bắt đầu cuộc trò chuyện mới với gia sư
                </p>
                <Button className="mt-6" onClick={() => navigate("/tutors")}>
                  Tìm gia sư
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}