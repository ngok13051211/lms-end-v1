import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";

/**
 * Component for rendering a group of messages from the same sender
 */
export const MessageGroup = ({
    group,
    isCurrentUser,
    otherUser,
    user,
    formatDate
}: {
    group: any;
    isCurrentUser: boolean;
    otherUser: any;
    user: any;
    formatDate: (date: string) => string;
}) => {
    return (
        <div className="mb-4">
            <div className={`flex ${isCurrentUser ? "justify-end" : "justify-start"} items-start mb-1`}>
                {!isCurrentUser && (
                    <Avatar className="h-8 w-8 mr-2 mt-1 flex-shrink-0">
                        <AvatarImage
                            src={otherUser?.avatar || undefined}
                            alt={`${otherUser?.first_name || otherUser?.firstName || ""}`}
                        />
                        <AvatarFallback>
                            {(otherUser?.first_name?.[0] || otherUser?.firstName?.[0] || "") +
                                (otherUser?.last_name?.[0] || otherUser?.lastName?.[0] || "")}
                        </AvatarFallback>
                    </Avatar>
                )}

                <div className="flex flex-col space-y-1 max-w-[75%]">
                    {group.messages.map((msg: any, msgIndex: number) => {
                        const isFirstMessage = msgIndex === 0;
                        const isLastMessage = msgIndex === group.messages.length - 1;

                        // Style message bubbles differently based on position in group
                        let bubbleStyle = "";
                        if (group.messages.length === 1) {
                            bubbleStyle = isCurrentUser
                                ? "rounded-t-lg rounded-l-lg"
                                : "rounded-t-lg rounded-r-lg";
                        } else if (isFirstMessage) {
                            bubbleStyle = isCurrentUser
                                ? "rounded-t-lg rounded-l-lg rounded-br-sm"
                                : "rounded-t-lg rounded-r-lg rounded-bl-sm";
                        } else if (isLastMessage) {
                            bubbleStyle = isCurrentUser
                                ? "rounded-b-lg rounded-l-lg rounded-tr-sm"
                                : "rounded-b-lg rounded-r-lg rounded-tl-sm";
                        } else {
                            bubbleStyle = isCurrentUser
                                ? "rounded-l-lg rounded-tr-sm rounded-br-sm"
                                : "rounded-r-lg rounded-tl-sm rounded-bl-sm";
                        }
                        return (
                            <div
                                key={msg.id}
                                className={`group ${isCurrentUser ? "self-end" : "self-start"}`}
                            >
                                <div
                                    className={`${isCurrentUser
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-muted border border-gray-200"
                                        } p-3 shadow-sm ${bubbleStyle} transition-all duration-200 hover:shadow-md`}
                                >
                                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>

                                    {msg.attachment_url && (
                                        <div className="mt-2">
                                            <a
                                                href={msg.attachment_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={`inline-flex items-center gap-1 text-xs ${isCurrentUser
                                                        ? "text-primary-foreground/90 hover:text-primary-foreground"
                                                        : "text-blue-600 hover:text-blue-800"
                                                    }`}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                                                </svg>
                                                File đính kèm
                                            </a>
                                        </div>
                                    )}

                                    {/* Only show timestamp on the last message in a group */}
                                    {isLastMessage && (<div className="flex items-center justify-between mt-1">
                                        <p
                                            className={`text-xs ${isCurrentUser
                                                    ? "text-primary-foreground/80"
                                                    : "text-muted-foreground"
                                                } opacity-50 group-hover:opacity-100 transition-opacity`}
                                        >
                                            {formatDate(msg.created_at)}
                                        </p>

                                        {isCurrentUser && isLastMessage && (
                                            <span
                                                className={`text-xs ml-2 ${msg.read
                                                        ? "text-primary-foreground/80"
                                                        : "text-primary-foreground/50"
                                                    } opacity-50 group-hover:opacity-100 transition-opacity flex items-center`}
                                            >                          {msg.read ? (
                                                <>
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    <span className="text-opacity-80">Đã xem</span>
                                                </>
                                            ) : (
                                                <>
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                                                    </svg>
                                                    <span className="text-opacity-60">Đã gửi</span>
                                                </>
                                            )}
                                            </span>
                                        )}
                                    </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {isCurrentUser && (
                    <Avatar className="h-8 w-8 ml-2 mt-1 flex-shrink-0">
                        <AvatarImage
                            src={user?.avatar || undefined}
                            alt="Your avatar"
                        />
                        <AvatarFallback>
                            {(user?.first_name?.[0] || "") + (user?.last_name?.[0] || "")}
                        </AvatarFallback>
                    </Avatar>
                )}
            </div>
        </div>
    );
};
