import React from 'react';

interface HolyloyLogoProps {
  className?: string;
  size?: number;
}

export const HolyloyLogo: React.FC<HolyloyLogoProps> = ({ 
  className = "w-6 h-6", 
  size = 24 
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Main "H" shape */}
      <path
        d="M3 4H7V20H3V4Z"
        fill="currentColor"
      />
      <path
        d="M3 10H21V14H3V10Z"
        fill="currentColor"
      />
      <path
        d="M17 4H21V20H17V4Z"
        fill="currentColor"
      />
      
      {/* Decorative circle accent */}
      <circle
        cx="12"
        cy="12"
        r="2"
        fill="currentColor"
        opacity="0.6"
      />
    </svg>
  );
};

export default HolyloyLogo;
