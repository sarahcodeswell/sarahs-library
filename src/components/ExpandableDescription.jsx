import React, { useState, useRef, useEffect } from 'react';

/**
 * Expandable description component with inline "read more" / "show less" link
 * Shows text clamped to specified lines with option to expand
 */
export function ExpandableDescription({ text, className = '', clampLines = 4, textSize = 'text-xs' }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsExpansion, setNeedsExpansion] = useState(false);
  const textRef = useRef(null);
  
  useEffect(() => {
    if (textRef.current) {
      // Check if text is truncated (scrollHeight > clientHeight)
      setNeedsExpansion(textRef.current.scrollHeight > textRef.current.clientHeight);
    }
  }, [text]);
  
  // Determine clamp class based on clampLines prop
  const clampClass = isExpanded ? '' : `line-clamp-${clampLines}`;
  
  return (
    <div className={className}>
      <p 
        ref={textRef}
        className={`${textSize} text-[#5F7252] leading-relaxed ${clampClass}`}
      >
        {text}
      </p>
      {needsExpansion && !isExpanded && (
        <button 
          onClick={() => setIsExpanded(true)}
          className={`${textSize} text-[#7A8F6C] hover:text-[#5F7252] font-medium mt-1`}
        >
          read more
        </button>
      )}
      {isExpanded && (
        <button 
          onClick={() => setIsExpanded(false)}
          className={`${textSize} text-[#7A8F6C] hover:text-[#5F7252] font-medium mt-1`}
        >
          show less
        </button>
      )}
    </div>
  );
}

export default ExpandableDescription;
