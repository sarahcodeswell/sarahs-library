import React from 'react';
import { Library, Sparkles } from 'lucide-react';
import FormattedText from './FormattedText';
import FormattedRecommendations from './FormattedRecommendations';

// Check if message contains structured recommendations
function hasStructuredRecommendations(text) {
  const t = String(text || '');
  return t.includes('Title:') && (t.includes('Author:') || t.includes('Why This Fits:') || t.includes('Why:') || t.includes('Description:') || t.includes('Reputation:'));
}

/**
 * ChatMessage - Displays a single chat message (user or Sarah)
 * 
 * Props:
 * - message: The message text
 * - isUser: Whether this is a user message
 * - chatMode: Current chat mode
 * - onActionPanelInteraction: Callback for action panel interactions
 * - user: Current authenticated user
 * - readingQueue: User's reading queue
 * - userRecommendations: User's saved recommendations
 * - onAddToQueue: Callback to add book to queue
 * - onRemoveFromQueue: Callback to remove book from queue
 * - onShowAuthModal: Callback to show auth modal
 */
export default function ChatMessage({ 
  message, 
  isUser, 
  chatMode, 
  onActionPanelInteraction, 
  user, 
  readingQueue, 
  userRecommendations, 
  onAddToQueue, 
  onRemoveFromQueue, 
  onShowAuthModal 
}) {
  const isStructured = !isUser && hasStructuredRecommendations(message);
  const isWelcomeMessage = !isUser && message.includes("Hi, I'm Sarah!");

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      {!isUser && (
        <img 
          src="/sarah.png" 
          alt="Sarah"
          className="w-10 h-10 rounded-full object-cover mr-3 border-2 border-[#D4DAD0] flex-shrink-0"
        />
      )}
      <div className={`max-w-[85%] sm:max-w-[75%] ${
        isUser 
          ? 'bg-[#5F7252] text-white rounded-2xl rounded-br-sm px-5 py-3' 
          : 'bg-[#F8F6EE] text-[#4A5940] rounded-2xl rounded-bl-sm px-5 py-3'
      }`}>
        {isStructured ? (
          <FormattedRecommendations 
            text={message} 
            chatMode={chatMode} 
            onActionPanelInteraction={onActionPanelInteraction}
            user={user}
            readingQueue={readingQueue}
            userRecommendations={userRecommendations}
            onAddToQueue={onAddToQueue}
            onRemoveFromQueue={onRemoveFromQueue}
            onShowAuthModal={onShowAuthModal}
          />
        ) : isWelcomeMessage ? (
          <div className="text-sm leading-relaxed">
            <p className="mb-3">Hi, I'm Sarah!</p>
            <p className="mb-3">I'm a voracious reader who knows what makes a great story. Browse my curated collections below—or ask me anything.</p>
            <p>Each recommendation is labeled: <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#5F7252]/10 text-[#5F7252] text-[10px] font-semibold"><Library className="w-3 h-3" />Curator's Pick</span> means it's from my personal collection, while <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#7A8F6C]/10 text-[#7A8F6C] text-[10px] font-semibold"><Sparkles className="w-3 h-3" />World Discovery</span> means I found it just for you.</p>
          </div>
        ) : (
          <div className="text-sm leading-relaxed">
            <FormattedText text={message} />
          </div>
        )}
      </div>
    </div>
  );
}
