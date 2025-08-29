import React, { useState, useRef, useEffect } from 'react';
import SendIcon from './icons/SendIcon';
import GlobeIcon from './icons/GlobeIcon';
import MarkdownRenderer from './MarkdownRenderer';
import WebSources from './WebSources';
import type { Message } from '../types';

interface StudyGuideOutputProps {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  isChatActive: boolean;
  onSendMessage: (message: string) => void;
}

const ChatInput: React.FC<{ onSendMessage: (message: string) => void; isLoading: boolean; }> = ({ onSendMessage, isLoading }) => {
  const [userInput, setUserInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (userInput.trim() && !isLoading) {
      onSendMessage(userInput.trim());
      setUserInput('');
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = `${scrollHeight}px`;
    }
  }, [userInput]);

  return (
    <div className="mt-4 flex-shrink-0">
      <div className="flex items-end gap-2 bg-black/20 p-2 rounded-xl border border-white/10 focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-500/50 transition-all">
        <textarea
          ref={textareaRef}
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Ask a question about your document..."
          disabled={isLoading}
          className="w-full bg-transparent text-gray-200 p-2 focus:outline-none resize-none max-h-40"
          rows={1}
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !userInput.trim()}
          className="p-2 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 text-white disabled:bg-gray-600 disabled:cursor-not-allowed hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-purple-400"
          aria-label="Send message"
        >
          <SendIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

const StudyGuideOutput: React.FC<StudyGuideOutputProps> = ({ messages, isLoading, error, isChatActive, onSendMessage }) => {
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages, isLoading]);

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex-grow overflow-y-auto pr-2 flex flex-col gap-4">
        {messages.map((message, index) => (
            <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xl lg:max-w-2xl px-5 py-3 rounded-2xl shadow-md ${message.role === 'user' ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-br-none' : 'bg-gray-800/80 text-gray-200 rounded-bl-none'}`}>
                   <MarkdownRenderer content={message.text} />
                   {message.sources && message.sources.length > 0 && (
                       <WebSources sources={message.sources} />
                   )}
                </div>
            </div>
        ))}
         {isLoading && messages.length > 0 && (
            <div className="justify-start">
                <div className="max-w-xl lg:max-w-2xl px-4 py-3 rounded-2xl bg-gray-800/80 text-gray-200 rounded-bl-none inline-flex items-center">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse ml-2" style={{animationDelay: '0.2s'}}></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse ml-2" style={{animationDelay: '0.4s'}}></div>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

       {error && (
          <div className="flex items-center justify-center mt-4">
            <div className="text-center bg-red-500/20 p-4 rounded-lg border border-red-500/30">
              <p className="text-red-400 font-semibold">An Error Occurred</p>
              <p className="text-red-300 mt-1">{error}</p>
            </div>
          </div>
        )}

      {isChatActive && <ChatInput onSendMessage={onSendMessage} isLoading={isLoading} />}
    </div>
  );
};

export default StudyGuideOutput;