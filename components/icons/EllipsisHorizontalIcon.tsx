import React from 'react';

interface IconProps {
  className?: string;
}

const EllipsisHorizontalIcon: React.FC<IconProps> = ({ className = "w-6 h-6" }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor" 
      strokeWidth={2}
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        d="M5 12h.01M12 12h.01M19 12h.01" 
      />
    </svg>
  );
};

export default EllipsisHorizontalIcon;
