/**
 * StatusBadge — Shared pill badge for match and team status.
 * Replaces duplicate inline status styling across matches, teams, and tournaments pages.
 */

type Status =
  // Match statuses
  | 'live' | 'completed' | 'scheduled' | 'cancelled'
  // Team statuses
  | 'registered' | 'pending' | 'withdrawn'
  // Tournament statuses
  | 'ongoing' | 'upcoming';

const STATUS_CONFIG: Record<Status, string> = {
  // Match
  live:        'bg-red-500 text-white animate-pulse motion-reduce:animate-none',
  completed:   'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  scheduled:   'bg-white/5 text-neutral-500 border border-white/10',
  cancelled:   'bg-neutral-800 text-neutral-600 border border-white/5',
  // Team
  registered:  'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
  pending:     'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20',
  withdrawn:   'bg-neutral-500/10 text-neutral-500 border border-neutral-500/20',
  // Tournament
  ongoing:     'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
  upcoming:    'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20',
};

interface StatusBadgeProps {
  status?: string | null;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const normalizedStatus = status?.trim() || 'unknown';
  const styles = STATUS_CONFIG[normalizedStatus as Status] ?? 'bg-white/5 text-neutral-500 border border-white/10';
  const label = normalizedStatus.replaceAll('_', ' ');

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-widest ${styles} ${className}`}
      aria-label={`Status: ${label}`}
    >
      {label}
    </span>
  );
}
