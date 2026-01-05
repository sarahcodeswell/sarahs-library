import React from 'react';
import { ShoppingBag, Star, Share2, Bookmark } from 'lucide-react';

/**
 * FormattedText - Renders text with inline icons and bold formatting
 * 
 * Props:
 * - text: The text to format
 */
export default function FormattedText({ text }) {
  const lines = String(text || '').split('\n');

  const renderLineWithIcons = (line) => {
    // Replace icon markers with actual Lucide icons
    let currentText = line;
    let key = 0;

    // Check for icon markers and replace with components
    const iconMap = {
      '[shopping-bag]': <ShoppingBag key={key++} className="w-3.5 h-3.5 inline-block align-text-bottom" />,
      '[star]': <Star key={key++} className="w-3.5 h-3.5 inline-block align-text-bottom" />,
      '[share]': <Share2 key={key++} className="w-3.5 h-3.5 inline-block align-text-bottom" />,
      '[bookmark]': <Bookmark key={key++} className="w-3.5 h-3.5 inline-block align-text-bottom" />
    };

    // Split by icon markers and rebuild with components
    Object.entries(iconMap).forEach(([marker, icon]) => {
      if (currentText.includes(marker)) {
        const segments = currentText.split(marker);
        const newParts = [];
        segments.forEach((segment, idx) => {
          if (idx > 0) newParts.push(icon);
          newParts.push(segment);
        });
        currentText = newParts;
      }
    });

    // Handle bold text
    const renderInlineBold = (content) => {
      if (typeof content === 'string') {
        const boldParts = content.split('**');
        return boldParts.map((part, idx) =>
          idx % 2 === 1 ? <strong key={`bold-${idx}`}>{part}</strong> : <React.Fragment key={`text-${idx}`}>{part}</React.Fragment>
        );
      }
      return content;
    };

    if (Array.isArray(currentText)) {
      return currentText.map((part, idx) => (
        <React.Fragment key={idx}>{renderInlineBold(part)}</React.Fragment>
      ));
    }

    return renderInlineBold(currentText);
  };

  return (
    <>
      {lines.map((line, idx) => (
        <React.Fragment key={idx}>
          {renderLineWithIcons(line)}
          {idx < lines.length - 1 && <br />}
        </React.Fragment>
      ))}
    </>
  );
}
