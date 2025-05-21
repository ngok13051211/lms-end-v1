import React from "react";
import { MessageGroup } from "./MessageGroup";

/**
 * Renders a list of message groups in a conversation with date headers
 */
export const MessageList = ({
    groupedMessages,
    user,
    conversation,
    formatDate
}: {
    groupedMessages: any[];
    user: any;
    conversation: any;
    formatDate: (date: string) => string;
}) => {
    if (!groupedMessages || groupedMessages.length === 0) {
        return (
            <div className="text-center py-12 bg-muted/10 rounded-xl border border-dashed border-muted p-6 animate-fadeIn">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-muted-foreground mb-4" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <h2 className="text-xl font-medium mb-2">
                    Không có tin nhắn nào
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                    Bắt đầu cuộc trò chuyện bằng cách gửi tin nhắn đầu tiên bên dưới
                </p>
            </div>
        );
    }

    // Function to format date for headers
    const formatDateHeader = (dateString: string) => {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        // Compare year, month, and day
        if (
            date.getFullYear() === today.getFullYear() &&
            date.getMonth() === today.getMonth() &&
            date.getDate() === today.getDate()
        ) {
            return "Hôm nay";
        } else if (
            date.getFullYear() === yesterday.getFullYear() &&
            date.getMonth() === yesterday.getMonth() &&
            date.getDate() === yesterday.getDate()
        ) {
            return "Hôm qua";
        } else {
            return date.toLocaleDateString("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
            });
        }
    };

    // Group messages by date for display
    const messagesByDate = groupedMessages.reduce((acc, group) => {
        // Use the first message's date in each group
        if (group.messages && group.messages.length > 0) {
            const dateString = group.messages[0].created_at;
            const dateKey = new Date(dateString).toDateString();

            if (!acc[dateKey]) {
                acc[dateKey] = {
                    dateDisplay: formatDateHeader(dateString),
                    groups: []
                };
            }
            acc[dateKey].groups.push(group);
        }
        return acc;
    }, {});

    return (
        <>
            {Object.entries(messagesByDate).map(([dateKey, { dateDisplay, groups }]: [string, any]) => (
                <React.Fragment key={dateKey}>
                    <div className="flex justify-center my-4">
                        <div className="px-3 py-1 bg-muted rounded-full text-xs text-muted-foreground">
                            {dateDisplay}
                        </div>
                    </div>

                    {groups.map((group, groupIndex) => {
                        const isCurrentUser = group.sender_id === user?.id;
                        const otherUser = isCurrentUser ? null : (user?.role === "student" ? conversation.tutor : conversation.student);

                        return (
                            <MessageGroup
                                key={groupIndex}
                                group={group}
                                isCurrentUser={isCurrentUser}
                                otherUser={otherUser}
                                user={user}
                                formatDate={formatDate}
                            />
                        );
                    })}
                </React.Fragment>
            ))}
        </>
    );
};
