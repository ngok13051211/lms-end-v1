import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { apiRequest } from "@/lib/queryClient";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, MessageSquare, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { useMessageGrouping } from "@/hooks/use-message-grouping";
import { MessageList } from "@/components/messages/MessageList";
import { MessageInput } from "@/components/messages/MessageInput";

// Định nghĩa cấu trúc dữ liệu
interface ConversationUser {
    id: number;
    first_name?: string;
    last_name?: string;
    avatar?: string;
    email?: string;
    role?: string;
}

interface ConversationMessage {
    id: number;
    sender_id: number;
    content: string;
    created_at: string;
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

export default function MessagesPage() {
    const { user } = useSelector((state: RootState) => state.auth);
    const [, navigate] = useLocation();
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Chuyển hướng người dùng chưa đăng nhập
    useEffect(() => {
        if (!user) {
            navigate("/login");
        }
    }, [user, navigate]);    // Get all conversations
    const { data: conversations, isLoading: conversationsLoading } = useQuery<
        Conversation[]
    >({
        queryKey: [`/api/v1/conversations`],
        enabled: !!user,
        refetchInterval: 30000, // Refresh mỗi 30 giây
    });
    // Polling được xử lý bởi refetchInterval trong useQuery

    // Get specific conversation details when selected
    const { data: selectedConversation, isLoading: conversationLoading } = useQuery<Conversation>({
        queryKey: [`/api/v1/conversations/${selectedConversationId}`],
        enabled: !!selectedConversationId && !!user,
        refetchInterval: 15000, // Auto-refresh every 15 seconds to get new messages
    });

    // Group messages by sender for a better chat UI
    const groupedMessages = useMessageGrouping(selectedConversation?.messages || []);

    // Scroll to bottom when messages change
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [selectedConversation?.messages]);

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

        if (user?.role === "student") {
            return conversation.tutor;
        } else {
            return conversation.student;
        }
    };

    // Format date to display in message details
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

    // Tạo đường dẫn dashboard dựa vào vai trò người dùng
    const getDashboardPath = () => {
        if (user?.role === "student") {
            return "/dashboard/student";
        } else if (user?.role === "tutor") {
            return "/dashboard/tutor";
        } else if (user?.role === "admin") {
            return "/dashboard/admin";
        }
        return "/";
    };

    // Truncate message content if too long
    const truncateMessage = (content?: string, maxLength = 50) => {
        if (!content) return "";
        return content.length > maxLength
            ? content.substring(0, maxLength) + "..."
            : content;
    };

    if (!user) {
        return null; // Sẽ chuyển hướng trong useEffect
    } return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Tin nhắn</h1>
                    <p className="text-gray-500 mt-1">
                        Xem tất cả các cuộc trò chuyện của bạn
                    </p>
                </div>
                <Link href={getDashboardPath()} className="text-primary hover:underline flex items-center">
                    <span>Quay lại Dashboard</span>
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Danh sách hội thoại */}
                <div className="md:col-span-1">
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle>Hội thoại của bạn</CardTitle>
                            <CardDescription>
                                {user.role === "student"
                                    ? "Tin nhắn với các giáo viên"
                                    : "Tin nhắn với học sinh của bạn"}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {conversationsLoading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            ) : conversations && conversations.length > 0 ? (
                                <div className="space-y-2">
                                    {conversations.map((conv) => {
                                        const otherUser = getOtherUser(conv);
                                        const dashboardPrefix =
                                            user?.role === "student"
                                                ? "/dashboard/student/messages"
                                                : "/dashboard/tutor/messages";
                                        return (
                                            <div
                                                key={conv.id}
                                                onClick={() => setSelectedConversationId(String(conv.id))}
                                                className={`flex items-center p-4 border rounded-lg transition-colors cursor-pointer hover:border-primary hover:bg-accent ${selectedConversationId === String(conv.id)
                                                        ? "border-primary bg-accent/20"
                                                        : ""
                                                    }`}
                                            >
                                                <Avatar className="h-12 w-12 mr-4">
                                                    <AvatarImage src={otherUser?.avatar || undefined} />
                                                    <AvatarFallback className="bg-primary-light text-primary">
                                                        {otherUser?.first_name?.[0]}
                                                        {otherUser?.last_name?.[0]}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="font-medium truncate">
                                                            {otherUser?.first_name} {otherUser?.last_name}
                                                        </h4>
                                                        <span className="text-xs text-gray-500">
                                                            {formatMessageDate(conv.last_message_at)}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-600 truncate">
                                                        {truncateMessage(conv.last_message?.content)}
                                                    </p>
                                                </div>
                                                {conv.unread_count && conv.unread_count > 0 ? (
                                                    <Badge className="ml-2">{conv.unread_count}</Badge>
                                                ) : null}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                                    <h3 className="text-lg font-medium mb-2">Chưa có tin nhắn</h3>
                                    <p className="text-muted-foreground">
                                        {user.role === "student"
                                            ? "Bạn chưa có cuộc trò chuyện nào với giáo viên."
                                            : "Bạn chưa có cuộc trò chuyện nào với học sinh."}
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Chi tiết hội thoại */}
                <div className="md:col-span-2">
                    {selectedConversationId ? (
                        <Card className="h-full flex flex-col">
                            {/* Tiêu đề hội thoại */}
                            <CardHeader className="border-b pb-3">
                                {conversationLoading ? (
                                    <div className="flex items-center">
                                        <div className="h-10 w-10 rounded-full bg-muted animate-pulse"></div>
                                        <div className="ml-3">
                                            <div className="h-5 w-40 bg-muted animate-pulse rounded"></div>
                                            <div className="h-4 w-24 bg-muted animate-pulse rounded mt-2"></div>
                                        </div>
                                    </div>
                                ) : selectedConversation && (
                                    <div className="flex items-center">
                                        <Avatar className="h-10 w-10 ring-2 ring-primary/20 ring-offset-2">
                                            <AvatarImage
                                                src={getOtherUser(selectedConversation)?.avatar || undefined}
                                                alt={getOtherUser(selectedConversation)?.first_name || "User"}
                                            />
                                            <AvatarFallback className="bg-primary/10 text-primary font-medium">
                                                {getOtherUser(selectedConversation)?.first_name?.[0]}
                                                {getOtherUser(selectedConversation)?.last_name?.[0]}
                                            </AvatarFallback>
                                        </Avatar>

                                        <div className="ml-3">
                                            <CardTitle className="text-base font-medium">
                                                {getOtherUser(selectedConversation)?.first_name} {getOtherUser(selectedConversation)?.last_name}
                                            </CardTitle>
                                            <div className="flex items-center">
                                                <p className="text-xs text-muted-foreground mr-2">
                                                    {getOtherUser(selectedConversation)?.email || ""}
                                                </p>
                                                <Badge variant="outline" className="text-xs px-1 py-0 h-5">
                                                    {user.role === "student" ? "Giáo viên" : "Học viên"}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardHeader>

                            {/* Nội dung tin nhắn */}
                            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4" style={{ maxHeight: "calc(70vh - 200px)" }}>
                                {conversationLoading ? (
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
                                    </div>
                                ) : selectedConversation && (
                                    <>
                                        <MessageList
                                            groupedMessages={groupedMessages}
                                            user={user}
                                            conversation={selectedConversation}
                                            formatDate={formatDate}
                                        />
                                        <div ref={messagesEndRef} />
                                    </>
                                )}
                            </CardContent>

                            {/* Ô nhập tin nhắn */}
                            <CardFooter className="p-4 border-t">
                                {selectedConversation && (
                                    <MessageInput
                                        conversationId={selectedConversationId}
                                        onMessageSent={() => {
                                            setTimeout(() => {
                                                if (messagesEndRef.current) {
                                                    messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
                                                }
                                            }, 100);
                                        }}
                                        placeholder="Nhập tin nhắn..."
                                    />
                                )}
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
        </div>
    );
}
