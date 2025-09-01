import React from 'react';

interface Props {
  className?: string;
}

// Simplified Google "G" mark
const GoogleIcon: React.FC<Props> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path fill="#EA4335" d="M12 10.2v3.84h5.42c-.24 1.38-1.64 4.04-5.42 4.04-3.26 0-5.92-2.7-5.92-6.04S8.74 6 12 6c1.86 0 3.12.8 3.84 1.5l2.62-2.52C17.04 3.32 14.76 2.4 12 2.4 6.84 2.4 2.7 6.54 2.7 11.64S6.84 20.88 12 20.88c5.58 0 9.3-3.9 9.3-9.38 0-.62-.06-1.08-.14-1.5H12z"/>
  </svg>
);

export default GoogleIcon;

