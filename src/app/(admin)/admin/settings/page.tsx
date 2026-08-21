'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/store/use-auth-store';
import { Megaphone, LayoutPanelLeft, Trophy, HelpCircle, Save, Plus, Trash2, Upload, ExternalLink, Activity, LockKeyhole } from 'lucide-react';

interface Ad {
  title: string;
  imageUrl: string;
  link: string;
  isActive: boolean;
}

interface Faq { q: string; a: string }
interface Sponsor { title: string; name: string; logo: string }
interface Announcement { text: string; link: string; isActive: boolean }
type SettingsTab = 'faq' | 'sponsors' | 'status' | 'announcement' | 'publicity';

interface SettingsData {
  registration_live?: string | boolean;
  landing_faqs?: Faq[];
  landing_sponsors?: Sponsor[];
  global_announcement?: Announcement;
  landing_ads?: Ad[];
}

interface SettingsResponse {
  success: boolean;
  message?: string;
  data?: SettingsData;
}

interface UploadResponse {
  success: boolean;
  data?: { url?: string };
}

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_SPONSOR_IMAGE_SIZE = 2 * 1024 * 1024;
const MAX_PUBLICITY_IMAGE_SIZE = 5 * 1024 * 1024;

const SETTINGS_TABS: Array<{
  id: SettingsTab;
  label: string;
  icon: typeof Trophy;
  color: string;
}> = [
  { id: 'status', label: 'Operations', icon: Trophy, color: 'text-amber-500' },
  { id: 'announcement', label: 'Alerts', icon: Megaphone, color: 'text-red-500' },
  { id: 'publicity', label: 'Publicity', icon: LayoutPanelLeft, color: 'text-blue-500' },
  { id: 'sponsors', label: 'Sponsors', icon: Trophy, color: 'text-emerald-500' },
  { id: 'faq', label: 'FAQs', icon: HelpCircle, color: 'text-purple-500' },
];

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export default function SettingsPage() {
  const { admin, hasHydrated } = useAuthStore();
  const canEdit = admin?.role === 'admin' || admin?.role === 'super_admin';
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>('status');
  const settingsRequestSequence = useRef(0);
  
  const [isRegistrationLive, setIsRegistrationLive] = useState(false);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  
  // New States
  const [announcement, setAnnouncement] = useState({ text: '', link: '', isActive: false });
  const [landingAds, setLandingAds] = useState<Ad[]>([]);

  const fetchSettings = useCallback(async () => {
    const requestSequence = ++settingsRequestSequence.current;
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await apiClient.get<SettingsResponse, SettingsResponse>('/settings');
      if (requestSequence !== settingsRequestSequence.current) return;
      if (!response.success || !response.data) throw new Error(response.message || 'Settings could not be loaded');

      const d = response.data;
      setIsRegistrationLive(d.registration_live === 'true' || d.registration_live === true);
      setFaqs(d.landing_faqs || [{ q: '', a: '' }]);
      setSponsors(d.landing_sponsors || [{ title: '', name: '', logo: '' }]);
      setAnnouncement(d.global_announcement || { text: '', link: '', isActive: false });
      setLandingAds(d.landing_ads || []);
    } catch (error: unknown) {
      if (requestSequence !== settingsRequestSequence.current) return;
      setLoadError(getErrorMessage(error, 'Settings could not be loaded.'));
    } finally {
      if (requestSequence === settingsRequestSequence.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSettings();
    return () => {
      settingsRequestSequence.current += 1;
    };
  }, [fetchSettings]);

  const handleSave = async () => {
    if (!canEdit) {
      toast.error('Settings are read-only for your account.');
      return;
    }
    setIsSaving(true);
    
    const validFaqs = faqs.filter(faq => faq.q.trim() !== '' || faq.a.trim() !== '');
    const validSponsors = sponsors.filter(s => s.name.trim() !== '');
    const validAds = landingAds.filter(ad => ad.imageUrl.trim() !== '');

    try {
      const response = await apiClient.put<SettingsResponse, SettingsResponse>('/settings', {
        registration_live: isRegistrationLive,
        landing_faqs: validFaqs,
        landing_sponsors: validSponsors,
        global_announcement: announcement,
        landing_ads: validAds
      });
      if (!response.success) throw new Error(response.message || 'Settings could not be saved');
      toast.success('Settings saved', {
        description: 'All settings and content updated successfully.'
      });
      setFaqs(validFaqs.length > 0 ? validFaqs : [{ q: '', a: '' }]);
      setSponsors(validSponsors.length > 0 ? validSponsors : [{ title: '', name: '', logo: '' }]);
      setLandingAds(validAds);
    } catch (error: unknown) {
      toast.error('Failed to save settings', {
        description: getErrorMessage(error, 'Please try again.')
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Helper Managers
  const addFaq = () => setFaqs((current) => [...current, { q: '', a: '' }]);
  const removeFaq = (index: number) => {
    const newFaqs = [...faqs];
    newFaqs.splice(index, 1);
    if (newFaqs.length === 0) newFaqs.push({ q: '', a: '' });
    setFaqs(newFaqs);
  };
  const updateFaq = (index: number, field: 'q' | 'a', value: string) => {
    setFaqs((current) => current.map((faq, itemIndex) => (
      itemIndex === index ? { ...faq, [field]: value } : faq
    )));
  };

  const addSponsor = () => setSponsors((current) => [...current, { title: '', name: '', logo: '' }]);
  const removeSponsor = (index: number) => {
    const newSponsors = [...sponsors];
    newSponsors.splice(index, 1);
    if (newSponsors.length === 0) newSponsors.push({ title: '', name: '', logo: '' });
    setSponsors(newSponsors);
  };
  const updateSponsor = (index: number, field: 'title' | 'name' | 'logo', value: string) => {
    setSponsors((current) => current.map((sponsor, itemIndex) => (
      itemIndex === index ? { ...sponsor, [field]: value } : sponsor
    )));
  };

  const addAd = () => setLandingAds((current) => [...current, { title: '', imageUrl: '', link: '', isActive: true }]);
  const removeAd = (index: number) => {
    const newAds = [...landingAds];
    newAds.splice(index, 1);
    setLandingAds(newAds);
  };
  const updateAd = <K extends keyof Ad>(index: number, field: K, value: Ad[K]) => {
    setLandingAds((current) => current.map((ad, itemIndex) => (
      itemIndex === index ? { ...ad, [field]: value } : ad
    )));
  };

  // Upload Handlers
  const handleFileUpload = (index: number, file: File | null, type: 'sponsor' | 'publicity') => {
    if (!canEdit) {
      toast.error('Administrator access is required to upload settings images.');
      return;
    }
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      toast.error('Use a JPG, PNG, or WebP image.');
      return;
    }

    const maxSize = type === 'sponsor' ? MAX_SPONSOR_IMAGE_SIZE : MAX_PUBLICITY_IMAGE_SIZE;
    if (file.size > maxSize) {
      toast.error(`Image must be ${type === 'sponsor' ? '2 MB' : '5 MB'} or smaller.`);
      return;
    }

    const formData = new FormData();
    formData.append(type === 'sponsor' ? 'logo' : 'image', file);
    const endpoint = type === 'sponsor' ? '/settings/upload-logo' : '/settings/upload-publicity';

    toast.promise(
      apiClient.post<UploadResponse, UploadResponse>(endpoint, formData),
      {
        loading: 'Uploading image...',
        success: (response: UploadResponse) => {
          if (response.success && response.data?.url) {
            if (type === 'sponsor') updateSponsor(index, 'logo', response.data.url);
            else updateAd(index, 'imageUrl', response.data.url);
            return 'Image uploaded successfully!';
          }
          throw new Error('Upload success flag was false');
        },
        error: (error: unknown) => getErrorMessage(error, 'Failed to upload image')
      }
    );
  };

  if (isLoading || !hasHydrated) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600/20 border-t-blue-600"></div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div role="alert" className="max-w-3xl rounded-[32px] border border-red-500/20 bg-red-500/10 p-8 text-red-200">
        <p className="text-sm font-bold">{loadError}</p>
        <button
          type="button"
          onClick={() => void fetchSettings()}
          className="mt-5 min-h-11 rounded-2xl border border-red-400/30 px-5 text-[10px] font-black uppercase tracking-widest text-white transition-colors hover:bg-red-500/10 focus:outline-none focus:ring-2 focus:ring-red-400"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-5xl">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold uppercase italic tracking-tighter text-white">
            Site <span className="text-blue-500">Settings</span>
          </h1>
          <p className="mt-2 text-neutral-400 font-medium">Manage global configuration, notifications, and landing page content.</p>
        </div>
        {canEdit ? (
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex min-h-12 items-center gap-2 rounded-2xl bg-blue-600 px-8 py-4 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-blue-600/20 transition-all hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? <Activity className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isSaving ? 'Saving...' : 'Save All Changes'}
          </button>
        ) : (
          <span className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 text-[10px] font-black uppercase tracking-widest text-neutral-400">
            <LockKeyhole className="h-4 w-4" /> Read-only access
          </span>
        )}
      </div>

      {!canEdit ? (
        <div role="status" className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-amber-100">
          <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest">Settings are read-only</p>
            <p className="mt-1 text-xs text-amber-100/70">You can review the current configuration, but administrator access is required to change or upload site settings.</p>
          </div>
        </div>
      ) : null}

      {/* Modern Tabs */}
      <div role="tablist" aria-label="Settings sections" className="flex flex-wrap gap-1 p-1 bg-white/[0.03] border border-white/5 rounded-2xl md:rounded-[24px]">
        {SETTINGS_TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`settings-tab-${tab.id}`}
            aria-controls={`settings-panel-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-label={tab.label}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 md:py-4 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === tab.id 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'text-neutral-500 hover:text-white hover:bg-white/5'
            }`}
          >
            <tab.icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${activeTab === tab.id ? 'text-white' : tab.color}`} />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      <fieldset disabled={!canEdit || isSaving} className="min-w-0 disabled:opacity-70">
        <legend className="sr-only">{canEdit ? 'Editable site settings' : 'Read-only site settings'}</legend>
        <div
          id={`settings-panel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`settings-tab-${activeTab}`}
          className="min-h-[400px] space-y-10"
        >
        
        {/* TOURNAMENT OPERATIONS */}
        {activeTab === 'status' && (
          <div className="rounded-[40px] border border-white/5 bg-white/[0.02] p-8 md:p-10 shadow-2xl animate-in fade-in duration-300">
            <div className="mb-8 border-b border-white/5 pb-6">
              <h2 className="text-2xl font-black uppercase tracking-tighter text-white italic">Tournament Operations</h2>
              <p className="text-sm text-neutral-500 mt-1">Control critical tournament states like team registration periods.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between p-6 bg-black/40 border border-white/5 rounded-3xl">
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Registration is Live</h3>
                <p className="text-xs text-neutral-500 uppercase tracking-widest max-w-sm">When active, the public landing page will display the &apos;NOW LIVE&apos; banner.</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isRegistrationLive}
                aria-label="Toggle public team registration"
                onClick={() => setIsRegistrationLive(!isRegistrationLive)}
                className={`relative inline-flex h-10 w-20 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${isRegistrationLive ? 'bg-emerald-500' : 'bg-white/10'}`}
              >
                <span className={`pointer-events-none inline-block h-9 w-9 transform rounded-full bg-white transition duration-200 ${isRegistrationLive ? 'translate-x-10' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
        )}

        {/* GLOBAL ANNOUNCEMENTS */}
        {activeTab === 'announcement' && (
          <div className="rounded-[40px] border border-white/5 bg-white/[0.02] p-8 md:p-10 shadow-2xl animate-in fade-in duration-300 text-neutral-100">
            <div className="mb-8 border-b border-white/5 pb-6">
              <h2 className="text-2xl font-black uppercase tracking-tighter text-white italic">Global Alerts</h2>
              <p className="text-sm text-neutral-500 mt-1">Manage the notification bar displayed at the very top of the website.</p>
            </div>
            
            <div className="space-y-6">
               <div className="flex items-center justify-between p-6 bg-black/40 border border-white/5 rounded-3xl">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">Active Notification</h3>
                    <p className="text-xs text-neutral-500 uppercase tracking-widest">Show or hide the global announcement bar.</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={announcement.isActive}
                    aria-label="Toggle global announcement"
                    onClick={() => setAnnouncement({...announcement, isActive: !announcement.isActive})}
                    className={`relative inline-flex h-10 w-20 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${announcement.isActive ? 'bg-red-500' : 'bg-white/10'}`}
                  >
                    <span className={`pointer-events-none inline-block h-9 w-9 transform rounded-full bg-white transition duration-200 ${announcement.isActive ? 'translate-x-10' : 'translate-x-0'}`} />
                  </button>
               </div>

               <div className="grid grid-cols-1 gap-6">
                  <div>
                     <label htmlFor="announcement-text" className="block text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-2">Notice Text</label>
                     <textarea
                       id="announcement-text"
                       value={announcement.text}
                       onChange={(e) => setAnnouncement({...announcement, text: e.target.value})}
                       placeholder="e.g. BREAKING: Registration deadline extended to Friday night! Don't miss out!"
                       rows={3}
                       className="w-full bg-black border border-white/10 rounded-2xl px-4 py-4 text-white focus:border-red-500 transition-all placeholder:text-neutral-700"
                     />
                  </div>
                  <div>
                     <label htmlFor="announcement-link" className="block text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-2">Target Link (Optional)</label>
                     <div className="relative">
                        <input
                          id="announcement-link"
                          type="text"
                          value={announcement.link}
                          onChange={(e) => setAnnouncement({...announcement, link: e.target.value})}
                          placeholder="e.g. /register-team or https://..."
                          className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 pl-11 text-white focus:border-red-500 transition-all font-mono text-sm"
                        />
                        <ExternalLink className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-600" />
                     </div>
                  </div>
               </div>
            </div>
          </div>
        )}

        {/* PUBLICITY CAROUSEL */}
        {activeTab === 'publicity' && (
          <div className="rounded-[40px] border border-white/5 bg-white/[0.02] p-8 md:p-10 shadow-2xl animate-in fade-in duration-300">
            <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/5 pb-6 gap-4">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tighter text-white italic">Publicity & Ads</h2>
                <p className="text-sm text-neutral-500 mt-1">Manage high-impact banners for the homepage carousel.</p>
              </div>
              <button
                type="button"
                onClick={addAd}
                className="px-6 py-3 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 hover:border-blue-500 rounded-2xl text-blue-500 text-xs font-black uppercase tracking-widest transition-all inline-flex items-center gap-2"
              >
                <Plus className="h-4 w-4" /> New Ad Slide
              </button>
            </div>

            <div className="space-y-6">
              {landingAds.length === 0 ? (
                <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[40px] opacity-30">
                   <LayoutPanelLeft className="h-12 w-12 mx-auto mb-4 text-neutral-500" />
                   <p className="text-xs font-black uppercase tracking-widest">No publicity banners yet.</p>
                </div>
              ) : (
                landingAds.map((ad, idx) => (
                  <div key={idx} className="flex flex-col lg:flex-row gap-6 p-6 bg-black/40 border border-white/5 rounded-[32px] relative group overflow-hidden">
                    <div className="flex-1 space-y-6 pr-4">
                      <div className="flex items-center justify-between">
                         <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Slide #{idx+1}</span>
                         <div className="flex items-center gap-3">
                           <span className="text-[10px] font-black uppercase tracking-widest text-neutral-600">Active</span>
                           <button
                             type="button"
                             role="switch"
                             aria-checked={ad.isActive}
                             aria-label={`Toggle publicity slide ${idx + 1}`}
                             onClick={() => updateAd(idx, 'isActive', !ad.isActive)}
                             className={`h-5 w-10 rounded-full p-0.5 transition-colors ${ad.isActive ? 'bg-emerald-500' : 'bg-neutral-800'}`}
                           >
                              <div className={`h-4 w-4 bg-white rounded-full transition-transform ${ad.isActive ? 'translate-x-5' : 'translate-x-0'}`} />
                           </button>
                         </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor={`ad-title-${idx}`} className="block text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-2">Display Title</label>
                          <input
                            id={`ad-title-${idx}`}
                            type="text"
                            value={ad.title}
                            onChange={(e) => updateAd(idx, 'title', e.target.value)}
                            placeholder="e.g. CoJude Title Sponsorship"
                            className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 transition-all"
                          />
                        </div>
                        <div>
                          <label htmlFor={`ad-link-${idx}`} className="block text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-2">Link Destination</label>
                          <input
                            id={`ad-link-${idx}`}
                            type="text"
                            value={ad.link}
                            onChange={(e) => updateAd(idx, 'link', e.target.value)}
                            placeholder="e.g. https://cojude.com"
                            className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 transition-all font-mono text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor={`publicity-${idx}`} className="block text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-2">Banner Image (16:9 recommended)</label>
                        <div className="flex items-center gap-4">
                           <input
                             type="file"
                             accept="image/jpeg,image/png,image/webp"
                             id={`publicity-${idx}`}
                             className="hidden"
                             onChange={(e) => handleFileUpload(idx, e.target.files?.[0] || null, 'publicity')}
                           />
                           <label
                             htmlFor={`publicity-${idx}`}
                             aria-disabled={!canEdit}
                             className={`flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-neutral-300 transition-all ${canEdit ? 'cursor-pointer hover:bg-white/10' : 'cursor-not-allowed'}`}
                           >
                              <Upload className="h-3 w-3" /> Upload Banner
                           </label>
                           <input 
                             aria-label={`Publicity slide ${idx + 1} image URL`}
                             type="text"
                             value={ad.imageUrl}
                             onChange={(e) => updateAd(idx, 'imageUrl', e.target.value)}
                             placeholder="Image URL..."
                             className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 transition-all font-mono text-[10px]"
                           />
                        </div>
                      </div>
                    </div>

                    <div className="w-full lg:w-[320px] h-[180px] shrink-0 border border-white/10 rounded-2xl bg-black relative group-hover:border-blue-500/30 transition-all overflow-hidden">
                       {ad.imageUrl ? (
                         <Image
                           src={ad.imageUrl}
                           alt={`${ad.title || `Publicity slide ${idx + 1}`} preview`}
                           fill
                           sizes="(min-width: 1024px) 320px, 100vw"
                           unoptimized
                           className="object-cover"
                         />
                       ) : (
                         <div className="w-full h-full flex flex-col items-center justify-center text-neutral-700">
                           <Upload className="h-8 w-8 mb-2 opacity-10" />
                           <span className="text-[8px] font-black uppercase tracking-widest">No Image Preview</span>
                         </div>
                       )}
                       <button
                         type="button"
                         aria-label={`Remove publicity slide ${idx + 1}`}
                         onClick={() => removeAd(idx)}
                         className="absolute top-2 right-2 h-8 w-8 bg-black/60 backdrop-blur-md rounded-lg text-red-500 hover:bg-red-600 hover:text-white transition-all flex items-center justify-center"
                       >
                         <Trash2 className="h-4 w-4" />
                       </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* SPONSORS SECTION */}
        {activeTab === 'sponsors' && (
          <div className="rounded-[40px] border border-white/5 bg-white/[0.02] p-8 md:p-10 shadow-2xl animate-in fade-in duration-300">
            <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/5 pb-6 gap-4">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tighter text-white italic">Sponsors & Partners</h2>
                <p className="text-sm text-neutral-500 mt-1">Manage brands for the &quot;Powering the Game&quot; section.</p>
              </div>
              <button
                type="button"
                onClick={addSponsor}
                className="px-6 py-3 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/20 hover:border-emerald-500 rounded-2xl text-emerald-500 text-xs font-black uppercase tracking-widest transition-all inline-flex items-center gap-2"
              >
                <Plus className="h-4 w-4" /> Add Sponsor
              </button>
            </div>

            <div className="space-y-6">
              {sponsors.map((sponsor, idx) => (
                <div key={idx} className="flex flex-col md:flex-row gap-6 p-6 bg-black/40 border border-white/5 rounded-3xl relative group">
                  <div className="flex-1 space-y-4 md:pl-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor={`sponsor-title-${idx}`} className="block text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-2">Role / Title</label>
                        <input
                          id={`sponsor-title-${idx}`}
                          type="text"
                          value={sponsor.title}
                          onChange={(e) => updateSponsor(idx, 'title', e.target.value)}
                          placeholder="e.g. Title Sponsor"
                          className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 transition-all font-medium"
                        />
                      </div>
                      <div>
                        <label htmlFor={`sponsor-name-${idx}`} className="block text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-2">Brand Name</label>
                        <input
                          id={`sponsor-name-${idx}`}
                          type="text"
                          value={sponsor.name}
                          onChange={(e) => updateSponsor(idx, 'name', e.target.value)}
                          placeholder="e.g. CoJude"
                          className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 transition-all font-medium"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor={`upload-sponsor-${idx}`} className="block text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-2">Sponsor Logo</label>
                      <div className="flex flex-col sm:flex-row gap-4">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          id={`upload-sponsor-${idx}`}
                          className="hidden"
                          onChange={(e) => handleFileUpload(idx, e.target.files?.[0] || null, 'sponsor')}
                        />
                        <label
                          htmlFor={`upload-sponsor-${idx}`}
                          aria-disabled={!canEdit}
                          className={`w-full rounded-xl border border-blue-500/20 bg-blue-600/10 px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-blue-500 transition-all sm:w-auto ${canEdit ? 'cursor-pointer hover:bg-blue-600 hover:text-white' : 'cursor-not-allowed'}`}
                        >
                          Upload File
                        </label>
                        <input
                          aria-label={`${sponsor.name || `Sponsor ${idx + 1}`} logo URL`}
                          type="text"
                          value={sponsor.logo}
                          onChange={(e) => updateSponsor(idx, 'logo', e.target.value)}
                          placeholder="Or paste URL..."
                          className="w-full sm:flex-1 bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 transition-all font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-row md:flex-col justify-end items-center gap-4 border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6 min-w-[150px]">
                    <div className="relative h-16 w-32 bg-white rounded-xl flex items-center justify-center p-2 overflow-hidden">
                       {sponsor.logo ? (
                         <Image
                           src={sponsor.logo}
                           alt={`${sponsor.name || `Sponsor ${idx + 1}`} logo preview`}
                           fill
                           sizes="128px"
                           unoptimized
                           className="object-contain p-2"
                         />
                       ) : <span className="text-[8px] text-neutral-400 font-bold uppercase">No Image</span>}
                    </div>
                    <button type="button" aria-label={`Remove ${sponsor.name || `sponsor ${idx + 1}`}`} onClick={() => removeSponsor(idx)} className="h-10 w-full px-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-600 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest">
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FAQ SECTION */}
        {activeTab === 'faq' && (
          <div className="rounded-[40px] border border-white/5 bg-white/[0.02] p-8 md:p-10 shadow-2xl animate-in fade-in duration-300">
            <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/5 pb-6 gap-4">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tighter text-white italic">Quick Brief / FAQ</h2>
                <p className="text-sm text-neutral-500 mt-1">Update landing page questions.</p>
              </div>
              <button type="button" onClick={addFaq} className="px-6 py-3 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 hover:border-blue-500 rounded-2xl text-blue-500 text-xs font-black uppercase tracking-widest transition-all">
                + Add FAQ
              </button>
            </div>
            <div className="space-y-6">
              {faqs.map((faq, idx) => (
                <div key={idx} className="flex gap-4 items-start p-6 bg-black/40 border border-white/5 rounded-3xl relative">
                  <div className="font-black text-white/5 text-4xl italic w-12 text-center absolute -left-4 top-4 hidden sm:block">Q{idx + 1}</div>
                  <div className="flex-1 space-y-4 sm:pl-8">
                     <div>
                        <label htmlFor={`faq-question-${idx}`} className="block text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-2">Question</label>
                        <input id={`faq-question-${idx}`} type="text" value={faq.q} onChange={(e) => updateFaq(idx, 'q', e.target.value)} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 transition-all font-medium" />
                     </div>
                     <div>
                        <label htmlFor={`faq-answer-${idx}`} className="block text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-2">Answer</label>
                        <textarea id={`faq-answer-${idx}`} value={faq.a} onChange={(e) => updateFaq(idx, 'a', e.target.value)} rows={3} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 transition-all font-medium resize-y" />
                     </div>
                  </div>
                  <button type="button" aria-label={`Remove FAQ ${idx + 1}`} onClick={() => removeFaq(idx)} className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500 transition-all">✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        </div>
      </fieldset>
    </div>
  );
}
