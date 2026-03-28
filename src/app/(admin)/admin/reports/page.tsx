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
    <div className="space-y-12 animate-reveal max-w-5xl">
      <div>
         <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter text-white uppercase">Reports.</h1>
         <p className="mt-2 text-[10px] font-black tracking-[0.3em] text-neutral-500 uppercase">System Data Extraction</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report) => (
          <div key={report.id} className="group rounded-[30px] border border-white/5 bg-white/[0.02] p-8 backdrop-blur-3xl transition-all hover:bg-white/[0.04] hover:border-blue-500/20 flex flex-col justify-between aspect-square">
            <div>
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-3xl mb-6">
                 {report.icon}
              </div>
              <h3 className="text-xl font-black italic tracking-tighter text-white uppercase mb-3">{report.name}</h3>
              <p className="text-xs text-neutral-500 leading-relaxed font-medium">{report.description}</p>
            </div>
            
            <button
               onClick={() => handleDownload(report.name)}
               disabled={isGenerating === report.name}
               className={`mt-8 w-full h-[52px] rounded-2xl border bg-white/[0.02] text-[10px] font-black uppercase tracking-widest transition-all ${
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
