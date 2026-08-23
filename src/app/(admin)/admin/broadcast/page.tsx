'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import type { ApiResponse } from '@/types';

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export default function BroadcastPage() {
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('Tournament Update - SolidFM 5-Aside');
  const [isSending, setIsSending] = useState(false);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSending(true);
    try {
      const response = await apiClient.post<ApiResponse<unknown>, ApiResponse<unknown>>('/broadcast', {
        message, 
        subject 
      });
      
      if (response.success) {
        toast.success('Broadcast transmitted successfully', {
          description: response.message
        });
        setMessage('');
      }
    } catch (error: unknown) {
      toast.error('Transmission Failed', {
        description: getErrorMessage(error, 'Could not send broadcast. Check your SMTP settings.')
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-8 animate-reveal md:space-y-10">
      <div>
        <h1 className="text-3xl font-black italic tracking-tighter text-white uppercase sm:text-4xl">Broadcast.</h1>
        <p className="mt-2 text-[10px] font-black tracking-[0.3em] text-neutral-500 uppercase">Emergency & Update Announcer</p>
      </div>

      <div className="relative overflow-hidden rounded-[32px] border border-blue-500/20 bg-blue-500/5 p-5 backdrop-blur-3xl animate-reveal sm:p-6 md:p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full"></div>
        
        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex items-start gap-4">
             <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl border bg-blue-600">
                <span className="pt-1 text-xl">📣</span>
             </div>
             <div>
                <h3 className="mb-2 text-lg font-black italic uppercase leading-none tracking-tighter text-white sm:text-xl">Global Notification</h3>
                <p className="text-sm text-neutral-400 leading-relaxed font-medium">This tool will send an email blast to all registered Team Captains and Staff immediately.</p>
             </div>
          </div>

          <form onSubmit={handleBroadcast} className="space-y-6">
             <div className="space-y-5">
                <div className="space-y-3">
                  <label htmlFor="broadcast-subject" className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Email Subject</label>
                  <input
                    id="broadcast-subject"
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Subject of the email..."
                    className="w-full rounded-2xl border border-white/10 bg-black/50 px-5 py-4 text-base font-bold text-white transition-all focus:border-blue-500 focus:outline-none [@media(pointer:fine)]:text-sm"
                  />
                </div>

                <div className="space-y-3">
                  <label htmlFor="broadcast-message" className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Compose Message</label>
                  <textarea
                    id="broadcast-message"
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="e.g. Due to severe weather, Phase 2 matches are delayed..."
                    className="h-40 w-full resize-y rounded-3xl border border-white/10 bg-black/50 px-5 py-4 text-base font-bold text-white transition-all focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 [@media(pointer:fine)]:text-sm"
                  />
                </div>
             </div>
             
             <div className="mt-4 flex flex-col gap-4 border-t border-white/5 pt-6 sm:flex-row sm:items-center">
                <div className="flex flex-1 items-center gap-3 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-yellow-500">
                   <span className="text-lg">⚠️</span>
                   <span className="text-[9px] font-black uppercase tracking-[0.2em] italic leading-tight">Proceed with caution. This will trigger a bulk email event to every team captain in the database.</span>
                </div>
                
                <button
                  type="submit"
                  disabled={!message.trim() || isSending}
                  className="group relative h-12 w-full shrink-0 overflow-hidden rounded-2xl bg-blue-600 px-8 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-blue-600/20 transition-all hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  <span className={isSending ? 'opacity-0' : 'opacity-100'}>Send Broadcast</span>
                  {isSending && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white"></div>
                    </div>
                  )}
                </button>
             </div>
          </form>
        </div>
      </div>
    </div>
  );
}
