import React from 'react';

interface IconProps {
  className?: string;
}

const BrainIcon: React.FC<IconProps> = ({ className = "w-6 h-6" }) => {
  return (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className={className} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
    >
        <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v1.2a3.5 3.5 0 0 0 1.1 6.8c1 .4 1.9.9 1.9 2.1 0 .9-.5 1.7-1.4 2.2" />
        <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v1.2a3.5 3.5 0 0 1-1.1 6.8c-1 .4-1.9.9-1.9 2.1 0 .9.5 1.7 1.4 2.2" />
        <path d="M12 21a8 8 0 0 0 5-2.2c1.3-1.3 2-3 2-4.8 0-1.6-.5-3.1-1.4-4.3" />
        <path d="M12 21a8 8 0 0 1-5-2.2c-1.3-1.3-2-3-2-4.8 0-1.6.5-3.1 1.4-4.3" />
        <path d="M12 21v-3.5" />
        <path d="M15 14c.4-1 .6-2.2.6-3.4" />
        <path d="M9 14c-.4-1-.6-2.2-.6-3.4" />
    </svg>
  );
};

export default BrainIcon;