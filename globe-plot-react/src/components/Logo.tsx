import React from 'react';

interface LogoProps {
  className?: string;
  alt?: string;
}

export const Logo: React.FC<LogoProps> = ({ 
  className = "w-6 h-6", 
  alt = "Globeplot logo" 
}) => {
  return (
    <img 
      src="/logo.svg" 
      alt={alt} 
      className={className}
    />
  );
}; 