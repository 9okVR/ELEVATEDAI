import React, { useCallback, useId, useMemo, useState } from 'react';

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
    sweepGrad: `sweepGrad-${uid}`,
    innerRing: `innerRing-${uid}`,
  } as const;

  // Subtle immersive tilt + glow intensity based on pointer position
  const [tilt, setTilt] = useState<{rx:number, ry:number, glow:number}>({ rx: 0, ry: 0, glow: 0.6 });
  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    const rx = Math.max(-1, Math.min(1, dy)) * 6; // rotateX
    const ry = Math.max(-1, Math.min(1, -dx)) * 6; // rotateY
    const glow = 0.55 + Math.min(0.35, Math.hypot(dx, dy) * 0.35);
    setTilt({ rx, ry, glow });
  }, []);
  const onLeave = useCallback(() => setTilt({ rx: 0, ry: 0, glow: 0.6 }), []);

  const wrapperStyle = useMemo(() => ({
    transform: `perspective(600px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
    transformStyle: 'preserve-3d' as const,
    transition: 'transform 240ms ease',
  }), [tilt]);

  return (
    <div className={`flex items-center gap-3 ${showText ? '' : 'justify-center'}`} onMouseMove={onMove} onMouseLeave={onLeave} style={{ willChange: 'transform' }}>
      {/* Minimal, modern brand mark */}
      <div style={wrapperStyle} className={`${className}`}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none" className="w-full h-full drop-shadow-[0_8px_30px_rgba(124,58,237,0.35)]">
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
          <linearGradient id={ids.sweepGrad} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity="0"/>
            <stop offset="50%" stopColor="#a78bfa" stopOpacity="0.8"/>
            <stop offset="100%" stopColor="#a78bfa" stopOpacity="0"/>
          </linearGradient>
          <radialGradient id={ids.innerRing} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#c7d2fe" stopOpacity="0.9"/>
            <stop offset="80%" stopColor="#7c3aed" stopOpacity="0.15"/>
            <stop offset="100%" stopColor="#000" stopOpacity="0"/>
          </radialGradient>
          <filter id={ids.softGlow} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Outer ring with dynamic glow */}
        <g opacity={tilt.glow}>
          <circle cx="60" cy="60" r="50" fill="none" stroke={`url(#${ids.brandGrad})`} strokeWidth="3" />
        </g>
        {/* Soft orb background */}
        <circle cx="60" cy="60" r="40" fill={`url(#${ids.orbGrad})`} />
        {/* Inner ambient ring */}
        <circle cx="60" cy="60" r="30" fill={`url(#${ids.innerRing})`} opacity="0.35" />

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

        {/* Orbiting spark */}
        <g>
          <circle cx="60" cy="60" r="34" fill="none" stroke={`url(#${ids.sweepGrad})`} strokeWidth="2" opacity="0.35">
            <animateTransform attributeName="transform" type="rotate" from="0 60 60" to="360 60 60" dur="8s" repeatCount="indefinite" />
          </circle>
          <g>
            <circle cx="94" cy="60" r="2.3" fill="#a78bfa">
              <animateTransform attributeName="transform" type="rotate" from="0 60 60" to="360 60 60" dur="6s" repeatCount="indefinite" />
            </circle>
          </g>
        </g>
      </svg>
      </div>

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
