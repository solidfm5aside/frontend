'use client';

import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { Trophy, Clock, Zap } from 'lucide-react';

interface BracketMatch {
  _id: string;
  homeTeam: { _id: string; name: string };
  awayTeam: { _id: string; name: string };
  homeScore: number;
  awayScore: number;
  status: string;
  date: string;
  venue: string;
  winner?: { _id: string; name: string };
  isExtraTime?: boolean;
  shootoutScore?: { home: number; away: number };
}

interface BracketData {
  [stage: string]: BracketMatch[];
}

interface KnockoutBracketProps {
  tournamentId: string;
  filterStage?: string; // If provided, only show this stage directly
}

const STAGE_LABELS: Record<string, string> = {
  playoff: 'Playoffs',
  round_of_16: 'Round of 16',
  quarter_finals: 'Quarter Finals',
  semi_finals: 'Semi Finals',
  final: 'Grand Final',
};

export default function KnockoutBracket({ tournamentId, filterStage }: KnockoutBracketProps) {
  const [bracket, setBracket] = useState<BracketData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('round_of_16');

  useEffect(() => {
    fetchBracket();
  }, [tournamentId]);

  const fetchBracket = async () => {
    try {
      const resp: any = await apiClient.get(`/tournaments/${tournamentId}/bracket`);
      if (resp.success) {
        setBracket(resp.data);
        // Default tab: if filterStage is provided, use it; otherwise pick most advanced stage
        if (!filterStage) {
          const stages = Object.keys(resp.data).reverse();
          for (const s of stages) {
            if (resp.data[s].length > 0) {
              setActiveTab(s);
              break;
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch bracket', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <div className="h-64 flex items-center justify-center text-neutral-500 font-black uppercase tracking-widest text-[10px] animate-pulse">Loading Bracket...</div>;
  if (!bracket) return null;

  const MatchCard = ({ match }: { match: BracketMatch }) => {
    const isCompleted = match.status === 'completed';
    const homeWinner = isCompleted && match.winner?._id === match.homeTeam?._id;
    const awayWinner = isCompleted && match.winner?._id === match.awayTeam?._id;

    return (
      <div className="relative group p-4 rounded-3xl bg-white/[0.02] border border-white/5 backdrop-blur-3xl hover:bg-white/[0.04] hover:border-blue-500/20 transition-all duration-500">
        <div className="absolute top-2 right-4 text-[7px] font-black uppercase tracking-[0.2em] text-neutral-600">
          {match.status === 'live' ? '🔴 Live' : match.status === 'completed' ? 'Final Result' : new Date(match.date).toLocaleDateString()}
        </div>
        
        <div className="space-y-3 mt-2">
          {/* Home Team */}
          <div className={`flex items-center justify-between transition-all duration-500 ${homeWinner ? 'scale-105' : isCompleted && !homeWinner ? 'opacity-30 blur-[1px]' : ''}`}>
             <div className="flex items-center gap-3">
                <div className={`h-8 w-8 rounded-xl bg-black border flex items-center justify-center font-black italic text-[10px] ${homeWinner ? 'text-blue-500 border-blue-500/30' : 'text-neutral-500 border-white/10'}`}>
                   {match.homeTeam?.name?.charAt(0)}
                </div>
                <span className={`text-xs font-black uppercase tracking-tighter ${homeWinner ? 'text-white' : 'text-neutral-400'}`}>{match.homeTeam?.name}</span>
             </div>
             <span className={`text-xl font-black italic tracking-tighter ${homeWinner ? 'text-blue-500' : 'text-white'}`}>
               {isCompleted || match.status === 'live' ? match.homeScore : '-'}
             </span>
          </div>

          <div className="h-px bg-white/5 w-full"></div>

          {/* Away Team */}
          <div className={`flex items-center justify-between transition-all duration-500 ${awayWinner ? 'scale-105' : isCompleted && !awayWinner ? 'opacity-30 blur-[1px]' : ''}`}>
             <div className="flex items-center gap-3">
                <div className={`h-8 w-8 rounded-xl bg-black border flex items-center justify-center font-black italic text-[10px] ${awayWinner ? 'text-blue-500 border-blue-500/30' : 'text-neutral-500 border-white/10'}`}>
                   {match.awayTeam?.name?.charAt(0)}
                </div>
                <span className={`text-xs font-black uppercase tracking-tighter ${awayWinner ? 'text-white' : 'text-neutral-400'}`}>{match.awayTeam?.name}</span>
             </div>
             <span className={`text-xl font-black italic tracking-tighter ${awayWinner ? 'text-blue-500' : 'text-white'}`}>
               {isCompleted || match.status === 'live' ? match.awayScore : '-'}
             </span>
          </div>
        </div>

        {/* Shootout/ET Indicator */}
        {isCompleted && (match.isExtraTime || match.shootoutScore) && (
          <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-4 text-[8px] font-black uppercase tracking-widest">
             {match.isExtraTime && (
               <div className="flex items-center gap-1.5 text-amber-500">
                  <Clock className="h-3 w-3" /> (AET)
               </div>
             )}
             {match.shootoutScore && (
               <div className="flex items-center gap-1.5 text-blue-500">
                  <Zap className="h-3 w-3" /> PENS: {match.shootoutScore.home}-{match.shootoutScore.away}
               </div>
             )}
          </div>
        )}

        {isCompleted && (
          <div className={`absolute -right-1 -bottom-1 h-6 w-6 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20 z-10 animate-in zoom-in duration-500`}>
             <Trophy className="h-3 w-3 text-white" />
          </div>
        )}
      </div>
    );
  };

  const stages = Object.keys(STAGE_LABELS).filter(s => bracket[s]?.length > 0);

  // The active stage to display — either the external filterStage prop or the internal tab selection
  const displayStage = filterStage || activeTab;
  const stageMatches = bracket[displayStage] || [];

  return (
    <div className="font-outfit">
      {/* Internal stage tabs — only shown when no filterStage is passed (standalone bracket page) */}
      {!filterStage && (
        <div className="flex gap-2 mb-8 overflow-x-auto pb-4 hide-scrollbar px-1">
           {stages.map(s => (
             <button
               key={s}
               onClick={() => setActiveTab(s)}
               className={`shrink-0 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border ${
                 activeTab === s 
                 ? 'bg-blue-600 border-blue-400 text-white shadow-xl shadow-blue-600/20' 
                 : 'bg-white/5 border-white/5 text-neutral-500 hover:text-white hover:bg-white/10'
               }`}
             >
               {STAGE_LABELS[s]}
             </button>
           ))}
        </div>
      )}

      {/* Matches Grid */}
      {stageMatches.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 animate-reveal">
           {stageMatches.map((m) => (
             <MatchCard key={m._id} match={m} />
           ))}
        </div>
      ) : (
        <div className="text-center py-24 rounded-[40px] border border-white/5 bg-white/[0.01]">
           <Trophy className="h-12 w-12 text-neutral-800 mx-auto mb-6 opacity-20" />
           <p className="text-[10px] font-black text-neutral-600 uppercase tracking-[0.4em] italic leading-loose">
             {filterStage
               ? `No ${STAGE_LABELS[filterStage] || filterStage} fixtures have been drawn yet.`
               : 'Knockout fixtures have not been generated yet.'
             }
           </p>
        </div>
      )}
    </div>
  );
}
