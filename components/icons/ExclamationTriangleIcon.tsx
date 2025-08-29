
import React from 'react';

interface IconProps {
  className?: string;
}

const ExclamationTriangleIcon: React.FC<IconProps> = ({ className = "w-6 h-6" }) => {
  return (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 24 24" 
        fill="currentColor" 
        className={className}
    >
        <path 
            fillRule="evenodd" 
            d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.752a3 3 0 01-2.598 4.5H4.644a3 3 0 01-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" 
            clipRule="evenodd" 
        />
    </svg>
  );
};

export default ExclamationTriangleIcon;
