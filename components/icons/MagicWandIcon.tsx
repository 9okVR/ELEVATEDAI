import React from 'react';

interface MagicWandIconProps {
  className?: string;
  animated?: boolean;
}

const MagicWandIcon: React.FC<MagicWandIconProps> = ({ 
  className = "w-6 h-6", 
  animated = false 
}) => {
  return (
    <svg 
      className={`${className} ${animated ? 'animate-pulse' : ''}`}
      viewBox="0 0 32 32" 
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: 'drop-shadow(0 2px 8px rgba(139, 92, 246, 0.3))' }}
    >
      <defs>
        {/* Wand gradient */}
        <linearGradient id="wandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B5CF6" stopOpacity="1" />
          <stop offset="50%" stopColor="#7C3AED" stopOpacity="1" />
          <stop offset="100%" stopColor="#6366F1" stopOpacity="1" />
        </linearGradient>
        
        {/* Star gradient */}
        <linearGradient id="starGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F59E0B" stopOpacity="1" />
          <stop offset="50%" stopColor="#F97316" stopOpacity="1" />
          <stop offset="100%" stopColor="#EF4444" stopOpacity="1" />
        </linearGradient>
        
        {/* Sparkle gradient */}
        <linearGradient id="sparkleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FBBF24" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#F59E0B" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#D97706" stopOpacity="0.7" />
        </linearGradient>
        
        {/* Glow filter */}
        <filter id="wandGlow">
          <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
          <feMerge> 
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/> 
          </feMerge>
        </filter>
      </defs>
      
      {/* Magic wand shaft */}
      <g filter="url(#wandGlow)">
        <line 
          x1="6" y1="26" 
          x2="18" y2="14" 
          stroke="url(#wandGradient)" 
          strokeWidth="2.5" 
          strokeLinecap="round"
        />
        
        {/* Wand handle */}
        <circle 
          cx="6" cy="26" 
          r="2" 
          fill="url(#wandGradient)"
          stroke="rgba(255, 255, 255, 0.3)"
          strokeWidth="0.5"
        />
        
        {/* Wand tip */}
        <circle 
          cx="18" cy="14" 
          r="1.5" 
          fill="rgba(255, 255, 255, 0.9)"
          stroke="url(#wandGradient)"
          strokeWidth="1"
        />
      </g>
      
      {/* Main magic star */}
      <g transform="translate(22, 8)">
        <path 
          d="M0,-4 L1,0 L4,0 L1.5,2 L2,5 L0,3 L-2,5 L-1.5,2 L-4,0 L-1,0 Z" 
          fill="url(#starGradient)"
          stroke="rgba(255, 255, 255, 0.4)"
          strokeWidth="0.5"
          filter="url(#wandGlow)"
        />
        <circle cx="0" cy="0" r="0.8" fill="rgba(255, 255, 255, 0.8)" />
      </g>
      
      {/* Sparkle effects */}
      <g opacity="0.8">
        {/* Large sparkle */}
        <g transform="translate(25, 12)">
          <path 
            d="M0,-2 L0.5,0 L2,0 L0.5,0.5 L0,2 L-0.5,0.5 L-2,0 L-0.5,0 Z" 
            fill="url(#sparkleGradient)"
            opacity="0.9"
          />
        </g>
        
        {/* Medium sparkle */}
        <g transform="translate(20, 5)">
          <path 
            d="M0,-1.5 L0.3,0 L1.5,0 L0.3,0.3 L0,1.5 L-0.3,0.3 L-1.5,0 L-0.3,0 Z" 
            fill="url(#sparkleGradient)"
            opacity="0.7"
          />
        </g>
        
        {/* Small sparkles */}
        <circle cx="26" cy="6" r="0.8" fill="url(#sparkleGradient)" opacity="0.6" />
        <circle cx="24" cy="16" r="0.6" fill="url(#sparkleGradient)" opacity="0.5" />
        <circle cx="19" cy="10" r="0.5" fill="url(#sparkleGradient)" opacity="0.4" />
      </g>
      
      {/* Animated sparkles (when animated) */}
      {animated && (
        <g className="animate-pulse">
          <circle cx="28" cy="10" r="0.5" fill="#FBBF24" opacity="0.7">
            <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" repeatCount="indefinite" />
          </circle>
          <circle cx="21" cy="7" r="0.4" fill="#F59E0B" opacity="0.6">
            <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="26" cy="14" r="0.3" fill="#D97706" opacity="0.5">
            <animate attributeName="opacity" values="0.5;1;0.5" dur="1.8s" repeatCount="indefinite" />
          </circle>
        </g>
      )}
      
      {/* Magic trail effect */}
      <path 
        d="M6 26 Q12 20 18 14" 
        stroke="rgba(139, 92, 246, 0.2)" 
        strokeWidth="3" 
        fill="none" 
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  );
};

export default MagicWandIcon;