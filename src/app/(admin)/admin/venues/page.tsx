'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';
import { AlertCircle, Edit2, MapPin, Plus, RefreshCw, Trash2 } from 'lucide-react';
import type { ApiResponse } from '@/types';

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

interface Venue {
  _id: string;
  name: string;
  address: string;
  importance: number;
}

export default function VenuesPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoadedSuccessfully, setHasLoadedSuccessfully] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const venueRequestIdRef = useRef(0);

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    importance: 1,
  });

  const fetchVenues = useCallback(async () => {
    const requestId = ++venueRequestIdRef.current;
    setLoading(true);

    try {
      const res = await apiClient.get<ApiResponse<Venue[]>, ApiResponse<Venue[]>>('/venues');
      if (!res.success || !Array.isArray(res.data)) {
        throw new Error(res.message || 'Failed to load the venue catalogue');
      }
      if (requestId !== venueRequestIdRef.current) return;

      setVenues(res.data);
      setHasLoadedSuccessfully(true);
      setLoadError(null);
    } catch (error: unknown) {
      if (requestId !== venueRequestIdRef.current) return;
      setLoadError(getErrorMessage(error, 'Failed to load the venue catalogue'));
    } finally {
      if (requestId === venueRequestIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchVenues();

    return () => {
      venueRequestIdRef.current += 1;
    };
  }, [fetchVenues]);

  const isCatalogueCurrent = hasLoadedSuccessfully && !loadError && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCatalogueCurrent) {
      toast.error('Reload the venue catalogue before saving');
      return;
    }

    try {
      const payload = {
        name: formData.name,
        address: formData.address,
        importance: Number(formData.importance),
      };

      if (editingId) {
        await apiClient.patch(`/venues/${editingId}`, payload);
        toast.success('Venue updated');
      } else {
        await apiClient.post('/venues', payload);
        toast.success('Venue created');
      }
      setIsFormOpen(false);
      setEditingId(null);
      setFormData({ name: '', address: '', importance: 1 });
      void fetchVenues();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to save venue'));
    }
  };

  const handleEdit = (v: Venue) => {
    if (!isCatalogueCurrent) return;
    setFormData({ name: v.name, address: v.address, importance: v.importance });
    setEditingId(v._id);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!isCatalogueCurrent) {
      toast.error('Reload the venue catalogue before deleting a venue');
      return;
    }
    if (!confirm('Are you sure you want to delete this venue?')) return;
    try {
      await apiClient.delete(`/venues/${id}`);
      toast.success('Venue deleted');
      void fetchVenues();
    } catch {
      toast.error('Failed to delete venue');
    }
  };

  if (loading && !hasLoadedSuccessfully && !loadError) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500/20 border-t-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-reveal">
      {/* Header */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase">
            Tournament <span className="text-blue-500 not-italic">Venues.</span>
          </h1>
          <p className="mt-2 text-xs font-bold text-neutral-500 uppercase tracking-widest">
            Manage Match Locations & Priority
          </p>
        </div>
        <button
          type="button"
          disabled={!isCatalogueCurrent}
          aria-describedby={!isCatalogueCurrent ? 'venue-catalogue-status' : undefined}
          title={!isCatalogueCurrent ? 'Load the current venue catalogue before adding a venue' : undefined}
          onClick={() => {
            setIsFormOpen(true);
            setEditingId(null);
            setFormData({ name: '', address: '', importance: 1 });
          }}
          className="flex h-12 items-center gap-3 rounded-2xl bg-blue-600 px-6 font-bold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-500 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 disabled:hover:bg-blue-600"
        >
          <Plus className="h-4 w-4" /> Add Venue
        </button>
      </div>

      {loadError ? (
        <div id="venue-catalogue-status" role="alert" className="flex flex-col gap-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-red-300 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="text-sm font-bold">{loadError}</p>
              <p className="mt-1 text-xs text-red-300/70">
                {hasLoadedSuccessfully
                  ? 'Showing the last successfully loaded venues. Venue changes stay locked until the catalogue is current.'
                  : 'Adding a venue stays locked until the catalogue loads, which prevents accidental duplicates.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void fetchVenues()}
            disabled={loading}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-red-400/20 bg-black/20 px-4 text-[10px] font-black uppercase tracking-widest text-white transition-colors hover:bg-black/30 disabled:cursor-wait disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Retrying...' : 'Retry'}
          </button>
        </div>
      ) : loading && hasLoadedSuccessfully ? (
        <p id="venue-catalogue-status" role="status" className="text-xs font-bold text-neutral-500">
          Refreshing venue catalogue...
        </p>
      ) : null}

      {isFormOpen && (
        <div className="rounded-[40px] border border-blue-500/20 bg-blue-500/5 p-8 backdrop-blur-3xl animate-reveal">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-xl font-black italic uppercase tracking-tight text-white">
              {editingId ? 'Edit Venue' : 'New Venue'}
            </h2>
            <button 
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="text-[10px] font-black uppercase tracking-widest text-neutral-500 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <label htmlFor="venue-name" className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Venue Name</label>
              <input
                id="venue-name"
                required
                className="w-full rounded-2xl border border-white/5 bg-white/5 px-6 py-4 text-sm text-white focus:border-blue-500/50 outline-none transition-all"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Nnamdi Azikiwe Stadium"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="venue-address" className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Address / Location</label>
              <input
                id="venue-address"
                required
                className="w-full rounded-2xl border border-white/5 bg-white/5 px-6 py-4 text-sm text-white focus:border-blue-500/50 outline-none transition-all"
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                placeholder="e.g. Main Pitch, Enugu"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="venue-importance" className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Importance (1 = Highest)</label>
              <input
                id="venue-importance"
                required
                type="number"
                min="1"
                className="w-full rounded-2xl border border-white/5 bg-white/5 px-6 py-4 text-sm text-white focus:border-blue-500/50 outline-none transition-all"
                value={formData.importance}
                onChange={e => setFormData({ ...formData, importance: parseInt(e.target.value) || 1 })}
              />
            </div>

            <div className="md:col-span-3 flex justify-end">
              <button
                type="submit"
                disabled={!isCatalogueCurrent}
                className="h-12 rounded-2xl bg-white px-8 font-black text-black hover:bg-neutral-200 transition-colors shadow-xl shadow-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Save Venue
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Venues Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {venues.map((venue) => (
          <div key={venue._id} className="group relative rounded-[32px] border border-white/5 bg-white/[0.02] p-8 backdrop-blur-xl transition-all hover:bg-white/[0.04]">
            <div className="absolute right-6 top-6 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
              <button 
                type="button"
                onClick={() => handleEdit(venue)}
                aria-label={`Edit ${venue.name}`}
                disabled={!isCatalogueCurrent}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-blue-600 transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white/10"
              >
                <Edit2 className="h-3 w-3" />
              </button>
              <button 
                type="button"
                onClick={() => handleDelete(venue._id)}
                aria-label={`Delete ${venue.name}`}
                disabled={!isCatalogueCurrent}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-red-600 transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white/10"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>

            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500">
              <MapPin className="h-6 w-6" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-bold text-white uppercase tracking-tight">{venue.name}</h3>
                {venue.importance === 1 && (
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-emerald-500">
                    Main Setting
                  </span>
                )}
              </div>
              <p className="text-xs font-medium text-neutral-400 leading-relaxed">{venue.address}</p>
            </div>

            <div className="mt-8 flex items-center justify-between border-t border-white/5 pt-6">
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Priority Level</span>
              <span className="text-lg font-black italic text-neutral-300">#{venue.importance}</span>
            </div>
          </div>
        ))}

        {venues.length === 0 && !isFormOpen && hasLoadedSuccessfully && !loadError && (
          <div className="col-span-full flex flex-col items-center justify-center rounded-[40px] border border-dashed border-white/10 bg-white/[0.02] py-20 text-center">
             <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5 text-neutral-600">
                <MapPin className="h-8 w-8" />
             </div>
             <p className="text-sm font-bold text-neutral-400 uppercase tracking-widest">No Venues Found</p>
             <p className="mt-2 text-xs text-neutral-600">Add venues to start scheduling matches.</p>
          </div>
        )}
      </div>
    </div>
  );
}
