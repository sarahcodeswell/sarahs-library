import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, BookOpen, BookMarked, Heart, Share2, UserPlus, RefreshCw, TrendingUp, MapPin, Calendar, BarChart3, Download, X, Check, Clock, Mail, Send, MessageSquare, Library } from 'lucide-react';
import { supabase } from '../lib/supabase';

const PERIODS = [
  { value: '1d', label: 'Last 24h' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'lifetime', label: 'All time' }
];

function StatCard({ title, value, subtitle, icon: Icon, color = 'bg-[#5F7252]', onClick }) {
  return (
    <div 
      className={`bg-white rounded-xl border border-[#E8EBE4] p-4 sm:p-5 ${onClick ? 'cursor-pointer hover:border-[#5F7252] hover:shadow-md transition-all' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 ${color}/10 rounded-lg`}>
          <Icon className={`w-5 h-5 ${color.replace('bg-', 'text-')}`} />
        </div>
        {onClick && <span className="text-xs text-[#96A888]">Click to view</span>}
      </div>
      <div className="text-2xl font-semibold text-[#4A5940] mb-1">{value}</div>
      <div className="text-sm font-medium text-[#5F7252]">{title}</div>
      {subtitle && <div className="text-xs text-[#96A888] mt-1">{subtitle}</div>}
    </div>
  );
}

function DetailModal({ isOpen, onClose, title, type, icon: Icon }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userBooks, setUserBooks] = useState(null);
  const [noteModal, setNoteModal] = useState({ isOpen: false, book: null });
  const [noteContent, setNoteContent] = useState('');
  const [sendingNote, setSendingNote] = useState(false);
  const [sentNotes, setSentNotes] = useState(new Set());

  useEffect(() => {
    if (!isOpen) {
      setSelectedUser(null);
      setUserBooks(null);
      return;
    }
    
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        const response = await fetch(`/api/admin/details?type=${type}`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });

        if (response.ok) {
          const result = await response.json();
          setData(result.data);
        }
      } catch (err) {
        console.error('Error fetching details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [isOpen, type]);

  const fetchUserDetails = async (detailType, userId, email) => {
    setSelectedUser({ userId, email });
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(`/api/admin/details?type=${detailType}&userId=${userId}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (response.ok) {
        const result = await response.json();
        setUserBooks(result.data);
      }
    } catch (err) {
      console.error('Error fetching user details:', err);
    } finally {
      setLoading(false);
    }
  };

  const sendNote = async () => {
    if (!noteContent.trim() || !noteModal.book || !selectedUser) return;
    
    setSendingNote(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch('/api/admin/send-note', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: selectedUser.userId,
          userEmail: selectedUser.email,
          bookId: noteModal.book.bookId,
          bookTitle: noteModal.book.title,
          bookAuthor: noteModal.book.author,
          noteContent: noteContent.trim()
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        // Use queueId as unique identifier (bookId can be null)
        setSentNotes(prev => new Set([...prev, noteModal.book.queueId || noteModal.book.bookId]));
        setNoteModal({ isOpen: false, book: null });
        setNoteContent('');
        alert(result.message || 'Note sent!');
      } else {
        alert(result.error || 'Failed to send note');
      }
    } catch (err) {
      console.error('Error sending note:', err);
      alert('Failed to send note');
    } finally {
      setSendingNote(false);
    }
  };

  if (!isOpen) return null;

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 text-[#5F7252] animate-spin" />
        </div>
      );
    }

    if (!data || data.length === 0) {
      return <p className="text-center text-[#96A888] py-8">No data available</p>;
    }

    switch (type) {
      case 'users':
        return (
          <div className="divide-y divide-[#E8EBE4] max-h-96 overflow-y-auto">
            {data.map((u, i) => (
              <div key={i} className="py-2.5 flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#4A5940]">{u.email}</p>
                  {u.createdAt && <p className="text-xs text-[#96A888]">Joined {new Date(u.createdAt).toLocaleDateString()}</p>}
                </div>
                {u.hasProfile ? (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Profile</span>
                ) : (
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">No profile</span>
                )}
              </div>
            ))}
          </div>
        );

      case 'profiles':
        return (
          <div className="divide-y divide-[#E8EBE4] max-h-96 overflow-y-auto">
            {data.map((p, i) => (
              <div key={i} className="py-2.5">
                <p className="text-sm text-[#4A5940] font-medium">{p.email}</p>
                <div className="text-xs text-[#7A8F6C] mt-1 space-y-0.5">
                  {p.city && <p>📍 {[p.city, p.state, p.country].filter(Boolean).join(', ')}</p>}
                  {p.birthYear && <p>🎂 Born {p.birthYear}</p>}
                  {p.genres?.length > 0 && <p>📚 {p.genres.slice(0, 3).join(', ')}</p>}
                  {p.bookstore && <p>🏪 {p.bookstore}</p>}
                </div>
              </div>
            ))}
          </div>
        );

      case 'queue':
        // If viewing a specific user's books
        if (selectedUser && userBooks) {
          return (
            <div>
              <button
                onClick={() => { setSelectedUser(null); setUserBooks(null); }}
                className="text-xs text-[#5F7252] hover:text-[#4A5940] mb-3 flex items-center gap-1"
              >
                ← Back to all users
              </button>
              <p className="text-sm font-medium text-[#4A5940] mb-3">{selectedUser.email}'s Queue</p>
              <div className="divide-y divide-[#E8EBE4] max-h-80 overflow-y-auto">
                {userBooks.books?.map((b, i) => (
                  <div key={i} className="py-2.5 flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#4A5940] font-medium">{b.title}</p>
                      <p className="text-xs text-[#7A8F6C]">by {b.author}</p>
                      {b.addedAt && <p className="text-xs text-[#96A888] mt-1">{new Date(b.addedAt).toLocaleDateString()}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {b.owned && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Owned</span>}
                      {b.priority && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Priority</span>}
                      {(b.noteSent || sentNotes.has(b.queueId || b.bookId)) ? (
                        <button
                          onClick={() => setNoteModal({ isOpen: true, book: b, viewOnly: true })}
                          className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded flex items-center gap-1 hover:bg-green-200 transition-colors"
                          title="Click to view note"
                        >
                          <Check className="w-3 h-3" /> Sent
                        </button>
                      ) : (
                        <button
                          onClick={() => setNoteModal({ isOpen: true, book: b, viewOnly: false })}
                          className="text-xs bg-[#5F7252] text-white px-2 py-1 rounded hover:bg-[#4A5940] transition-colors flex items-center gap-1"
                        >
                          <MessageSquare className="w-3 h-3" /> Note
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        }
        // Show users with book counts
        return (
          <div className="divide-y divide-[#E8EBE4] max-h-96 overflow-y-auto">
            {data.map((u, i) => (
              <button
                key={i}
                onClick={() => fetchUserDetails('queue-user', u.userId, u.email)}
                className="w-full py-2.5 flex items-center justify-between hover:bg-[#F8F6EE] transition-colors text-left px-1 -mx-1 rounded"
              >
                <p className="text-sm text-[#4A5940]">{u.email}</p>
                <span className="text-xs bg-[#E8EBE4] text-[#5F7252] px-2 py-0.5 rounded-full font-medium">
                  {u.bookCount} {u.bookCount === 1 ? 'book' : 'books'}
                </span>
              </button>
            ))}
          </div>
        );

      case 'read':
        // If viewing a specific user's books
        if (selectedUser && userBooks) {
          return (
            <div>
              <button
                onClick={() => { setSelectedUser(null); setUserBooks(null); }}
                className="text-xs text-[#5F7252] hover:text-[#4A5940] mb-3 flex items-center gap-1"
              >
                ← Back to all users
              </button>
              <p className="text-sm font-medium text-[#4A5940] mb-3">{selectedUser.email}'s Books Read</p>
              <div className="divide-y divide-[#E8EBE4] max-h-80 overflow-y-auto">
                {userBooks.books?.map((b, i) => (
                  <div key={i} className="py-2.5 flex items-start justify-between">
                    <div>
                      <p className="text-sm text-[#4A5940] font-medium">{b.title}</p>
                      <p className="text-xs text-[#7A8F6C]">by {b.author}</p>
                    </div>
                    {b.rating && (
                      <span className="text-sm text-[#C97B7B]">{'♥'.repeat(b.rating)}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        }
        // Show users with book counts
        return (
          <div className="divide-y divide-[#E8EBE4] max-h-96 overflow-y-auto">
            {data.map((u, i) => (
              <button
                key={i}
                onClick={() => fetchUserDetails('read-user', u.userId, u.email)}
                className="w-full py-2.5 flex items-center justify-between hover:bg-[#F8F6EE] transition-colors text-left px-1 -mx-1 rounded"
              >
                <p className="text-sm text-[#4A5940]">{u.email}</p>
                <span className="text-xs bg-[#E8EBE4] text-[#5F7252] px-2 py-0.5 rounded-full font-medium">
                  {u.bookCount} {u.bookCount === 1 ? 'book' : 'books'}
                </span>
              </button>
            ))}
          </div>
        );

      case 'collection':
        // If viewing a specific user's collection
        if (selectedUser && userBooks) {
          return (
            <div>
              <button
                onClick={() => { setSelectedUser(null); setUserBooks(null); }}
                className="text-xs text-[#5F7252] hover:text-[#4A5940] mb-3 flex items-center gap-1"
              >
                ← Back to all users
              </button>
              <p className="text-sm font-medium text-[#4A5940] mb-3">{selectedUser.email}'s Collection</p>
              <div className="divide-y divide-[#E8EBE4] max-h-80 overflow-y-auto">
                {userBooks.books?.map((b, i) => (
                  <div key={i} className="py-2.5 flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#4A5940] font-medium">{b.title}</p>
                      <p className="text-xs text-[#7A8F6C]">by {b.author}</p>
                      {b.addedAt && <p className="text-xs text-[#96A888] mt-1">{new Date(b.addedAt).toLocaleDateString()}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {b.status === 'read' && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Read</span>}
                      {b.rating && <span className="text-xs text-[#C97B7B]">{'♥'.repeat(b.rating)}</span>}
                      {b.inAdminCollection && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Match</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        }
        // Show users with book counts and overlap %
        return (
          <div className="divide-y divide-[#E8EBE4] max-h-96 overflow-y-auto">
            {data.map((u, i) => (
              <button
                key={i}
                onClick={() => fetchUserDetails('collection-user', u.userId, u.email)}
                className="w-full py-2.5 flex items-center justify-between hover:bg-[#F8F6EE] transition-colors text-left px-1 -mx-1 rounded"
              >
                <p className="text-sm text-[#4A5940]">{u.email}</p>
                <div className="flex items-center gap-2">
                  {u.overlapPercent > 0 && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                      {u.overlapPercent}% match
                    </span>
                  )}
                  <span className="text-xs bg-[#E8EBE4] text-[#5F7252] px-2 py-0.5 rounded-full font-medium">
                    {u.bookCount} {u.bookCount === 1 ? 'book' : 'books'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        );

      case 'waitlist':
        return (
          <div className="divide-y divide-[#E8EBE4] max-h-96 overflow-y-auto">
            {data.map((w, i) => (
              <div key={i} className="py-2.5 flex items-center justify-between">
                <p className="text-sm text-[#4A5940]">{w.email}</p>
                {w.signedUpAt && <p className="text-xs text-[#96A888]">{new Date(w.signedUpAt).toLocaleDateString()}</p>}
              </div>
            ))}
          </div>
        );

      case 'recommendations':
        // If viewing a specific user's recommendations
        if (selectedUser && userBooks) {
          return (
            <div>
              <button
                onClick={() => { setSelectedUser(null); setUserBooks(null); }}
                className="text-xs text-[#5F7252] hover:text-[#4A5940] mb-3 flex items-center gap-1"
              >
                ← Back to all users
              </button>
              <p className="text-sm font-medium text-[#4A5940] mb-3">{selectedUser.email}'s Recommendations</p>
              <div className="divide-y divide-[#E8EBE4] max-h-80 overflow-y-auto">
                {userBooks.books?.map((b, i) => (
                  <div key={i} className="py-2.5">
                    <p className="text-sm text-[#4A5940] font-medium">{b.title}</p>
                    <p className="text-xs text-[#7A8F6C]">by {b.author}</p>
                    {b.createdAt && <p className="text-xs text-[#96A888] mt-1">{new Date(b.createdAt).toLocaleDateString()}</p>}
                  </div>
                ))}
              </div>
            </div>
          );
        }
        // Show users with rec counts
        return (
          <div className="divide-y divide-[#E8EBE4] max-h-96 overflow-y-auto">
            {data.map((u, i) => (
              <button
                key={i}
                onClick={() => fetchUserDetails('recommendations-user', u.userId, u.email)}
                className="w-full py-2.5 flex items-center justify-between hover:bg-[#F8F6EE] transition-colors text-left px-1 -mx-1 rounded"
              >
                <p className="text-sm text-[#4A5940]">{u.email}</p>
                <span className="text-xs bg-[#E8EBE4] text-[#5F7252] px-2 py-0.5 rounded-full font-medium">
                  {u.recCount} {u.recCount === 1 ? 'rec' : 'recs'}
                </span>
              </button>
            ))}
          </div>
        );

      case 'referrals':
        // If viewing a specific user's referrals
        if (selectedUser && userBooks) {
          return (
            <div>
              <button
                onClick={() => { setSelectedUser(null); setUserBooks(null); }}
                className="text-xs text-[#5F7252] hover:text-[#4A5940] mb-3 flex items-center gap-1"
              >
                ← Back to all users
              </button>
              <p className="text-sm font-medium text-[#4A5940] mb-3">{selectedUser.email}'s Referrals</p>
              <div className="divide-y divide-[#E8EBE4] max-h-80 overflow-y-auto">
                {userBooks.referrals?.map((r, i) => (
                  <div key={i} className="py-2.5 flex items-start justify-between">
                    <div>
                      <p className="text-sm text-[#4A5940]">{r.invitedEmail}</p>
                      <p className="text-xs text-[#96A888] mt-0.5">
                        {r.type === 'link' ? '🔗 Link' : '📧 Email'}{r.createdAt && ` • ${new Date(r.createdAt).toLocaleDateString()}`}
                      </p>
                    </div>
                    {r.status === 'accepted' ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded flex items-center gap-1">
                        <Check className="w-3 h-3" /> Joined
                      </span>
                    ) : (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Pending
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        }
        // Show users with referral counts
        return (
          <div className="divide-y divide-[#E8EBE4] max-h-96 overflow-y-auto">
            {data.map((u, i) => (
              <button
                key={i}
                onClick={() => fetchUserDetails('referrals-user', u.userId, u.email)}
                className="w-full py-2.5 flex items-center justify-between hover:bg-[#F8F6EE] transition-colors text-left px-1 -mx-1 rounded"
              >
                <p className="text-sm text-[#4A5940]">{u.email}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                    {u.accepted} joined
                  </span>
                  <span className="text-xs bg-[#E8EBE4] text-[#5F7252] px-2 py-0.5 rounded-full font-medium">
                    {u.refCount} sent
                  </span>
                </div>
              </button>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden border border-[#E8EBE4]">
          <div className="flex items-center justify-between p-4 border-b border-[#E8EBE4]">
            <div className="flex items-center gap-2">
              {Icon && <Icon className="w-5 h-5 text-[#5F7252]" />}
              <h2 className="text-lg font-semibold text-[#4A5940]">{title}</h2>
              {data && <span className="text-xs bg-[#E8EBE4] text-[#5F7252] px-2 py-0.5 rounded-full">{data.length}</span>}
            </div>
            <button onClick={onClose} className="p-1 hover:bg-[#E8EBE4] rounded-lg transition-colors">
              <X className="w-5 h-5 text-[#96A888]" />
            </button>
          </div>
          <div className="p-4">
            {renderContent()}
          </div>
        </div>
      </div>

      {/* Note Modal */}
      {noteModal.isOpen && noteModal.book && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-[#E8EBE4]">
            <div className={`p-4 ${noteModal.viewOnly ? 'bg-gradient-to-r from-green-600 to-green-700' : 'bg-gradient-to-r from-[#5F7252] to-[#4A5940]'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white">
                  {noteModal.viewOnly ? <Check className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
                  <h3 className="font-semibold">{noteModal.viewOnly ? 'Note Sent' : 'Send Personal Note'}</h3>
                </div>
                <button 
                  onClick={() => { setNoteModal({ isOpen: false, book: null }); setNoteContent(''); }}
                  className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
            
            <div className="p-4">
              {/* Book info */}
              <div className={`rounded-lg p-3 mb-4 border-l-4 ${noteModal.viewOnly ? 'bg-green-50 border-green-500' : 'bg-[#F8F6EE] border-[#5F7252]'}`}>
                <p className="text-sm font-medium text-[#4A5940]">{noteModal.book.title}</p>
                <p className="text-xs text-[#7A8F6C]">by {noteModal.book.author}</p>
                <p className="text-xs text-[#96A888] mt-1">To: {selectedUser?.email}</p>
                {noteModal.viewOnly && noteModal.book.noteSentAt && (
                  <p className="text-xs text-green-600 mt-1">Sent: {new Date(noteModal.book.noteSentAt).toLocaleDateString()}</p>
                )}
              </div>
              
              {noteModal.viewOnly ? (
                <>
                  <label className="block text-xs text-green-600 font-medium mb-2">
                    Your note:
                  </label>
                  <div className="w-full p-3 bg-gray-50 border border-[#E8EBE4] rounded-lg text-sm text-[#4A5940] whitespace-pre-wrap">
                    {noteModal.book.noteContent || 'Note content not available'}
                  </div>
                </>
              ) : (
                <>
                  {/* Note input */}
                  <label className="block text-xs text-[#5F7252] font-medium mb-2">
                    Why I love this book...
                  </label>
                  <textarea
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Share your personal thoughts about this book..."
                    className="w-full h-32 p-3 border border-[#E8EBE4] rounded-lg text-sm text-[#4A5940] placeholder-[#96A888] focus:outline-none focus:ring-2 focus:ring-[#5F7252]/30 focus:border-[#5F7252] resize-none"
                  />
                  
                  {/* Quick starters */}
                  <div className="flex flex-wrap gap-1.5 mt-3 mb-4">
                    <button
                      onClick={() => setNoteContent(prev => prev + "This is one of my all-time favorites because ")}
                      className="text-xs bg-[#E8EBE4] text-[#5F7252] px-2 py-1 rounded hover:bg-[#D8DBD4] transition-colors"
                    >
                      All-time favorite...
                    </button>
                    <button
                      onClick={() => setNoteContent(prev => prev + "I think you'll especially love ")}
                      className="text-xs bg-[#E8EBE4] text-[#5F7252] px-2 py-1 rounded hover:bg-[#D8DBD4] transition-colors"
                    >
                      You'll love...
                    </button>
                    <button
                      onClick={() => setNoteContent(prev => prev + "The writing style is ")}
                      className="text-xs bg-[#E8EBE4] text-[#5F7252] px-2 py-1 rounded hover:bg-[#D8DBD4] transition-colors"
                    >
                      Writing style...
                    </button>
                  </div>
                  
                  {/* Send button */}
                  <button
                    onClick={sendNote}
                    disabled={!noteContent.trim() || sendingNote}
                    className="w-full bg-gradient-to-r from-[#5F7252] to-[#4A5940] text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendingNote ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Note to {selectedUser?.email?.split('@')[0]}
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ProgressBar({ label, value, percent, color = 'bg-[#5F7252]' }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-[#5F7252]">{label}</span>
        <span className="text-[#96A888]">{value} ({percent}%)</span>
      </div>
      <div className="h-2 bg-[#E8EBE4] rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export default function AdminDashboard({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('lifetime');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [sendingDigest, setSendingDigest] = useState(false);
  const [modal, setModal] = useState({ isOpen: false, type: null, title: '', icon: null });

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/admin/stats?period=${period}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch stats');
      }

      const data = await response.json();
      setStats(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching admin stats:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [period]);

  const exportCSV = async () => {
    setExporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch('/api/admin/export', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sarahs-books-users-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      console.error('Export error:', err);
      alert('Export failed: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  const sendDigest = async () => {
    setSendingDigest(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch('/api/admin/digest', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      const result = await response.json();
      if (response.ok) {
        alert('Digest email sent successfully!');
      } else {
        alert('Failed to send digest: ' + (result.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Digest error:', err);
      alert('Failed to send digest: ' + err.message);
    } finally {
      setSendingDigest(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FDFBF4 0%, #FBF9F0 50%, #F5EFDC 100%)' }}>
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-[#5F7252] animate-spin mx-auto mb-3" />
          <div className="text-[#7A8F6C]">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FDFBF4 0%, #FBF9F0 50%, #F5EFDC 100%)' }}>
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 mb-4">Error: {error}</div>
          <button
            onClick={fetchStats}
            className="px-4 py-2 bg-[#5F7252] text-white rounded-lg hover:bg-[#4A5940]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #FDFBF4 0%, #FBF9F0 50%, #F5EFDC 100%)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => onNavigate('home')}
            className="inline-flex items-center gap-2 text-[#5F7252] hover:text-[#4A5940] transition-colors mb-4 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-[#4A5940]" style={{ fontFamily: 'Crimson Pro' }}>
                Admin Dashboard
              </h1>
              {lastUpdated && (
                <p className="text-xs text-[#96A888] mt-1">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="px-3 py-2 border border-[#D4DAD0] rounded-lg text-sm text-[#4A5940] bg-white focus:outline-none focus:ring-2 focus:ring-[#5F7252]"
              >
                {PERIODS.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
              <button
                onClick={fetchStats}
                disabled={loading}
                className="p-2 border border-[#D4DAD0] rounded-lg hover:bg-[#F8F6EE] transition-colors disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 text-[#5F7252] ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={exportCSV}
                disabled={exporting}
                className="p-2 border border-[#D4DAD0] rounded-lg hover:bg-[#F8F6EE] transition-colors disabled:opacity-50 flex items-center gap-1.5"
                title="Export CSV"
              >
                <Download className={`w-4 h-4 text-[#5F7252] ${exporting ? 'animate-pulse' : ''}`} />
              </button>
              <button
                onClick={sendDigest}
                disabled={sendingDigest}
                className="p-2 border border-[#D4DAD0] rounded-lg hover:bg-[#F8F6EE] transition-colors disabled:opacity-50 flex items-center gap-1.5"
                title="Send Test Digest Email"
              >
                <Mail className={`w-4 h-4 text-[#5F7252] ${sendingDigest ? 'animate-pulse' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Overview Stats */}
        {/* Core Stats - 4 cards per row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <StatCard
            title="Total Users"
            value={stats?.users?.total || 0}
            subtitle={period !== 'lifetime' ? `+${stats?.users?.inPeriod || 0} in period` : `${stats?.users?.withProfiles || 0} with profiles`}
            icon={Users}
            onClick={() => setModal({ isOpen: true, type: 'users', title: 'All Users', icon: Users })}
          />
          <StatCard
            title="Books Queued"
            value={stats?.queue?.totalBooks || 0}
            subtitle={`Avg ${stats?.queue?.avgPerUser || 0} per user`}
            icon={BookMarked}
            onClick={() => setModal({ isOpen: true, type: 'queue', title: 'Reading Queues', icon: BookMarked })}
          />
          <StatCard
            title="Collections"
            value={stats?.collection?.totalBooks || 0}
            subtitle={`${stats?.collection?.usersWithCollection || 0} users with books`}
            icon={Library}
            color="bg-amber-500"
            onClick={() => setModal({ isOpen: true, type: 'collection', title: 'User Collections', icon: Library })}
          />
          <StatCard
            title="Books Read"
            value={stats?.read?.totalFinished || 0}
            subtitle={`${stats?.read?.totalRated || 0} rated (avg ${stats?.read?.avgRating || 0}★)`}
            icon={BookOpen}
            onClick={() => setModal({ isOpen: true, type: 'read', title: 'Books Read', icon: BookOpen })}
          />
        </div>

        {/* Engagement Stats - 4 cards per row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          <StatCard
            title="Recommendations"
            value={stats?.recommendations?.total || 0}
            subtitle={`${stats?.recommendations?.shared || 0} shared`}
            icon={Heart}
            onClick={() => setModal({ isOpen: true, type: 'recommendations', title: 'Recommendations', icon: Heart })}
          />
          <StatCard
            title="Referrals"
            value={`${stats?.referrals?.accepted || 0} / ${stats?.referrals?.sent || 0}`}
            subtitle={`${Math.round((stats?.referrals?.conversionRate || 0) * 100)}% conversion`}
            icon={Share2}
            onClick={() => setModal({ isOpen: true, type: 'referrals', title: 'Referrals', icon: Share2 })}
          />
          <StatCard
            title="Platform K-Factor"
            value={stats?.referrals?.platformKFactor || '0.00'}
            subtitle="Viral coefficient"
            icon={TrendingUp}
            color="bg-emerald-500"
          />
          <StatCard
            title="Curator Waitlist"
            value={stats?.curatorWaitlist?.total || 0}
            subtitle="Pending curators"
            icon={UserPlus}
            color="bg-violet-500"
            onClick={() => setModal({ isOpen: true, type: 'waitlist', title: 'Curator Waitlist', icon: UserPlus })}
          />
        </div>

        {/* Demographics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Countries */}
          <div className="bg-white rounded-xl border border-[#E8EBE4] p-5">
            <h3 className="text-sm font-semibold text-[#4A5940] mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Users by Country
            </h3>
            {stats?.demographics?.byCountry?.length > 0 ? (
              <div className="space-y-2">
                {stats.demographics.byCountry.slice(0, 5).map((c, i) => (
                  <ProgressBar
                    key={i}
                    label={c.country}
                    value={c.count}
                    percent={c.percent}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#96A888] italic">No location data yet</p>
            )}
          </div>

          {/* Age Distribution */}
          <div className="bg-white rounded-xl border border-[#E8EBE4] p-5">
            <h3 className="text-sm font-semibold text-[#4A5940] mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Age Distribution
            </h3>
            {stats?.demographics?.ageDistribution?.some(a => a.count > 0) ? (
              <div className="space-y-2">
                {stats.demographics.ageDistribution.map((a, i) => (
                  <ProgressBar
                    key={i}
                    label={a.range}
                    value={a.count}
                    percent={a.percent}
                    color={a.range === '25-34' ? 'bg-[#5F7252]' : 'bg-[#96A888]'}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#96A888] italic">No age data yet</p>
            )}
          </div>
        </div>

        {/* Top Genres */}
        <div className="bg-white rounded-xl border border-[#E8EBE4] p-5 mb-6">
          <h3 className="text-sm font-semibold text-[#4A5940] mb-4">Top Genres</h3>
          {stats?.demographics?.topGenres?.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
              {stats.demographics.topGenres.slice(0, 6).map((g, i) => (
                <ProgressBar
                  key={i}
                  label={g.genre}
                  value={g.count}
                  percent={g.percent}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#96A888] italic">No genre preferences yet</p>
          )}
        </div>

        {/* K-Factor Leaderboard */}
        {stats?.referrals?.topReferrers?.length > 0 && (
          <div className="bg-white rounded-xl border border-[#E8EBE4] p-5 mb-6">
            <h3 className="text-sm font-semibold text-[#4A5940] mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Top Referrers (K-Factor Leaderboard)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-[#96A888] border-b border-[#E8EBE4]">
                    <th className="pb-2 font-medium">#</th>
                    <th className="pb-2 font-medium">User</th>
                    <th className="pb-2 font-medium text-right">Sent</th>
                    <th className="pb-2 font-medium text-right">Accepted</th>
                    <th className="pb-2 font-medium text-right">K-Factor</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.referrals.topReferrers.map((r, i) => (
                    <tr key={i} className="border-b border-[#E8EBE4] last:border-0">
                      <td className="py-2 text-[#5F7252] font-medium">{i + 1}</td>
                      <td className="py-2 text-[#4A5940]">{r.email}</td>
                      <td className="py-2 text-right text-[#7A8F6C]">{r.sent}</td>
                      <td className="py-2 text-right text-[#5F7252] font-medium">{r.accepted}</td>
                      <td className="py-2 text-right">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          parseFloat(r.kFactor) >= 0.5 ? 'bg-green-100 text-green-700' :
                          parseFloat(r.kFactor) >= 0.25 ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {r.kFactor}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Data Quality Breakdown */}
        <div className="bg-white rounded-xl border border-[#E8EBE4] p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#4A5940]">Data Quality Breakdown</h3>
            {stats?.dataQualityScore != null && (
              <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${
                stats.dataQualityScore >= 70 ? 'bg-green-100 text-green-700' :
                stats.dataQualityScore >= 40 ? 'bg-amber-100 text-amber-700' :
                'bg-red-100 text-red-700'
              }`}>
                {stats.dataQualityScore}/100
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            <ProgressBar
              label="Profile Completeness"
              value=""
              percent={stats?.dataQuality?.profileCompleteness || 0}
            />
            <ProgressBar
              label="Engagement Rate"
              value=""
              percent={stats?.dataQuality?.engagementRate || 0}
            />
            <ProgressBar
              label="Rating Density"
              value=""
              percent={stats?.dataQuality?.ratingDensity || 0}
            />
            <ProgressBar
              label="Referral Health"
              value=""
              percent={stats?.dataQuality?.referralHealth || 0}
              color="bg-emerald-500"
            />
          </div>
        </div>

        {/* Curator Waitlist */}
        {stats?.curatorWaitlist?.recent?.length > 0 && (
          <div className="bg-white rounded-xl border border-[#E8EBE4] p-5">
            <h3 className="text-sm font-semibold text-[#4A5940] mb-4 flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Recent Curator Waitlist Signups
            </h3>
            <div className="space-y-2">
              {stats.curatorWaitlist.recent.map((w, i) => (
                <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-[#E8EBE4] last:border-0">
                  <span className="text-[#4A5940]">{w.email}</span>
                  <span className="text-xs text-[#96A888]">
                    {w.createdAt ? new Date(w.createdAt).toLocaleDateString() : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detail Modal */}
        <DetailModal
          isOpen={modal.isOpen}
          onClose={() => setModal({ isOpen: false, type: null, title: '', icon: null })}
          title={modal.title}
          type={modal.type}
          icon={modal.icon}
        />
      </div>
    </div>
  );
}
