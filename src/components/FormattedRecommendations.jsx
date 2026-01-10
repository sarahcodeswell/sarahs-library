import React, { useMemo } from 'react';
import { Sparkles, RotateCcw } from 'lucide-react';
import { parseRecommendations } from '../lib/recommendationService';
import RecommendationCard from './RecommendationCard';

/**
 * RecommendationActionPanel - Shows "Find Me More" + "New Search" buttons after recommendations
 */
function RecommendationActionPanel({ onShowMore, onNewSearch }) {
  return (
    <div className="mt-4 flex gap-2">
      <button
        onClick={() => onShowMore && onShowMore()}
        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#5F7252] text-white rounded-lg text-sm font-medium hover:bg-[#4A5940] transition-colors"
      >
        <Sparkles className="w-4 h-4" />
        Find Me More Like These
      </button>
      <button
        onClick={() => onNewSearch && onNewSearch()}
        className="px-4 py-2.5 bg-white text-[#5F7252] border border-[#D4DAD0] rounded-lg text-sm font-medium hover:bg-[#F8F6EE] transition-colors inline-flex items-center justify-center gap-2"
      >
        <RotateCcw className="w-4 h-4" />
        New Search
      </button>
    </div>
  );
}

/**
 * FormattedRecommendations - Parses and displays structured book recommendations
 * 
 * Props:
 * - text: The raw recommendation text from Claude
 * - chatMode: Current chat mode
 * - onActionPanelInteraction: Callback for action panel interactions
 * - user: Current authenticated user
 * - readingQueue: User's reading queue
 * - userRecommendations: User's saved recommendations
 * - onAddToQueue: Callback to add book to queue
 * - onRemoveFromQueue: Callback to remove book from queue
 * - onShowAuthModal: Callback to show auth modal
 */
export default function FormattedRecommendations({ 
  text, 
  chatMode, 
  onActionPanelInteraction,
  onNewSearch,
  user, 
  readingQueue, 
  userRecommendations, 
  onAddToQueue, 
  onRemoveFromQueue, 
  onShowAuthModal 
}) {
  const recommendations = useMemo(() => parseRecommendations(String(text || '')), [text]);
  
  // Extract the header (everything before the first recommendation)
  const header = useMemo(() => {
    const lines = String(text || '').split('\n');
    const headerLines = [];
    for (const line of lines) {
      // Stop at the first recommendation indicator
      if (line.includes('Title:') || line.match(/^\*\*[^*]+\*\*$/) || line.includes('[RECOMMENDATION')) {
        break;
      }
      // Skip lines that look like book titles (bold text at start)
      if (line.match(/^\*\*[^*]+\*\*/)) {
        break;
      }
      headerLines.push(line);
    }
    let headerText = headerLines.join('\n').trim();
    // Remove any recommendation markers
    headerText = headerText.replace(/\*\*RECOMMENDATION\s+\d+\*\*/gi, '').trim();
    // Remove any trailing book titles that got captured
    headerText = headerText.replace(/\*\*[^*]+\*\*\s*$/, '').trim();
    return headerText;
  }, [text]);
  
  return (
    <div className="space-y-3">
      {header && (
        <p className="text-sm font-medium text-[#4A5940]">{header}</p>
      )}
      {recommendations.map((rec, idx) => (
        <RecommendationCard 
          key={idx} 
          rec={rec} 
          chatMode={chatMode}
          user={user}
          readingQueue={readingQueue}
          userRecommendations={userRecommendations}
          onAddToQueue={onAddToQueue}
          onRemoveFromQueue={onRemoveFromQueue}
          onShowAuthModal={onShowAuthModal}
        />
      ))}
      
      {/* Action panel appears after recommendations */}
      {recommendations.length > 0 && (
        <RecommendationActionPanel 
          onShowMore={() => onActionPanelInteraction && onActionPanelInteraction('show_more', null, recommendations)}
          onNewSearch={onNewSearch}
        />
      )}
    </div>
  );
}
