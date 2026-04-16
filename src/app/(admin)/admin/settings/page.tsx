'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { Megaphone, LayoutPanelLeft, Trophy, HelpCircle, Save, Plus, Trash2, Upload, ExternalLink, Activity } from 'lucide-react';

interface Ad {
  title: string;
  imageUrl: string;
  link: string;
  isActive: boolean;
}

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'faq' | 'sponsors' | 'status' | 'announcement' | 'publicity'>('status');
  
  const [isRegistrationLive, setIsRegistrationLive] = useState(false);
  const [faqs, setFaqs] = useState<{q: string, a: string}[]>([]);
  const [sponsors, setSponsors] = useState<{title: string, name: string, logo: string}[]>([]);
  
  // New States
  const [announcement, setAnnouncement] = useState({ text: '', link: '', isActive: false });
  const [landingAds, setLandingAds] = useState<Ad[]>([]);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response: any = await apiClient.get('/settings');
      if (response.success && response.data) {
        const d = response.data;
        
        if (d.registration_live !== undefined) {
          setIsRegistrationLive(d.registration_live === 'true' || d.registration_live === true);
        }

        setFaqs(d.landing_faqs || [{ q: '', a: '' }]);
        setSponsors(d.landing_sponsors || [{ title: '', name: '', logo: '' }]);
        
        // New features
        setAnnouncement(d.global_announcement || { text: '', link: '', isActive: false });
        setLandingAds(d.landing_ads || []);
      }
    } catch (error: any) {
      toast.error('Failed to load settings', {
        description: error.response?.data?.message || error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    const validFaqs = faqs.filter(faq => faq.q.trim() !== '' || faq.a.trim() !== '');
    const validSponsors = sponsors.filter(s => s.name.trim() !== '');
    const validAds = landingAds.filter(ad => ad.imageUrl.trim() !== '');

    try {
      await apiClient.put('/settings', {
        registration_live: isRegistrationLive,
        landing_faqs: validFaqs,
        landing_sponsors: validSponsors,
        global_announcement: announcement,
        landing_ads: validAds
      });
      toast.success('Settings saved', {
        description: 'All settings and content updated successfully.'
      });
      setFaqs(validFaqs.length > 0 ? validFaqs : [{ q: '', a: '' }]);
      setSponsors(validSponsors.length > 0 ? validSponsors : [{ title: '', name: '', logo: '' }]);
      setLandingAds(validAds);
    } catch (error: any) {
      toast.error('Failed to save settings', {
        description: error.response?.data?.message || 'Please try again.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Helper Managers
  const addFaq = () => setFaqs([...faqs, { q: '', a: '' }]);
  const removeFaq = (index: number) => {
    const newFaqs = [...faqs];
    newFaqs.splice(index, 1);
    if (newFaqs.length === 0) newFaqs.push({ q: '', a: '' });
    setFaqs(newFaqs);
  };
  const updateFaq = (index: number, field: 'q' | 'a', value: string) => {
    const newFaqs = [...faqs];
    (newFaqs[index] as any)[field] = value;
    setFaqs(newFaqs);
  };

  const addSponsor = () => setSponsors([...sponsors, { title: '', name: '', logo: '' }]);
  const removeSponsor = (index: number) => {
    const newSponsors = [...sponsors];
    newSponsors.splice(index, 1);
    if (newSponsors.length === 0) newSponsors.push({ title: '', name: '', logo: '' });
    setSponsors(newSponsors);
  };
  const updateSponsor = (index: number, field: 'title' | 'name' | 'logo', value: string) => {
    const newSponsors = [...sponsors];
    (newSponsors[index] as any)[field] = value;
    setSponsors(newSponsors);
  };

  const addAd = () => setLandingAds([...landingAds, { title: '', imageUrl: '', link: '', isActive: true }]);
  const removeAd = (index: number) => {
    const newAds = [...landingAds];
    newAds.splice(index, 1);
    setLandingAds(newAds);
  };
  const updateAd = (index: number, field: keyof Ad, value: any) => {
    const newAds = [...landingAds];
    (newAds[index] as any)[field] = value;
    setLandingAds(newAds);
  };

  // Upload Handlers
  const handleFileUpload = async (index: number, file: File | null, type: 'sponsor' | 'publicity') => {
    if (!file) return;

    const formData = new FormData();
    formData.append(type === 'sponsor' ? 'logo' : 'image', file);
    const endpoint = type === 'sponsor' ? '/settings/upload-logo' : '/settings/upload-publicity';

    toast.promise(
      apiClient.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }),
      {
        loading: 'Uploading image...',
        success: (response: any) => {
          if (response.success && response.data?.url) {
            if (type === 'sponsor') updateSponsor(index, 'logo', response.data.url);
            else updateAd(index, 'imageUrl', response.data.url);
            return 'Image uploaded successfully!';
          }
          throw new Error('Upload success flag was false');
        },
        error: (err: any) => err.response?.data?.message || err.message || 'Failed to upload image'
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600/20 border-t-blue-600"></div>
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
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 rounded-2xl bg-blue-600 px-8 py-4 text-xs font-black uppercase tracking-widest text-white hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20 disabled:opacity-50"
        >
          {isSaving ? <Activity className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isSaving ? 'Saving...' : 'Save All Changes'}
        </button>
      </div>

      {/* Modern Tabs */}
      <div className="flex flex-wrap gap-1 p-1 bg-white/[0.03] border border-white/5 rounded-2xl md:rounded-[24px]">
        {[
          { id: 'status', label: 'Operations', icon: Trophy, color: 'text-amber-500' },
          { id: 'announcement', label: 'Alerts', icon: Megaphone, color: 'text-red-500' },
          { id: 'publicity', label: 'Publicity', icon: LayoutPanelLeft, color: 'text-blue-500' },
          { id: 'sponsors', label: 'Sponsors', icon: Trophy, color: 'text-emerald-500' },
          { id: 'faq', label: 'FAQs', icon: HelpCircle, color: 'text-purple-500' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
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

      <div className="space-y-10 min-h-[400px]">
        
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
                <p className="text-xs text-neutral-500 uppercase tracking-widest max-w-sm">When active, the public landing page will display the 'NOW LIVE' banner.</p>
              </div>
              <button
                type="button"
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
                    onClick={() => setAnnouncement({...announcement, isActive: !announcement.isActive})}
                    className={`relative inline-flex h-10 w-20 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${announcement.isActive ? 'bg-red-500' : 'bg-white/10'}`}
                  >
                    <span className={`pointer-events-none inline-block h-9 w-9 transform rounded-full bg-white transition duration-200 ${announcement.isActive ? 'translate-x-10' : 'translate-x-0'}`} />
                  </button>
               </div>

               <div className="grid grid-cols-1 gap-6">
                  <div>
                     <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-2">Notice Text</label>
                     <textarea
                       value={announcement.text}
                       onChange={(e) => setAnnouncement({...announcement, text: e.target.value})}
                       placeholder="e.g. BREAKING: Registration deadline extended to Friday night! Don't miss out!"
                       rows={3}
                       className="w-full bg-black border border-white/10 rounded-2xl px-4 py-4 text-white focus:border-red-500 transition-all placeholder:text-neutral-700"
                     />
                  </div>
                  <div>
                     <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-2">Target Link (Optional)</label>
                     <div className="relative">
                        <input
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
                             onClick={() => updateAd(idx, 'isActive', !ad.isActive)}
                             className={`h-5 w-10 rounded-full p-0.5 transition-colors ${ad.isActive ? 'bg-emerald-500' : 'bg-neutral-800'}`}
                           >
                              <div className={`h-4 w-4 bg-white rounded-full transition-transform ${ad.isActive ? 'translate-x-5' : 'translate-x-0'}`} />
                           </button>
                         </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-2">Display Title</label>
                          <input
                            type="text"
                            value={ad.title}
                            onChange={(e) => updateAd(idx, 'title', e.target.value)}
                            placeholder="e.g. CoJude Title Sponsorship"
                            className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-2">Link Destination</label>
                          <input
                            type="text"
                            value={ad.link}
                            onChange={(e) => updateAd(idx, 'link', e.target.value)}
                            placeholder="e.g. https://cojude.com"
                            className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 transition-all font-mono text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-2">Banner Image (16:9 recommended)</label>
                        <div className="flex items-center gap-4">
                           <input
                             type="file"
                             accept="image/*"
                             id={`publicity-${idx}`}
                             className="hidden"
                             onChange={(e) => handleFileUpload(idx, e.target.files?.[0] || null, 'publicity')}
                           />
                           <label htmlFor={`publicity-${idx}`} className="shrink-0 flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-neutral-300 cursor-pointer transition-all">
                              <Upload className="h-3 w-3" /> Upload Banner
                           </label>
                           <input 
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
                         <img src={ad.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                       ) : (
                         <div className="w-full h-full flex flex-col items-center justify-center text-neutral-700">
                           <Upload className="h-8 w-8 mb-2 opacity-10" />
                           <span className="text-[8px] font-black uppercase tracking-widest">No Image Preview</span>
                         </div>
                       )}
                       <button
                         type="button"
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
                <p className="text-sm text-neutral-500 mt-1">Manage brands for the "Powering the Game" section.</p>
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
                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-2">Role / Title</label>
                        <input
                          type="text"
                          value={sponsor.title}
                          onChange={(e) => updateSponsor(idx, 'title', e.target.value)}
                          placeholder="e.g. Title Sponsor"
                          className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 transition-all font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-2">Brand Name</label>
                        <input
                          type="text"
                          value={sponsor.name}
                          onChange={(e) => updateSponsor(idx, 'name', e.target.value)}
                          placeholder="e.g. CoJude"
                          className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 transition-all font-medium"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-2">Sponsor Logo</label>
                      <div className="flex flex-col sm:flex-row gap-4">
                        <input
                          type="file"
                          accept="image/*"
                          id={`upload-sponsor-${idx}`}
                          className="hidden"
                          onChange={(e) => handleFileUpload(idx, e.target.files?.[0] || null, 'sponsor')}
                        />
                        <label htmlFor={`upload-sponsor-${idx}`} className="w-full sm:w-auto text-center cursor-pointer rounded-xl bg-blue-600/10 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-blue-500 hover:bg-blue-600 hover:text-white transition-all border border-blue-500/20">
                          Upload File
                        </label>
                        <input
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
                    <div className="h-16 w-32 bg-white rounded-xl flex items-center justify-center p-2">
                       {sponsor.logo ? <img src={sponsor.logo} alt="Preview" className="max-h-full max-w-full object-contain" /> : <span className="text-[8px] text-neutral-400 font-bold uppercase">No Image</span>}
                    </div>
                    <button type="button" onClick={() => removeSponsor(idx)} className="h-10 w-full px-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-600 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest">
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
                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-2">Question</label>
                        <input type="text" value={faq.q} onChange={(e) => updateFaq(idx, 'q', e.target.value)} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 transition-all font-medium" />
                     </div>
                     <div>
                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-2">Answer</label>
                        <textarea value={faq.a} onChange={(e) => updateFaq(idx, 'a', e.target.value)} rows={3} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 transition-all font-medium resize-y" />
                     </div>
                  </div>
                  <button type="button" onClick={() => removeFaq(idx)} className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500 transition-all">✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
