import React from 'react';
import { ArrowLeft, Shield, Bot, BookOpen, Lock, Trash2 } from 'lucide-react';

export default function OurPracticesPage({ onNavigate }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FDFBF4] via-[#FBF9F0] to-[#F5EFDC]">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {/* Back Button */}
        <button
          onClick={() => {
            onNavigate('home');
            window.scrollTo(0, 0);
          }}
          className="mb-6 flex items-center gap-2 text-[#5F7252] hover:text-[#4A5940] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>

        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="font-serif text-3xl text-[#4A5940] mb-2">Our Practices</h1>
          <p className="text-[#7A8F6C] leading-relaxed">
            How we handle your data, use AI responsibly, and maintain our community
          </p>
        </div>

        {/* Your Data, Your Control */}
        <div className="bg-[#F8F6EE] rounded-xl p-6 border border-[#D4DAD0] mb-6">
          <h2 className="font-serif text-xl text-[#4A5940] mb-4">Your Data, Your Control</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#5F7252] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Shield className="w-3.5 h-3.5 text-white" />
              </div>
              <p className="text-sm text-[#5F7252] leading-relaxed flex-1">
                <strong className="text-[#4A5940]">We never sell your data.</strong> Your reading preferences, book lists, and personal information are never shared with third parties for advertising or any other purpose.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#5F7252] flex items-center justify-center flex-shrink-0 mt-0.5">
                <BookOpen className="w-3.5 h-3.5 text-white" />
              </div>
              <p className="text-sm text-[#5F7252] leading-relaxed flex-1">
                <strong className="text-[#4A5940]">Used only for recommendations.</strong> We use your reading history and preferences solely to provide you with better, more personalized book recommendations.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#5F7252] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Lock className="w-3.5 h-3.5 text-white" />
              </div>
              <p className="text-sm text-[#5F7252] leading-relaxed flex-1">
                <strong className="text-[#4A5940]">You own your data.</strong> You can export or delete your data at any time from your profile settings.
              </p>
            </div>
          </div>
        </div>

        {/* Responsible AI */}
        <div className="bg-[#F8F6EE] rounded-xl p-6 border border-[#D4DAD0] mb-6">
          <h2 className="font-serif text-xl text-[#4A5940] mb-4">Responsible AI</h2>
          <div className="space-y-3 text-sm text-[#5F7252] leading-relaxed">
            <p>
              Sarah's Books uses <strong>Claude by Anthropic</strong> to power our book recommendations. Claude is designed to be <a href="https://www.anthropic.com/transparency/voluntary-commitments" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#4A5940]">helpful, harmless, and honest</a>.
            </p>
            <p>
              When you ask for recommendations, Claude analyzes your request against Sarah's curated collection of 200+ books and the broader world of literature to find your perfect match.
            </p>
            <p>
              We're transparent about AI use: every recommendation clearly shows whether it comes from Sarah's personal library or is a discovery from the world's library.
            </p>
          </div>
        </div>

        {/* Community Engagement Guidelines */}
        <div className="bg-[#F8F6EE] rounded-xl p-6 sm:p-8 border border-[#D4DAD0] mb-6">
          <h2 className="font-serif text-2xl text-[#4A5940] mb-6">Community Engagement Guidelines</h2>
          <div className="space-y-6 text-base text-[#5F7252] leading-relaxed">
            <p>
              Sarah's Books is a community built on a shared love of reading. We're here to help each other discover great books, share recommendations thoughtfully, and connect over stories that move us.
            </p>
            
            <div>
              <h3 className="font-semibold text-[#4A5940] mb-4 text-lg">Core Principles</h3>
              <ul className="space-y-3">
                <li className="pl-0"><strong className="text-[#5F7252]">Be Neighborly</strong> — Treat others with kindness and respect</li>
                <li className="pl-0"><strong className="text-[#5F7252]">Stay Book-Focused</strong> — Keep conversations centered on books and reading</li>
                <li className="pl-0"><strong className="text-[#5F7252]">Respect Diverse Perspectives</strong> — Books mean different things to different people</li>
                <li className="pl-0"><strong className="text-[#5F7252]">Share Thoughtfully</strong> — Provide honest, helpful recommendations</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-[#4A5940] mb-4 text-lg">What We Don't Allow</h3>
              <p className="mb-3">We maintain a welcoming space by not allowing:</p>
              <ul className="space-y-2 text-sm">
                <li>• Harassment, abuse, or hate speech</li>
                <li>• Spam or unsolicited self-promotion</li>
                <li>• Misinformation or inappropriate content</li>
                <li>• Platform manipulation or fake accounts</li>
              </ul>
            </div>

            <p className="text-sm italic text-[#7A8F6C] pt-4">
              By creating an account, you agree to follow our Community Engagement Guidelines and Terms of Use.
            </p>
          </div>
        </div>

        {/* Age Requirements */}
        <div className="bg-[#F8F6EE] rounded-xl p-6 border border-[#D4DAD0] mb-6">
          <h2 className="font-serif text-xl text-[#4A5940] mb-4">Age Requirements</h2>
          <div className="space-y-3 text-sm text-[#5F7252] leading-relaxed">
            <p>
              Sarah's Books is designed for readers aged <strong>13 and older</strong>. We do not knowingly collect information from children under 13.
            </p>
            <p>
              Our <strong>Read with Friends</strong> feature (coming soon) will only be available to users aged <strong>18 and older</strong> to ensure a safe and appropriate community experience.
            </p>
          </div>
        </div>

        {/* Legal & Privacy */}
        <div className="bg-[#F8F6EE] rounded-xl p-6 border border-[#D4DAD0] mb-6">
          <h2 className="font-serif text-xl text-[#4A5940] mb-4">Legal & Privacy</h2>
          <div className="space-y-3 text-sm text-[#5F7252] leading-relaxed">
            <p>
              For complete details on how we collect, use, and protect your information, please review our legal documents:
            </p>
            <div className="flex flex-col gap-2 mt-4">
              <button
                onClick={() => {
                  onNavigate('privacy-policy');
                  window.scrollTo(0, 0);
                }}
                className="text-left px-4 py-2 rounded-lg bg-white border border-[#D4DAD0] text-[#5F7252] hover:bg-[#F8F6EE] hover:text-[#4A5940] transition-colors"
              >
                → Privacy Notice
              </button>
              <button
                onClick={() => {
                  onNavigate('terms-of-use');
                  window.scrollTo(0, 0);
                }}
                className="text-left px-4 py-2 rounded-lg bg-white border border-[#D4DAD0] text-[#5F7252] hover:bg-[#F8F6EE] hover:text-[#4A5940] transition-colors"
              >
                → Terms of Use
              </button>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="text-center text-sm text-[#7A8F6C]">
          <p>Questions about our practices? <a href="mailto:hello@sarahsbooks.com" className="text-[#5F7252] underline hover:text-[#4A5940]">Get in touch</a></p>
        </div>
      </div>
    </div>
  );
}
