import React, { useState, useRef, useEffect } from 'react';
import { Heart, HelpCircle } from 'lucide-react';

// Gradient heart colors from lightest to full dusty rose (#C97B7B)
const heartColors = {
  1: { fill: '#F5E8E8', stroke: '#F5E8E8' },  // Barely there blush
  2: { fill: '#E8CBCB', stroke: '#E8CBCB' },  // Soft rose
  3: { fill: '#DBADAD', stroke: '#DBADAD' },  // Medium rose
  4: { fill: '#CE9494', stroke: '#CE9494' },  // Warm rose
  5: { fill: '#C97B7B', stroke: '#C97B7B' },  // Signature dusty rose
};

const emptyColor = { fill: 'none', stroke: '#D4DAD0' };

// Rating legend descriptions
const ratingLabels = {
  1: 'Not my cup of tea',
  2: 'Had some good moments',
  3: 'Solid read, glad I read it',
  4: 'Really loved this one',
  5: 'All-time favorite',
};

// Rating Legend Popover Component
function RatingLegend({ isOpen, onClose, anchorRef }) {
  const popoverRef = useRef(null);
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target) &&
          anchorRef.current && !anchorRef.current.contains(event.target)) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, anchorRef]);
  
  if (!isOpen) return null;
  
  return (
    <div 
      ref={popoverRef}
      className="absolute left-0 top-full mt-2 z-50 bg-white rounded-xl shadow-lg border border-[#E8EBE4] p-4 w-64"
    >
      <div className="text-xs font-medium text-[#4A5940] mb-3">Rating Guide</div>
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((value) => (
          <div key={value} className="flex items-center gap-4">
            <div className="flex items-center gap-0.5 flex-shrink-0">
              {[1, 2, 3, 4, 5].map((heart) => (
                <Heart
                  key={heart}
                  className="w-3.5 h-3.5"
                  style={{
                    fill: heart <= value ? heartColors[heart].fill : 'none',
                    color: heart <= value ? heartColors[heart].stroke : '#D4DAD0',
                  }}
                />
              ))}
            </div>
            <span className="text-xs text-[#5F7252] italic text-right flex-1">
              {ratingLabels[value]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StarRating({ rating, onRatingChange, readOnly = false, size = 'md', showLegend = false }) {
  const [hoverRating, setHoverRating] = useState(0);
  const [legendOpen, setLegendOpen] = useState(false);
  const legendButtonRef = useRef(null);
  
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
  
  // Get the color based on the heart's position (gradient effect)
  const getHeartColor = (value) => {
    if (value <= displayRating) {
      // Each heart has its own color in the gradient
      return heartColors[value];
    }
    return emptyColor;
  };
  
  return (
    <div className="flex items-center gap-1 relative">
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
              ${!readOnly && 'focus:outline-none focus:ring-2 focus:ring-[#C97B7B] focus:ring-offset-1 rounded'}
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
          className="ml-2 text-xs text-[#96A888] hover:text-[#C97B7B] transition-colors"
        >
          Clear
        </button>
      )}
      {showLegend && !readOnly && (
        <button
          ref={legendButtonRef}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setLegendOpen(!legendOpen);
          }}
          className="ml-1 p-0.5 text-[#96A888] hover:text-[#7A8F6C] transition-colors"
          aria-label="Rating guide"
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>
      )}
      <RatingLegend 
        isOpen={legendOpen} 
        onClose={() => setLegendOpen(false)} 
        anchorRef={legendButtonRef}
      />
    </div>
  );
}
