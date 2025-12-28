import React, { useState, useMemo, useRef } from 'react';
import { ArrowLeft, Search, Plus, Trash2, Camera, BookOpen, BookMarked, Upload } from 'lucide-react';
import { track } from '@vercel/analytics';
import { useUserBooks } from '../contexts/UserBooksContext';
import { useReadingQueue } from '../contexts/ReadingQueueContext';
import PhotoCaptureModal from './PhotoCaptureModal';

// CSV parsing helper
function parseCsvLine(line) {
  const out = [];
  let current = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuote && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if (c === ',' && !inQuote) {
      out.push(current);
      current = '';
    } else {
      current += c;
    }
  }
  out.push(current);
  return out;
}

function parseGoodreadsCsv(text) {
  const raw = String(text || '').replace(/^\uFEFF/, '');
  const lines = raw.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];

  const headers = parseCsvLine(lines[0]).map(h => String(h || '').trim());
  const idxTitle = headers.findIndex(h => h.toLowerCase() === 'title');
  const idxAuthor = headers.findIndex(h => h.toLowerCase() === 'author' || h.toLowerCase() === 'author l-f');
  if (idxTitle < 0) return [];

  const items = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const title = String(cols[idxTitle] || '').trim();
    const author = idxAuthor >= 0 ? String(cols[idxAuthor] || '').trim() : '';
    if (!title) continue;
    items.push({ title, author });
  }
  return items;
}

export default function MyBooksPage({ onNavigate, user, onShowAuthModal }) {
  const { userBooks, isLoadingBooks, addBook, removeBook } = useUserBooks();
  const { readingQueue, addToQueue } = useReadingQueue();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [recognizedBooks, setRecognizedBooks] = useState([]);
  const [newBook, setNewBook] = useState({ title: '', author: '', notes: '' });
  const [isUploadingGoodreads, setIsUploadingGoodreads] = useState(false);
  const [goodreadsError, setGoodreadsError] = useState('');
  const goodreadsInputRef = useRef(null);

  const sortedBooks = useMemo(() => {
    return [...userBooks].sort((a, b) => {
      const titleA = (a.book_title || '').toLowerCase();
      const titleB = (b.book_title || '').toLowerCase();
      return titleA.localeCompare(titleB);
    });
  }, [userBooks]);

  const filteredBooks = useMemo(() => {
    if (!searchQuery.trim()) return sortedBooks;
    const query = searchQuery.toLowerCase();
    return sortedBooks.filter(book => 
      book.book_title?.toLowerCase().includes(query) || 
      book.book_author?.toLowerCase().includes(query)
    );
  }, [sortedBooks, searchQuery]);

  const handleAddBook = async (e) => {
    e.preventDefault();
    
    if (!user) {
      onShowAuthModal();
      return;
    }

    if (!newBook.title.trim()) {
      alert('Please enter a book title');
      return;
    }

    const result = await addBook({
      title: newBook.title.trim(),
      author: newBook.author.trim(),
      notes: newBook.notes.trim(),
      addedVia: 'manual',
    });

    if (result.success) {
      track('book_added_manually', {
        book_title: newBook.title,
        has_author: !!newBook.author,
      });
      setNewBook({ title: '', author: '', notes: '' });
      setShowAddModal(false);
    } else {
      alert('Failed to add book. Please try again.');
    }
  };

  const handleRemoveBook = async (bookId, bookTitle) => {
    if (!confirm(`Remove "${bookTitle}" from your collection?`)) {
      return;
    }

    const result = await removeBook(bookId);
    
    if (result.success) {
      track('book_removed', {
        book_title: bookTitle,
      });
    } else {
      alert('Failed to remove book. Please try again.');
    }
  };

  const handlePhotoCaptured = async (books) => {
    setRecognizedBooks(books);
    
    // Automatically add all recognized books
    let successCount = 0;
    for (const book of books) {
      const result = await addBook({
        title: book.title,
        author: book.author || '',
        isbn: book.isbn || '',
        addedVia: 'photo',
      });
      
      if (result.success) {
        successCount++;
      }
    }

    track('books_added_from_photo', {
      total_recognized: books.length,
      successfully_added: successCount,
    });

    setShowPhotoModal(false);
    
    if (successCount > 0) {
      alert(`Added ${successCount} book${successCount !== 1 ? 's' : ''} to your collection!`);
    }
  };

  const handleGoodreadsUpload = async (file) => {
    if (!user) {
      onShowAuthModal();
      return;
    }

    setGoodreadsError('');

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      setGoodreadsError('File size must be less than 10MB. Please choose a smaller CSV file.');
      return;
    }

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      setGoodreadsError('Please upload a CSV file exported from Goodreads.');
      return;
    }

    setIsUploadingGoodreads(true);

    try {
      const text = await file.text();
      const books = parseGoodreadsCsv(text);
      
      if (!books.length) {
        setGoodreadsError('Could not find any books in that CSV. Make sure it is a Goodreads library export.');
        setIsUploadingGoodreads(false);
        return;
      }

      let successCount = 0;
      for (const book of books) {
        // Add books from Goodreads CSV directly to reading queue with status='finished'
        // This ensures they're counted in collection and excluded from recommendations
        const result = await addToQueue({
          title: book.title,
          author: book.author || '',
          status: 'finished',
        });
        
        if (result.success) {
          successCount++;
        }
      }

      track('books_added_from_goodreads', {
        total_in_csv: books.length,
        successfully_added: successCount,
      });

      setIsUploadingGoodreads(false);
      
      if (successCount > 0) {
        alert(`Added ${successCount} book${successCount !== 1 ? 's' : ''} from Goodreads to your collection!`);
      }
    } catch (error) {
      console.error('Error processing Goodreads CSV:', error);
      setGoodreadsError('Could not read that file. Please try exporting your Goodreads library again.');
      setIsUploadingGoodreads(false);
    }
  };

  const handleAddToReadingQueue = async (book, status) => {
    if (!user) {
      onShowAuthModal();
      return;
    }

    // Check if already in reading queue
    const alreadyInQueue = readingQueue.some(item => 
      item.book_title?.toLowerCase() === book.book_title?.toLowerCase() &&
      item.book_author?.toLowerCase() === book.book_author?.toLowerCase()
    );

    if (alreadyInQueue) {
      alert('This book is already in your reading queue');
      return;
    }

    const result = await addToQueue({
      title: book.book_title,
      author: book.book_author,
      status: status,
    });

    if (result.success) {
      // Remove from staging area (user_books) after successfully adding to reading queue
      await removeBook(book.id);
      
      const statusText = status === 'finished' ? 'read books' : 'reading queue';
      alert(`Added "${book.book_title}" to ${statusText}!`);
      
      track('book_added_to_queue_from_my_books', {
        book_title: book.book_title,
        status: status,
      });
    } else {
      alert('Failed to add to reading queue. Please try again.');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #FDFBF4 0%, #FBF9F0 50%, #F5EFDC 100%)' }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <button
            onClick={() => onNavigate('home')}
            className="inline-flex items-center gap-2 text-[#5F7252] hover:text-[#4A5940] transition-colors mb-6 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
          
          <div className="text-center py-12">
            <h1 className="font-serif text-3xl text-[#4A5940] mb-4">My Books</h1>
            <p className="text-[#7A8F6C] mb-6">Sign in to build your personal book collection</p>
            <button
              onClick={onShowAuthModal}
              className="px-6 py-2.5 bg-[#5F7252] text-white rounded-lg hover:bg-[#4A5940] transition-colors text-sm font-medium"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #FDFBF4 0%, #FBF9F0 50%, #F5EFDC 100%)' }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <button
          onClick={() => {
            onNavigate('home');
            window.scrollTo(0, 0);
          }}
          className="inline-flex items-center gap-2 text-[#5F7252] hover:text-[#4A5940] transition-colors mb-6 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>

        <div className="mb-6">
          <h1 className="font-serif text-3xl sm:text-4xl text-[#4A5940] mb-2">Add Books</h1>
          <p className="text-[#7A8F6C] text-sm font-light">
            {isLoadingBooks ? 'Loading...' : `${userBooks.length} book${userBooks.length !== 1 ? 's' : ''} waiting to be added`}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <button
            onClick={() => setShowPhotoModal(true)}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-[#5F7252] bg-[#5F7252] hover:bg-[#4A5940] text-white text-sm font-medium transition-colors"
          >
            <Camera className="w-4 h-4" />
            Add from Photo
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-[#D4DAD0] bg-white hover:bg-[#F8F6EE] text-[#5F7252] text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Manually
          </button>
          <button
            onClick={() => goodreadsInputRef.current?.click()}
            disabled={isUploadingGoodreads}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-[#5F7252] text-[#5F7252] hover:bg-[#F8F6EE] text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="w-4 h-4" />
            {isUploadingGoodreads ? 'Uploading...' : 'Upload Goodreads CSV'}
          </button>
        </div>

        {goodreadsError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {goodreadsError}
          </div>
        )}

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#96A888]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your books..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#D4DAD0] bg-white text-[#4A5940] placeholder-[#96A888] text-sm focus:outline-none focus:ring-2 focus:ring-[#96A888] focus:border-transparent"
          />
        </div>

        {isLoadingBooks ? (
          <div className="text-center py-12">
            <p className="text-[#7A8F6C] text-sm">Loading your books...</p>
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[#7A8F6C] text-sm">
              {searchQuery ? `No books found matching "${searchQuery}"` : 'No books waiting to be added'}
            </p>
            {!searchQuery && (
              <p className="text-[#96A888] text-xs mt-2">Add books here first, then organize them into your Reading Queue or Collection.</p>
            )}
          </div>
        ) : (
          <div className="bg-[#F8F6EE] rounded-xl border border-[#D4DAD0] shadow-sm divide-y divide-[#E8EBE4]">
            {filteredBooks.map((book) => (
              <div key={book.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[#4A5940]">
                      {book.book_title}
                    </div>
                    {book.book_author && (
                      <div className="text-xs text-[#7A8F6C] font-light mt-1">
                        {book.book_author}
                      </div>
                    )}
                    {book.notes && (
                      <div className="text-xs text-[#96A888] mt-2 italic">
                        {book.notes}
                      </div>
                    )}
                    <div className="text-xs text-[#96A888] mt-2">
                      Added {new Date(book.added_at).toLocaleDateString()} via {book.added_via}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAddToReadingQueue(book, 'want_to_read')}
                      className="px-2 py-1 rounded text-xs font-medium text-[#5F7252] hover:bg-[#E8EBE4] transition-colors flex items-center gap-1"
                      title="Add to Want to Read"
                    >
                      <BookMarked className="w-3.5 h-3.5" />
                      Want to Read
                    </button>
                    <button
                      onClick={() => handleAddToReadingQueue(book, 'finished')}
                      className="px-2 py-1 rounded text-xs font-medium text-[#5F7252] hover:bg-[#E8EBE4] transition-colors flex items-center gap-1"
                      title="Mark as Read"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      Read
                    </button>
                    <button
                      onClick={() => handleRemoveBook(book.id, book.book_title)}
                      className="p-1 rounded text-[#96A888] hover:text-[#5F7252] transition-colors"
                      title="Remove from collection"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="font-serif text-2xl text-[#4A5940] mb-4">Add Book</h2>
            
            <form onSubmit={handleAddBook}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#5F7252] mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={newBook.title}
                    onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                    placeholder="Enter book title"
                    className="w-full px-3 py-2 rounded-lg border border-[#D4DAD0] bg-white text-[#4A5940] placeholder-[#96A888] text-sm focus:outline-none focus:ring-2 focus:ring-[#96A888] focus:border-transparent"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#5F7252] mb-1">
                    Author
                  </label>
                  <input
                    type="text"
                    value={newBook.author}
                    onChange={(e) => setNewBook({ ...newBook, author: e.target.value })}
                    placeholder="Enter author name"
                    className="w-full px-3 py-2 rounded-lg border border-[#D4DAD0] bg-white text-[#4A5940] placeholder-[#96A888] text-sm focus:outline-none focus:ring-2 focus:ring-[#96A888] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#5F7252] mb-1">
                    Notes
                  </label>
                  <textarea
                    value={newBook.notes}
                    onChange={(e) => setNewBook({ ...newBook, notes: e.target.value })}
                    placeholder="Add any notes (optional)"
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-[#D4DAD0] bg-white text-[#4A5940] placeholder-[#96A888] text-sm focus:outline-none focus:ring-2 focus:ring-[#96A888] focus:border-transparent resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setNewBook({ title: '', author: '', notes: '' });
                  }}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-[#D4DAD0] bg-white hover:bg-[#F8F6EE] text-[#5F7252] text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 rounded-lg bg-[#5F7252] hover:bg-[#4A5940] text-white text-sm font-medium transition-colors"
                >
                  Add Book
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <PhotoCaptureModal
        isOpen={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        onPhotoCaptured={handlePhotoCaptured}
      />

      <input
        ref={goodreadsInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleGoodreadsUpload(file);
          }
          e.target.value = '';
        }}
      />
    </div>
  );
}
