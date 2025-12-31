import React, { useState } from 'react';
import { Heart } from 'lucide-react';

// Warming heart colors from cool to warm (5 = brand rose #E11D48)
const heartColors = {
  1: { fill: '#FECDD3', stroke: '#FECDD3' },  // Palest pink
  2: { fill: '#FDA4AF', stroke: '#FDA4AF' },  // Light pink
  3: { fill: '#FB7185', stroke: '#FB7185' },  // Pink
  4: { fill: '#F43F5E', stroke: '#F43F5E' },  // Rose
  5: { fill: '#E11D48', stroke: '#BE123C' },  // Brand rose ❤️
};

const emptyColor = { fill: 'none', stroke: '#D4DAD0' };

export default function StarRating({ rating, onRatingChange, readOnly = false, size = 'md' }) {
  const [hoverRating, setHoverRating] = useState(0);
  
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };
  
  const iconSize = sizeClasses[size] || sizeClasses.md;
  
  const handleClick = (value) => {
    if (!readOnly && onRatingChange) {
      onRatingChange(value === rating ? null : value);
    }
  };
  
  const handleMouseEnter = (value) => {
    if (!readOnly) {
      setHoverRating(value);
    }
  };
  
  const handleMouseLeave = () => {
    if (!readOnly) {
      setHoverRating(0);
    }
  };
  
  const displayRating = hoverRating || rating || 0;
  
  // Get the color based on the highest filled heart (warming effect)
  const getHeartColor = (value) => {
    if (value <= displayRating) {
      // Use the color of the highest selected heart for all filled hearts
      return heartColors[displayRating] || heartColors[5];
    }
    return emptyColor;
  };
  
  return (
    <div className="flex items-center gap-1 relative z-10">
      {[1, 2, 3, 4, 5].map((value) => {
        const isFilled = value <= displayRating;
        const colors = getHeartColor(value);
        
        return (
          <button
            key={value}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClick(value);
            }}
            onMouseEnter={() => handleMouseEnter(value)}
            onMouseLeave={handleMouseLeave}
            disabled={readOnly}
            className={`
              transition-all p-0.5
              ${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}
              ${!readOnly && 'focus:outline-none focus:ring-2 focus:ring-[#E11D48] focus:ring-offset-1 rounded'}
            `}
            aria-label={`Rate ${value} heart${value !== 1 ? 's' : ''}`}
          >
            <Heart
              className={`${iconSize} transition-all duration-200 pointer-events-none`}
              style={{
                fill: isFilled ? colors.fill : 'none',
                color: colors.stroke,
              }}
            />
          </button>
        );
      })}
      {!readOnly && rating && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRatingChange(null);
          }}
          className="ml-2 text-xs text-[#96A888] hover:text-[#E11D48] transition-colors"
        >
          Clear
        </button>
      )}
    </div>
  );
}
