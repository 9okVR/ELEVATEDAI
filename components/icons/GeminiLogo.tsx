import React from 'react';

interface GeminiLogoProps {
  className?: string;
  animated?: boolean;
}

const GeminiLogo: React.FC<GeminiLogoProps> = ({ 
  className = "w-6 h-6", 
  animated = false 
}) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 32 32" 
    className={`${className} ${animated ? 'animate-pulse' : ''}`}
    style={{ filter: 'drop-shadow(0 2px 8px rgba(139, 92, 246, 0.3))' }}
  >
    <defs>
      {/* Main gradient for the core */}
      <linearGradient id="modernGeminiCore" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8B5CF6" stopOpacity="1" />
        <stop offset="30%" stopColor="#7C3AED" stopOpacity="1" />
        <stop offset="70%" stopColor="#6366F1" stopOpacity="1" />
        <stop offset="100%" stopColor="#4F46E5" stopOpacity="1" />
      </linearGradient>
      
      {/* Secondary gradient for circuits */}
      <linearGradient id="circuitGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#A78BFA" stopOpacity="0.8" />
        <stop offset="50%" stopColor="#8B5CF6" stopOpacity="0.6" />
        <stop offset="100%" stopColor="#6366F1" stopOpacity="0.4" />
      </linearGradient>
      
      {/* Glow effect */}
      <filter id="glow">
        <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
        <feMerge> 
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/> 
        </feMerge>
      </filter>
      
      {/* Inner glow for glassmorphism */}
      <filter id="innerGlow">
        <feGaussianBlur stdDeviation="0.5" result="blur"/>
        <feOffset in="blur" dx="0" dy="0" result="offset"/>
        <feFlood floodColor="#FFFFFF" floodOpacity="0.3"/>
        <feComposite in2="offset" operator="in"/>
        <feMerge> 
          <feMergeNode/>
          <feMergeNode in="SourceGraphic"/> 
        </feMerge>
      </filter>
    </defs>
    
    {/* Outer ring with circuit patterns */}
    <g opacity="0.7">
      {/* Circuit connection lines */}
      <path 
        d="M16 4 L16 8 M28 16 L24 16 M16 28 L16 24 M4 16 L8 16" 
        stroke="url(#circuitGradient)" 
        strokeWidth="1.5" 
        strokeLinecap="round"
        fill="none"
      />
      
      {/* Corner nodes */}
      <circle cx="16" cy="4" r="2" fill="url(#circuitGradient)" opacity="0.8" />
      <circle cx="28" cy="16" r="2" fill="url(#circuitGradient)" opacity="0.8" />
      <circle cx="16" cy="28" r="2" fill="url(#circuitGradient)" opacity="0.8" />
      <circle cx="4" cy="16" r="2" fill="url(#circuitGradient)" opacity="0.8" />
      
      {/* Diagonal circuit traces */}
      <path 
        d="M22 10 L20 12 M22 22 L20 20 M10 22 L12 20 M10 10 L12 12" 
        stroke="url(#circuitGradient)" 
        strokeWidth="1" 
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />
    </g>
    
    {/* Main hexagonal core */}
    <g filter="url(#glow)">
      <path 
        d="M16 6 L22 10 L22 18 L16 22 L10 18 L10 10 Z" 
        fill="url(#modernGeminiCore)"
        stroke="rgba(255, 255, 255, 0.3)"
        strokeWidth="0.5"
        filter="url(#innerGlow)"
      />
      
      {/* Inner hexagon for depth */}
      <path 
        d="M16 9 L20 11.5 L20 16.5 L16 19 L12 16.5 L12 11.5 Z" 
        fill="rgba(255, 255, 255, 0.1)"
        stroke="rgba(255, 255, 255, 0.4)"
        strokeWidth="0.5"
      />
    </g>
    
    {/* Central energy core */}
    <g>
      <circle 
        cx="16" 
        cy="14" 
        r="2.5" 
        fill="rgba(255, 255, 255, 0.9)"
        filter="url(#glow)"
      />
      <circle 
        cx="16" 
        cy="14" 
        r="1.5" 
        fill="url(#modernGeminiCore)"
        opacity="0.8"
      />
      <circle 
        cx="16" 
        cy="14" 
        r="0.8" 
        fill="rgba(255, 255, 255, 0.95)"
      />
    </g>
    
    {/* Data flow particles (animated) */}
    {animated && (
      <g className="animate-spin" style={{ transformOrigin: '16px 16px', animationDuration: '8s' }}>
        <circle cx="24" cy="16" r="1" fill="#A78BFA" opacity="0.7">
          <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="8" cy="16" r="1" fill="#8B5CF6" opacity="0.7">
          <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="16" cy="8" r="1" fill="#6366F1" opacity="0.7">
          <animate attributeName="opacity" values="0.7;1;0.7" dur="2.5s" repeatCount="indefinite" />
        </circle>
        <circle cx="16" cy="24" r="1" fill="#4F46E5" opacity="0.7">
          <animate attributeName="opacity" values="1;0.5;1" dur="2.5s" repeatCount="indefinite" />
        </circle>
      </g>
    )}
    
    {/* Subtle highlight for 3D effect */}
    <path 
      d="M16 6 L22 10 L20 9 L16 7 L12 9 L10 10 Z" 
      fill="rgba(255, 255, 255, 0.2)"
      opacity="0.6"
    />
  </svg>
);

export default GeminiLogo;