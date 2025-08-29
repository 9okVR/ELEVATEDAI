import React from 'react';

const DeepSeekLogo: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zM12 17.5a5.5 5.5 0 110-11 5.5 5.5 0 010 11zM12 15a3 3 0 100-6 3 3 0 000 6z" />
        <path d="M12 9a3 3 0 00-3 3h1.5a1.5 1.5 0 111.5-1.5V9z" />
    </svg>
);

export default DeepSeekLogo;