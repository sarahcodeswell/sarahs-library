import React from 'react';
import { ChevronDown, Star } from 'lucide-react';

/**
 * Shared UI Components - DRY refactor
 * Consolidates repeated patterns across the app
 */

/**
 * Book Cover with loading state
 */
export function BookCover({ coverUrl, title, isEnriching, size = 'sm' }) {
  const sizeClasses = {
    sm: 'w-12 h-18',
    md: 'w-16 h-24',
    lg: 'w-20 h-30',
  };
  
  const sizeClass = sizeClasses[size] || sizeClasses.sm;
  
  if (coverUrl) {
    return (
      <div className="flex-shrink-0">
        <img 
          src={coverUrl} 
          alt={`Cover of ${title}`}
          className={`${sizeClass} object-cover rounded shadow-sm`}
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      </div>
    );
  }
  
  if (isEnriching) {
    return <div className={`flex-shrink-0 ${sizeClass} bg-[#E8EBE4] rounded animate-pulse`} />;
  }
  
  return null;
}

/**
 * Genre badges
 */
export function GenreBadges({ genres = [], maxDisplay = 3 }) {
  if (!genres?.length) return null;
  
  return (
    <div className="flex flex-wrap gap-1">
      {genres.slice(0, maxDisplay).map((genre, idx) => (
        <span 
          key={idx}
          className="px-1.5 py-0.5 text-[10px] bg-[#E8EBE4] text-[#5F7252] rounded"
        >
          {genre}
        </span>
      ))}
    </div>
  );
}

/**
 * Reputation/Accolades display box
 */
export function ReputationBox({ reputation }) {
  if (!reputation) return null;
  
  return (
    <div className="p-2 bg-amber-50 rounded-lg border border-amber-200">
      <p className="text-xs font-medium text-[#4A5940] mb-1 flex items-center gap-1">
        <Star className="w-3 h-3 text-amber-500" />
        Reputation & Accolades:
      </p>
      <p className="text-xs text-[#5F7252] leading-relaxed">{reputation}</p>
    </div>
  );
}

/**
 * Expand/Collapse toggle button
 */
export function ExpandToggle({ expanded, onToggle, className = '', isLoading = false }) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-1 text-xs font-medium text-[#7A8F6C] hover:text-[#4A5940] transition-colors ${className}`}
    >
      {isLoading ? (
        <>
          <div className="w-3 h-3 border border-[#96A888] border-t-[#5F7252] rounded-full animate-spin" />
          <span>Loading...</span>
        </>
      ) : (
        <>
          <span>{expanded ? 'Show less' : 'About this book'}</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </>
      )}
    </button>
  );
}

/**
 * Primary action button
 */
export function PrimaryButton({ children, onClick, disabled, loading, className = '', ...props }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`px-4 py-2.5 bg-[#5F7252] text-white rounded-lg font-medium hover:bg-[#4A5940] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${className}`}
      {...props}
    >
      {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
      {children}
    </button>
  );
}

/**
 * Secondary/outline button
 */
export function SecondaryButton({ children, onClick, disabled, className = '', ...props }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2.5 border border-[#5F7252] text-[#5F7252] rounded-lg font-medium hover:bg-[#F8F6EE] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * Ghost/subtle button
 */
export function GhostButton({ children, onClick, disabled, className = '', ...props }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2.5 text-[#7A8F6C] hover:text-[#4A5940] hover:bg-[#F8F6EE] rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * Card container with consistent styling
 */
export function Card({ children, className = '', highlighted = false }) {
  return (
    <div className={`bg-[#FDFBF4] rounded-xl border ${
      highlighted 
        ? 'border-[#5F7252] ring-1 ring-[#5F7252]/20' 
        : 'border-[#D4DAD0]'
    } ${className}`}>
      {children}
    </div>
  );
}

/**
 * Section divider
 */
export function Divider({ className = '' }) {
  return <div className={`border-t border-[#E8EBE4] ${className}`} />;
}

/**
 * Loading spinner
 */
export function Spinner({ size = 'md', className = '' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };
  
  return (
    <div className={`${sizeClasses[size]} border-2 border-[#E8EBE4] border-t-[#5F7252] rounded-full animate-spin ${className}`} />
  );
}

/**
 * Empty state placeholder
 */
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="text-center py-12 px-4">
      {Icon && (
        <div className="w-16 h-16 bg-[#F8F6EE] rounded-full flex items-center justify-center mx-auto mb-4">
          <Icon className="w-8 h-8 text-[#96A888]" />
        </div>
      )}
      <h3 className="text-lg font-serif text-[#4A5940] mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-[#7A8F6C] mb-4 max-w-sm mx-auto">{description}</p>
      )}
      {action}
    </div>
  );
}

/**
 * Badge component
 */
export function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    default: 'bg-[#E8EBE4] text-[#5F7252]',
    primary: 'bg-[#5F7252]/10 text-[#5F7252]',
    secondary: 'bg-[#7A8F6C]/10 text-[#7A8F6C]',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-amber-100 text-amber-700',
  };
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}

/**
 * Page header with back button
 */
export function PageHeader({ title, subtitle, onBack, backLabel = 'Back', children }) {
  return (
    <div className="mb-6">
      {onBack && (
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-[#5F7252] hover:text-[#4A5940] transition-colors mb-4 text-sm font-medium"
        >
          <ChevronDown className="w-4 h-4 rotate-90" />
          {backLabel}
        </button>
      )}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl text-[#4A5940]">{title}</h1>
          {subtitle && (
            <p className="text-sm text-[#7A8F6C] mt-1">{subtitle}</p>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
