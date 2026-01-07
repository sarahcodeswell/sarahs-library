import React, { useState, useMemo } from 'react';
import { ArrowLeft, Inbox, Check, X, Archive, Trash2, BookMarked, Library, ExternalLink, Sparkles } from 'lucide-react';
import { useReceivedRecommendations } from '../contexts/ReceivedRecommendationsContext';
import { useReadingQueue } from '../contexts/ReadingQueueContext';

export default function BooksSharedWithMePage({ onNavigate, user }) {
  const { receivedRecommendations, isLoading, acceptRecommendation, declineRecommendation, deleteRecommendation } = useReceivedRecommendations();
  const { addToQueue } = useReadingQueue();
  const [activeTab, setActiveTab] = useState('pending');
  const [processingId, setProcessingId] = useState(null);

  // Filter recommendations by status
  const filteredRecommendations = useMemo(() => {
    return receivedRecommendations.filter(rec => rec.status === activeTab);
  }, [receivedRecommendations, activeTab]);

  // Get counts for tabs
  const counts = useMemo(() => {
    const pending = receivedRecommendations.filter(r => r.status === 'pending').length;
    const accepted = receivedRecommendations.filter(r => r.status === 'accepted').length;
    const declined = receivedRecommendations.filter(r => r.status === 'declined').length;
    return { pending, accepted, declined };
  }, [receivedRecommendations]);

  const handleAccept = async (recommendation) => {
    setProcessingId(recommendation.id);
    
    const result = await acceptRecommendation(recommendation.id, async () => {
      return await addToQueue({
        book_title: recommendation.book_title,
        book_author: recommendation.book_author,
        book_isbn: recommendation.book_isbn,
        status: 'want_to_read',
        recommended_by: recommendation.recommender_name,
        recommendation_note: recommendation.recommendation_note,
        received_recommendation_id: recommendation.id
      });
    });

    setProcessingId(null);

    if (!result.success) {
      alert('Failed to accept recommendation. Please try again.');
    }
  };

  const handleDecline = async (recommendation) => {
    setProcessingId(recommendation.id);
    const result = await declineRecommendation(recommendation.id);
    setProcessingId(null);

    if (!result.success) {
      alert('Failed to decline recommendation. Please try again.');
    }
  };

  const handleDelete = async (recommendation) => {
    if (!confirm('Are you sure you want to delete this recommendation? This cannot be undone.')) {
      return;
    }

    setProcessingId(recommendation.id);
    const result = await deleteRecommendation(recommendation.id);
    setProcessingId(null);

    if (!result.success) {
      alert('Failed to delete recommendation. Please try again.');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return date.toLocaleDateString();
  };

  const tabs = [
    { id: 'pending', label: 'Pending', count: counts.pending, icon: Inbox },
    { id: 'accepted', label: 'Accepted', count: counts.accepted, icon: Check },
    { id: 'declined', label: 'Declined', count: counts.declined, icon: X },
  ];

  if (!user) {
    return (
      <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #FDFBF4 0%, #FBF9F0 50%, #F5EFDC 100%)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <div className="text-center py-12">
            <Inbox className="w-16 h-16 text-[#96A888] mx-auto mb-4" />
            <h2 className="text-2xl font-serif text-[#4A5940] mb-2">Sign in to view recommendations</h2>
            <p className="text-[#7A8F6C]">See books that friends have shared with you</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #FDFBF4 0%, #FBF9F0 50%, #F5EFDC 100%)' }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => onNavigate('home')}
            className="inline-flex items-center gap-2 text-[#5F7252] hover:text-[#4A5940] mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Home</span>
          </button>
          
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-8 h-8 text-[#5F7252]" />
            <h1 className="text-3xl font-serif text-[#4A5940]">Books Shared with Me</h1>
          </div>
          <p className="text-[#7A8F6C]">Recommendations from friends and fellow readers</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-[#E8EBE4]">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-[#5F7252] text-[#4A5940]'
                  : 'border-transparent text-[#96A888] hover:text-[#5F7252]'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="font-medium">{tab.label}</span>
              {tab.count > 0 && (
                <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold flex items-center justify-center ${
                  activeTab === tab.id ? 'bg-[#5F7252] text-white' : 'bg-[#E8EBE4] text-[#7A8F6C]'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-[#E8EBE4] border-t-[#5F7252] rounded-full animate-spin mb-4"></div>
            <p className="text-[#7A8F6C]">Loading recommendations...</p>
          </div>
        ) : filteredRecommendations.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-[#E8EBE4]">
            <Inbox className="w-12 h-12 text-[#D4DAD0] mx-auto mb-3" />
            <h3 className="text-lg font-medium text-[#4A5940] mb-1">
              {activeTab === 'pending' && 'No pending recommendations'}
              {activeTab === 'accepted' && 'No accepted recommendations'}
              {activeTab === 'declined' && 'No declined recommendations'}
            </h3>
            <p className="text-sm text-[#7A8F6C]">
              {activeTab === 'pending' && 'When friends share books with you, they\'ll appear here'}
              {activeTab === 'accepted' && 'Books you\'ve accepted will be shown here'}
              {activeTab === 'declined' && 'Books you\'ve declined will be shown here'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRecommendations.map(recommendation => (
              <div
                key={recommendation.id}
                className="bg-white rounded-xl border border-[#E8EBE4] p-5 hover:shadow-md transition-shadow"
              >
                {/* Book Info */}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-[#4A5940] mb-1">
                    {recommendation.book_title}
                  </h3>
                  {recommendation.book_author && (
                    <p className="text-sm text-[#7A8F6C] mb-2">by {recommendation.book_author}</p>
                  )}
                  
                  {/* Recommender Info */}
                  <div className="flex items-center gap-2 text-xs text-[#96A888] mb-3">
                    <span>Recommended by <strong className="text-[#5F7252]">{recommendation.recommender_name}</strong></span>
                    <span>•</span>
                    <span>{formatDate(recommendation.received_at)}</span>
                  </div>

                  {/* Recommendation Note */}
                  {recommendation.recommendation_note && (
                    <div className="bg-[#F8F6EE] rounded-lg p-3 mb-3">
                      <p className="text-sm text-[#4A5940] italic">"{recommendation.recommendation_note}"</p>
                    </div>
                  )}

                  {/* Description */}
                  {recommendation.book_description && (
                    <p className="text-sm text-[#7A8F6C] line-clamp-3">{recommendation.book_description}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  {activeTab === 'pending' && (
                    <>
                      <button
                        onClick={() => handleAccept(recommendation)}
                        disabled={processingId === recommendation.id}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#5F7252] text-white rounded-lg hover:bg-[#4A5940] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <BookMarked className="w-4 h-4" />
                        <span className="text-sm font-medium">Add to Queue</span>
                      </button>
                      <button
                        onClick={() => handleDecline(recommendation)}
                        disabled={processingId === recommendation.id}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-[#E8EBE4] text-[#7A8F6C] rounded-lg hover:border-[#D4DAD0] hover:text-[#4A5940] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <X className="w-4 h-4" />
                        <span className="text-sm font-medium">Decline</span>
                      </button>
                    </>
                  )}
                  
                  {activeTab === 'accepted' && (
                    <button
                      onClick={() => onNavigate('reading-queue')}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#5F7252] text-white rounded-lg hover:bg-[#4A5940] transition-colors"
                    >
                      <Library className="w-4 h-4" />
                      <span className="text-sm font-medium">View in Queue</span>
                    </button>
                  )}

                  {activeTab === 'declined' && (
                    <button
                      onClick={() => handleAccept(recommendation)}
                      disabled={processingId === recommendation.id}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#5F7252] text-white rounded-lg hover:bg-[#4A5940] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <BookMarked className="w-4 h-4" />
                      <span className="text-sm font-medium">Add to Queue</span>
                    </button>
                  )}

                  {/* Delete button for all tabs */}
                  <button
                    onClick={() => handleDelete(recommendation)}
                    disabled={processingId === recommendation.id}
                    className="ml-auto inline-flex items-center gap-2 px-3 py-2 text-[#96A888] hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
