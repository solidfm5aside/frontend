'use client';

import { useState } from 'react';
import { toast } from 'sonner';

export default function ReportsPage() {
  const [isGenerating, setIsGenerating] = useState<string | null>(null);

  const handleDownload = (type: string) => {
    setIsGenerating(type);
    
    // Stub implementation
    setTimeout(() => {
      setIsGenerating(null);
      toast.success(`${type} Report generated and stored offline.`);
    }, 2000);
  };

  const reports = [
    { id: 'registration', name: 'Registration Master List', icon: '📝', description: 'Export all approved team and player data in CSV format.', color: 'emerald' },
    { id: 'standings', name: 'Standings Snapshot', icon: '🏆', description: 'Download the current league table and tiebreaker calculations.', color: 'blue' },
    { id: 'financial', name: 'Financial Overview', icon: '📈', description: 'Secure log of all processed payment receipts and pending fees.', color: 'yellow' }
  ];

  return (
    <div className="max-w-5xl space-y-8 animate-reveal md:space-y-10">
      <div>
         <h1 className="text-3xl font-black italic tracking-tighter text-white uppercase sm:text-4xl">Reports.</h1>
         <p className="mt-2 text-[10px] font-black tracking-[0.3em] text-neutral-500 uppercase">System Data Extraction</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {reports.map((report) => (
          <div key={report.id} className="group flex min-h-[19rem] flex-col justify-between rounded-[28px] border border-white/5 bg-white/[0.02] p-6 backdrop-blur-3xl transition-all hover:border-blue-500/20 hover:bg-white/[0.04]">
            <div>
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl">
                 {report.icon}
              </div>
              <h3 className="mb-3 text-lg font-black italic uppercase tracking-tighter text-white">{report.name}</h3>
              <p className="text-xs text-neutral-500 leading-relaxed font-medium">{report.description}</p>
            </div>
            
            <button
               onClick={() => handleDownload(report.name)}
               disabled={isGenerating === report.name}
               className={`mt-6 h-12 w-full rounded-2xl border bg-white/[0.02] text-[10px] font-black uppercase tracking-widest transition-all ${
                 isGenerating === report.name 
                 ? 'border-neutral-500/20 text-neutral-500 cursor-wait' 
                 : 'border-white/10 text-white hover:bg-white/10 hover:border-white/20'
               }`}
            >
               {isGenerating === report.name ? 'Packaging...' : 'Download / Export'}
            </button>
          </div>
         ))}
      </div>
    </div>
  );
}
