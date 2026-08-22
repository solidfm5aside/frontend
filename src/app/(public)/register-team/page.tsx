'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';

interface SettingsResponse {
  success: boolean;
  data?: { registration_live?: string | boolean };
}

interface RegistrationResponse {
  success: boolean;
  message?: string;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

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
  const [statusCheckError, setStatusCheckError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const checkActiveTournament = useCallback(async () => {
    setCheckingStatus(true);
    setStatusCheckError(null);
    try {
      const response = await apiClient.get<SettingsResponse, SettingsResponse>('/settings');
      if (!response.success || !response.data) throw new Error('Registration status is unavailable');

      const isLive = response.data.registration_live === 'true' || response.data.registration_live === true;
      setIsRegistrationOpen(isLive);
    } catch (error: unknown) {
      setStatusCheckError(getErrorMessage(error, 'Unable to check registration status. Please try again.'));
    } finally {
      setCheckingStatus(false);
    }
  }, []);

  useEffect(() => {
    void checkActiveTournament();
  }, [checkActiveTournament]);

  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
    };
  }, [logoPreview]);

  const clearLogoSelection = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Choose a JPG, PNG, or WebP logo');
      clearLogoSelection();
      return;
    }
    if (file.size > 1024 * 1024) {
      toast.error('Logo must be 1 MB or smaller');
      clearLogoSelection();
      return;
    }

    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
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
      data.append('division', 'men');
      if (logoFile) data.append('logo', logoFile);

      const response = await apiClient.post<RegistrationResponse, RegistrationResponse>('/teams/register', data);
      if (!response.success) throw new Error(response.message || 'Registration failed');

      setStatus('success');
      setMessage(response.message || 'Registration successful! We will contact you shortly.');
      clearLogoSelection();
      toast.success('Registration submitted successfully!');
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error, 'Registration failed. Please try again or contact support.');
      setStatus('error');
      setMessage(errorMessage);
      toast.error(errorMessage);
    }
  };

  if (checkingStatus) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black" role="status" aria-live="polite">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600/20 border-t-blue-600"></div>
        <span className="sr-only">Checking team registration status</span>
      </div>
    );
  }

  if (statusCheckError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-6 font-outfit">
        <div className="w-full max-w-md rounded-[32px] border border-red-500/20 bg-red-500/5 p-8 text-center" role="alert">
          <h2 className="text-2xl font-black uppercase italic text-white">Status unavailable</h2>
          <p className="mt-4 text-sm text-red-200">{statusCheckError}</p>
          <button type="button" onClick={() => void checkActiveTournament()} className="mt-6 rounded-2xl bg-blue-600 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white hover:bg-blue-500">
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!isRegistrationOpen) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-6 font-outfit relative overflow-hidden">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-red-600/5 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="w-full max-w-md text-center space-y-8 relative z-10 animate-reveal">
          <div className="inline-flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-[30px] sm:rounded-[40px] bg-red-500/10 border border-red-500/20 font-black text-red-500 text-3xl sm:text-4xl mb-6">
            !
          </div>
          <h2 className="text-4xl md:text-5xl font-black italic tracking-tighter text-white uppercase leading-tight">
            Registration <br /><span className="text-red-500 not-italic">Closed.</span>
          </h2>
          <div className="rounded-[28px] sm:rounded-[40px] border border-white/5 bg-white/[0.02] p-6 sm:p-8 backdrop-blur-xl">
            <p className="text-sm font-medium text-neutral-400 leading-relaxed mb-6">
              Men&apos;s team registration is currently closed. Women&apos;s teams are entered directly by the competition administrators.
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
          <div className="inline-flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-[30px] sm:rounded-[40px] bg-blue-600 font-black text-white text-3xl sm:text-4xl mb-6 shadow-2xl shadow-blue-600/20">
            ✓
          </div>
          <h2 className="text-4xl md:text-5xl font-black italic tracking-tighter text-white uppercase leading-tight">
            Registration <br /><span className="text-blue-500 not-italic">Received.</span>
          </h2>
          <div className="rounded-[28px] sm:rounded-[40px] border border-blue-500/10 bg-blue-500/5 p-6 sm:p-8 backdrop-blur-xl">
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
    <div className="flex min-h-screen items-center justify-center bg-black px-4 sm:px-6 py-12 sm:py-20 font-outfit relative overflow-hidden">
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-2xl space-y-10 relative z-10 animate-reveal">
        <div className="text-center">
          <Link href="/" className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 font-black text-white shadow-2xl shadow-blue-600/20 mb-8 transition-transform hover:scale-110">
            SFM
          </Link>
          <h2 className="text-4xl md:text-6xl font-black italic tracking-tighter text-white uppercase">
            Register your Men&apos;s <span className="text-blue-500 not-italic">Squad.</span>
          </h2>
          <p className="mt-4 text-xs md:text-sm font-bold text-neutral-500 uppercase tracking-[0.3em]">Public registration is for the men&apos;s competition</p>
        </div>

        <div className="rounded-[28px] sm:rounded-[40px] border border-white/5 bg-white/[0.02] p-6 md:p-12 backdrop-blur-3xl shadow-2xl">
          <form className="space-y-8 md:space-y-10" onSubmit={handleSubmit}>
            {status === 'error' && (
              <div className="rounded-2xl bg-red-500/10 p-5 text-[10px] md:text-xs font-bold uppercase tracking-widest text-red-500 border border-red-500/20" role="alert" aria-live="assertive">
                {message}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Logo Upload */}
              <div className="md:col-span-2 flex flex-col items-center justify-center">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-neutral-500 mb-6 block text-center">Squad Logo</span>
                <div className="relative group">
                  <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleLogoChange} className="hidden" id="logo-upload" />
                  <label htmlFor="logo-upload" className="flex h-28 w-28 sm:h-32 sm:w-32 md:h-40 md:w-40 cursor-pointer items-center justify-center rounded-[30px] sm:rounded-[40px] border-2 border-dashed border-white/10 bg-white/5 transition-all hover:border-blue-500/50 hover:bg-white/10 overflow-hidden relative">
                    {logoPreview ? (
                      <Image src={logoPreview} alt="Selected squad logo preview" fill sizes="160px" unoptimized className="object-cover transition-transform group-hover:scale-110" />
                    ) : (
                      <div className="text-center space-y-2">
                        <div className="text-3xl text-neutral-600 group-hover:text-blue-500 transition-colors">+</div>
                        <div className="text-[8px] font-black uppercase tracking-widest text-neutral-600 group-hover:text-neutral-400">Upload</div>
                      </div>
                    )}
                  </label>
                  {logoPreview && (
                    <button type="button" onClick={clearLogoSelection} aria-label="Remove selected squad logo" className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-red-500 text-white font-bold flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg scale-0 group-hover:scale-100 group-focus-within:scale-100 duration-300">×</button>
                  )}
                </div>
                <p className="mt-4 text-[9px] font-bold text-neutral-600 uppercase tracking-widest italic">Square / Transparent PNG preferred (Max 1MB)</p>
              </div>

              <div className="group md:col-span-2">
                <label htmlFor="public-team-name" className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-500 mb-4 block">Team Name</label>
                <input id="public-team-name" type="text" required placeholder="e.g. Enugu Stars" className="block w-full rounded-2xl border border-white/5 bg-white/5 px-6 py-5 text-white placeholder:text-neutral-700 focus:border-blue-500/50 focus:bg-white/[0.08] focus:outline-none transition-all text-sm font-medium" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="group">
                <label htmlFor="public-team-city" className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-500 mb-4 block">City / Location</label>
                <input id="public-team-city" type="text" required placeholder="Enugu" className="block w-full rounded-2xl border border-white/5 bg-white/5 px-6 py-5 text-white placeholder:text-neutral-700 focus:border-blue-500/50 focus:bg-white/[0.08] focus:outline-none transition-all text-sm font-medium" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
              </div>
              <div className="group">
                <label htmlFor="public-team-captain" className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-500 mb-4 block">Captain&apos;s Name</label>
                <input id="public-team-captain" type="text" required placeholder="Full Name" className="block w-full rounded-2xl border border-white/5 bg-white/5 px-6 py-5 text-white placeholder:text-neutral-700 focus:border-blue-500/50 focus:bg-white/[0.08] focus:outline-none transition-all text-sm font-medium" value={formData.captainName} onChange={(e) => setFormData({ ...formData, captainName: e.target.value })} />
              </div>
              <div className="group">
                <label htmlFor="public-team-phone" className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-500 mb-4 block">WhatsApp / Phone</label>
                <input id="public-team-phone" type="tel" required placeholder="080XXXXXXXX" className="block w-full rounded-2xl border border-white/5 bg-white/5 px-6 py-5 text-white placeholder:text-neutral-700 focus:border-blue-500/50 focus:bg-white/[0.08] focus:outline-none transition-all text-sm font-medium" value={formData.contactPhone} onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })} />
              </div>
              <div className="group">
                <label htmlFor="public-team-email" className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-500 mb-4 block">Contact Email</label>
                <input id="public-team-email" type="email" required placeholder="name@example.com" className="block w-full rounded-2xl border border-white/5 bg-white/5 px-6 py-5 text-white placeholder:text-neutral-700 focus:border-blue-500/50 focus:bg-white/[0.08] focus:outline-none transition-all text-sm font-medium" value={formData.contactEmail} onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })} />
              </div>
            </div>

            <button type="submit" disabled={status === 'loading'} aria-busy={status === 'loading'} className="group relative flex h-20 w-full items-center justify-center rounded-3xl bg-white text-xl font-black text-black transition-all hover:bg-neutral-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 shadow-2xl shadow-white/5">
              <span className={status === 'loading' ? 'opacity-0' : 'opacity-100 uppercase italic tracking-tighter'}>Submit Application</span>
              {status === 'loading' && (
                <div className="absolute inset-0 flex items-center justify-center" role="status" aria-live="polite">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-black/20 border-t-black"></div>
                  <span className="sr-only">Submitting team registration</span>
                </div>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[10px] font-bold text-neutral-600 uppercase tracking-[0.3em] leading-relaxed max-w-lg mx-auto">
          Men&apos;s registration costs ₦50,000 per team. Women&apos;s teams are entered by administrators. By submitting, you agree to the tournament rules and participant code of conduct.
        </p>
      </div>
    </div>
  );
}
