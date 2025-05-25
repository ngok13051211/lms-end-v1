import React, { useEffect } from "react";

// Declare global CozeWebSDK type
declare global {
  interface Window {
    CozeWebSDK: {
      WebChatClient: new (options: {
        config: {
          bot_id: string;
        };
        componentProps: {
          title: string;
          avatar: string;
        };
        auth: {
          type: string;
          token: string;
          onRefreshToken: () => string;
        };
      }) => void;
    };
  }
}

const CozeBot: React.FC = () => {
  // Lấy token trực tiếp - thay thế bằng token thực của bạn
  const COZE_TOKEN =
    "pat_N1qRYaN2qSTudXSh2H4WtUQeleqSpTPZpmChr0Q80rQ9B6ohnaVGd41bbzDqU6oG";

  useEffect(() => {
    // Load Coze SDK script
    const script = document.createElement("script");
    script.src =
      "https://sf-cdn.coze.com/obj/unpkg-va/flow-platform/chat-app-sdk/1.2.0-beta.6/libs/oversea/index.js";
    script.async = true;

    script.onload = () => {
      // Initialize Coze chatbot after script loads
      if (window.CozeWebSDK) {
        new window.CozeWebSDK.WebChatClient({
          config: {
            bot_id: "7507946803204636679",
          },
          componentProps: {
            title: "HomiTutor",
            avatar:
              "https://res.cloudinary.com/homitutor/image/upload/v1748102366/homitutor/avatars/uwu9wg6n10v5gcuueycc.png",
          },
          auth: {
            type: "token",
            token: COZE_TOKEN,
            onRefreshToken: function () {
              return COZE_TOKEN;
            },
          },
        });
      }
    };

    document.head.appendChild(script);

    // Cleanup script when component unmounts
    return () => {
      const existingScript = document.querySelector(
        `script[src="${script.src}"]`
      );
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
    };
  }, []);

  return null; // Component này không render gì, chỉ load chatbot
};

export default CozeBot;
