import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingFallback({ message = 'Loading...' }) {
  return (
    <div className="min-h-screen bg-[#F8F6EE] flex items-center justify-center p-4">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white border border-[#E8EBE4] shadow-sm mb-4">
          <Loader2 className="w-8 h-8 text-[#5F7252] animate-spin" />
        </div>
        <p className="text-[#7A8F6C] font-light">{message}</p>
      </div>
    </div>
  );
}
