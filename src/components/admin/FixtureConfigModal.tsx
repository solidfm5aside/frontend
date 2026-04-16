'use client';

import { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { calculateFixtureEndDate, getFirstMatchDay } from '@/utils/format';

interface FixtureConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (numRounds: number, matchesPerDay: number) => void;
  /** Number of active venues, shown in the info blurb */
  venueCount: number;
  /** The tournament start date string (ISO) */
  startDate?: string;
  /** Whether generation is in progress */
  isGenerating?: boolean;
}

/**
 * FixtureConfigModal — Shared modal for generating league fixtures.
 * Previously copy-pasted identically in both dashboard/page.tsx and tournaments/page.tsx.
 */
export function FixtureConfigModal({
  isOpen,
  onClose,
  onConfirm,
  venueCount,
  startDate = '',
  isGenerating = false,
}: FixtureConfigModalProps) {
  const [numRounds, setNumRounds] = useState(6);
  const [matchesPerDay, setMatchesPerDay] = useState(7);

  const estimatedEndDate = calculateFixtureEndDate(startDate, numRounds, matchesPerDay);
  const kickoffDate = getFirstMatchDay(startDate);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Fixture Configuration">
      <div className="space-y-6">
        <div className="p-6 rounded-3xl bg-blue-600/5 border border-blue-500/10">
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2 italic">
            Scheduling Intelligence
          </p>
          <p className="text-sm text-neutral-400 font-medium leading-relaxed">
            Based on your{' '}
            <span className="text-white font-bold">{venueCount} active venues</span>, each round
            of 14 matches will be distributed across available slots.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-1">
              Rounds per Team
            </label>
            <input
              type="number"
              min="1"
              max="27"
              value={numRounds}
              onChange={(e) =>
                setNumRounds(Math.min(27, Math.max(1, parseInt(e.target.value) || 1)))
              }
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-xl font-black italic tracking-tighter text-white focus:border-blue-500 focus:outline-none transition-all"
            />
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-1">
              Matches Per Day
            </label>
            <input
              type="number"
              min="1"
              max="28"
              value={matchesPerDay}
              onChange={(e) =>
                setMatchesPerDay(Math.min(28, Math.max(1, parseInt(e.target.value) || 1)))
              }
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-xl font-black italic tracking-tighter text-white focus:border-blue-500 focus:outline-none transition-all"
            />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
          <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-neutral-500">
            <span>📅 Weekend Policy</span>
            <span className="text-emerald-500 lowercase tracking-normal">Saturdays &amp; Sundays only</span>
          </div>
          <div className="flex justify-between items-center border-t border-white/5 pt-2">
            <div className="text-left">
              <p className="text-[9px] font-black text-neutral-600 uppercase">Season Kickoff</p>
              <p className="text-xs font-bold text-white">{kickoffDate?.toLocaleDateString() ?? '—'}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black text-neutral-600 uppercase">Grand Finale</p>
              <p className="text-xs font-bold text-blue-500">{estimatedEndDate?.toLocaleDateString() ?? '—'}</p>
            </div>
          </div>
          <p className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest text-center italic border-t border-white/5 pt-2">
            Total {numRounds * 14} matches • {Math.ceil((numRounds * 14) / matchesPerDay)} matchdays
          </p>
        </div>

        <div className="flex gap-4 pt-4">
          <button
            onClick={onClose}
            className="flex-1 h-14 rounded-2xl border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(numRounds, matchesPerDay)}
            disabled={isGenerating}
            className="flex-1 h-14 rounded-2xl bg-blue-600 text-[10px] font-black uppercase tracking-widest text-white hover:bg-blue-500 shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CalendarDays className="h-4 w-4" />
            {isGenerating ? 'Generating…' : 'Initialize'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
