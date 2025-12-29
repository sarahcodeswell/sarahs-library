import React from 'react';
import { ShoppingBag, ExternalLink, Heart, Sparkles } from 'lucide-react';

export default function ShopPage({ onNavigate }) {
  const products = [
    {
      name: "Sarah's Books Classic Tee",
      description: "Soft, comfortable cotton tee featuring the Sarah's Books logo",
      image: "/shop-tee-preview.jpg", // You'll need to add product images
      price: "$24.99",
    },
    // Add more products as you create them in Printful
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FDFBF4] via-[#FBF9F0] to-[#F5EFDC]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-4">
            <ShoppingBag className="w-8 h-8 text-[#5F7252]" />
            <h1 className="font-serif text-3xl sm:text-4xl text-[#4A5940]">Shop</h1>
          </div>
          <p className="text-[#7A8F6C] text-sm sm:text-base max-w-2xl mx-auto">
            Wear your love of reading with Sarah's Books merchandise. Each purchase supports our mission to connect readers with their next great book.
          </p>
        </div>

        {/* Featured Banner */}
        <div className="bg-white rounded-2xl p-8 sm:p-12 border border-[#D4DAD0] shadow-sm mb-12 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Heart className="w-6 h-6 text-[#c96b6b] fill-[#c96b6b]" />
            <Sparkles className="w-6 h-6 text-[#5F7252]" />
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl text-[#4A5940] mb-4">
            Sarah's Books Collection
          </h2>
          <p className="text-[#7A8F6C] mb-6 max-w-xl mx-auto">
            High-quality apparel for book lovers. Designed with care, printed on demand, and shipped directly to you.
          </p>
          <a
            href="https://sarahsbooks.printful.me/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#5F7252] text-white rounded-lg hover:bg-[#4A5940] transition-colors font-medium"
          >
            <ShoppingBag className="w-5 h-5" />
            Browse All Products
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Product Grid - You can expand this later */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {/* Product Card Example */}
          <div className="bg-white rounded-xl border border-[#D4DAD0] overflow-hidden hover:shadow-lg transition-shadow">
            <div className="aspect-square bg-[#F8F6EE] flex items-center justify-center">
              <ShoppingBag className="w-16 h-16 text-[#D4DAD0]" />
              {/* Replace with actual product image */}
            </div>
            <div className="p-4">
              <h3 className="font-medium text-[#4A5940] mb-1">T-Shirts</h3>
              <p className="text-xs text-[#7A8F6C] mb-3">Classic & comfortable</p>
              <a
                href="https://sarahsbooks.printful.me/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#5F7252] hover:text-[#4A5940] font-medium inline-flex items-center gap-1"
              >
                Shop Now
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Add more product cards as needed */}
        </div>

        {/* Info Section */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-xl p-6 border border-[#D4DAD0] text-center">
            <div className="w-12 h-12 bg-[#E8F5E9] rounded-full flex items-center justify-center mx-auto mb-3">
              <ShoppingBag className="w-6 h-6 text-[#2E7D32]" />
            </div>
            <h3 className="font-medium text-[#4A5940] mb-2">Quality Materials</h3>
            <p className="text-xs text-[#7A8F6C]">Premium fabrics and prints that last</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-[#D4DAD0] text-center">
            <div className="w-12 h-12 bg-[#E8F5E9] rounded-full flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-6 h-6 text-[#2E7D32]" />
            </div>
            <h3 className="font-medium text-[#4A5940] mb-2">Made to Order</h3>
            <p className="text-xs text-[#7A8F6C]">Printed just for you, reducing waste</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-[#D4DAD0] text-center">
            <div className="w-12 h-12 bg-[#E8F5E9] rounded-full flex items-center justify-center mx-auto mb-3">
              <Heart className="w-6 h-6 text-[#c96b6b] fill-[#c96b6b]" />
            </div>
            <h3 className="font-medium text-[#4A5940] mb-2">Support Reading</h3>
            <p className="text-xs text-[#7A8F6C]">Every purchase supports our mission</p>
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
