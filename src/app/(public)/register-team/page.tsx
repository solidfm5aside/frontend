'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';

export default function RegisterTeamPage() {
  const [formData, setFormData] = useState({
    name: '',
    city: 'Enugu',
    captainName: '',
    contactPhone: '',
    contactEmail: '',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    const checkActiveTournament = async () => {
      try {
        const response: any = await apiClient.get('/tournaments');
        if (response.success) {
          const hasActive = response.data.some(
            (t: any) => t.status === 'upcoming' || t.status === 'ongoing'
          );
          setIsRegistrationOpen(hasActive);
        }
      } catch (e) {
        console.error('Failed to check tournaments');
      } finally {
        setCheckingStatus(false);
      }
    };
    checkActiveTournament();
  }, []);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        toast.error('Logo must be smaller than 1MB');
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');
    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('city', formData.city);
      data.append('captainName', formData.captainName);
      data.append('contactPhone', formData.contactPhone);
      data.append('contactEmail', formData.contactEmail);
      if (logoFile) data.append('logo', logoFile);

      const response: any = await apiClient.post('/teams/register', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (response.success) {
        setStatus('success');
        setMessage(response.message || 'Registration successful! We will contact you shortly.');
        toast.success('Registration submitted successfully!');
      }
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Registration failed. Please try again or contact support.');
      toast.error(err.message || 'Registration failed');
    }
  };

  if (checkingStatus) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600/20 border-t-blue-600"></div>
      </div>
    );
  }

  if (!isRegistrationOpen) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-6 font-outfit relative overflow-hidden">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-red-600/5 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="w-full max-w-md text-center space-y-8 relative z-10 animate-reveal">
          <div className="inline-flex h-24 w-24 items-center justify-center rounded-[40px] bg-red-500/10 border border-red-500/20 font-black text-red-500 text-4xl mb-6">
            !
          </div>
          <h2 className="text-4xl md:text-5xl font-black italic tracking-tighter text-white uppercase leading-tight">
            Registration <br /><span className="text-red-500 not-italic">Closed.</span>
          </h2>
          <div className="rounded-[40px] border border-white/5 bg-white/[0.02] p-8 backdrop-blur-xl">
            <p className="text-sm font-medium text-neutral-400 leading-relaxed mb-6">
              There are currently no upcoming or ongoing tournament seasons accepting registrations.
            </p>
            <p className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest leading-loose">
              Please check back later.
            </p>
          </div>
          <Link href="/" className="inline-block text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 hover:text-white transition-colors underline underline-offset-8">
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-6 font-outfit">
        <div className="w-full max-w-md text-center space-y-8 animate-reveal">
          <div className="inline-flex h-24 w-24 items-center justify-center rounded-[40px] bg-blue-600 font-black text-white text-4xl mb-6 shadow-2xl shadow-blue-600/20">
            ✓
          </div>
          <h2 className="text-4xl md:text-5xl font-black italic tracking-tighter text-white uppercase leading-tight">
            Registration <br /><span className="text-blue-500 not-italic">Received.</span>
          </h2>
          <div className="rounded-[40px] border border-blue-500/10 bg-blue-500/5 p-8 backdrop-blur-xl">
            <p className="text-lg font-medium text-neutral-300 leading-relaxed mb-6">{message}</p>
            <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest leading-loose">
              Our coordinators will reach out to the captain via the provided contact info within 24 hours.
            </p>
          </div>
          <Link href="/" className="inline-block text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 hover:text-white transition-colors underline underline-offset-8">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-6 py-20 font-outfit relative overflow-hidden">
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-2xl space-y-10 relative z-10 animate-reveal">
        <div className="text-center">
          <Link href="/" className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 font-black text-white shadow-2xl shadow-blue-600/20 mb-8 transition-transform hover:scale-110">
            SFM
          </Link>
          <h2 className="text-4xl md:text-6xl font-black italic tracking-tighter text-white uppercase">
            Register your <span className="text-blue-500 not-italic">Squad.</span>
          </h2>
          <p className="mt-4 text-xs md:text-sm font-bold text-neutral-500 uppercase tracking-[0.3em]">Join the SolidFM 5-A-Side Elite</p>
        </div>

        <div className="rounded-[40px] border border-white/5 bg-white/[0.02] p-8 md:p-12 backdrop-blur-3xl shadow-2xl">
          <form className="space-y-8 md:space-y-10" onSubmit={handleSubmit}>
            {status === 'error' && (
              <div className="rounded-2xl bg-red-500/10 p-5 text-[10px] md:text-xs font-bold uppercase tracking-widest text-red-500 border border-red-500/20">
                {message}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Logo Upload */}
              <div className="md:col-span-2 flex flex-col items-center justify-center">
                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-neutral-500 mb-6 block text-center">Squad Logo</label>
                <div className="relative group">
                  <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" id="logo-upload" />
                  <label htmlFor="logo-upload" className="flex h-32 w-32 md:h-40 md:w-40 cursor-pointer items-center justify-center rounded-[40px] border-2 border-dashed border-white/10 bg-white/5 transition-all hover:border-blue-500/50 hover:bg-white/10 overflow-hidden relative">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo Preview" className="h-full w-full object-cover transition-transform group-hover:scale-110" />
                    ) : (
                      <div className="text-center space-y-2">
                        <div className="text-3xl text-neutral-600 group-hover:text-blue-500 transition-colors">+</div>
                        <div className="text-[8px] font-black uppercase tracking-widest text-neutral-600 group-hover:text-neutral-400">Upload</div>
                      </div>
                    )}
                  </label>
                  {logoPreview && (
                    <button type="button" onClick={() => { setLogoPreview(null); setLogoFile(null); }} className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-red-500 text-white font-bold flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg scale-0 group-hover:scale-100 duration-300">×</button>
                  )}
                </div>
                <p className="mt-4 text-[9px] font-bold text-neutral-600 uppercase tracking-widest italic">Square / Transparent PNG preferred (Max 1MB)</p>
              </div>

              <div className="group md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-500 mb-4 block">Team Name</label>
                <input type="text" required placeholder="e.g. Enugu Stars" className="block w-full rounded-2xl border border-white/5 bg-white/5 px-6 py-5 text-white placeholder:text-neutral-700 focus:border-blue-500/50 focus:bg-white/[0.08] focus:outline-none transition-all text-sm font-medium" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="group">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-500 mb-4 block">City / Location</label>
                <input type="text" required placeholder="Enugu" className="block w-full rounded-2xl border border-white/5 bg-white/5 px-6 py-5 text-white placeholder:text-neutral-700 focus:border-blue-500/50 focus:bg-white/[0.08] focus:outline-none transition-all text-sm font-medium" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
              </div>
              <div className="group">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-500 mb-4 block">Captain's Name</label>
                <input type="text" required placeholder="Full Name" className="block w-full rounded-2xl border border-white/5 bg-white/5 px-6 py-5 text-white placeholder:text-neutral-700 focus:border-blue-500/50 focus:bg-white/[0.08] focus:outline-none transition-all text-sm font-medium" value={formData.captainName} onChange={(e) => setFormData({ ...formData, captainName: e.target.value })} />
              </div>
              <div className="group">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-500 mb-4 block">WhatsApp / Phone</label>
                <input type="tel" required placeholder="080XXXXXXXX" className="block w-full rounded-2xl border border-white/5 bg-white/5 px-6 py-5 text-white placeholder:text-neutral-700 focus:border-blue-500/50 focus:bg-white/[0.08] focus:outline-none transition-all text-sm font-medium" value={formData.contactPhone} onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })} />
              </div>
              <div className="group">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-500 mb-4 block">Contact Email</label>
                <input type="email" required placeholder="name@example.com" className="block w-full rounded-2xl border border-white/5 bg-white/5 px-6 py-5 text-white placeholder:text-neutral-700 focus:border-blue-500/50 focus:bg-white/[0.08] focus:outline-none transition-all text-sm font-medium" value={formData.contactEmail} onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })} />
              </div>
            </div>

            <button type="submit" disabled={status === 'loading'} className="group relative flex h-20 w-full items-center justify-center rounded-3xl bg-white text-xl font-black text-black transition-all hover:bg-neutral-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 shadow-2xl shadow-white/5">
              <span className={status === 'loading' ? 'opacity-0' : 'opacity-100 uppercase italic tracking-tighter'}>Submit Application</span>
              {status === 'loading' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-black/20 border-t-black"></div>
                </div>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[10px] font-bold text-neutral-600 uppercase tracking-[0.3em] leading-relaxed max-w-lg mx-auto">
          Registration cost is ₦50,000 per team. By submitting, you agree to the tournament rules and participant code of conduct.
        </p>
      </div>
    </div>
  );
}
