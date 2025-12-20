import React from 'react';
import { ArrowLeft, Mail } from 'lucide-react';

export default function AboutPage({ onNavigate }) {
  return (
    <div className="min-h-screen bg-[#FDFBF4]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Back Button */}
        <button
          onClick={() => onNavigate('home')}
          className="inline-flex items-center gap-2 text-[#5F7252] hover:text-[#4A5940] transition-colors mb-6 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="font-serif text-3xl sm:text-4xl text-[#4A5940] mb-4">About the Reader</h1>
        </div>

        {/* Profile Section */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#D4DAD0] shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <img
              src="/sarah.png"
              alt="Sarah"
              className="w-24 h-24 rounded-full object-cover border-4 border-[#E8EBE4] shadow-sm"
            />
            <div className="flex-1 text-center sm:text-left">
              <h2 className="font-serif text-2xl text-[#4A5940] mb-3">Hi, I'm Sarah</h2>
              <div className="space-y-3 text-sm text-[#5F7252] leading-relaxed">
                <p>
                  I've always been the friend people call when they need a book recommendation. "Something that'll make me feel deeply," they say. Or "I need to escape but not too far." I get it—finding the right book at the right moment is a small kind of magic ✨.
                </p>
                <p>
                  So I built this: a digital version of my bookshelves, searchable and powered by AI that knows my taste. It's a living library that grows as I read, with a discovery engine to help us both find what's next. And when you're ready to buy, I hope you'll support a local bookstore—they're the heartbeat of our communities.
                </p>
                <p className="text-[#7A8F6C] italic">
                  Happy reading, friend. 📚
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Curator's Note */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#D4DAD0] shadow-sm mb-6">
          <h2 className="font-serif text-2xl text-[#4A5940] mb-4 flex items-center gap-2">
            📝 Curator's Note
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
                <li>• <span className="font-medium">Tell Me How to Be</span> by Neel Patel</li>
                <li>• <span className="font-medium">Where the Red Fern Grows</span> by Wilson Rawls</li>
                <li>• <span className="font-medium">Loving Frank</span> by Nancy Horan</li>
                <li>• <span className="font-medium">Just Mercy</span> by Bryan Stevenson</li>
                <li>• <span className="font-medium">Heartland</span> by Sarah Smarsh</li>
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
