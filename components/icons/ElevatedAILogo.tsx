import React, { useId } from 'react';

interface LogoProps {
  className?: string;
  showText?: boolean;
}

const ElevatedAILogo: React.FC<LogoProps> = ({ className = 'w-12 h-12', showText = false }) => {
  const uid = useId().replace(/[:]/g, '');
  const ids = {
    brandGrad: `brandGrad-${uid}`,
    softGlow: `softGlow-${uid}`,
    orbGrad: `orbGrad-${uid}`,
  } as const;

  return (
    <div className={`flex items-center gap-3 ${showText ? '' : 'justify-center'}`}>
      {/* Minimal, modern brand mark */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 120 120"
        className={`${className} transition-transform duration-400 ease-out hover:scale-105`}
        fill="none"
      >
        <defs>
          <linearGradient id={ids.brandGrad} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7c3aed"/>
            <stop offset="50%" stopColor="#4f46e5"/>
            <stop offset="100%" stopColor="#ec4899"/>
          </linearGradient>
          <radialGradient id={ids.orbGrad} cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9"/>
            <stop offset="70%" stopColor="#111827" stopOpacity="0.15"/>
            <stop offset="100%" stopColor="#000000" stopOpacity="0"/>
          </radialGradient>
          <filter id={ids.softGlow} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Outer ring */}
        <circle cx="60" cy="60" r="50" fill="none" stroke={`url(#${ids.brandGrad})`} strokeWidth="3" />
        {/* Soft orb background */}
        <circle cx="60" cy="60" r="40" fill={`url(#${ids.orbGrad})`} />

        {/* Stylized E with upward arrow tip */}
        <g filter={`url(#${ids.softGlow})`}>
          {/* top bar */}
          <rect x="36" y="42" width="48" height="7" rx="3.5" fill={`url(#${ids.brandGrad})`} />
          {/* middle bar with arrow */}
          <rect x="36" y="58" width="38" height="7" rx="3.5" fill={`url(#${ids.brandGrad})`} />
          <polygon points="74,58 89,61.5 74,65" fill={`url(#${ids.brandGrad})`} />
          {/* bottom bar */}
          <rect x="36" y="74" width="48" height="7" rx="3.5" fill={`url(#${ids.brandGrad})`} />
        </g>
      </svg>

      {/* Wordmark */}
      {showText && (
        <div className="relative select-none">
          <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/10 via-cyan-500/10 to-pink-500/10 blur-xl rounded-xl" />
          <div className="relative flex items-center gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-purple-200 via-indigo-200 to-pink-200 bg-clip-text text-transparent">
              Elevated
            </span>
            <span className="uppercase text-[11px] sm:text-xs font-black tracking-widest px-2.5 py-1 rounded-md border border-white/15 bg-gradient-to-br from-purple-600/30 to-indigo-600/30 text-white/90 shadow-[0_4px_18px_rgba(124,58,237,0.35)]">
              AI
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ElevatedAILogo;
