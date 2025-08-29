import React from 'react';

const OpenRouterLogo: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className}>
        <defs>
            <linearGradient id="openrouterGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#00d4ff', stopOpacity: 1 }} />
                <stop offset="50%" style={{ stopColor: '#5b21b6', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: '#1e40af', stopOpacity: 1 }} />
            </linearGradient>
        </defs>
        {/* OpenRouter-inspired design with routing/network theme */}
        <g fill="url(#openrouterGradient)">
            {/* Central hub */}
            <circle cx="12" cy="12" r="3" fill="url(#openrouterGradient)" opacity="0.9"/>
            
            {/* Connection nodes */}
            <circle cx="4" cy="4" r="1.5" fill="url(#openrouterGradient)"/>
            <circle cx="20" cy="4" r="1.5" fill="url(#openrouterGradient)"/>
            <circle cx="4" cy="20" r="1.5" fill="url(#openrouterGradient)"/>
            <circle cx="20" cy="20" r="1.5" fill="url(#openrouterGradient)"/>
            
            {/* Connecting lines */}
            <path d="M5.5 5.5L9 9" stroke="url(#openrouterGradient)" strokeWidth="2" fill="none" opacity="0.7"/>
            <path d="M18.5 5.5L15 9" stroke="url(#openrouterGradient)" strokeWidth="2" fill="none" opacity="0.7"/>
            <path d="M5.5 18.5L9 15" stroke="url(#openrouterGradient)" strokeWidth="2" fill="none" opacity="0.7"/>
            <path d="M18.5 18.5L15 15" stroke="url(#openrouterGradient)" strokeWidth="2" fill="none" opacity="0.7"/>
            
            {/* Data flow indicators */}
            <circle cx="7" cy="12" r="0.8" fill="white" opacity="0.8"/>
            <circle cx="17" cy="12" r="0.8" fill="white" opacity="0.8"/>
            <circle cx="12" cy="7" r="0.8" fill="white" opacity="0.8"/>
            <circle cx="12" cy="17" r="0.8" fill="white" opacity="0.8"/>
        </g>
    </svg>
);

export default OpenRouterLogo;