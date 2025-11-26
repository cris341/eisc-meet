import React, { useEffect, useState } from "react";
import { socket } from "../../../sockets/socketManager";

type ChatMessage = {
  userId: string;
  message: string;
  timestamp: string;
};

interface ChatProps {
  username: string;
}

const Chat: React.FC<ChatProps> = ({ username }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageDraft, setMessageDraft] = useState("");

  useEffect(() => {
    socket.emit("newUser", username);
  }, [username]);

  useEffect(() => {
    const handleIncomingMessage = (payload: ChatMessage) => {
      setMessages(prev => [...prev, payload]);
    };

    socket.on("chat:message", handleIncomingMessage);

    return () => {
      socket.off("chat:message", handleIncomingMessage);
    };
  }, []);

  const handleSendMessage = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedMessage = messageDraft.trim();

    if (!trimmedMessage) {
      return;
    }

    socket.emit("chat:message", {
      userId: username,
      message: trimmedMessage
    });

    setMessageDraft("");
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 border border-gray-200 dark:border-gray-700">
      <h2 className="text-xl font-bold text-center mb-2 bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">Chat</h2>
      <div className="flex-1 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-3 text-sm overflow-y-auto flex flex-col gap-3">
        {messages.length === 0 ? (
          <p className="text-center text-gray-400 my-auto">
            Bienvenido, {username}.<br/>Aquí verás los mensajes...
          </p>
        ) : (
          messages.map((msg, index) => {
            const isOwn = msg.userId === username;
            const time = new Date(msg.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit"
            });

            return (
              <div
                key={`${msg.timestamp}-${index}`}
                className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    isOwn
                      ? "bg-purple-600 text-white text-right"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  }`}
                >
                  <div className="text-xs opacity-70 mb-1 font-semibold">
                    {isOwn ? "Tú" : msg.userId} <span className="font-normal opacity-50">· {time}</span>
                  </div>
                  <div className="whitespace-pre-wrap wrap-break-word">
                    {msg.message}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form
        onSubmit={handleSendMessage}
        className="flex flex-col gap-2 w-full"
      >
        <input
          className="w-full rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
          placeholder="Escribe tu mensaje..."
          value={messageDraft}
          onChange={event => setMessageDraft(event.target.value)}
        />
        <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded transition-colors">Enviar</button>
      </form>
    </div>
  );
};

export default Chat;