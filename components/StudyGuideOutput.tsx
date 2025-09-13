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
    <div className="mt-4 flex-shrink-0 sticky bottom-0 z-10 bg-[#0D0B14]/80 backdrop-blur-md pt-2">
      <div className="flex items-end gap-2 bg-white/5 p-2 rounded-2xl border border-white/10 focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-500/40 transition-all shadow-lg">
        <textarea
          ref={textareaRef}
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Ask a question about your document..."
          disabled={isLoading}
          className="w-full bg-transparent text-gray-200 p-2 focus:outline-none resize-none max-h-40 placeholder:text-white/40"
          rows={1}
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !userInput.trim()}
          className="p-2.5 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white disabled:bg-gray-700/60 disabled:cursor-not-allowed hover:opacity-90 transition-all focus:outline-none focus:ring-2 focus:ring-purple-400/60 shadow-md"
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
  // Track previous message length to animate only newly appended assistant messages
  const prevLenRef = useRef<number>(messages.length);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages, isLoading]);
  useEffect(() => {
    // After render, update previous length for next diff
    prevLenRef.current = messages.length;
  }, [messages.length]);

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex-grow overflow-y-auto pr-2 flex flex-col gap-4 custom-scrollbar">
        {messages.map((message, index) => {
          const shouldAnimate = index >= prevLenRef.current && message.role !== 'user';
          return (
          <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-xl lg:max-w-2xl px-5 py-3 rounded-2xl shadow-md border ${
                message.role === 'user'
                  ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-br-none border-transparent'
                  : 'bg-white/6 backdrop-blur-sm text-gray-200 rounded-bl-none border-white/10'
              } ${shouldAnimate ? 'animate-chat-fade' : ''}`}
            >
              <MarkdownRenderer content={message.text} />
              {message.sources && message.sources.length > 0 && <WebSources sources={message.sources} />}
            </div>
          </div>
        );})}

        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-xl lg:max-w-2xl rounded-2xl p-0.5 bg-gradient-to-r from-purple-600/40 to-indigo-600/40">
              <div className="px-4 py-3 rounded-2xl bg-black/40 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 shadow-inner" />
                  <span className="text-white/80 text-sm">AI is thinking</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="typing-dot" />
                  <span className="typing-dot" style={{ animationDelay: '0.12s' }} />
                  <span className="typing-dot" style={{ animationDelay: '0.24s' }} />
                </div>
                <div className="mt-3 space-y-2">
                  <div className="h-3 skeleton w-3/4"></div>
                  <div className="h-3 skeleton w-5/6"></div>
                  <div className="h-3 skeleton w-2/3"></div>
                </div>
              </div>
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
