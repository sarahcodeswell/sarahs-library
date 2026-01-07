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
          <div className="space-y-3 text-sm text-[#5F7252] leading-relaxed">
            <p>• <strong>We never sell your data.</strong> Your reading preferences, book lists, and personal information are never shared with third parties for advertising or any other purpose.</p>
            <p>• <strong>Used only for recommendations.</strong> We use your reading history and preferences solely to provide you with better, more personalized book recommendations.</p>
            <p>• <strong>You own your data.</strong> You can export or delete your data at any time from your profile settings.</p>
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

        {/* Age Requirements & Community Standards */}
        <div className="bg-[#F8F6EE] rounded-xl p-6 border border-[#D4DAD0] mb-6">
          <h2 className="font-serif text-xl text-[#4A5940] mb-4">Age Requirements & Community Standards</h2>
          <div className="space-y-3 text-sm text-[#5F7252] leading-relaxed">
            <p>
              Sarah's Books is designed for readers aged <strong>13 and older</strong>. We do not knowingly collect information from children under 13.
            </p>
            <p>
              Our <strong>Read with Friends</strong> feature (coming soon) will only be available to users aged <strong>18 and older</strong> to ensure a safe and appropriate community experience.
            </p>
            <p>
              We are thoughtfully designed and moderated to promote neighborly behavior and genuine book discovery—not social media engagement.
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
