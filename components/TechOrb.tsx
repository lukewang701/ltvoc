import React from 'react';

interface TechOrbProps {
  value: string | number;
  positionClass: string;
  colorClass: string;
  glowClass?: string;
  className?: string;
  progress?: number; // 0 to 100
}

const TechOrb: React.FC<TechOrbProps> = ({ 
  value, 
  positionClass, 
  colorClass, 
  glowClass,
  className = "",
  progress
}) => {
  // SVG Configuration for the progress ring
  // ViewBox 0 0 100 100
  const center = 50;
  const strokeWidth = 8;
  const radius = 45; // Fits within 100x100 with stroke
  const circumference = 2 * Math.PI * radius;
  // Calculate offset: if progress is 100, offset is 0. If 0, offset is circumference.
  const strokeDashoffset = circumference - ((progress || 0) / 100) * circumference;

  return (
    <div className={`${positionClass} z-40 ${className}`}>
      <div 
        className={`w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 lg:w-44 lg:h-44 rounded-full flex flex-col items-center justify-center text-white font-bold relative shadow-lg ${colorClass} ${glowClass}`}
      >
        {/* Progress Ring Overlay */}
        {typeof progress === 'number' && (
          <div className="absolute inset-0 rounded-full pointer-events-none">
             <svg 
               className="w-full h-full -rotate-90"
               viewBox="0 0 100 100"
             >
               {/* Background Track */}
               <circle 
                 cx={center} 
                 cy={center} 
                 r={radius} 
                 fill="none" 
                 stroke="rgba(255, 255, 255, 0.2)" 
                 strokeWidth={strokeWidth} 
               />
               {/* Progress Indicator */}
               <circle 
                 cx={center} 
                 cy={center} 
                 r={radius} 
                 fill="none" 
                 stroke="white" 
                 strokeWidth={strokeWidth}
                 strokeDasharray={circumference}
                 strokeDashoffset={strokeDashoffset}
                 strokeLinecap="round"
                 className="transition-all duration-500 ease-out"
               />
             </svg>
          </div>
        )}

        {/* Centered Value */}
        <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl relative z-10 drop-shadow-md">
          {value}
        </span>
      </div>
    </div>
  );
};

export default TechOrb;