import React, { useState, useMemo } from 'react';
import { ArrowLeft, Mail, Search, Library, ChevronDown, ChevronUp, Upload, BookMarked, User, Home, Share2 } from 'lucide-react';
import bookCatalog from '../books.json';

export default function AboutPage({ onNavigate }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCuratorNoteExpanded, setIsCuratorNoteExpanded] = useState(false);

  const filteredBooks = useMemo(() => {
    if (!searchQuery.trim()) return bookCatalog;
    const query = searchQuery.toLowerCase();
    return bookCatalog.filter(book => 
      book.title?.toLowerCase().includes(query) || 
      book.author?.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #FDFBF4 0%, #FBF9F0 50%, #F5EFDC 100%)' }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Back Button */}
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

        {/* Header */}
        <div className="mb-8">
          <h1 className="font-serif text-3xl sm:text-4xl text-[#4A5940] mb-4">How It Works</h1>
          <p className="text-sm text-[#7A8F6C] leading-relaxed">
            Discover your next great read, build your personal library, and share recommendations with friends.
          </p>
        </div>

        {/* Profile Section */}
        <div className="bg-[#F8F6EE] rounded-2xl p-6 sm:p-8 border border-[#D4DAD0] shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <img
              src="/sarah.png"
              alt="Sarah"
              className="w-24 h-24 rounded-full object-cover border-4 border-[#E8EBE4] shadow-sm"
            />
            <div className="flex-1 text-center sm:text-left">
              <h2 className="font-serif text-2xl text-[#4A5940] mb-3">Hi, I'm Sarah!</h2>
              <div className="space-y-3 text-sm text-[#5F7252] leading-relaxed">
                <p>
                  I've always been the friend people call when they need a book recommendation. I get it—finding the right book at the right moment is a small kind of magic ✨.
                </p>
                <p>
                  So I built this: a digital version of my bookshelves, searchable and powered by AI that knows my taste. My 200 curated books are the foundation, but now you can build your own library too—upload photos of your books, track what you want to read, and get personalized recommendations based on both our collections.
                </p>
                <p>
                  It's a living library that grows as we both read, with a discovery engine to help us find what's next. And when you're ready to buy, I hope you'll support a local bookstore—they're the heartbeat of our communities.
                </p>
                <p className="text-[#7A8F6C]">
                  Happy reading, friend. 📚
                </p>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    document.getElementById('browse-collection')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#5F7252] text-[#5F7252] text-sm font-medium hover:bg-[#F8F6EE] transition-colors"
                >
                  <Library className="w-4 h-4" />
                  Browse Sarah's Collection
                </button>
                <button
                  onClick={() => {
                    document.getElementById('curator-themes')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#5F7252] text-white text-sm font-medium hover:bg-[#4A5940] transition-colors"
                >
                  Explore Curator Themes
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Curator's Note removed from here - moved to after collection */}

        {/* How It Works - 3 Jobs */}
        <div className="bg-[#F8F6EE] rounded-2xl p-6 sm:p-8 border border-[#D4DAD0] shadow-sm mb-6">
          <h2 className="font-serif text-2xl text-[#4A5940] mb-4">
            Three Ways to Use Sarah's Books
          </h2>
          <div className="space-y-4">
            {/* Job 1: Discover */}
            <div className="bg-[#F8F6EE] rounded-lg p-4 border border-[#E8EBE4]">
              <h3 className="font-medium text-[#4A5940] mb-2 text-base flex items-center gap-2">
                <Home className="w-4 h-4 text-[#5F7252]" />
                Discover Your Next Read
              </h3>
              <p className="text-sm text-[#7A8F6C] leading-relaxed mb-3">
                Chat with me to get personalized recommendations from my curated collection of 200 books—or discoveries from the wider world.
              </p>
              <div className="bg-white rounded-lg p-3 border border-[#E8EBE4]">
                <div className="flex items-start gap-2">
                  <Upload className="w-4 h-4 text-[#5F7252] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-[#5F7252] mb-1">Add Your Books</p>
                    <p className="text-xs text-[#96A888] leading-relaxed">
                      Upload photos of books you've read so I never recommend something you've already finished—and to improve your recommendations based on your taste.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Job 2: Build Library */}
            <div className="bg-[#F8F6EE] rounded-lg p-4 border border-[#E8EBE4]">
              <h3 className="font-medium text-[#4A5940] mb-2 text-base flex items-center gap-2">
                <Library className="w-4 h-4 text-[#5F7252]" />
                Build Your Personal Library
              </h3>
              <p className="text-sm text-[#7A8F6C] leading-relaxed mb-3">
                Add your books, track your reading, and improve future recommendations
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-xs text-[#96A888] flex items-center gap-1">
                  <Upload className="w-3 h-3" />
                  Add Books
                </div>
                <div className="text-xs text-[#96A888] flex items-center gap-1">
                  <BookMarked className="w-3 h-3" />
                  Reading Queue
                </div>
                <div className="text-xs text-[#96A888] flex items-center gap-1">
                  <Library className="w-3 h-3" />
                  My Collection
                </div>
                <div className="text-xs text-[#96A888] flex items-center gap-1">
                  <User className="w-3 h-3" />
                  Preferences
                </div>
              </div>
            </div>
            
            {/* Job 3: Share (Coming Soon) */}
            <div className="bg-[#F8F6EE] rounded-lg p-4 border border-[#E8EBE4] relative overflow-hidden">
              <div className="absolute top-2 right-2 px-2 py-0.5 bg-[#5F7252] text-white text-[10px] font-medium rounded-full">
                Coming Soon
              </div>
              <h3 className="font-medium text-[#4A5940] mb-2 text-base flex items-center gap-2">
                <Share2 className="w-4 h-4 text-[#5F7252]" />
                Share with Friends
              </h3>
              <p className="text-sm text-[#7A8F6C] leading-relaxed">
                Recommend your favorite books to others
              </p>
            </div>
          </div>
        </div>

        {/* Sarah's Curated Collection */}
        <div id="browse-collection" className="bg-[#F8F6EE] rounded-2xl p-6 sm:p-8 border border-[#D4DAD0] shadow-sm mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Library className="w-5 h-5 text-[#5F7252]" />
            <h2 className="font-serif text-2xl text-[#4A5940]">Sarah's Curated Collection</h2>
          </div>
          <p className="text-sm text-[#7A8F6C] mb-6">
            All 200 books Sarah has read and loved. This foundation collection powers the recommendation engine for everyone.
          </p>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#96A888]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Sarah's books..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#D4DAD0] bg-white text-[#4A5940] placeholder-[#96A888] text-sm focus:outline-none focus:ring-2 focus:ring-[#96A888] focus:border-transparent"
            />
          </div>

          <div className="text-xs text-[#96A888] mb-3">
            {filteredBooks.length} book{filteredBooks.length !== 1 ? 's' : ''}
          </div>

          <div className="max-h-96 overflow-y-auto bg-white rounded-lg border border-[#D4DAD0]">
            <div className="divide-y divide-[#E8EBE4]">
              {filteredBooks.map((book, index) => (
                <div key={index} className="px-4 py-3 hover:bg-[#F8F6EE] transition-colors">
                  <div className="text-sm font-medium text-[#4A5940]">
                    {book.title}
                  </div>
                  <div className="text-xs text-[#7A8F6C] font-light mt-1">
                    {book.author}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Curator Themes - Moved after collection */}
        <div id="curator-themes" className="bg-[#F8F6EE] rounded-2xl p-6 sm:p-8 border border-[#D4DAD0] shadow-sm mb-6">
          <h2 className="font-serif text-2xl text-[#4A5940] mb-4 flex items-center gap-2">
            📝 Curator Themes
          </h2>
          <p className="text-sm text-[#5F7252] mb-6 leading-relaxed">
            A few common themes you'll see in my collection:
          </p>

          <div className="space-y-6">
            {/* Women's Interior Lives */}
            <div>
              <h3 className="font-serif text-lg text-[#4A5940] mb-2 flex items-center gap-2">
                💗 Women's Interior Lives and Untold Stories
              </h3>
              <p className="text-sm text-[#5F7252] leading-relaxed">
                This collection is dominated by female authors and female protagonists—not just in quantity, but in type. The reader gravitates toward books that excavate women's hidden contributions (The Personal Librarian, First Ladies), women's survival under impossible conditions (Kristin Hannah's catalog), and women navigating systems that weren't built for them (Lessons in Chemistry, The Female Persuasion). Five Kristin Hannah novels, four Paula McLain, three Marie Benedict—authors who specialize in giving voice to women history overlooked.
              </p>
            </div>

            {/* Emotional Truth */}
            <div>
              <h3 className="font-serif text-lg text-[#4A5940] mb-2 flex items-center gap-2">
                📖 Reading for Emotional Truth, Not Escapism
              </h3>
              <p className="text-sm text-[#5F7252] leading-relaxed">
                Even the "lighter" genres here aren't light. The thrillers are psychological (Gone Girl, Verity) rather than procedural. The romances are laced with grief, suicide, and identity crisis (The Midnight Library, A Man Called Ove). These are books that cost something to read—that leave the reader changed rather than simply entertained.
              </p>
            </div>

            {/* Identity & Belonging */}
            <div>
              <h3 className="font-serif text-lg text-[#4A5940] mb-2 flex items-center gap-2">
                🔍 Grappling with Questions of Identity and Belonging
              </h3>
              <p className="text-sm text-[#5F7252] leading-relaxed">
                The collection reveals deep interest in who we are versus who we present ourselves to be: racial identity (Vanishing Half, The Personal Librarian), class performance (Such a Fun Age), gender identity (This Is How It Always Is, The Danish Girl), and cultural identity across diaspora (Homegoing, Vanishing Half). A persistent draw toward characters navigating the gap between their authentic selves and the selves the world expects.
              </p>
            </div>

            {/* Spiritual Seeker */}
            <div>
              <h3 className="font-serif text-lg text-[#4A5940] mb-2 flex items-center gap-2">
                ✨ A Spiritual Seeker with Eclectic Tastes
              </h3>
              <p className="text-sm text-[#5F7252] leading-relaxed">
                The spirituality shelf is notably pluralistic: multiple Dalai Lama books, Thich Nhat Hanh, Pema Chödrön (Buddhism), Saraswati (Theravada), but also Ramakrishna (Hindu), Brené Brown (secular vulnerability research), and Baltasar Gracián (17th-century Jesuit). Not looking for one answer—collecting wisdom across traditions. The presence of "no-self" texts and Brené Brown's work on authenticity suggests warring through the tension between ego dissolution and showing up vulnerably as oneself.
              </p>
            </div>

            {/* Justice */}
            <div>
              <h3 className="font-serif text-lg text-[#4A5940] mb-2 flex items-center gap-2">
                ⚖️ A Deep Care for Justice—Especially Invisible Injustices
              </h3>
              <p className="text-sm text-[#5F7252] leading-relaxed">
                The criminal justice cluster is telling: Just Mercy, The Sun Does Shine, An American Marriage, The Master Plan. Beyond that, a draw toward systems that fail people quietly: orphan trains, the treatment of Vietnam nurses, the erasure of women scientists, Guatemala's suppressed history. Particular interest in how power operates invisibly and how ordinary people become complicit.
              </p>
            </div>

            {/* All-Time Favorites */}
            <div>
              <h3 className="font-serif text-lg text-[#4A5940] mb-2 flex items-center gap-2">
                ⭐ All-Time Favorites
              </h3>
              <p className="text-sm text-[#5F7252] leading-relaxed mb-3">
                Top recommendations that have shaped how I see the world:
              </p>
              <ul className="text-sm text-[#5F7252] space-y-1 ml-4">
                <li>• <button onClick={() => { onNavigate('collection'); window.scrollTo(0, 0); }} className="font-medium hover:underline hover:text-[#4A5940] transition-colors">Tell Me How to Be</button> by Neel Patel</li>
                <li>• <button onClick={() => { onNavigate('collection'); window.scrollTo(0, 0); }} className="font-medium hover:underline hover:text-[#4A5940] transition-colors">Where the Red Fern Grows</button> by Wilson Rawls</li>
                <li>• <button onClick={() => { onNavigate('collection'); window.scrollTo(0, 0); }} className="font-medium hover:underline hover:text-[#4A5940] transition-colors">Loving Frank</button> by Nancy Horan</li>
                <li>• <button onClick={() => { onNavigate('collection'); window.scrollTo(0, 0); }} className="font-medium hover:underline hover:text-[#4A5940] transition-colors">Just Mercy</button> by Bryan Stevenson</li>
                <li>• <button onClick={() => { onNavigate('collection'); window.scrollTo(0, 0); }} className="font-medium hover:underline hover:text-[#4A5940] transition-colors">Heartland</button> by Sarah Smarsh</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#D4DAD0] shadow-sm">
          <h2 className="font-serif text-xl text-[#4A5940] mb-4">Get in Touch</h2>
          <p className="text-sm text-[#5F7252] mb-4 leading-relaxed">
            Have a question or book recommendation? I'd love to hear from you.
          </p>
          <a
            href="mailto:hello@sarahsbooks.com"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#5F7252] text-white text-sm font-medium hover:bg-[#4A5940] transition-colors"
          >
            <Mail className="w-4 h-4" />
            hello@sarahsbooks.com
          </a>
        </div>
      </div>
    </div>
  );
}
