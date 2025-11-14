import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

interface Participant {
  id: string;
  name: string;
}

interface WheelSpinnerProps {
  participants: Participant[];
  isSpinning: boolean;
  winner: string | null;
}

export const WheelSpinner = ({ participants, isSpinning, winner }: WheelSpinnerProps) => {
  const [rotation, setRotation] = useState(0);
  const segmentAngle = participants.length > 0 ? 360 / participants.length : 0;
  
  useEffect(() => {
    if (isSpinning && participants.length > 0) {
      const winnerIndex = participants.findIndex(p => p.name === winner);
      const targetAngle = 1800 + (360 - (winnerIndex * segmentAngle)); // Multiple rotations + land on winner
      setRotation(targetAngle);
    }
  }, [isSpinning, winner, participants, segmentAngle]);

  const getSegmentColor = (index: number) => {
    const colors = [
      'hsl(261 51% 46%)', // Primary purple
      'hsl(217 89% 61%)', // Accent blue
      'hsl(261 51% 56%)', // Light purple
      'hsl(217 89% 71%)', // Light blue
    ];
    return colors[index % colors.length];
  };

  if (participants.length === 0) {
    return (
      <div className="relative w-full max-w-md aspect-square mx-auto">
        <div className="absolute inset-0 rounded-full border-8 border-muted flex items-center justify-center">
          <p className="text-muted-foreground text-center px-8">
            No participants yet
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-md aspect-square mx-auto">
      {/* Pointer */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
        <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[40px] border-t-primary drop-shadow-lg" />
      </div>

      {/* Wheel */}
      <motion.div
        className="absolute inset-0 rounded-full shadow-xl"
        style={{
          boxShadow: '0 0 40px rgba(94, 53, 177, 0.3)',
        }}
        animate={{ rotate: rotation }}
        transition={{
          duration: isSpinning ? 4 : 0,
          ease: [0.25, 0.46, 0.45, 0.94],
        }}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {participants.map((participant, index) => {
            const startAngle = index * segmentAngle;
            const endAngle = (index + 1) * segmentAngle;
            
            const startRad = (startAngle - 90) * (Math.PI / 180);
            const endRad = (endAngle - 90) * (Math.PI / 180);
            
            const x1 = 50 + 50 * Math.cos(startRad);
            const y1 = 50 + 50 * Math.sin(startRad);
            const x2 = 50 + 50 * Math.cos(endRad);
            const y2 = 50 + 50 * Math.sin(endRad);
            
            const largeArcFlag = segmentAngle > 180 ? 1 : 0;
            
            const pathData = `M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
            
            const textAngle = startAngle + segmentAngle / 2;
            const textRad = (textAngle - 90) * (Math.PI / 180);
            const textX = 50 + 35 * Math.cos(textRad);
            const textY = 50 + 35 * Math.sin(textRad);
            
            return (
              <g key={participant.id}>
                <path
                  d={pathData}
                  fill={getSegmentColor(index)}
                  stroke="white"
                  strokeWidth="0.5"
                />
                <text
                  x={textX}
                  y={textY}
                  fill="white"
                  fontSize="3"
                  fontWeight="600"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${textAngle}, ${textX}, ${textY})`}
                >
                  {participant.name.length > 12 
                    ? participant.name.substring(0, 12) + '...' 
                    : participant.name}
                </text>
              </g>
            );
          })}
          
          {/* Center circle */}
          <circle
            cx="50"
            cy="50"
            r="8"
            fill="white"
            stroke="hsl(261 51% 46%)"
            strokeWidth="2"
          />
        </svg>
      </motion.div>

      {/* Outer ring */}
      <div className="absolute inset-0 rounded-full border-8 border-white pointer-events-none" />
    </div>
  );
};
