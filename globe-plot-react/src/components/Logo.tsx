import React from 'react';

interface LogoProps {
  className?: string;
  alt?: string;
}

export const Logo: React.FC<LogoProps> = ({ 
  className = "w-6 h-6", 
  alt = "Plotrr logo" 
}) => {
  return (
    <img 
      src="/logo.PNG" 
      alt={alt} 
      className={className}
    />
  );
}; 