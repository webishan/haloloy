import React from 'react';
import logoImage from '../../assets/images/komarce-logo.png';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ 
  size = 'md', 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-12',
    xl: 'h-16',
    '2xl': 'h-20'
  };

  // Only show the logo image, no text
  return (
    <div className={`${className} flex items-center justify-center`}>
      <img 
        src={logoImage} 
        alt="Holyloy Logo" 
        className={`${sizeClasses[size]} w-auto object-contain`}
      />
    </div>
  );
};

export default Logo;