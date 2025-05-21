import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

interface MessageInputProps {
  conversationId: string;
  onMessageSent?: () => void;
  placeholder?: string;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  conversationId,
  onMessageSent,
  placeholder = "Nhập tin nhắn..."
}) => {
  const [message, setMessage] = useState("");
  const { toast } = useToast();
  const { user } = useSelector((state: RootState) => state.auth);

  // Optimistic update helper function
  const addOptimisticMessage = (content: string) => {
    queryClient.setQueryData([`/api/v1/conversations/${conversationId}`], (oldData: any) => {
      if (!oldData) return oldData;

      // Create an optimistic message
      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        sender_id: user?.id,
        content,
        created_at: new Date().toISOString(),
        read: false,
        _optimistic: true // Mark as optimistic to identify later
      };

      return {
        ...oldData,
        messages: [...(oldData.messages || []), optimisticMessage]
      };
    });

    // Also update the conversations list
    queryClient.setQueryData(['/api/v1/conversations'], (oldData: any[]) => {
      if (!oldData) return oldData;

      return oldData.map(conv => {
        if (conv.id.toString() === conversationId.toString()) {
          return {
            ...conv,
            last_message: { content: message },
            last_message_at: new Date().toISOString()
          };
        }
        return conv;
      });
    });
  };

  // Send a message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest(
        "POST",
        `/api/v1/conversations/${conversationId}/messages`,
        { content }
      );
      return res.json();
    },
    onMutate: async (content) => {
      // Add optimistic message before the API call completes
      addOptimisticMessage(content);
    },
    onSuccess: () => {
      setMessage("");
      // Invalidate queries to get fresh data from server
      queryClient.invalidateQueries({
        queryKey: [`/api/v1/conversations/${conversationId}`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/v1/conversations`]
      });

      // Call the onMessageSent callback if provided
      if (onMessageSent) {
        onMessageSent();
      }
    },
    onError: (error) => {
      console.error("Error sending message:", error);
      toast({
        title: "Lỗi",
        description: "Không thể gửi tin nhắn. Vui lòng thử lại sau.",
        variant: "destructive",
      });

      // Remove the optimistic update on error
      queryClient.invalidateQueries({
        queryKey: [`/api/v1/conversations/${conversationId}`],
      });
    },
  });

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) return;

    try {
      await sendMessageMutation.mutateAsync(message);
    } catch (error) {
      console.error("Error in handleSubmit:", error);
    }
  };

  // Handle keyboard shortcuts - press Enter to send, Shift+Enter for new line
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (message.trim()) {
        handleSubmit(e);
      }
    }
  };
  return (
    <form onSubmit={handleSubmit} className="flex w-full gap-2">
      <div className="relative flex-1">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="min-h-[60px] max-h-[120px] resize-none pr-2 focus-visible:ring-1"
          disabled={sendMessageMutation.isPending}
          autoFocus
        />
        <div className="absolute bottom-1 right-2 text-xs text-gray-400">
          {message.length > 0 && (
            <span>{message.length} ký tự</span>
          )}
        </div>
      </div>
      <div className="flex flex-col justify-end">
        <Button
          type="submit"
          disabled={!message.trim() || sendMessageMutation.isPending}
          size="icon"
          className="h-10 w-10"
          title="Gửi tin nhắn (hoặc nhấn Enter)"
          aria-label="Gửi tin nhắn"
        >
          {sendMessageMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </form>
  );
};
