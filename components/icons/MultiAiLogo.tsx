
import React from 'react';

const MultiAiLogo: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className}>
        <defs>
            <linearGradient id="multiAiGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#60a5fa', stopOpacity: 1 }} />
            <stop offset="50%" style={{ stopColor: '#a78bfa', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#4ade80', stopOpacity: 1 }} />
            </linearGradient>
        </defs>
        <path fill="url(#multiAiGradient)" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
);

export default MultiAiLogo;
