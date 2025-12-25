import React from 'react';
import { User, LogOut } from 'lucide-react';
import { useUser } from '../contexts';

export default function UserProfile({ tasteProfile }) {
  const { user, signOut } = useUser();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#5F7252] to-[#7A8F6C] flex items-center justify-center">
            <User className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-[#4A5940] truncate">{user.email}</h3>
            <p className="text-xs text-[#96A888]">Member since {new Date(user.created_at).toLocaleDateString()}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-[#D4DAD0] hover:bg-[#F8F6EE] text-[#5F7252] rounded-lg transition-colors text-sm font-medium"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>

      {/* Future: Reading taste preferences will go here */}
      <div className="pt-6 border-t border-[#E8EBE4]">
        <h4 className="text-sm font-medium text-[#5F7252] mb-2">Reading Preferences</h4>
        <p className="text-xs text-[#96A888]">
          Coming soon: Define your reading tastes and preferences here.
        </p>
      </div>


      {tasteProfile?.likedAuthors?.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-[#5F7252] mb-2">Favorite Authors</h4>
          <div className="flex flex-wrap gap-2">
            {tasteProfile.likedAuthors.slice(0, 5).map((author, idx) => (
              <span
                key={idx}
                className="text-xs px-2 py-1 bg-[#E8EBE4] text-[#5F7252] rounded-full"
              >
                {author}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
