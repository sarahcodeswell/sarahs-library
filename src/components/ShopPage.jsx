import React from 'react';
import { Heart } from 'lucide-react';

export default function ShopPage({ onNavigate }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FDFBF4] via-[#FBF9F0] to-[#F5EFDC]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        
        {/* Simple Header */}
        <div className="text-center mb-16">
          <h1 className="font-serif text-4xl sm:text-5xl text-[#4A5940] mb-6">
            For the <Heart className="w-10 h-10 sm:w-12 sm:h-12 fill-[#c96b6b] text-[#c96b6b] inline mx-1" /> of reading
          </h1>
          <p className="text-[#7A8F6C] text-base sm:text-lg mb-8 max-w-2xl mx-auto">
            Wear your love of books. Each t-shirt is made to order and supports our mission to connect readers with their next great read.
          </p>
        </div>

        {/* Product Showcase */}
        <div className="mb-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-12">
            {/* Product 1 */}
            <a
              href="https://sarahsbooks.printful.me/"
              target="_blank"
              rel="noopener noreferrer"
              className="group"
            >
              <div className="bg-white rounded-2xl overflow-hidden border border-[#D4DAD0] hover:shadow-xl transition-all">
                <div className="aspect-square bg-white flex items-center justify-center p-8">
                  <img 
                    src="/unisex-staple-t-shirt-vintage-white-front-69530f90b2fa7.png" 
                    alt="For the love of reading t-shirt - compact design"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="p-6 text-center">
                  <p className="text-sm text-[#7A8F6C] font-serif italic">Compact Design</p>
                </div>
              </div>
            </a>

            {/* Product 2 */}
            <a
              href="https://sarahsbooks.printful.me/"
              target="_blank"
              rel="noopener noreferrer"
              className="group"
            >
              <div className="bg-white rounded-2xl overflow-hidden border border-[#D4DAD0] hover:shadow-xl transition-all">
                <div className="aspect-square bg-white flex items-center justify-center p-8">
                  <img 
                    src="/unisex-staple-t-shirt-vintage-white-front-6953100b12468.png" 
                    alt="For the love of reading t-shirt - centered design"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="p-6 text-center">
                  <p className="text-sm text-[#7A8F6C] font-serif italic">Centered Design</p>
                </div>
              </div>
            </a>
          </div>

          {/* CTA */}
          <div className="text-center">
            <a
              href="https://sarahsbooks.printful.me/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-8 py-4 bg-[#5F7252] text-white rounded-lg hover:bg-[#4A5940] transition-colors font-medium text-lg"
            >
              Shop Now
            </a>
            <p className="text-xs text-[#96A888] mt-4">
              Opens in new window • Secure checkout via Printful
            </p>
          </div>
        </div>

        {/* Back Button */}
        <div className="text-center">
          <button
            onClick={() => onNavigate('home')}
            className="text-sm text-[#7A8F6C] hover:text-[#5F7252] transition-colors"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
