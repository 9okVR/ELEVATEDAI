import React from 'react';

const QwenLogo: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className}>
        <defs>
            <linearGradient id="qwenGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#f97316', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: '#ea580c', stopOpacity: 1 }} />
            </linearGradient>
        </defs>
        <path stroke="url(#qwenGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        <circle cx="12" cy="12" r="2" fill="url(#qwenGradient)"/>
    </svg>
);

export default QwenLogo;