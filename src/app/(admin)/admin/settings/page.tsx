'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'faq' | 'sponsors' | 'status'>('status'); // Default to status for quick access
  
  const [isRegistrationLive, setIsRegistrationLive] = useState(false);
  const [faqs, setFaqs] = useState<{q: string, a: string}[]>([]);
  const [sponsors, setSponsors] = useState<{title: string, name: string, logo: string}[]>([]);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response: any = await apiClient.get('/settings');
      if (response.success && response.data) {
        if (response.data.registration_live !== undefined) {
          setIsRegistrationLive(response.data.registration_live === 'true' || response.data.registration_live === true);
        }

        if (response.data.landing_faqs) {
          setFaqs(response.data.landing_faqs);
        } else {
          setFaqs([{ q: '', a: '' }]);
        }

        if (response.data.landing_sponsors) {
          setSponsors(response.data.landing_sponsors);
        } else {
          setSponsors([{ title: '', name: '', logo: '' }]);
        }
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
    
    // Filter out completely empty rows
    const validFaqs = faqs.filter(faq => faq.q.trim() !== '' || faq.a.trim() !== '');
    const validSponsors = sponsors.filter(s => s.name.trim() !== '');

    try {
      await apiClient.put('/settings', {
        registration_live: isRegistrationLive,
        landing_faqs: validFaqs,
        landing_sponsors: validSponsors
      });
      toast.success('Settings saved', {
        description: 'Landing page content updated successfully.'
      });
      setFaqs(validFaqs.length > 0 ? validFaqs : [{ q: '', a: '' }]);
      setSponsors(validSponsors.length > 0 ? validSponsors : [{ title: '', name: '', logo: '' }]);
    } catch (error: any) {
      toast.error('Failed to save settings', {
        description: error.response?.data?.message || 'Please try again.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const addFaq = () => setFaqs([...faqs, { q: '', a: '' }]);
  const removeFaq = (index: number) => {
    const newFaqs = [...faqs];
    newFaqs.splice(index, 1);
    if (newFaqs.length === 0) newFaqs.push({ q: '', a: '' });
    setFaqs(newFaqs);
  };
  const updateFaq = (index: number, field: 'q' | 'a', value: string) => {
    const newFaqs = [...faqs];
    newFaqs[index][field] = value;
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
    newSponsors[index][field] = value;
    setSponsors(newSponsors);
  };

  const handleLogoUpload = async (index: number, file: File | null) => {
    if (!file) return;

    const formData = new FormData();
    formData.append('logo', file);

    toast.promise(
      apiClient.post('/settings/upload-logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }),
      {
        loading: 'Uploading logo to Cloudinary...',
        success: (response: any) => {
          if (response.success && response.data?.url) {
            updateSponsor(index, 'logo', response.data.url);
            return 'Logo uploaded safely to Cloudinary!';
          }
          throw new Error('Upload success flag was false');
        },
        error: (err: any) => err.response?.data?.message || err.message || 'Failed to upload logo'
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
      <div>
        <h1 className="text-4xl font-extrabold uppercase italic tracking-tighter text-white">
          Site <span className="text-blue-500">Settings</span>
        </h1>
        <p className="mt-2 text-neutral-400 font-medium">Manage global configuration and landing page content.</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 md:gap-4 border-b border-white/5 pb-px">
        <button
          onClick={() => setActiveTab('status')}
          className={`px-4 md:px-6 py-4 text-[10px] md:text-xs font-black uppercase tracking-widest transition-all border-b-2 ${
            activeTab === 'status' 
              ? 'border-yellow-500 text-yellow-500' 
              : 'border-transparent text-neutral-500 hover:text-white'
          }`}
        >
          Tournament Status
        </button>
        <button
          onClick={() => setActiveTab('faq')}
          className={`px-4 md:px-6 py-4 text-[10px] md:text-xs font-black uppercase tracking-widest transition-all border-b-2 ${
            activeTab === 'faq' 
              ? 'border-blue-500 text-blue-500' 
              : 'border-transparent text-neutral-500 hover:text-white'
          }`}
        >
          General FAQ
        </button>
        <button
          onClick={() => setActiveTab('sponsors')}
          className={`px-4 md:px-6 py-4 text-[10px] md:text-xs font-black uppercase tracking-widest transition-all border-b-2 ${
            activeTab === 'sponsors' 
              ? 'border-blue-500 text-blue-500' 
              : 'border-transparent text-neutral-500 hover:text-white'
          }`}
        >
          Sponsors & Partners
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-10">
        
        {/* Tournament Status Section */}
        <div className={`rounded-[40px] border border-white/5 bg-white/[0.02] p-8 md:p-10 shadow-2xl transition-opacity duration-300 ${activeTab === 'status' ? 'block' : 'hidden'}`}>
          <div className="mb-8 border-b border-white/5 pb-6">
            <h2 className="text-2xl font-black uppercase tracking-tighter text-white italic">Tournament Operations</h2>
            <p className="text-sm text-neutral-500 mt-1">Control critical tournament states like team registration periods.</p>
          </div>

          <div className="flex items-center justify-between p-6 bg-black/40 border border-white/5 rounded-3xl">
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Registration is Live</h3>
              <p className="text-xs text-neutral-500 uppercase tracking-widest max-w-sm">When active, the public landing page will display the highly visible 'NOW LIVE' banner and accept team applications.</p>
            </div>
            
            <button
              type="button"
              onClick={() => setIsRegistrationLive(!isRegistrationLive)}
              className={`relative inline-flex h-10 w-20 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white/75 ${
                isRegistrationLive ? 'bg-emerald-500' : 'bg-white/10'
              }`}
              role="switch"
              aria-checked={isRegistrationLive}
            >
              <span className="sr-only">Toggle Registration Live</span>
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-9 w-9 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  isRegistrationLive ? 'translate-x-10' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
        
        {/* FAQ Section */}
        <div className={`rounded-[40px] border border-white/5 bg-white/[0.02] p-8 md:p-10 shadow-2xl transition-opacity duration-300 ${activeTab === 'faq' ? 'block' : 'hidden'}`}>
          <div className="mb-8 flex justify-between items-center border-b border-white/5 pb-6">
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tighter text-white italic">Quick Brief / FAQ</h2>
              <p className="text-sm text-neutral-500 mt-1">Update the questions and answers shown on the public landing page.</p>
            </div>
            <button
              type="button"
              onClick={addFaq}
              className="px-6 py-3 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 hover:border-blue-500 rounded-2xl text-blue-500 text-xs font-black uppercase tracking-widest transition-all"
            >
              + Add FAQ
            </button>
          </div>

          <div className="space-y-6">
            {faqs.map((faq, idx) => (
              <div key={idx} className="flex gap-4 items-start p-6 bg-black/40 border border-white/5 rounded-3xl relative group">
                <div className="font-black text-white/10 text-4xl italic w-12 text-center absolute -left-4 top-4">
                  Q{idx + 1}
                </div>
                
                <div className="flex-1 space-y-4 pl-8">
                  <div>
                     <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-2">Question</label>
                     <input
                       type="text"
                       required={activeTab === 'faq'}
                       value={faq.q}
                       onChange={(e) => updateFaq(idx, 'q', e.target.value)}
                       placeholder="e.g. How much is the registration fee?"
                       className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-neutral-700"
                     />
                  </div>
                  <div>
                     <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-2">Answer</label>
                     <textarea
                       required={activeTab === 'faq'}
                       value={faq.a}
                       onChange={(e) => updateFaq(idx, 'a', e.target.value)}
                       placeholder="Provide the answer..."
                       rows={3}
                       className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-neutral-700 resize-y"
                     />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeFaq(idx)}
                  className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all ml-2"
                  title="Remove Item"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Sponsors Section */}
        <div className={`rounded-[40px] border border-white/5 bg-white/[0.02] p-8 md:p-10 shadow-2xl transition-opacity duration-300 ${activeTab === 'sponsors' ? 'block' : 'hidden'}`}>
          <div className="mb-8 flex justify-between items-center border-b border-white/5 pb-6">
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tighter text-white italic">Sponsors & Partners</h2>
              <p className="text-sm text-neutral-500 mt-1">Manage the brands displayed in the "Powering the Game" section.</p>
            </div>
            <button
              type="button"
              onClick={addSponsor}
              className="px-6 py-3 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/20 hover:border-emerald-500 rounded-2xl text-emerald-500 text-xs font-black uppercase tracking-widest transition-all"
            >
              + Add Sponsor
            </button>
          </div>

          <div className="space-y-6">
            {sponsors.map((sponsor, idx) => (
              <div key={idx} className="flex flex-col md:flex-row gap-6 p-6 bg-black/40 border border-white/5 rounded-3xl relative group">
                <div className="font-black text-white/10 text-4xl italic absolute -left-4 top-4">
                  #{idx + 1}
                </div>
                
                <div className="flex-1 space-y-4 pl-4 md:pl-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-2">Role / Title</label>
                      <input
                        type="text"
                        required={activeTab === 'sponsors'}
                        value={sponsor.title}
                        onChange={(e) => updateSponsor(idx, 'title', e.target.value)}
                        placeholder="e.g. Title Sponsor"
                        className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-neutral-700"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-2">Brand Name</label>
                      <input
                        type="text"
                        required={activeTab === 'sponsors'}
                        value={sponsor.name}
                        onChange={(e) => updateSponsor(idx, 'name', e.target.value)}
                        placeholder="e.g. CoJude"
                        className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-neutral-700"
                      />
                    </div>
                  </div>
                  <div>
                     <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-2">Sponsor Logo</label>
                     <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                       <input
                         type="file"
                         accept="image/*"
                         id={`upload-sponsor-${idx}`}
                         className="hidden"
                         onChange={(e) => handleLogoUpload(idx, e.target.files?.[0] || null)}
                       />
                       <label
                         htmlFor={`upload-sponsor-${idx}`}
                         className="w-full sm:w-auto text-center flex-shrink-0 cursor-pointer rounded-xl bg-blue-600/10 px-4 py-3 text-xs font-black uppercase tracking-widest text-blue-500 hover:bg-blue-600 hover:text-white transition-all border border-blue-500/20"
                       >
                         Upload File
                       </label>
                       <input
                         type="text"
                         required={activeTab === 'sponsors'}
                         value={sponsor.logo}
                         onChange={(e) => updateSponsor(idx, 'logo', e.target.value)}
                         placeholder="Or paste image URL..."
                         className="w-full sm:flex-1 bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-neutral-700 font-mono text-sm"
                       />
                     </div>
                  </div>
                </div>

                <div className="flex flex-row md:flex-col justify-end items-center gap-4 border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6 mt-4 md:mt-0">
                  {/* Live Logo Preview */}
                  <div className="h-16 w-32 bg-white rounded-xl flex items-center justify-center p-2 hidden md:flex">
                     {sponsor.logo ? (
                       <img src={sponsor.logo} alt="Preview" className="max-h-full max-w-full object-contain" />
                     ) : (
                       <span className="text-[10px] text-neutral-400 font-bold uppercase">No Image</span>
                     )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSponsor(idx)}
                    className="h-10 w-full md:w-auto px-4 flex-shrink-0 flex items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all text-xs font-black uppercase tracking-widest"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Global Save Action */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 rounded-2xl bg-blue-600 px-10 py-4 text-sm font-black uppercase tracking-widest text-white hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white"></div>
                Saving Changes...
              </>
            ) : (
              'Save All Settings'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
