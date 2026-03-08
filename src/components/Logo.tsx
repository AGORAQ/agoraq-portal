import React from 'react';

export default function Logo({ className = "", variant = "dark" }: { className?: string, variant?: "light" | "dark" }) {
  const textColor = variant === 'light' ? '#ffffff' : '#1e3a8a'; // slate-900 or blue-900
  
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <svg 
        width="180" 
        height="50" 
        viewBox="0 0 180 50" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        aria-label="AgoraQ Logo"
      >
        <defs>
          <linearGradient id="arrowGradient" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#0ea5e9" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>

        {/* Text "Agora" */}
        <text 
          x="0" 
          y="38" 
          fontFamily="'Inter', sans-serif" 
          fontWeight="700" 
          fontSize="40" 
          fill={textColor} 
          letterSpacing="-1"
        >
          Agora
        </text>
        
        {/* Q Icon */}
        <g transform="translate(140, 25)">
           {/* Dark Blue Circle Part - Open at bottom right */}
           <path 
             d="M 12 10 A 16 16 0 1 0 -8 14" 
             fill="none" 
             stroke={textColor} 
             strokeWidth="6" 
             strokeLinecap="round"
           />
           
           {/* Gradient Arrow */}
           {/* Starts from bottom left, swoops up-right into center */}
           <path 
             d="M -12 16 Q 5 22 10 2" 
             fill="none" 
             stroke="url(#arrowGradient)" 
             strokeWidth="6" 
             strokeLinecap="round"
           />
           {/* Arrow Head */}
           <path 
             d="M 2 2 L 10 2 L 8 10" 
             fill="none" 
             stroke="url(#arrowGradient)" 
             strokeWidth="6" 
             strokeLinecap="round" 
             strokeLinejoin="round"
           />
        </g>
      </svg>
    </div>
  );
}
