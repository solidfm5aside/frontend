'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import {
  CheckCircle2,
  ImagePlus,
  LoaderCircle,
  Pencil,
  Plus,
  Trash2,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { PageSpinner } from '@/components/ui/Spinner';
import { Select } from '@/components/ui/Select';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { TeamAvatar } from '@/components/ui/TeamAvatar';

type RegistrationStatus = 'pending' | 'registered' | 'withdrawn';
type TeamFilter = 'all' | 'pending' | 'registered';
type TeamDivision = 'men' | 'women';

interface Team {
  _id: string;
  name: string;
  city: string;
  captainName: string;
  contactPhone: string;
  contactEmail: string;
  division?: TeamDivision;
  registrationStatus: RegistrationStatus;
  logo?: string;
  stadium?: string;
  colors?: string[];
  foundedYear?: number;
}

interface Pagination {
  total: number;
  pages: number;
  limit: number;
}

interface TeamsResponse {
  success: boolean;
  data: Team[];
  pagination: Pagination;
  message?: string;
}

interface TeamResponse {
  success: boolean;
  data: Team;
  message?: string;
}

interface MutationResponse {
  success: boolean;
  message?: string;
}

interface TeamMutationResponse extends MutationResponse {
  data?: Team;
}

interface TeamAction {
  teamId: string;
  kind: 'approve' | 'withdraw' | 'delete';
}

interface TeamFormData {
  name: string;
  city: string;
  stadium: string;
  colors: string;
  foundedYear: string;
  captainName: string;
  contactPhone: string;
  contactEmail: string;
  division: TeamDivision;
  registrationStatus: RegistrationStatus;
}

const INITIAL_FORM_DATA: TeamFormData = {
  name: '',
  city: 'Enugu',
  stadium: '',
  colors: '',
  foundedYear: '',
  captainName: '',
  contactPhone: '',
  contactEmail: '',
  division: 'men',
  registrationStatus: 'registered',
};

const TEAM_FILTERS: TeamFilter[] = ['all', 'pending', 'registered'];
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE = 1024 * 1024;

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export default function TeamsManagementPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<TeamFilter>('all');
  const [divisionFilter, setDivisionFilter] = useState<TeamDivision>('men');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, pages: 1, limit: 10 });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState<TeamFormData>(INITIAL_FORM_DATA);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isSavedLogoRemoved, setIsSavedLogoRemoved] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [teamAction, setTeamAction] = useState<TeamAction | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const logoPreviewUrlRef = useRef<string | null>(null);
  const latestTeamsRequestRef = useRef(0);
  const formSectionRef = useRef<HTMLElement>(null);

  const fetchTeams = useCallback(async (
    page: number,
    currentFilter: TeamFilter,
    currentDivision: TeamDivision,
    silent = false,
  ) => {
    const requestId = ++latestTeamsRequestRef.current;
    if (!silent) setIsLoading(true);
    setLoadError(null);

    try {
      const response = await apiClient.get<TeamsResponse, TeamsResponse>(
        '/teams/admin?page=' + page + '&limit=10&registrationStatus=' + currentFilter + '&division=' + currentDivision,
      );
      if (!response.success) throw new Error(response.message || 'Failed to fetch teams');

      if (requestId !== latestTeamsRequestRef.current) return;

      const maxPage = Math.max(1, response.pagination.pages);
      if (page > maxPage) {
        setCurrentPage(maxPage);
        return;
      }

      setTeams(response.data);
      setPagination({
        ...response.pagination,
        pages: maxPage,
      });
    } catch (error: unknown) {
      if (requestId !== latestTeamsRequestRef.current) return;
      const message = getErrorMessage(error, 'Failed to fetch teams');
      setLoadError(message);
      if (silent) toast.error(message);
    } finally {
      if (requestId !== latestTeamsRequestRef.current) return;
      setHasLoadedOnce(true);
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTeams(currentPage, filter, divisionFilter);
  }, [currentPage, divisionFilter, fetchTeams, filter]);

  useEffect(() => () => {
    latestTeamsRequestRef.current += 1;
    if (logoPreviewUrlRef.current) URL.revokeObjectURL(logoPreviewUrlRef.current);
  }, []);

  const replaceLogoPreview = (file: File | null) => {
    if (logoPreviewUrlRef.current) URL.revokeObjectURL(logoPreviewUrlRef.current);
    const nextUrl = file ? URL.createObjectURL(file) : null;
    logoPreviewUrlRef.current = nextUrl;
    setLogoPreview(nextUrl);
  };

  const resetForm = () => {
    setFormData({ ...INITIAL_FORM_DATA, division: divisionFilter });
    setEditingTeam(null);
    setLogoFile(null);
    setIsSavedLogoRemoved(false);
    replaceLogoPreview(null);
    setLogoError(null);
    setFormError(null);
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const handleFormToggle = () => {
    if (isSaving) return;
    if (isFormOpen) resetForm();
    else if (!editingTeam) setFormData((current) => ({ ...current, division: divisionFilter }));
    setIsFormOpen((isOpen) => !isOpen);
  };

  const clearLogo = () => {
    setLogoFile(null);
    setIsSavedLogoRemoved(false);
    replaceLogoPreview(null);
    if (editingTeam?.logo) setLogoPreview(editingTeam.logo);
    setLogoError(null);
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const openEditTeam = (team: Team) => {
    if (isSaving || teamAction) return;
    if (logoPreviewUrlRef.current) URL.revokeObjectURL(logoPreviewUrlRef.current);
    logoPreviewUrlRef.current = null;
    setEditingTeam(team);
    setFormData({
      name: team.name,
      city: team.city,
      stadium: team.stadium || '',
      colors: team.colors?.join(', ') || '',
      foundedYear: team.foundedYear ? String(team.foundedYear) : '',
      captainName: team.captainName,
      contactPhone: team.contactPhone,
      contactEmail: team.contactEmail,
      division: team.division === 'women' ? 'women' : 'men',
      registrationStatus: team.registrationStatus,
    });
    setLogoFile(null);
    setIsSavedLogoRemoved(false);
    setLogoPreview(team.logo || null);
    setLogoError(null);
    setFormError(null);
    if (logoInputRef.current) logoInputRef.current.value = '';
    setIsFormOpen(true);
    requestAnimationFrame(() => formSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const handleLogoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setLogoError(null);

    if (!file) {
      clearLogo();
      return;
    }
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      clearLogo();
      setLogoError('Choose a JPG, PNG, or WebP image.');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      clearLogo();
      setLogoError('Team logo must be 1MB or smaller.');
      return;
    }

    setLogoFile(file);
    setIsSavedLogoRemoved(false);
    replaceLogoPreview(file);
  };

  const markSavedLogoForRemoval = () => {
    if (!editingTeam?.logo || logoFile) return;
    setIsSavedLogoRemoved(true);
    replaceLogoPreview(null);
    setLogoError(null);
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const restoreSavedLogo = () => {
    if (!editingTeam?.logo) return;
    setIsSavedLogoRemoved(false);
    setLogoPreview(editingTeam.logo);
  };

  const handleSaveTeam = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setFormError(null);

    try {
      const payload = new FormData();
      payload.append('name', formData.name.trim());
      payload.append('city', formData.city.trim());
      payload.append('stadium', formData.stadium.trim());
      payload.append('colors', formData.colors.trim());
      payload.append('foundedYear', formData.foundedYear.trim());
      payload.append('captainName', formData.captainName.trim());
      payload.append('contactPhone', formData.contactPhone.trim());
      payload.append('contactEmail', formData.contactEmail.trim());
      payload.append('division', formData.division);
      payload.append('registrationStatus', formData.registrationStatus);
      if (logoFile) payload.append('logo', logoFile);
      else if (editingTeam && isSavedLogoRemoved) payload.append('logo', '');

      const response = editingTeam
        ? await apiClient.patch<TeamResponse, TeamResponse>(`/teams/${encodeURIComponent(editingTeam._id)}`, payload)
        : await apiClient.post<TeamResponse, TeamResponse>('/teams', payload);
      if (!response.success) throw new Error(response.message || `Failed to ${editingTeam ? 'update' : 'create'} team`);

      toast.success(response.message || `${response.data.name} ${editingTeam ? 'updated' : 'created'} successfully`);
      const wasEditing = Boolean(editingTeam);
      const savedDivision = formData.division;
      const savedStatus = formData.registrationStatus;
      resetForm();
      setIsFormOpen(false);

      if (savedDivision !== divisionFilter || (filter !== 'all' && savedStatus !== filter)) {
        setFilter('all');
        setDivisionFilter(savedDivision);
        setCurrentPage(1);
      } else if (wasEditing) {
        await fetchTeams(currentPage, filter, divisionFilter, true);
      } else if (filter === 'all' && currentPage === 1) {
        await fetchTeams(1, 'all', divisionFilter, true);
      } else {
        setFilter('all');
        setDivisionFilter(formData.division);
        setCurrentPage(1);
      }
    } catch (error: unknown) {
      const message = getErrorMessage(error, `Failed to ${editingTeam ? 'update' : 'create'} team`);
      setFormError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: RegistrationStatus) => {
    if (teamAction || isSaving) return;
    setTeamAction({ teamId: id, kind: status === 'registered' ? 'approve' : 'withdraw' });
    try {
      const response = await apiClient.patch<TeamMutationResponse, TeamMutationResponse>('/teams/' + id, {
        registrationStatus: status,
      });
      if (!response.success) throw new Error(response.message || 'Failed to update team status');
      if (response.data?.registrationStatus !== status) {
        throw new Error('The server did not confirm the requested team status. Refresh and try again.');
      }
      await fetchTeams(currentPage, filter, divisionFilter, true);
      toast.success(response.message || 'Team status updated to ' + status);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to update team status'));
    } finally {
      setTeamAction(null);
    }
  };

  const handleDeleteTeam = async (team: Team) => {
    if (teamAction || isSaving) return;
    if (!window.confirm('Delete ' + team.name + '? This removes its registration from active records.')) return;
    setTeamAction({ teamId: team._id, kind: 'delete' });
    try {
      const response = await apiClient.delete<MutationResponse, MutationResponse>('/teams/' + team._id);
      if (!response.success) throw new Error(response.message || 'Failed to delete team');
      toast.success(response.message || 'Team deleted successfully');

      if (teams.length === 1 && currentPage > 1) {
        setCurrentPage((page) => page - 1);
      } else {
        await fetchTeams(currentPage, filter, divisionFilter, true);
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to delete team'));
    } finally {
      setTeamAction(null);
    }
  };

  if (!hasLoadedOnce && isLoading) return <PageSpinner />;

  const firstVisibleTeam = pagination.total === 0
    ? 0
    : (currentPage - 1) * pagination.limit + 1;
  const lastVisibleTeam = Math.min(currentPage * pagination.limit, pagination.total);

  return (
    <div className="space-y-8 animate-reveal md:space-y-10">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-black italic uppercase leading-none tracking-tighter text-white sm:text-4xl">Teams.</h1>
          <p className="mt-2 text-[10px] font-black tracking-[0.3em] text-neutral-500 uppercase italic">Manage Men&apos;s &amp; Women&apos;s Registrations</p>
        </div>

        <div className="flex w-full flex-col gap-3 md:w-auto md:items-end">
          <button
            type="button"
            onClick={handleFormToggle}
            disabled={isSaving}
            aria-expanded={isFormOpen}
            aria-controls="admin-team-form"
            className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl bg-blue-600 px-6 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-500 active:scale-[0.98] md:w-auto"
          >
            {isFormOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {isFormOpen ? 'Close Form' : 'Add Team'}
          </button>

          <div className="flex max-w-full gap-2 overflow-x-auto rounded-2xl border border-white/5 bg-white/[0.02] p-1.5 scrollbar-hide" aria-label="Team division">
            {(['men', 'women'] as const).map((division) => (
              <button
                key={division}
                type="button"
                disabled={isSaving || Boolean(editingTeam)}
                title={editingTeam ? 'Finish editing this team before changing the division list' : undefined}
                onClick={() => {
                  if (division === divisionFilter) return;
                  setDivisionFilter(division);
                  setCurrentPage(1);
                  if (!editingTeam) setFormData((current) => ({ ...current, division }));
                }}
                aria-pressed={divisionFilter === division}
                className={clsx(
                  'min-h-11 shrink-0 whitespace-nowrap rounded-xl px-5 py-2 text-[10px] font-black uppercase tracking-widest transition-all disabled:cursor-not-allowed disabled:opacity-40',
                  divisionFilter === division
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'text-neutral-500 hover:text-white',
                )}
              >
                {division === 'men' ? "Men's teams" : "Women's teams"}
              </button>
            ))}
          </div>

          <div className="flex max-w-full gap-2 overflow-x-auto rounded-2xl border border-white/5 bg-white/[0.02] p-1.5 scrollbar-hide" aria-label="Registration status">
            {TEAM_FILTERS.map((teamFilter) => (
              <button
                key={teamFilter}
                type="button"
                onClick={() => {
                  setFilter(teamFilter);
                  setCurrentPage(1);
                }}
                aria-pressed={filter === teamFilter}
                className={clsx(
                  'min-h-11 shrink-0 whitespace-nowrap rounded-xl px-5 py-2 text-[10px] font-black uppercase tracking-widest transition-all',
                  filter === teamFilter
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'text-neutral-500 hover:text-white',
                )}
              >
                {teamFilter}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isFormOpen ? (
        <section
          ref={formSectionRef}
          id="admin-team-form"
          aria-labelledby="admin-team-form-title"
          className="rounded-[28px] border border-blue-500/20 bg-blue-500/5 p-5 backdrop-blur-3xl sm:rounded-[32px] sm:p-6 animate-reveal"
        >
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 id="admin-team-form-title" className="text-xl font-black italic uppercase tracking-tight text-white">
                {editingTeam ? `Edit ${editingTeam.name}` : 'New Team Registration'}
              </h2>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                {editingTeam ? 'Update the team division, identity, venue, contact details, status, or crest.' : 'Choose the division, then enter the team identity, contact details, status, and optional crest.'}
              </p>
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest text-neutral-600">* Required fields</span>
          </div>

          <form onSubmit={handleSaveTeam} aria-busy={isSaving}>
            <fieldset disabled={isSaving} className="space-y-6 disabled:opacity-70">
            {formError ? (
              <div role="alert" className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-xs font-bold text-red-400">{formError}</div>
            ) : null}

            <div className="grid gap-6 lg:grid-cols-[160px_minmax(0,1fr)]">
              <div className="flex flex-col items-center lg:items-start">
                <label htmlFor="team-logo" className="mb-3 text-[10px] font-black uppercase tracking-widest text-neutral-500">Team Logo</label>
                <div className="group relative">
                  <input
                    ref={logoInputRef}
                    id="team-logo"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleLogoChange}
                    className="sr-only"
                    aria-describedby={logoError ? 'team-logo-help team-logo-error' : 'team-logo-help'}
                    aria-invalid={Boolean(logoError)}
                  />
                  <label
                    htmlFor="team-logo"
                    className="relative flex h-32 w-32 cursor-pointer items-center justify-center overflow-hidden rounded-[32px] border-2 border-dashed border-white/10 bg-white/5 transition-all hover:border-blue-500/50 hover:bg-white/10 sm:h-36 sm:w-36"
                  >
                    {logoPreview ? (
                      <Image src={logoPreview} alt={`${logoFile ? 'Selected replacement' : editingTeam ? 'Current' : 'Selected'} team logo preview`} fill sizes="144px" className="object-cover" unoptimized />
                    ) : (
                      <span className="flex flex-col items-center gap-2 text-neutral-600 transition-colors group-hover:text-blue-500">
                        <ImagePlus className="h-7 w-7" />
                        <span className="text-[8px] font-black uppercase tracking-widest">Choose Logo</span>
                      </span>
                    )}
                  </label>
                  {logoFile ? (
                    <button
                      type="button"
                      onClick={clearLogo}
                      aria-label={editingTeam ? 'Discard selected replacement logo' : 'Remove selected team logo'}
                      className="absolute -right-2 -top-2 flex h-11 w-11 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition-colors hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
                <p id="team-logo-help" className="mt-3 text-center text-[9px] font-bold uppercase tracking-widest text-neutral-600 lg:text-left">JPG, PNG, or WebP • Max 1MB</p>
                {logoError ? <p id="team-logo-error" role="alert" className="mt-2 text-center text-[10px] font-bold text-red-400 lg:text-left">{logoError}</p> : null}
                {editingTeam?.logo && !logoFile ? (
                  isSavedLogoRemoved ? (
                    <div role="status" className="mt-3 rounded-xl border border-orange-500/20 bg-orange-500/10 p-3 text-center lg:text-left">
                      <p className="text-[9px] font-bold text-orange-300">Saved logo will be removed when you save.</p>
                      <button type="button" onClick={restoreSavedLogo} className="mt-2 min-h-11 rounded-lg px-3 text-[9px] font-black uppercase tracking-widest text-white underline underline-offset-4">Undo removal</button>
                    </div>
                  ) : (
                    <button type="button" onClick={markSavedLogoForRemoval} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 text-[9px] font-black uppercase tracking-widest text-red-400 transition-colors hover:bg-red-500/20">
                      <Trash2 className="h-3.5 w-3.5" /> Remove saved logo
                    </button>
                  )
                ) : null}
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <label htmlFor="team-division" className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Competition Division *</label>
                  <Select
                    id="team-division"
                    required
                    controlSize="large"
                    fontWeight="normal"
                    surface="glass"
                    value={formData.division}
                    onChange={(event) => setFormData((current) => ({
                      ...current,
                      division: event.target.value as TeamDivision,
                    }))}
                  >
                    <option value="men" className="bg-[#0a0a0a]">Men&apos;s division</option>
                    <option value="women" className="bg-[#0a0a0a]">Women&apos;s division</option>
                  </Select>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-600">Tournament entry lists only show registered teams from the same division.</p>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <label htmlFor="team-name" className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Team Name *</label>
                  <input
                    id="team-name"
                    required
                    minLength={3}
                    maxLength={50}
                    autoFocus
                    value={formData.name}
                    onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
                    placeholder="e.g. Enugu Stars"
                    className="w-full rounded-2xl border border-white/5 bg-white/5 px-5 py-4 text-base text-white outline-none transition-all placeholder:text-neutral-700 focus:border-blue-500/50 focus:bg-white/[0.08] [@media(pointer:fine)]:text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="team-city" className="text-[10px] font-black uppercase tracking-widest text-neutral-500">City / Location *</label>
                  <input
                    id="team-city"
                    required
                    minLength={2}
                    maxLength={100}
                    value={formData.city}
                    onChange={(event) => setFormData((current) => ({ ...current, city: event.target.value }))}
                    placeholder="e.g. Enugu"
                    className="w-full rounded-2xl border border-white/5 bg-white/5 px-5 py-4 text-base text-white outline-none transition-all placeholder:text-neutral-700 focus:border-blue-500/50 focus:bg-white/[0.08] [@media(pointer:fine)]:text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="team-stadium" className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Home Venue</label>
                  <input
                    id="team-stadium"
                    maxLength={150}
                    value={formData.stadium}
                    onChange={(event) => setFormData((current) => ({ ...current, stadium: event.target.value }))}
                    placeholder="e.g. Solid FM Arena"
                    className="w-full rounded-2xl border border-white/5 bg-white/5 px-5 py-4 text-base text-white outline-none transition-all placeholder:text-neutral-700 focus:border-blue-500/50 focus:bg-white/[0.08] [@media(pointer:fine)]:text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="team-colors" className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Team Colors</label>
                  <input
                    id="team-colors"
                    maxLength={200}
                    value={formData.colors}
                    onChange={(event) => setFormData((current) => ({ ...current, colors: event.target.value }))}
                    placeholder="e.g. Blue, White"
                    aria-describedby="team-colors-help"
                    className="w-full rounded-2xl border border-white/5 bg-white/5 px-5 py-4 text-base text-white outline-none transition-all placeholder:text-neutral-700 focus:border-blue-500/50 focus:bg-white/[0.08] [@media(pointer:fine)]:text-sm"
                  />
                  <p id="team-colors-help" className="text-[9px] font-bold uppercase tracking-widest text-neutral-600">Separate multiple colors with commas.</p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="team-founded-year" className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Founded Year</label>
                  <input
                    id="team-founded-year"
                    type="number"
                    min={1800}
                    max={new Date().getFullYear()}
                    step={1}
                    inputMode="numeric"
                    value={formData.foundedYear}
                    onChange={(event) => setFormData((current) => ({ ...current, foundedYear: event.target.value }))}
                    placeholder="e.g. 2018"
                    className="w-full rounded-2xl border border-white/5 bg-white/5 px-5 py-4 text-base text-white outline-none transition-all placeholder:text-neutral-700 focus:border-blue-500/50 focus:bg-white/[0.08] [@media(pointer:fine)]:text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="team-captain" className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Captain / Contact Name *</label>
                  <input
                    id="team-captain"
                    required
                    minLength={2}
                    maxLength={100}
                    autoComplete="name"
                    value={formData.captainName}
                    onChange={(event) => setFormData((current) => ({ ...current, captainName: event.target.value }))}
                    placeholder="Full name"
                    className="w-full rounded-2xl border border-white/5 bg-white/5 px-5 py-4 text-base text-white outline-none transition-all placeholder:text-neutral-700 focus:border-blue-500/50 focus:bg-white/[0.08] [@media(pointer:fine)]:text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="team-phone" className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Phone / WhatsApp *</label>
                  <input
                    id="team-phone"
                    type="tel"
                    required
                    minLength={7}
                    maxLength={30}
                    autoComplete="tel"
                    value={formData.contactPhone}
                    onChange={(event) => setFormData((current) => ({ ...current, contactPhone: event.target.value }))}
                    placeholder="080XXXXXXXX"
                    className="w-full rounded-2xl border border-white/5 bg-white/5 px-5 py-4 text-base text-white outline-none transition-all placeholder:text-neutral-700 focus:border-blue-500/50 focus:bg-white/[0.08] [@media(pointer:fine)]:text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="team-email" className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Contact Email *</label>
                  <input
                    id="team-email"
                    type="email"
                    required
                    maxLength={254}
                    autoComplete="email"
                    value={formData.contactEmail}
                    onChange={(event) => setFormData((current) => ({ ...current, contactEmail: event.target.value }))}
                    placeholder="name@example.com"
                    className="w-full rounded-2xl border border-white/5 bg-white/5 px-5 py-4 text-base text-white outline-none transition-all placeholder:text-neutral-700 focus:border-blue-500/50 focus:bg-white/[0.08] [@media(pointer:fine)]:text-sm"
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <label htmlFor="team-status" className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Registration Status *</label>
                  <Select
                    id="team-status"
                    required
                    controlSize="large"
                    fontWeight="normal"
                    surface="glass"
                    value={formData.registrationStatus}
                    onChange={(event) => setFormData((current) => ({
                      ...current,
                      registrationStatus: event.target.value as RegistrationStatus,
                    }))}
                  >
                    <option value="registered" className="bg-[#0a0a0a]">Registered — ready for squad entry</option>
                    <option value="pending" className="bg-[#0a0a0a]">Pending — awaiting approval</option>
                    <option value="withdrawn" className="bg-[#0a0a0a]">Withdrawn — inactive</option>
                  </Select>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-600">Admin-entered teams default to registered. Change this only when needed.</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-white/5 pt-6 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleFormToggle}
                disabled={isSaving}
                className="h-12 rounded-2xl border border-white/10 px-6 text-[10px] font-black uppercase tracking-widest text-neutral-400 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex h-12 items-center justify-center gap-3 rounded-2xl bg-white px-8 font-black text-black shadow-xl shadow-white/10 transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : editingTeam ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {isSaving ? (editingTeam ? 'Saving Changes...' : 'Creating Team...') : editingTeam ? 'Save Changes' : 'Create Team'}
              </button>
            </div>
            </fieldset>
          </form>
        </section>
      ) : null}

      {loadError ? (
        <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400 sm:flex-row sm:items-center sm:justify-between">
          <span>{loadError}</span>
          <button type="button" onClick={() => void fetchTeams(currentPage, filter, divisionFilter)} className="min-h-11 rounded-lg px-3 text-[10px] font-black uppercase tracking-widest text-white underline underline-offset-4">Try Again</button>
        </div>
      ) : null}

      <div
        className={clsx(
          'relative overflow-hidden rounded-[28px] border border-white/5 bg-white/[0.01] shadow-2xl backdrop-blur-3xl sm:rounded-[40px]',
          isLoading && 'opacity-60',
        )}
        aria-busy={isLoading}
      >
        {isLoading ? (
          <div className="absolute right-5 top-5 z-10 flex items-center gap-2 rounded-full border border-white/10 bg-black/70 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-neutral-400">
            <LoaderCircle className="h-3 w-3 animate-spin text-blue-500" /> Refreshing
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 md:px-6 md:py-5">Squad Name / Division</th>
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 md:px-6 md:py-5">Captain / Contact</th>
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 md:px-6 md:py-5">Status</th>
                <th className="px-4 py-4 text-right text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 md:px-6 md:py-5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {teams.length > 0 ? teams.map((team) => {
                const isBusy = teamAction?.teamId === team._id;
                const mutationsLocked = Boolean(teamAction) || isSaving;
                const isApproving = isBusy && teamAction.kind === 'approve';
                const isWithdrawing = isBusy && teamAction.kind === 'withdraw';
                const isDeleting = isBusy && teamAction.kind === 'delete';
                return (
                  <tr key={team._id} className="group transition-colors hover:bg-white/[0.02]">
                    <td className="px-4 py-5 md:px-6 md:py-6">
                      <div className="flex items-center gap-4">
                        <TeamAvatar name={team.name} logo={team.logo} size="sm" />
                        <div>
                          <p className="text-sm font-bold tracking-tight text-white">{team.name}</p>
                          <p className="mt-1 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-widest text-neutral-500">
                            <span>{team.city}</span>
                            <span className="rounded-full border border-white/5 bg-white/5 px-2 py-0.5 text-[7px] text-neutral-400">
                              {team.division === 'women' ? "Women's" : "Men's"}
                            </span>
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-5 md:px-6 md:py-6">
                      <p className="text-sm font-medium text-neutral-300">{team.captainName}</p>
                      <p className="mt-1 break-all text-[10px] font-bold text-neutral-600">{team.contactPhone} • {team.contactEmail}</p>
                    </td>
                    <td className="px-4 py-5 md:px-6 md:py-6"><StatusBadge status={team.registrationStatus} /></td>
                    <td className="px-4 py-5 text-right md:px-6 md:py-6">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => openEditTeam(team)}
                          disabled={mutationsLocked}
                          aria-label={`Edit ${team.name}`}
                          title="Edit Team"
                           className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/5 bg-white/5 text-neutral-500 transition-all hover:border-blue-500/50 hover:text-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <Link
                          href={'/admin/teams/' + team._id + '/squad'}
                          aria-label={'Manage ' + team.name + ' squad'}
                          title="Manage Squad"
                           className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/5 bg-white/5 text-neutral-500 transition-all hover:border-blue-500/50 hover:text-blue-500"
                        >
                          <Users className="h-4 w-4" />
                        </Link>

                        {team.registrationStatus === 'pending' ? (
                          <button
                            type="button"
                            onClick={() => void handleStatusUpdate(team._id, 'registered')}
                            disabled={mutationsLocked}
                            aria-label={'Approve ' + team.name}
                            title="Approve Team"
                             className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isApproving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                          </button>
                        ) : null}

                        {team.registrationStatus !== 'withdrawn' ? (
                          <button
                            type="button"
                            onClick={() => void handleStatusUpdate(team._id, 'withdrawn')}
                            disabled={mutationsLocked}
                            aria-label={'Withdraw ' + team.name}
                            title="Withdraw Team"
                             className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 text-neutral-500 transition-all hover:bg-red-500/10 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isWithdrawing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                          </button>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => void handleDeleteTeam(team)}
                          disabled={mutationsLocked}
                          aria-label={'Delete ' + team.name}
                          title="Delete Team"
                           className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/5 text-neutral-700 transition-all hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isDeleting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center">
                    <p className="text-[10px] font-black uppercase italic tracking-[0.3em] text-neutral-600">No {divisionFilter === 'women' ? "women's" : "men's"} squads found matching this filter</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/5 bg-white/[0.02] px-5 py-6 sm:flex-row sm:px-8">
          <div className="text-center text-[10px] font-black uppercase tracking-widest text-neutral-500 sm:text-left">
            Showing <span className="text-white">{firstVisibleTeam}-{lastVisibleTeam}</span> of <span className="text-white">{pagination.total}</span> teams
          </div>

          <div className="flex max-w-full items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              type="button"
              disabled={currentPage === 1 || isLoading}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              className="min-h-11 rounded-xl border border-white/5 px-4 text-[10px] font-black uppercase tracking-widest text-neutral-500 transition-all hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:text-neutral-500"
            >
              Prev
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: pagination.pages }, (_, index) => index + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  disabled={isLoading}
                  aria-label={'Go to teams page ' + page}
                  aria-current={currentPage === page ? 'page' : undefined}
                  className={clsx(
                    'h-11 w-11 rounded-lg text-[10px] font-black transition-all disabled:cursor-not-allowed disabled:opacity-50',
                    currentPage === page ? 'bg-blue-600 text-white' : 'text-neutral-500 hover:text-white',
                  )}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              type="button"
              disabled={currentPage === pagination.pages || isLoading}
              onClick={() => setCurrentPage((page) => Math.min(pagination.pages, page + 1))}
              className="min-h-11 rounded-xl border border-white/5 px-4 text-[10px] font-black uppercase tracking-widest text-neutral-500 transition-all hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:text-neutral-500"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <p className="text-center text-[10px] font-bold uppercase italic tracking-[0.3em] text-neutral-700">
        Active competitions use corrected team identities; completed seasons keep their history.
      </p>
    </div>
  );
}
