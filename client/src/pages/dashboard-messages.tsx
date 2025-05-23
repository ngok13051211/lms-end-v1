import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { useMessageGrouping } from "@/hooks/use-message-grouping";
import { Loader2, MessageSquare, ArrowLeft } from "lucide-react";
import { MessageInput } from "@/components/messages/MessageInput";
import { MessageList } from "@/components/messages/MessageList";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import DashboardLayout from "@/components/layout/DashboardLayout";
import TutorDashboardLayout from "@/components/layout/TutorDashboardLayout";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

// Định nghĩa cấu trúc dữ liệu
interface ConversationUser {
  id: number;
  first_name?: string;
  firstName?: string;
  last_name?: string;
  lastName?: string;
  avatar?: string;
  email?: string;
  role?: string;
}

interface ConversationMessage {
  id: number;
  sender_id: number;
  content: string;
  attachment_url?: string;
  created_at: string;
  read: boolean;
}

interface Conversation {
  id: string | number;
  student?: ConversationUser;
  tutor?: ConversationUser;
  messages?: ConversationMessage[];
  last_message_at?: string;
  last_message?: {
    content?: string;
  };
  unread_count?: number;
}

export default function DashboardMessages() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const params = useParams();
  const [conversationId, setConversationId] = useState<string | null>(
    params.id || null
  );
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
  }, [user, navigate]);
  // Lắng nghe thay đổi URL để cập nhật conversationId
  useEffect(() => {
    if (params.id) {
      setConversationId(params.id);
    }
  }, [params.id]);

  // Get all conversations
  const { data: conversations, isLoading: conversationsLoading } = useQuery<
    Conversation[]
  >({
    queryKey: [`/api/v1/conversations`],
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Get a specific conversation if ID is provided
  const {
    data: conversationData,
    isLoading: conversationLoading,
    error: conversationError,
  } = useQuery<Conversation>({
    queryKey: [`/api/v1/conversations/${conversationId}`],
    enabled: !!conversationId && !!user,
    refetchInterval: 10000, // Auto-refresh every 15 seconds to get new messages
  });
  // Update state when data changes
  useEffect(() => {
    if (conversationData) {
      setConversation(conversationData);
    } else if (conversationError && conversationId) {
      toast({
        title: "Lỗi",
        description:
          "Không thể tải cuộc trò chuyện này hoặc cuộc trò chuyện không tồn tại",
        variant: "destructive",
      });
      // Chuyển về trang chính nếu có lỗi
      navigate("/dashboard/messages");
      setConversationId(null);
    }
  }, [conversationData, conversationError, conversationId, navigate, toast]);

  // Group messages by sender for a better chat UI
  const groupedMessages = useMessageGrouping(conversation?.messages || []);

  // Scroll to bottom of messages whenever messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversation?.messages]);

  // Also scroll to bottom on initial load and window resize
  useEffect(() => {
    const scrollToBottom = () => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView();
      }
    };

    // Scroll on load
    scrollToBottom();

    // Scroll on window resize
    window.addEventListener("resize", scrollToBottom);

    return () => {
      window.removeEventListener("resize", scrollToBottom);
    };
  }, [conversationId]);

  // Format date to display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Format date for conversation list
  const formatMessageDate = (dateString?: string) => {
    if (!dateString) return "";

    const date = new Date(dateString);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    // If today
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    // If yesterday
    if (date.toDateString() === yesterday.toDateString()) {
      return "Hôm qua";
    }

    // Otherwise show date
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
    });
  };

  // Lấy thông tin người dùng còn lại trong cuộc trò chuyện
  const getOtherUser = (conversation: Conversation) => {
    if (!conversation) return null;

    return user?.role === "student" ? conversation.tutor : conversation.student;
  };

  // Nội dung trang chính
  const renderContent = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Danh sách cuộc hội thoại */}
      <div className="lg:col-span-1">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Hội thoại</CardTitle>
            <CardDescription>
              {user?.role === "student"
                ? "Tin nhắn với giáo viên của bạn"
                : "Tin nhắn từ học viên của bạn"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {conversationsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : conversations && conversations.length > 0 ? (
              <div className="space-y-2">
                {" "}
                {conversations.map((conv) => {
                  const otherUser = getOtherUser(conv);
                  const convId = String(conv.id);
                  return (
                    <Link key={conv.id} href={`/dashboard/messages/${conv.id}`}>
                      <a
                        className={`flex items-center p-4 border rounded-lg transition-colors hover:border-primary ${
                          conversationId === convId
                            ? "border-primary bg-primary/5"
                            : ""
                        }`}
                        onClick={(e) => {
                          e.preventDefault();
                          navigate(`/dashboard/messages/${conv.id}`);
                        }}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage
                            src={otherUser?.avatar}
                            alt={otherUser?.firstName || otherUser?.first_name}
                          />
                          <AvatarFallback>
                            {(otherUser?.firstName?.[0] ||
                              otherUser?.first_name?.[0] ||
                              "") +
                              (otherUser?.lastName?.[0] ||
                                otherUser?.last_name?.[0] ||
                                "")}
                          </AvatarFallback>
                        </Avatar>

                        <div className="ml-4 flex-1 overflow-hidden">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium truncate">
                              {otherUser?.firstName || otherUser?.first_name}{" "}
                              {otherUser?.lastName || otherUser?.last_name}
                            </h4>
                            <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                              {formatMessageDate(conv.last_message_at)}
                            </span>
                          </div>

                          <p className="text-sm text-muted-foreground truncate">
                            {conv.last_message?.content ||
                              "Bắt đầu cuộc trò chuyện"}
                          </p>
                        </div>

                        {conv.unread_count && conv.unread_count > 0 && (
                          <Badge className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                            {conv.unread_count}
                          </Badge>
                        )}
                      </a>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground" />
                <h2 className="mt-4 text-xl font-medium">Không có tin nhắn</h2>
                <p className="mt-2 text-muted-foreground max-w-md mx-auto">
                  {user?.role === "student"
                    ? "Bạn chưa có cuộc trò chuyện với giáo viên nào. Hãy tìm kiếm giáo viên phù hợp để bắt đầu."
                    : "Bạn chưa nhận được tin nhắn từ học viên. Hoàn thiện hồ sơ và tạo thông báo dạy để học viên liên hệ."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Nội dung tin nhắn */}
      <div className="lg:col-span-2">
        {conversationId && conversationLoading ? (
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-muted animate-pulse"></div>
                <div className="ml-3">
                  <div className="h-5 w-40 bg-muted animate-pulse rounded"></div>
                  <div className="h-4 w-24 bg-muted animate-pulse rounded mt-2"></div>
                </div>
              </div>
            </CardHeader>
            <CardContent
              className="flex-1 overflow-y-auto p-4 space-y-4"
              style={{ maxHeight: "calc(70vh - 140px)" }}
            >
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="h-8 w-8 rounded-full bg-muted mr-2"></div>
                  <div className="space-y-2">
                    <div className="h-16 w-64 bg-muted rounded-lg animate-pulse"></div>
                  </div>
                </div>

                <div className="flex items-start justify-end">
                  <div className="space-y-2">
                    <div className="h-12 w-48 bg-primary/30 rounded-lg animate-pulse"></div>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-muted ml-2"></div>
                </div>

                <div className="flex items-start">
                  <div className="h-8 w-8 rounded-full bg-muted mr-2"></div>
                  <div className="space-y-2">
                    <div className="h-10 w-52 bg-muted rounded-lg animate-pulse"></div>
                  </div>
                </div>

                <div className="flex items-start justify-end">
                  <div className="space-y-2">
                    <div className="h-20 w-72 bg-primary/30 rounded-lg animate-pulse"></div>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-muted ml-2"></div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="p-4 border-t">
              <div className="flex w-full gap-2">
                <div className="h-10 flex-1 bg-muted animate-pulse rounded"></div>
                <div className="h-10 w-20 bg-muted animate-pulse rounded"></div>
              </div>
            </CardFooter>
          </Card>
        ) : conversationId && conversation ? (
          <Card className="h-full flex flex-col">
            {" "}
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center">
                <button
                  className="mr-2 lg:hidden"
                  onClick={() => {
                    navigate("/dashboard/messages");
                    setConversationId(null);
                  }}
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>

                <Avatar className="h-10 w-10 ring-2 ring-primary/20 ring-offset-2">
                  <AvatarImage
                    src={getOtherUser(conversation)?.avatar}
                    alt={
                      getOtherUser(conversation)?.firstName ||
                      getOtherUser(conversation)?.first_name ||
                      "User"
                    }
                  />
                  <AvatarFallback className="bg-primary/10 text-primary font-medium">
                    {(getOtherUser(conversation)?.firstName?.[0] ||
                      getOtherUser(conversation)?.first_name?.[0] ||
                      "") +
                      (getOtherUser(conversation)?.lastName?.[0] ||
                        getOtherUser(conversation)?.last_name?.[0] ||
                        "")}
                  </AvatarFallback>
                </Avatar>

                <div className="ml-3">
                  <CardTitle className="text-base font-medium">
                    {getOtherUser(conversation)?.firstName ||
                      getOtherUser(conversation)?.first_name}{" "}
                    {getOtherUser(conversation)?.lastName ||
                      getOtherUser(conversation)?.last_name}
                  </CardTitle>
                  <div className="flex items-center">
                    <p className="text-xs text-muted-foreground mr-2">
                      {getOtherUser(conversation)?.email || ""}
                    </p>
                    <Badge variant="outline" className="text-xs px-1 py-0 h-5">
                      {user?.role === "tutor" ? "Học viên" : "Giáo viên"}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent
              className="flex-1 overflow-y-auto p-4 space-y-4"
              style={{ maxHeight: "calc(70vh - 140px)" }}
            >
              <MessageList
                groupedMessages={groupedMessages}
                user={user}
                conversation={conversation}
                formatDate={formatDate}
              />
              <div ref={messagesEndRef} />
            </CardContent>
            <CardFooter className="p-4 border-t">
              <MessageInput
                conversationId={conversationId || ""}
                onMessageSent={() => {
                  // Scroll to bottom after sending
                  setTimeout(() => {
                    if (messagesEndRef.current) {
                      messagesEndRef.current.scrollIntoView({
                        behavior: "smooth",
                      });
                    }
                    // Invalidate queries to refresh conversation list
                    queryClient.invalidateQueries({
                      queryKey: [`/api/v1/conversations`],
                    });
                  }, 100);
                }}
                placeholder="Nhập tin nhắn..."
              />
            </CardFooter>
          </Card>
        ) : (
          <div className="h-full flex items-center justify-center bg-muted/30 rounded-lg p-6">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-medium mb-2">
                Chọn một cuộc trò chuyện
              </h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Chọn một cuộc trò chuyện từ danh sách bên trái để xem tin nhắn
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Kiểm tra nếu user không tồn tại
  if (!user) {
    return null; // Sẽ được redirect trong useEffect
  }

  // Render với layout tương ứng
  return user.role === "tutor" ? (
    <TutorDashboardLayout activePage="messages">
      {renderContent()}
    </TutorDashboardLayout>
  ) : (
    <DashboardLayout activePage="messages">{renderContent()}</DashboardLayout>
  );
}
