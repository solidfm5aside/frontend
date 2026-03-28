'use client';

import { useState } from 'react';
import { toast } from 'sonner';

export default function BroadcastPage() {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSending(true);
    // Stub implementation
    setTimeout(() => {
      setIsSending(false);
      setMessage('');
      toast.success('Broadcast sent to all coaches and organizers');
    }, 1500);
  };

  return (
    <div className="space-y-12 animate-reveal max-w-4xl">
      <div>
        <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter text-white uppercase">Broadcast.</h1>
        <p className="mt-2 text-[10px] font-black tracking-[0.3em] text-neutral-500 uppercase">Emergency & Update Announcer</p>
      </div>

      <div className="rounded-[40px] border border-blue-500/20 bg-blue-500/5 p-8 md:p-12 backdrop-blur-3xl animate-reveal relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full"></div>
        
        <div className="relative z-10 flex flex-col gap-8">
          <div className="flex items-start gap-6">
             <div className="flex shrink-0 h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 border flex-col">
                <span className="text-2xl pt-1">📣</span>
             </div>
             <div>
                <h3 className="text-lg md:text-2xl font-black italic tracking-tighter text-white uppercase mb-2 leading-none">Global Notification</h3>
                <p className="text-sm text-neutral-400 leading-relaxed font-medium">Use this tool to push notifications to team dashboards and registered emails.</p>
             </div>
          </div>

          <form onSubmit={handleBroadcast} className="space-y-6">
             <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Compose Message</label>
                <textarea
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="e.g. Due to severe weather, Phase 2 matches are delayed..."
                  className="w-full h-40 rounded-3xl border border-white/10 bg-black/50 px-6 py-5 text-sm font-bold text-white transition-all focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-none"
                />
             </div>
             
             <div className="flex items-center gap-4 border-t border-white/5 pt-6 mt-6">
                <div className="flex items-center gap-3 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-4 py-3 rounded-xl flex-1">
                   <span className="text-sm">⚠️</span>
                   <span className="text-[9px] font-black uppercase tracking-[0.2em] italic">Alert: This will notify all registered users immediately.</span>
                </div>
                
                <button
                  type="submit"
                  disabled={!message.trim() || isSending}
                  className="shrink-0 h-[52px] px-10 rounded-2xl bg-blue-600 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-blue-500 shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSending ? 'Transmitting...' : 'Issue Alert'}
                </button>
             </div>
          </form>
        </div>
      </div>
    </div>
  );
}
