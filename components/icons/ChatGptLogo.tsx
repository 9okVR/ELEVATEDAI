import React from 'react';

const ChatGptLogo: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className}>
        <defs>
            <linearGradient id="chatgptGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#10b981', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: '#059669', stopOpacity: 1 }} />
            </linearGradient>
        </defs>
        <path fill="url(#chatgptGradient)" d="M12 2.5c-5.238 0-9.5 4.262-9.5 9.5 0 1.89.553 3.65 1.506 5.13L2.5 21.5l4.37-1.506A9.454 9.454 0 0012 21.5c5.238 0 9.5-4.262 9.5-9.5S17.238 2.5 12 2.5zm-2.5 6.5a1.5 1.5 0 103 0 1.5 1.5 0 00-3 0zm5 0a1.5 1.5 0 103 0 1.5 1.5 0 00-3 0zm-2.5 6c-1.5 0-2.8-.8-3.5-2h7c-.7 1.2-2 2-3.5 2z"/>
    </svg>
);

export default ChatGptLogo;