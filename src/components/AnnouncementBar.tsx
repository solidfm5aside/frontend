'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { Megaphone, ChevronRight } from 'lucide-react';

interface Announcement {
  text: string;
  link?: string;
  isActive: boolean;
}

interface SettingsResponse {
  success: boolean;
  data?: { global_announcement?: Announcement };
}

export default function AnnouncementBar() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);

  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        const response = await apiClient.get<SettingsResponse, SettingsResponse>('/settings');
        if (response.success && response.data?.global_announcement) {
          setAnnouncement(response.data.global_announcement);
        }
      } catch (error) {
        console.warn('Announcement is temporarily unavailable:', error);
      }
    };
    fetchAnnouncement();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchAnnouncement, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (!announcement || !announcement.isActive || !announcement.text) return null;

  const content = (
    <div className="flex items-center justify-center gap-4 py-2 px-4">
      <div className="flex items-center gap-2 shrink-0">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
        </span>
        <Megaphone className="h-3.5 w-3.5 opacity-80" />
        <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Solid Notice:</span>
      </div>
      
      <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wide truncate">
        {announcement.text}
      </p>

      {announcement.link && (
        <div className="flex items-center gap-1 shrink-0 bg-white/20 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter group-hover:bg-white group-hover:text-red-600 transition-all">
          Details <ChevronRight className="h-2.5 w-2.5" />
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-red-600 text-white border-b border-red-500/30 relative z-[100] group overflow-hidden">
      {announcement.link ? (
        <Link href={announcement.link} className="block hover:opacity-90">
          {content}
        </Link>
      ) : (
        content
      )}
    </div>
  );
}
