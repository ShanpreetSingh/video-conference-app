import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Smile } from 'lucide-react';
import { ChatMessage } from '../types/mediasoup';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  onClose: () => void;
  currentUserName: string;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  onSendMessage,
  onClose,
  currentUserName,
}) => {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (newMessage.trim()) {
      onSendMessage(newMessage);
      setNewMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed right-8 top-1/2 transform -translate-y-1/2 w-80 h-96 bg-gray-900 bg-opacity-95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700 flex flex-col z-40">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h3 className="text-white font-semibold">Chat</h3>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg bg-gray-700 hover:bg-gray-600 text-white flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 text-sm mt-8">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.name === currentUserName ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-xs px-3 py-2 rounded-2xl ${
                  message.name === currentUserName
                    ? 'bg-blue-500 text-white rounded-br-sm'
                    : 'bg-gray-700 text-white rounded-bl-sm'
                }`}
              >
                {message.name !== currentUserName && (
                  <div className="text-xs text-gray-300 mb-1 font-medium">
                    {message.name}
                  </div>
                )}
                <div className="text-sm">{message.message}</div>
                <div className="text-xs opacity-70 mt-1">
                  {formatTime(message.timestamp)}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center space-x-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="w-full bg-gray-800 text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
              maxLength={500}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!newMessage.trim()}
            className="w-10 h-10 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};