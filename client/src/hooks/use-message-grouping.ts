import { useState, useEffect } from "react";

/**
 * Custom hook to group messages by sender
 * Groups consecutive messages from the same sender together with a timestamp only on the last message
 */
export function useMessageGrouping(messages: any[] = []) {
    const [groupedMessages, setGroupedMessages] = useState<any[]>([]);

    useEffect(() => {
        if (!messages || !messages.length) {
            setGroupedMessages([]);
            return;
        }

        const result = [];
        let currentGroup = {
            sender_id: messages[0].sender_id,
            messages: [messages[0]],
            created_at: messages[0].created_at
        };

        // Start from the second message
        for (let i = 1; i < messages.length; i++) {
            const message = messages[i];

            // If same sender and within 5 minutes of previous message, group together
            if (
                message.sender_id === currentGroup.sender_id &&
                new Date(message.created_at).getTime() - new Date(currentGroup.messages[currentGroup.messages.length - 1].created_at).getTime() < 5 * 60 * 1000
            ) {
                // Add to current group
                currentGroup.messages.push(message);
                currentGroup.created_at = message.created_at; // Update timestamp to latest
            } else {
                // Finish current group and start new one
                result.push(currentGroup);
                currentGroup = {
                    sender_id: message.sender_id,
                    messages: [message],
                    created_at: message.created_at
                };
            }
        }

        // Add the last group
        result.push(currentGroup);
        setGroupedMessages(result);
    }, [messages]);

    return groupedMessages;
}
