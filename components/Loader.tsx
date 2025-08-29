
import React from 'react';

interface LoaderProps {
  message?: string;
  subMessage?: string;
  size?: 'small' | 'medium' | 'large';
}

const Loader: React.FC<LoaderProps> = ({ message, subMessage, size = 'medium' }) => {
  const sizeClasses = {
    small: 'w-8 h-8',
    medium: 'w-16 h-16', 
    large: 'w-24 h-24'
  };

  const containerSize = sizeClasses[size];
  const ringSize = size === 'small' ? 'w-6 h-6' : size === 'large' ? 'w-20 h-20' : 'w-12 h-12';
  const dotSize = size === 'small' ? 'w-1 h-1' : size === 'large' ? 'w-2 h-2' : 'w-1.5 h-1.5';

  return (
    <div className="flex flex-col items-center justify-center gap-6">
      {/* Modern Loader Animation */}
      <div className={`relative ${containerSize} flex items-center justify-center`}>
        {/* Outer rotating ring */}
        <div className={`absolute ${containerSize} border-2 border-transparent border-t-purple-400 border-r-purple-400 rounded-full animate-spin`}></div>
        
        {/* Middle rotating ring (opposite direction) */}
        <div className={`absolute ${ringSize} border-2 border-transparent border-b-indigo-400 border-l-indigo-400 rounded-full animate-spin-reverse`} style={{animationDelay: '0.15s'}}></div>
        
        {/* Inner pulsing core */}
        <div className={`${dotSize} bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full animate-pulse-glow`}></div>
        
        {/* Floating particles */}
        <div className="absolute inset-0">
          <div className={`absolute top-0 left-1/2 transform -translate-x-1/2 ${dotSize} bg-purple-400 rounded-full animate-float-1`}></div>
          <div className={`absolute bottom-0 right-0 ${dotSize} bg-indigo-400 rounded-full animate-float-2`}></div>
          <div className={`absolute top-1/2 left-0 transform -translate-y-1/2 ${dotSize} bg-pink-400 rounded-full animate-float-3`}></div>
        </div>
      </div>

      {/* Text content with enhanced styling */}
      <div className="text-center space-y-3 max-w-md">
        <p className="text-purple-300 text-lg font-semibold tracking-wide animate-pulse-text">
          {message || 'AI is thinking...'}
        </p>
        {subMessage && (
          <p className="text-gray-400 text-sm leading-relaxed animate-fade-in-delayed">
            {subMessage}
          </p>
        )}
      </div>
    </div>
  );
};

export default Loader;
