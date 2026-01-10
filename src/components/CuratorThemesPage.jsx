import React from 'react';
import { ArrowLeft, BookText, BookHeart, Heart, Users, Sparkles, Scale, Star, MessageCircle, Sun } from 'lucide-react';

export default function CuratorThemesPage({ onNavigate }) {
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #FDFBF4 0%, #FBF9F0 50%, #F5EFDC 100%)' }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Back Button */}
        <button
          onClick={() => {
            onNavigate('about');
            window.scrollTo(0, 0);
          }}
          className="inline-flex items-center gap-2 text-[#5F7252] hover:text-[#4A5940] transition-colors mb-6 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to How It Works
        </button>

        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="font-serif text-3xl sm:text-4xl text-[#4A5940] mb-4">What I Read</h1>
          <p className="text-base text-[#5F7252] leading-relaxed max-w-xl mx-auto">
            These are the themes that keep showing up in my collection—the questions I return to, the stories that stay with me.
          </p>
        </div>

        {/* Curator Themes */}
        <div className="space-y-6 mb-8">
          {/* Women's Interior Lives */}
          <div className="bg-[#F8F6EE] rounded-xl p-6 border border-[#D4DAD0]">
            <h3 className="font-serif text-lg text-[#4A5940] mb-3 flex items-center gap-2">
              <BookHeart className="w-5 h-5 text-[#5F7252]" />
              Women's Interior Lives and Untold Stories
            </h3>
            <p className="text-sm text-[#5F7252] leading-relaxed">
              This collection is dominated by female authors and female protagonists—not just in quantity, but in type. Books that excavate women's hidden contributions, women's survival under impossible conditions, and women navigating systems that weren't built for them. Authors like Kristin Hannah, Paula McLain, and Marie Benedict who specialize in giving voice to women history overlooked.
            </p>
          </div>

          {/* Beach Reads */}
          <div className="bg-[#F8F6EE] rounded-xl p-6 border border-[#D4DAD0]">
            <h3 className="font-serif text-lg text-[#4A5940] mb-3 flex items-center gap-2">
              <Sun className="w-5 h-5 text-[#5F7252]" />
              Beach Reads
            </h3>
            <p className="text-sm text-[#5F7252] leading-relaxed">
              The books you devour in a weekend. The ones that make you laugh out loud on an airplane or stay up way too late because you have to know what happens next. Pure reading joy—no homework required.
            </p>
          </div>

          {/* Emotional Truth */}
          <div className="bg-[#F8F6EE] rounded-xl p-6 border border-[#D4DAD0]">
            <h3 className="font-serif text-lg text-[#4A5940] mb-3 flex items-center gap-2">
              <Heart className="w-5 h-5 text-[#5F7252]" />
              Emotional Truth
            </h3>
            <p className="text-sm text-[#5F7252] leading-relaxed">
              Books that crack you open. The ones where you find yourself underlining passages and texting quotes to friends. Stories that hold up a mirror to what it means to be human—the grief, the joy, the mess of it all. You finish them different than you started.
            </p>
          </div>

          {/* Identity & Belonging */}
          <div className="bg-[#F8F6EE] rounded-xl p-6 border border-[#D4DAD0]">
            <h3 className="font-serif text-lg text-[#4A5940] mb-3 flex items-center gap-2">
              <Users className="w-5 h-5 text-[#5F7252]" />
              Grappling with Questions of Identity and Belonging
            </h3>
            <p className="text-sm text-[#5F7252] leading-relaxed">
              Deep interest in who we are versus who we present ourselves to be: racial identity, class performance, gender identity, and cultural identity across diaspora. A persistent draw toward characters navigating the gap between their authentic selves and the selves the world expects.
            </p>
          </div>

          {/* Spiritual Seeker */}
          <div className="bg-[#F8F6EE] rounded-xl p-6 border border-[#D4DAD0]">
            <h3 className="font-serif text-lg text-[#4A5940] mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#5F7252]" />
              A Spiritual Seeker with Eclectic Tastes
            </h3>
            <p className="text-sm text-[#5F7252] leading-relaxed">
              The spirituality shelf is notably pluralistic: Buddhism, Hindu wisdom, secular vulnerability research, and 17th-century Jesuit philosophy. Not looking for one answer—collecting wisdom across traditions. Wrestling through the tension between ego dissolution and showing up vulnerably as oneself.
            </p>
          </div>

          {/* Justice */}
          <div className="bg-[#F8F6EE] rounded-xl p-6 border border-[#D4DAD0]">
            <h3 className="font-serif text-lg text-[#4A5940] mb-3 flex items-center gap-2">
              <Scale className="w-5 h-5 text-[#5F7252]" />
              A Deep Care for Justice—Especially Invisible Injustices
            </h3>
            <p className="text-sm text-[#5F7252] leading-relaxed">
              Books about systems that fail people quietly: orphan trains, the treatment of Vietnam nurses, the erasure of women scientists, suppressed histories. Particular interest in how power operates invisibly and how ordinary people become complicit.
            </p>
          </div>

          {/* All-Time Favorites */}
          <div className="bg-[#5F7252]/10 rounded-xl p-6 border border-[#5F7252]/20">
            <h3 className="font-serif text-lg text-[#4A5940] mb-3 flex items-center gap-2">
              <Star className="w-5 h-5 text-[#5F7252]" />
              All-Time Favorites
            </h3>
            <p className="text-sm text-[#5F7252] leading-relaxed mb-4">
              Books that have shaped how I see the world:
            </p>
            <ul className="text-sm text-[#5F7252] space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-[#5F7252]">•</span>
                <span><span className="font-medium">Tell Me How to Be</span> by Neel Patel</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#5F7252]">•</span>
                <span><span className="font-medium">Where the Red Fern Grows</span> by Wilson Rawls</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#5F7252]">•</span>
                <span><span className="font-medium">Loving Frank</span> by Nancy Horan</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#5F7252]">•</span>
                <span><span className="font-medium">Just Mercy</span> by Bryan Stevenson</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#5F7252]">•</span>
                <span><span className="font-medium">Heartland</span> by Sarah Smarsh</span>
              </li>
            </ul>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-[#F8F6EE] rounded-2xl p-6 sm:p-8 border border-[#D4DAD0] shadow-sm text-center">
          <h2 className="font-serif text-xl text-[#4A5940] mb-3">Sound like your kind of reading?</h2>
          <p className="text-sm text-[#7A8F6C] mb-6">
            Let me help you find your next great read.
          </p>
          <button
            onClick={() => {
              onNavigate('home');
              window.scrollTo(0, 0);
            }}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[#5F7252] text-white text-sm font-medium hover:bg-[#4A5940] transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            Ask Sarah for a Recommendation
          </button>
        </div>
      </div>
    </div>
  );
}
