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
          {/* Women's Untold Stories */}
          <div className="bg-[#F8F6EE] rounded-xl p-6 border border-[#D4DAD0]">
            <h3 className="font-serif text-lg text-[#4A5940] mb-3 flex items-center gap-2">
              <BookHeart className="w-5 h-5 text-[#5F7252]" />
              Women's Untold Stories
            </h3>
            <p className="text-sm text-[#5F7252] leading-relaxed">
              I'm drawn to stories that illuminate the experiences we rarely hear about—the women who've been footnotes in history books, the ones who survived impossible circumstances, and those whose inner lives were infinitely more complex than the world allowed them to show. These books give voice to the voiceless, whether they're historical figures finally getting their due or contemporary women navigating challenges that society prefers to ignore. Each one feels like discovering a secret that's been hiding in plain sight.
            </p>
          </div>

          {/* Beach Reads */}
          <div className="bg-[#F8F6EE] rounded-xl p-6 border border-[#D4DAD0]">
            <h3 className="font-serif text-lg text-[#4A5940] mb-3 flex items-center gap-2">
              <Sun className="w-5 h-5 text-[#5F7252]" />
              Beach Reads
            </h3>
            <p className="text-sm text-[#5F7252] leading-relaxed">
              These are my go-to books when I want to feel like I'm wrapped in a warm hug while lounging by the ocean. I gravitate toward stories that make me laugh out loud one moment and tear up the next—tales of second chances, unexpected friendships, and characters who are beautifully flawed but utterly lovable. They're the perfect blend of heartwarming and escapist, with just enough depth to make you think but never so heavy that they weigh down your beach bag.
            </p>
          </div>

          {/* Emotional Truth */}
          <div className="bg-[#F8F6EE] rounded-xl p-6 border border-[#D4DAD0]">
            <h3 className="font-serif text-lg text-[#4A5940] mb-3 flex items-center gap-2">
              <Heart className="w-5 h-5 text-[#5F7252]" />
              Emotional Truth
            </h3>
            <p className="text-sm text-[#5F7252] leading-relaxed">
              These are the books that have reached into my chest and rearranged something fundamental—stories that don't just entertain but transform how I see the world and my place in it. I'm drawn to narratives that excavate the deepest parts of human experience: trauma and healing, love and loss, the weight of choices that echo across generations. Whether it's a mother fleeing violence, siblings separated by history, or someone discovering who they truly are, these books reveal the raw, beautiful complexity of what it means to be human.
            </p>
          </div>

          {/* Identity & Belonging */}
          <div className="bg-[#F8F6EE] rounded-xl p-6 border border-[#D4DAD0]">
            <h3 className="font-serif text-lg text-[#4A5940] mb-3 flex items-center gap-2">
              <Users className="w-5 h-5 text-[#5F7252]" />
              Identity & Belonging
            </h3>
            <p className="text-sm text-[#5F7252] leading-relaxed">
              These are the books that have made me feel less alone in the world. I'm drawn to stories about people figuring out who they are when everything familiar falls away—whether through immigration, trauma, family secrets, or simply growing up. There's something deeply comforting about reading how others navigate the space between who they were raised to be and who they're becoming, especially when home feels complicated or conditional.
            </p>
          </div>

          {/* Spiritual Seeking */}
          <div className="bg-[#F8F6EE] rounded-xl p-6 border border-[#D4DAD0]">
            <h3 className="font-serif text-lg text-[#4A5940] mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#5F7252]" />
              Spiritual Seeking
            </h3>
            <p className="text-sm text-[#5F7252] leading-relaxed">
              These are the books that have shaped my understanding of what it means to be human—stories and teachings that explore life's biggest questions without pretending to have all the answers. I'm drawn to authors who write with both intellectual honesty and deep compassion, whether they're examining faith, consciousness, purpose, or the courage it takes to transform ourselves. Each book here has taught me something profound about navigating uncertainty and finding meaning in both struggle and joy.
            </p>
          </div>

          {/* Invisible Injustices */}
          <div className="bg-[#F8F6EE] rounded-xl p-6 border border-[#D4DAD0]">
            <h3 className="font-serif text-lg text-[#4A5940] mb-3 flex items-center gap-2">
              <Scale className="w-5 h-5 text-[#5F7252]" />
              Invisible Injustices
            </h3>
            <p className="text-sm text-[#5F7252] leading-relaxed">
              These are the books that haunt me in the best way—stories that pull back the curtain on injustices hiding in plain sight, whether in our systems, our histories, or our hearts. I'm drawn to narratives that illuminate the quiet ways power operates, the voices that have been silenced, and the human cost of indifference. They're not always easy reads, but they're essential ones that change how you see the world.
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
