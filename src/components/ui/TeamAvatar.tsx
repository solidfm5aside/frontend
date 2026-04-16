'use client';

/**
 * TeamAvatar — Shared team display component.
 * Shows the uploaded team logo if available, otherwise falls back to
 * a stylistic letter-based placeholder. This is the single source of truth
 * for team avatar display across Fixtures, Results, Standings, and Admin pages.
 */

interface TeamAvatarProps {
  name?: string;
  logo?: string;
  /** Preset sizes. xs=24px, sm=48px, md=64px, lg=112px */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const RESPONSIVE_SIZE_MAP = {
  xs: 'h-6 w-6 rounded-md text-[10px]',
  sm: 'h-11 w-11 sm:h-14 sm:w-14 md:h-16 md:w-16 rounded-2xl text-lg',
  md: 'h-12 w-12 sm:h-16 sm:w-16 md:h-20 md:w-20 rounded-2xl text-xl',
  lg: 'h-12 w-12 sm:h-16 sm:w-16 md:h-28 md:w-28 rounded-2xl md:rounded-[40px] text-xl md:text-4xl',
};

export function TeamAvatar({ name, logo, size = 'md', className = '' }: TeamAvatarProps) {
  const sizeClasses = RESPONSIVE_SIZE_MAP[size];
  const letter = name?.charAt(0) ?? '?';

  return (
    <div
      className={`${sizeClasses} bg-white/[0.03] border border-white/10 flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-transform shadow-2xl shadow-black/50 ${className}`}
    >
      {logo ? (
        <img src={logo} alt={name ?? 'Team'} className="h-full w-full object-cover" />
      ) : (
        <span className="font-black text-neutral-700 italic">{letter}</span>
      )}
    </div>
  );
}
