import React, { useState } from 'react';
import { ArrowLeft, Share2, Copy, Trash2, Eye, Clock, Library, Pencil } from 'lucide-react';
import { track } from '@vercel/analytics';
import { useRecommendations } from '../contexts/RecommendationContext';
import { useBookEnrichment } from './BookCard';
import ShareModal from './ShareModal';

// Individual recommendation card with enrichment
function RecommendationBookCard({ recommendation, onShare, onDelete, onStartEdit, editingId, editNote, setEditNote, onSaveEdit, onCancelEdit, copyFeedback, formatDate }) {
  const shareData = recommendation.shared_recommendations?.[0];
  const hasBeenShared = !!shareData;
  const viewCount = shareData?.view_count || 0;
  
  // Auto-enrich with cover and genres
  const { coverUrl, genres, isEnriching } = useBookEnrichment(
    recommendation.book_title,
    recommendation.book_author,
    null,
    []
  );

  return (
    <div className="bg-[#F8F6EE] rounded-xl border border-[#D4DAD0] p-5 hover:shadow-md transition-shadow">
      <div className="flex gap-3 mb-3">
        {/* Cover Image */}
        {coverUrl ? (
          <div className="flex-shrink-0">
            <img 
              src={coverUrl} 
              alt={`Cover of ${recommendation.book_title}`}
              className="w-12 h-18 object-cover rounded shadow-sm"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
        ) : isEnriching ? (
          <div className="flex-shrink-0 w-12 h-18 bg-[#E8EBE4] rounded animate-pulse" />
        ) : null}
        
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-[#4A5940] mb-0.5">
            {recommendation.book_title}
          </h3>
          {recommendation.book_author && (
            <p className="text-xs text-[#7A8F6C] font-light">
              {recommendation.book_author}
            </p>
          )}
          
          {/* Genres */}
          {genres?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {genres.slice(0, 3).map((genre, idx) => (
                <span 
                  key={idx}
                  className="px-1.5 py-0.5 text-[10px] bg-[#E8EBE4] text-[#5F7252] rounded"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {editingId === recommendation.id ? (
        <div className="mb-3">
          <textarea
            value={editNote}
            onChange={(e) => setEditNote(e.target.value)}
            placeholder="Why do you recommend this book?"
            className="w-full px-3 py-2 rounded-lg border border-[#D4DAD0] bg-white text-[#4A5940] placeholder-[#96A888] text-sm focus:outline-none focus:ring-2 focus:ring-[#5F7252] focus:border-transparent resize-none"
            rows={3}
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => onSaveEdit(recommendation)}
              className="px-3 py-1.5 bg-[#5F7252] text-white rounded-lg text-sm font-medium hover:bg-[#4A5940] transition-colors"
            >
              Save
            </button>
            <button
              onClick={onCancelEdit}
              className="px-3 py-1.5 border border-[#D4DAD0] text-[#5F7252] rounded-lg text-sm font-medium hover:bg-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : recommendation.recommendation_note ? (
        <div className="mb-3 p-3 bg-white/50 rounded-lg border border-[#E8EBE4]">
          <p className="text-sm text-[#5F7252] leading-relaxed">
            "{recommendation.recommendation_note}"
          </p>
        </div>
      ) : (
        <button
          onClick={() => onStartEdit(recommendation)}
          className="mb-3 text-sm text-[#96A888] hover:text-[#5F7252] transition-colors"
        >
          + Add a note about why you recommend this book
        </button>
      )}

      <div className="flex items-center justify-between text-xs text-[#96A888] mb-3">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDate(recommendation.created_at)}
          </span>
          {hasBeenShared && viewCount > 0 && (
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {viewCount} {viewCount === 1 ? 'view' : 'views'}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onShare(recommendation)}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-[#5F7252] text-white hover:bg-[#4A5940] flex items-center gap-2"
        >
          {copyFeedback[recommendation.id] ? (
            <>
              <Copy className="w-3.5 h-3.5" />
              Copied!
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5" />
              Share
            </>
          )}
        </button>
        {editingId !== recommendation.id && recommendation.recommendation_note && (
          <button
            onClick={() => onStartEdit(recommendation)}
            className="p-2 rounded-lg text-[#96A888] hover:text-[#5F7252] hover:bg-white transition-colors"
            title="Edit note"
          >
            <Pencil className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={() => onDelete(recommendation)}
          className="p-2 rounded-lg text-[#96A888] hover:text-red-600 hover:bg-red-50 transition-colors"
          title="Delete recommendation"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function MyRecommendationsPage({ onNavigate, user, onShowAuthModal }) {
  const { recommendations, isLoading, deleteRecommendation, getShareLink, updateRecommendation } = useRecommendations();
  const [copyFeedback, setCopyFeedback] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editNote, setEditNote] = useState('');
  const [shareModalData, setShareModalData] = useState(null);

  const handleShare = async (recommendation) => {
    const result = await getShareLink(recommendation.id);
    
    if (result.success && result.data?.shareUrl) {
      // Open custom share modal
      setShareModalData({
        shareUrl: result.data.shareUrl,
        bookTitle: recommendation.book_title,
        bookAuthor: recommendation.book_author,
        note: recommendation.recommendation_note
      });
      
      track('recommendation_share_opened', {
        book_title: recommendation.book_title
      });
    } else {
      alert('Failed to generate share link. Please try again.');
    }
  };

  const handleDelete = async (recommendation) => {
    if (!confirm(`Remove your recommendation for "${recommendation.book_title}"?`)) {
      return;
    }

    const result = await deleteRecommendation(recommendation.id);
    
    if (result.success) {
      track('recommendation_deleted', {
        book_title: recommendation.book_title
      });
    } else {
      alert('Failed to delete recommendation. Please try again.');
    }
  };

  const handleStartEdit = (recommendation) => {
    setEditingId(recommendation.id);
    setEditNote(recommendation.recommendation_note || '');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditNote('');
  };

  const handleSaveEdit = async (recommendation) => {
    if (updateRecommendation) {
      const result = await updateRecommendation(recommendation.id, editNote);
      if (result.success) {
        track('recommendation_edited', { book_title: recommendation.book_title });
        setEditingId(null);
        setEditNote('');
      } else {
        alert('Failed to save changes. Please try again.');
      }
    } else {
      alert('Edit functionality not available.');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FDFBF4] via-[#FBF9F0] to-[#F5EFDC] flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-serif text-[#4A5940] mb-4">Sign in to view your recommendations</h2>
          <button
            onClick={onShowAuthModal}
            className="px-6 py-2 bg-[#5F7252] text-white rounded-lg hover:bg-[#4A5940] transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FDFBF4] via-[#FBF9F0] to-[#F5EFDC]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => onNavigate('home')}
          className="mb-6 flex items-center gap-2 text-[#5F7252] hover:text-[#4A5940] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-serif text-[#4A5940] mb-2">Books I've Shared</h1>
          <p className="text-[#7A8F6C]">
            {recommendations.length} {recommendations.length === 1 ? 'book' : 'books'} you've shared with friends
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-[#7A8F6C] text-sm">Loading your recommendations...</p>
          </div>
        ) : recommendations.length === 0 ? (
          <div className="text-center py-12">
            <div className="max-w-sm mx-auto">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#5F7252]/10 flex items-center justify-center">
                <Share2 className="w-8 h-8 text-[#5F7252]" />
              </div>
              <h3 className="font-medium text-[#4A5940] mb-2">No recommendations shared yet</h3>
              <p className="text-[#7A8F6C] text-sm mb-4">
                Found a book you love? Share it with friends! Rate books in your Collection to get started.
              </p>
              <button
                onClick={() => onNavigate('collection')}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#5F7252] text-white rounded-lg text-sm font-medium hover:bg-[#4A5940] transition-colors"
              >
                <Library className="w-4 h-4" />
                Go to My Collection
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {recommendations.map((recommendation) => (
              <RecommendationBookCard
                key={recommendation.id}
                recommendation={recommendation}
                onShare={handleShare}
                onDelete={handleDelete}
                onStartEdit={handleStartEdit}
                editingId={editingId}
                editNote={editNote}
                setEditNote={setEditNote}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={handleCancelEdit}
                copyFeedback={copyFeedback}
                formatDate={formatDate}
              />
            ))}
          </div>
        )}
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={!!shareModalData}
        onClose={() => setShareModalData(null)}
        shareUrl={shareModalData?.shareUrl || ''}
        bookTitle={shareModalData?.bookTitle || ''}
        bookAuthor={shareModalData?.bookAuthor || ''}
        note={shareModalData?.note || ''}
      />
    </div>
  );
}
