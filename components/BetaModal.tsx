import React, { useEffect, useState, useRef } from 'react';

interface BetaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BetaModal: React.FC<BetaModalProps> = ({ isOpen, onClose }) => {
  const [show, setShow] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle mouse movement for interactive effects
  useEffect(() => {
    let animationFrame: number;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        // Cancel previous animation frame to throttle updates
        if (animationFrame) {
          cancelAnimationFrame(animationFrame);
        }
        
        animationFrame = requestAnimationFrame(() => {
          if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            
            // Smoothly interpolate to new position (slower movement)
            setMousePosition(prev => ({
              x: prev.x + (x - prev.x) * 0.1, // Much slower interpolation (was direct assignment)
              y: prev.y + (y - prev.y) * 0.1
            }));
          }
        });
      }
    };

    if (isOpen) {
      window.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
          onClose();
          return;
      }

      if (e.key === 'Tab') {
        const focusableElements = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusableElements || focusableElements.length === 0) return;

        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey) { // Shift + Tab
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else { // Tab
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      const timer = setTimeout(() => setShow(true), 50);
      return () => clearTimeout(timer);
    } else {
      setShow(false);
      const timer = setTimeout(() => setShouldRender(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Lock body scroll while open to prevent background scroll/cropping on mobile
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  if (!shouldRender) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 pt-safe pb-safe overscroll-contain transition-all duration-500 ease-out ${
        show ? 'opacity-100' : 'opacity-0'
      }`}
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Enhanced Multi-layered Backdrop */}
      <div className="fixed inset-0">
        {/* Base dark layer */}
        <div 
          className={`absolute inset-0 bg-black/60 transition-all duration-500 ease-out ${
            show ? 'opacity-100' : 'opacity-0'
          }`} 
          onClick={onClose}
        />
        
        {/* Dynamic gradient overlay */}
        <div 
          className={`absolute inset-0 transition-all duration-1000 ease-out ${
            show ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            background: `radial-gradient(circle at ${mousePosition.x}% ${mousePosition.y}%, rgba(124, 58, 237, 0.2) 0%, transparent 80%)`,
            transition: 'background 0.3s ease-out' // Slower transition for background changes
          }}
        />
        
        {/* Glassmorphism blur layer */}
        <div 
          className={`absolute inset-0 backdrop-blur-2xl transition-all duration-500 ease-out ${
            show ? 'backdrop-blur-2xl' : 'backdrop-blur-0'
          }`}
        />
        
      </div>

      {/* Enhanced Modal Panel */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className={`relative w-full max-w-xs sm:max-w-md lg:max-w-lg transform transition-all duration-500 ease-out focus:outline-none ${
          show ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-8'
        }`}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        style={{
          transform: `perspective(1000px) rotateX(${isHovering ? '2deg' : '0deg'}) rotateY(${isHovering ? '1deg' : '0deg'})`
        }}
      >
        {/* Multi-layer glassmorphism background */}
        <div className="absolute inset-0 rounded-3xl overflow-hidden">
          {/* Base glass layer */}
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900/90 via-gray-800/85 to-gray-900/90 backdrop-blur-3xl" />
          
          {/* Highlight overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent" />
          
          {/* Dynamic color overlay */}
          <div 
            className={`absolute inset-0 bg-gradient-to-br from-purple-500/20 via-transparent to-pink-500/20 transition-opacity duration-300 ${
              isHovering ? 'opacity-100' : 'opacity-60'
            }`}
          />
          
          {/* Border glow effect */}
          <div className="absolute inset-0 rounded-3xl border border-white/20 shadow-2xl shadow-purple-500/20" />
          
          {/* Inner glow ring */}
          <div className="absolute inset-2 rounded-3xl border border-purple-400/30" />
        </div>

        {/* Content Container */}
        <div className="relative p-4 sm:p-6 lg:p-10 text-center">
          {/* Enhanced Beta Logo with 3D effects */}
          <div className="w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 mx-auto mb-6 sm:mb-8 relative group">
            {/* Logo shadow/depth */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/30 to-pink-500/30 blur-2xl scale-110 rounded-full" />
            
            {/* Main logo container */}
            <div className={`relative w-full h-full transition-transform duration-300 ${
              isHovering ? 'scale-110 rotate-2' : 'scale-100 rotate-0'
            }`}>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="w-full h-full drop-shadow-2xl"
                viewBox="0 0 120 120" 
                fill="none"
              >
                {/* Enhanced Gradient Definitions */}
                <defs>
                  {/* Holographic primary gradient */}
                  <linearGradient id="betaPrimaryGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#7c3aed" />
                    <stop offset="25%" stopColor="#06b6d4" />
                    <stop offset="50%" stopColor="#4f46e5" />
                    <stop offset="75%" stopColor="#ec4899" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                  
                  {/* Dynamic secondary gradient */}
                  <linearGradient id="betaSecondaryGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#60a5fa" />
                    <stop offset="50%" stopColor="#7c3aed" />
                    <stop offset="100%" stopColor="#ec4899" />
                  </linearGradient>
                  
                  {/* Radial energy core */}
                  <radialGradient id="betaCoreGradient" cx="50%" cy="50%" r="60%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                    <stop offset="30%" stopColor="#60a5fa" stopOpacity="0.9" />
                    <stop offset="70%" stopColor="#7c3aed" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0.4" />
                  </radialGradient>
                  
                  {/* Enhanced glow filter */}
                  <filter id="betaGlow" x="-100%" y="-100%" width="300%" height="300%">
                    <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                    <feOffset dx="0" dy="0" result="offsetBlur"/>
                    <feFlood floodColor="#7c3aed" floodOpacity="0.6"/>
                    <feComposite in2="offsetBlur" operator="in"/>
                    <feMerge> 
                      <feMergeNode/>
                      <feMergeNode in="SourceGraphic"/> 
                    </feMerge>
                  </filter>
                  
                  {/* 3D emboss effect */}
                  <filter id="betaEmboss" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
                    <feOffset dx="3" dy="3" result="offset1"/>
                    <feOffset dx="-2" dy="-2" result="offset2"/>
                    <feMerge>
                      <feMergeNode in="offset1"/>
                      <feMergeNode in="offset2"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                  
                  {/* Holographic prism effect */}
                  <filter id="betaPrism">
                    <feColorMatrix type="matrix" values="
                      1.3 0 0.2 0 0
                      0.1 1.2 0.3 0 0
                      0.2 0.1 1.4 0 0
                      0 0 0 1 0
                    "/>
                  </filter>
                </defs>
                
                {/* 3D Depth Shadow */}
                <ellipse cx="60" cy="75" rx="50" ry="10" fill="url(#betaCoreGradient)" opacity="0.3" />
                
                {/* Outer Energy Rings */}
                <circle cx="60" cy="60" r="55" fill="none" stroke="url(#betaPrimaryGradient)" strokeWidth="1" opacity="0.4">
                  <animate attributeName="r" values="55;58;55" dur="8s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.4;0.8;0.4" dur="8s" repeatCount="indefinite" />
                </circle>
                
                <circle cx="60" cy="60" r="48" fill="none" stroke="url(#betaSecondaryGradient)" strokeWidth="0.8" opacity="0.6">
                  <animate attributeName="stroke-dasharray" values="0 300;150 150;0 300" dur="6s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.6;1;0.6" dur="6s" repeatCount="indefinite" />
                </circle>
                
                {/* Advanced Hexagonal Core Structure */}
                <g filter="url(#betaGlow)">
                  {/* Main hexagonal chamber */}
                  <path 
                    d="M60 25 L90 40 L90 70 L60 85 L30 70 L30 40 Z" 
                    fill="url(#betaCoreGradient)" 
                    stroke="url(#betaPrimaryGradient)"
                    strokeWidth="2"
                    opacity="0.9"
                    filter="url(#betaEmboss)"
                  >
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      values="0 60 60;2 60 60;0 60 60"
                      dur="10s"
                      repeatCount="indefinite"
                    />
                  </path>
                  
                  {/* Inner geometric layers */}
                  <polygon 
                    points="40,45 80,45 80,65 60,80 40,65" 
                    fill="url(#betaSecondaryGradient)" 
                    opacity="0.8"
                    filter="url(#betaPrism)"
                  >
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      values="0 60 55;-3 60 55;0 60 55"
                      dur="8s"
                      repeatCount="indefinite"
                    />
                  </polygon>
                  
                  {/* Central energy core */}
                  <circle cx="60" cy="55" r="15" fill="url(#betaCoreGradient)" filter="url(#betaPrism)">
                    <animate attributeName="r" values="15;18;15" dur="4s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.9;1;0.9" dur="4s" repeatCount="indefinite" />
                  </circle>
                </g>
                
                {/* Beta Symbol with Enhanced Design */}
                <g transform="translate(60, 55)">
                  <circle r="10" fill="url(#betaCoreGradient)" opacity="0.3" />
                  <text 
                    x="0" 
                    y="7" 
                    textAnchor="middle" 
                    fontSize="24" 
                    fontWeight="bold" 
                    fill="url(#betaPrimaryGradient)"
                    className="select-none"
                    filter="url(#betaGlow)"
                  >
                    β
                  </text>
                </g>
                
                {/* Concentric Energy Pulses */}
                <circle cx="60" cy="55" r="20" fill="none" stroke="url(#betaSecondaryGradient)" strokeWidth="1" opacity="0.5">
                  <animate attributeName="r" values="20;35;20" dur="5s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.5;0;0.5" dur="5s" repeatCount="indefinite" />
                </circle>
              </svg>
            </div>
            
            {/* Enhanced glow effect around logo */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 blur-xl animate-pulse" />
          </div>
          
          {/* Enhanced Title Section */}
          <div className="mb-6 sm:mb-8">
            <h2 id="modal-title" className="text-2xl sm:text-3xl font-black text-white mb-2 tracking-wide">
              Welcome to{' '}
              <span className="bg-gradient-to-r from-purple-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
                Elevated AI
              </span>
            </h2>
            <div className="flex items-center justify-center gap-2 mb-3 sm:mb-4">
              <div className="h-px bg-gradient-to-r from-transparent via-purple-400 to-transparent flex-1" />
              <span className="text-xs sm:text-sm font-bold bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent px-2 sm:px-3 py-1 rounded-full border border-purple-400/30 bg-purple-500/10">
                PREVIEW RELEASE
              </span>
              <div className="h-px bg-gradient-to-r from-transparent via-purple-400 to-transparent flex-1" />
            </div>
          </div>
          
          {/* Enhanced Content Section */}
          <div className="text-gray-300 mb-6 sm:mb-8 space-y-3 sm:space-y-4">
            <div className="bg-gradient-to-r from-purple-500/10 via-transparent to-pink-500/10 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-purple-400/20">
              <p className="text-sm sm:text-base leading-relaxed text-gray-200">
                Experience the cutting-edge{' '}
                <strong className="font-bold text-purple-300 bg-gradient-to-r from-purple-400/20 to-pink-400/20 px-1.5 sm:px-2 py-0.5 rounded-md">
                  BETA
                </strong>{' '}
                version of our revolutionary AI-powered educational platform.
              </p>
            </div>
            
            <div className="grid grid-cols-1 gap-2 sm:gap-3 text-xs sm:text-sm">
              <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gray-800/40 border border-gray-700/30">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse flex-shrink-0" />
                <div className="flex-1">
                  <span className="font-semibold text-gray-200 block">AI Content Generation</span>
                  <p className="text-gray-400 mt-1">Advanced natural language processing for intelligent content creation</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gray-800/40 border border-gray-700/30">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-400 rounded-full animate-pulse flex-shrink-0" />
                <div className="flex-1">
                  <span className="font-semibold text-gray-200 block">Real-time Analysis</span>
                  <p className="text-gray-400 mt-0.5 sm:mt-1 text-xs sm:text-sm">Instant document processing and intelligent insights</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gray-800/40 border border-gray-700/30">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-purple-400 rounded-full animate-pulse flex-shrink-0" />
                <div className="flex-1">
                  <span className="font-semibold text-gray-200 block">Continuous Learning</span>
                  <p className="text-gray-400 mt-0.5 sm:mt-1 text-xs sm:text-sm">Adaptive algorithms that improve with every interaction</p>
                </div>
              </div>
            </div>
            
            <div className="mt-3 sm:mt-4 p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-400/20">
              <p className="text-xs sm:text-sm text-amber-200 font-medium flex items-center gap-1.5 sm:gap-2">
                <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-amber-400 rounded-full animate-pulse flex-shrink-0" />
                This preview release may contain experimental features as we optimize performance and user experience.
              </p>
            </div>
          </div>
          
          {/* Enhanced Action Button */}
          <div className="relative group">
            {/* Button glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl sm:rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity duration-300" />
            
            <button
              onClick={onClose}
              className={`relative w-full py-3 sm:py-4 px-6 sm:px-8 rounded-xl sm:rounded-2xl text-base sm:text-lg font-bold transition-all duration-300 ease-out transform focus:outline-none focus:ring-4 focus:ring-purple-500/50 ${
                isHovering 
                  ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 scale-105 shadow-2xl shadow-purple-500/40' 
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 scale-100 shadow-lg shadow-purple-600/30'
              } hover:scale-105 active:scale-95 min-h-[44px]`}
            >
              <span className="bg-gradient-to-r from-white to-purple-100 bg-clip-text text-transparent">
                Begin Your Learning Journey
              </span>
              
              {/* Button highlight effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-transparent to-white/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BetaModal;
