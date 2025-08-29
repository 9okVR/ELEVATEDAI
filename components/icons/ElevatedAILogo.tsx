import React from 'react';

interface LogoProps {
  className?: string;
  showText?: boolean;
}

const ElevatedAILogo: React.FC<LogoProps> = ({ className = "w-12 h-12", showText = false }) => {
  return (
    <div className={`flex items-center gap-3 ${showText ? '' : 'justify-center'}`}>
      {/* Logo Icon */}
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className={`${className} transform-gpu transition-all duration-500 hover:scale-110 hover:rotate-1`}
        viewBox="0 0 120 120" 
        fill="none"
      >
        {/* Enhanced Gradient Definitions */}
        <defs>
          {/* Primary holographic gradient */}
          <linearGradient id="holographicGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accent-primary, #7c3aed)" />
            <stop offset="25%" stopColor="#06b6d4" />
            <stop offset="50%" stopColor="var(--accent-secondary, #4f46e5)" />
            <stop offset="75%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
          
          {/* Radial energy gradient */}
          <radialGradient id="energyCore" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="30%" stopColor="#60a5fa" stopOpacity="0.9" />
            <stop offset="60%" stopColor="var(--accent-primary, #7c3aed)" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0.3" />
          </radialGradient>
          
          {/* Depth shadow gradient */}
          <radialGradient id="depthShadow" cx="50%" cy="50%" r="80%">
            <stop offset="0%" stopColor="#000000" stopOpacity="0" />
            <stop offset="70%" stopColor="#000000" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.8" />
          </radialGradient>
          
          {/* Stable shimmer gradient (no animation) */}
          <linearGradient id="shimmerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.1)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.2)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.1)" />
          </linearGradient>
          
          {/* Enhanced glow filter */}
          <filter id="hyperGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feOffset dx="0" dy="0" result="offsetBlur"/>
            <feFlood floodColor="var(--accent-primary, #7c3aed)" floodOpacity="0.4"/>
            <feComposite in2="offsetBlur" operator="in"/>
            <feMerge> 
              <feMergeNode in="SourceGraphic"/>
              <feMergeNode/>
            </feMerge>
          </filter>
          
          {/* 3D emboss filter */}
          <filter id="emboss3D" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
            <feOffset dx="2" dy="2" result="offset1"/>
            <feOffset dx="-1" dy="-1" result="offset2"/>
            <feMerge>
              <feMergeNode in="offset1"/>
              <feMergeNode in="offset2"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          {/* Holographic prism effect */}
          <filter id="prismEffect">
            <feColorMatrix type="matrix" values="
              1.2 0 0.2 0 0
              0.1 1.1 0.3 0 0
              0.2 0.1 1.3 0 0
              0 0 0 1 0
            "/>
          </filter>
        </defs>
        
        {/* Stable 3D Base Shadow Layer */}
        <ellipse cx="60" cy="70" rx="45" ry="8" fill="url(#depthShadow)" opacity="0.4" />
        
        {/* Stable Outer Energy Ring */}
        <circle cx="60" cy="60" r="52" fill="none" stroke="url(#holographicGradient)" strokeWidth="0.5" opacity="0.2">
          <animate attributeName="r" values="52;54;52" dur="6s" repeatCount="indefinite" />
        </circle>
        
        {/* Stable Particle Field Background */}
        <g opacity="0.4">
          {/* Static energy particles - no animation to avoid flicker */}
          <circle cx="20" cy="30" r="1.5" fill="#60a5fa" opacity="0.6" />
          <circle cx="100" cy="40" r="1" fill="#ec4899" opacity="0.5" />
          <circle cx="30" cy="90" r="1.2" fill="#8b5cf6" opacity="0.6" />
          <circle cx="90" cy="20" r="0.8" fill="#06b6d4" opacity="0.4" />
        </g>
        
        {/* Main AI Core Structure */}
        <g filter="url(#hyperGlow)">
          {/* Hexagonal energy chamber */}
          <path 
            d="M60 20 L85 35 L85 65 L60 80 L35 65 L35 35 Z" 
            fill="url(#holographicGradient)" 
            opacity="0.8"
            filter="url(#emboss3D)"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              values="0 60 60;1 60 60;0 60 60"
              dur="6s"
              repeatCount="indefinite"
            />
          </path>
          
          {/* Inner geometric layers */}
          <polygon 
            points="45,40 75,40 75,60 60,70 45,60" 
            fill="url(#energyCore)" 
            opacity="0.9"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              values="0 60 50;-2 60 50;0 60 50"
              dur="4s"
              repeatCount="indefinite"
            />
          </polygon>
          
          {/* Central energy core - simplified animation */}
          <circle cx="60" cy="50" r="12" fill="url(#energyCore)" filter="url(#prismEffect)" opacity="0.95">
            <animate attributeName="r" values="12;13;12" dur="4s" repeatCount="indefinite" />
          </circle>
          
          {/* Neural network connections */}
          <g stroke="url(#holographicGradient)" strokeWidth="1.5" fill="none" opacity="0.6">
            {/* Primary neural paths */}
            <path d="M35 45 L50 50 L60 45">
              <animate attributeName="stroke-dasharray" values="0,20;10,10;20,0;10,10;0,20" dur="3s" repeatCount="indefinite" />
            </path>
            <path d="M85 55 L70 50 L60 55">
              <animate attributeName="stroke-dasharray" values="0,20;10,10;20,0;10,10;0,20" dur="3.2s" repeatCount="indefinite" />
            </path>
            <path d="M50 35 L60 45 L70 35">
              <animate attributeName="stroke-dasharray" values="0,20;10,10;20,0;10,10;0,20" dur="2.8s" repeatCount="indefinite" />
            </path>
            <path d="M50 65 L60 55 L70 65">
              <animate attributeName="stroke-dasharray" values="0,20;10,10;20,0;10,10;0,20" dur="3.4s" repeatCount="indefinite" />
            </path>
          </g>
          
          {/* Data flow nodes with stable glow */}
          <g opacity="0.9">
            <circle cx="35" cy="45" r="3" fill="url(#energyCore)" filter="url(#hyperGlow)" />
            <circle cx="85" cy="55" r="3" fill="url(#energyCore)" filter="url(#hyperGlow)" />
            <circle cx="50" cy="35" r="3" fill="url(#energyCore)" filter="url(#hyperGlow)" />
            <circle cx="70" cy="65" r="3" fill="url(#energyCore)" filter="url(#hyperGlow)" />
          </g>
          
          {/* Single stable energy pulse */}
          <circle cx="60" cy="50" r="18" fill="none" stroke="url(#holographicGradient)" strokeWidth="0.5" opacity="0.3">
            <animate attributeName="r" values="18;22;18" dur="6s" repeatCount="indefinite" />
          </circle>
        </g>
      </svg>
      
      {/* Enhanced Text Logo */}
      {showText && (
        <div className="flex flex-col relative">
          {/* Stable holographic background glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-cyan-500/20 to-pink-500/20 blur-lg rounded-lg opacity-60" />
          
          <span className="relative text-3xl font-black bg-gradient-to-r from-purple-300 via-cyan-300 to-pink-300 bg-clip-text text-transparent drop-shadow-lg">
            Elevated
          </span>
          <span className="relative text-xl font-bold bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 bg-clip-text text-transparent -mt-2 tracking-wider">
            AI
          </span>
        </div>
      )}
    </div>
  );
};

export default ElevatedAILogo;