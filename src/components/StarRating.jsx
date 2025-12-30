import React, { useState } from 'react';
import { Star } from 'lucide-react';

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
  
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((value) => {
        const isFilled = value <= displayRating;
        
        return (
          <button
            key={value}
            type="button"
            onClick={() => handleClick(value)}
            onMouseEnter={() => handleMouseEnter(value)}
            onMouseLeave={handleMouseLeave}
            disabled={readOnly}
            className={`
              transition-all
              ${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}
              ${!readOnly && 'focus:outline-none focus:ring-2 focus:ring-[#5F7252] focus:ring-offset-1 rounded'}
            `}
            aria-label={`Rate ${value} star${value !== 1 ? 's' : ''}`}
          >
            <Star
              className={`
                ${iconSize}
                transition-colors
                ${isFilled 
                  ? 'fill-[#F59E0B] text-[#F59E0B]' 
                  : 'fill-none text-[#D4DAD0]'
                }
                ${!readOnly && hoverRating >= value && 'fill-[#FBBF24] text-[#FBBF24]'}
              `}
            />
          </button>
        );
      })}
      {!readOnly && rating && (
        <button
          type="button"
          onClick={() => onRatingChange(null)}
          className="ml-2 text-xs text-[#96A888] hover:text-[#5F7252] transition-colors"
        >
          Clear
        </button>
      )}
    </div>
  );
}
