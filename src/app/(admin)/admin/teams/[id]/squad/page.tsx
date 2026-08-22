'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChangeEvent, FormEvent, use, useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import {
  ArrowLeft,
  ImagePlus,
  LoaderCircle,
  Pencil,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { isOptimizableImageUrl } from '@/lib/image-url';
import { PageSpinner } from '@/components/ui/Spinner';
import { Select } from '@/components/ui/Select';
import { StatusBadge } from '@/components/ui/StatusBadge';

type PlayerPosition = 'GK' | 'DF' | 'MF' | 'FW';

interface Player {
  _id: string;
  name: string;
  position: PlayerPosition;
  jerseyNumber: number;
  nationality: string;
  passportPic?: string;
}

interface Team {
  _id: string;
  name: string;
  registrationStatus: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface TeamsResponse extends ApiResponse<Team[]> {
  pagination: Pagination;
}

interface MutationResponse {
  success: boolean;
  message?: string;
}

interface PlayerFormData {
  name: string;
  position: PlayerPosition;
  jerseyNumber: string;
  nationality: string;
}

const INITIAL_FORM_DATA: PlayerFormData = {
  name: '',
  position: 'MF',
  jerseyNumber: '',
  nationality: 'Nigeria',
};

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE = 1024 * 1024;
const MAX_ROSTER_SIZE = 10;
const MAX_TEAM_PAGE_SIZE = 100;

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

async function fetchAllAdminTeams(): Promise<Team[]> {
  const fetchPage = async (page: number) => {
    const response = await apiClient.get<TeamsResponse, TeamsResponse>(
      `/teams/admin?page=${page}&limit=${MAX_TEAM_PAGE_SIZE}&registrationStatus=all`,
    );
    if (!response.success) throw new Error(response.message || 'Failed to load teams');
    return response;
  };

  const firstPage = await fetchPage(1);
  const expectedTotal = firstPage.pagination.total;
  const pageCount = Math.max(1, firstPage.pagination.pages);
  const remainingPages = pageCount > 1
    ? await Promise.all(
        Array.from({ length: pageCount - 1 }, (_, index) => fetchPage(index + 2)),
      )
    : [];
  if (remainingPages.some((response) => response.pagination.total !== expectedTotal)) {
    throw new Error('The team catalogue changed while it was loading. Reload and try again.');
  }
  const uniqueTeams = new Map<string, Team>();
  for (const response of [firstPage, ...remainingPages]) {
    for (const responseTeam of response.data) uniqueTeams.set(responseTeam._id, responseTeam);
  }
  if (uniqueTeams.size !== expectedTotal) {
    throw new Error('The team catalogue was incomplete. Reload before transferring a player.');
  }
  return [...uniqueTeams.values()].sort((left, right) => left.name.localeCompare(right.name));
}

export default function SquadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [team, setTeam] = useState<Team | null>(null);
  const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [deletingPlayerId, setDeletingPlayerId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [formData, setFormData] = useState<PlayerFormData>(INITIAL_FORM_DATA);
  const [passportFile, setPassportFile] = useState<File | null>(null);
  const [passportPreview, setPassportPreview] = useState<string | null>(null);
  const [isSavedPhotoRemoved, setIsSavedPhotoRemoved] = useState(false);
  const [destinationTeamId, setDestinationTeamId] = useState(id);
  const passportInputRef = useRef<HTMLInputElement>(null);
  const passportPreviewUrlRef = useRef<string | null>(null);
  const formSectionRef = useRef<HTMLElement>(null);
  const latestSquadRequestRef = useRef(0);

  const fetchData = useCallback(async () => {
    const requestId = ++latestSquadRequestRef.current;
    setIsLoading(true);
    setLoadError(null);

    try {
      const [teamResponse, playersResponse, teamsResponse] = await Promise.all([
        apiClient.get<ApiResponse<Team>, ApiResponse<Team>>('/teams/admin/' + encodeURIComponent(id)),
        apiClient.get<ApiResponse<Player[]>, ApiResponse<Player[]>>('/players/admin?teamId=' + encodeURIComponent(id) + '&limit=100'),
        fetchAllAdminTeams(),
      ]);

      if (!teamResponse.success) {
        throw new Error(teamResponse.message || 'Failed to load team');
      }
      if (!playersResponse.success) {
        throw new Error(playersResponse.message || 'Failed to load players');
      }
      if (requestId !== latestSquadRequestRef.current) return;

      setTeam(teamResponse.data);
      setPlayers(playersResponse.data);
      setAvailableTeams(
        teamsResponse.some((responseTeam) => responseTeam._id === teamResponse.data._id)
          ? teamsResponse
          : [teamResponse.data, ...teamsResponse].sort((left, right) => left.name.localeCompare(right.name)),
      );
      setDestinationTeamId(id);
    } catch (error: unknown) {
      if (requestId !== latestSquadRequestRef.current) return;
      const message = getErrorMessage(error, 'Failed to load squad data');
      setLoadError(message);
      toast.error(message);
    } finally {
      if (requestId === latestSquadRequestRef.current) setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => () => {
    if (passportPreviewUrlRef.current) URL.revokeObjectURL(passportPreviewUrlRef.current);
  }, []);

  const replacePassportPreview = (file: File | null) => {
    if (passportPreviewUrlRef.current) URL.revokeObjectURL(passportPreviewUrlRef.current);
    const nextUrl = file ? URL.createObjectURL(file) : null;
    passportPreviewUrlRef.current = nextUrl;
    setPassportPreview(nextUrl);
  };

  const clearPassport = () => {
    setPassportFile(null);
    setIsSavedPhotoRemoved(false);
    replacePassportPreview(null);
    if (editingPlayer?.passportPic) setPassportPreview(editingPlayer.passportPic);
    setPhotoError(null);
    if (passportInputRef.current) passportInputRef.current.value = '';
  };

  const handlePassportChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setPhotoError(null);

    if (!file) {
      clearPassport();
      return;
    }
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      clearPassport();
      setPhotoError('Choose a JPG, PNG, or WebP image.');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      clearPassport();
      setPhotoError('Player photo must be 1MB or smaller.');
      return;
    }

    setPassportFile(file);
    setIsSavedPhotoRemoved(false);
    replacePassportPreview(file);
  };

  const markSavedPhotoForRemoval = () => {
    if (!editingPlayer?.passportPic || passportFile) return;
    setPassportFile(null);
    setIsSavedPhotoRemoved(true);
    replacePassportPreview(null);
    setPhotoError(null);
    if (passportInputRef.current) passportInputRef.current.value = '';
  };

  const restoreSavedPhoto = () => {
    setIsSavedPhotoRemoved(false);
    setPassportPreview(editingPlayer?.passportPic || null);
  };

  const resetPlayerForm = () => {
    setFormData(INITIAL_FORM_DATA);
    setEditingPlayer(null);
    setIsSavedPhotoRemoved(false);
    setFormError(null);
    setPassportFile(null);
    replacePassportPreview(null);
    setPhotoError(null);
    setDestinationTeamId(id);
    if (passportInputRef.current) passportInputRef.current.value = '';
  };

  const openEditPlayer = (player: Player) => {
    if (isSaving || deletingPlayerId) return;
    if (passportPreviewUrlRef.current) URL.revokeObjectURL(passportPreviewUrlRef.current);
    passportPreviewUrlRef.current = null;
    setEditingPlayer(player);
    setDestinationTeamId(id);
    setFormData({
      name: player.name,
      position: player.position,
      jerseyNumber: String(player.jerseyNumber),
      nationality: player.nationality,
    });
    setPassportFile(null);
    setIsSavedPhotoRemoved(false);
    setPassportPreview(player.passportPic || null);
    setPhotoError(null);
    setFormError(null);
    if (passportInputRef.current) passportInputRef.current.value = '';
    requestAnimationFrame(() => formSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const handleSavePlayer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!editingPlayer && players.length >= MAX_ROSTER_SIZE) {
      setFormError(`This squad already has the maximum ${MAX_ROSTER_SIZE} players.`);
      return;
    }

    const jerseyNumber = Number(formData.jerseyNumber);
    if (!Number.isInteger(jerseyNumber) || jerseyNumber < 1 || jerseyNumber > 99) {
      setFormError('Jersey number must be a whole number between 1 and 99.');
      return;
    }
    const isTransfer = Boolean(editingPlayer && destinationTeamId !== id);
    if (editingPlayer && !availableTeams.some((availableTeam) => availableTeam._id === destinationTeamId)) {
      setFormError('Choose an available destination team.');
      return;
    }
    setIsSaving(true);
    try {
      const payload = new FormData();
      payload.append('name', formData.name.trim());
      payload.append('position', formData.position);
      payload.append('jerseyNumber', String(jerseyNumber));
      payload.append('nationality', formData.nationality.trim());
      if (!editingPlayer) payload.append('teamId', id);
      else if (isTransfer) payload.append('teamId', destinationTeamId);
      if (passportFile) payload.append('passportPic', passportFile);
      else if (editingPlayer && isSavedPhotoRemoved) payload.append('passportPic', '');

      const response = editingPlayer
        ? await apiClient.patch<ApiResponse<Player>, ApiResponse<Player>>(
            `/players/${encodeURIComponent(editingPlayer._id)}`,
            payload,
          )
        : await apiClient.post<ApiResponse<Player>, ApiResponse<Player>>('/players', payload);
      if (!response.success) throw new Error(response.message || `Failed to ${editingPlayer ? 'update' : 'add'} player`);

      const destinationTeam = availableTeams.find(
        (availableTeam) => availableTeam._id === destinationTeamId,
      );
      setPlayers((currentPlayers) => {
        if (isTransfer && editingPlayer) {
          return currentPlayers.filter((player) => player._id !== editingPlayer._id);
        }
        const nextPlayers = editingPlayer
          ? currentPlayers.map((player) => player._id === editingPlayer._id ? response.data : player)
          : [...currentPlayers, response.data];
        return nextPlayers.sort((a, b) => a.name.localeCompare(b.name));
      });
      const wasEditing = Boolean(editingPlayer);
      resetPlayerForm();
      toast.success(
        response.message || (isTransfer
          ? `Player transferred to ${destinationTeam?.name || 'the selected squad'}`
          : wasEditing
            ? 'Player details updated'
            : 'Player added to squad'),
      );
      if (isTransfer) {
        router.push(`/admin/teams/${encodeURIComponent(destinationTeamId)}/squad`);
      }
    } catch (error: unknown) {
      const message = getErrorMessage(
        error,
        `Failed to ${editingPlayer && destinationTeamId !== id ? 'transfer' : editingPlayer ? 'update' : 'add'} player`,
      );
      setFormError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePlayer = async (player: Player) => {
    if (deletingPlayerId || isSaving) return;
    if (!window.confirm('Remove ' + player.name + ' from this squad?')) return;
    setDeletingPlayerId(player._id);

    try {
      const response = await apiClient.delete<MutationResponse, MutationResponse>('/players/' + player._id);
      if (!response.success) throw new Error(response.message || 'Failed to remove player');
      setPlayers((currentPlayers) => currentPlayers.filter((item) => item._id !== player._id));
      toast.success(response.message || 'Player removed');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to remove player'));
    } finally {
      setDeletingPlayerId(null);
    }
  };

  if (isLoading) return <PageSpinner />;

  if (loadError || !team) {
    return (
      <div className="space-y-6 animate-reveal">
        <Link
          href="/admin/teams"
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-neutral-500 transition-colors hover:text-blue-500"
        >
          <ArrowLeft className="h-3 w-3" /> Back to Teams
        </Link>
        <div role="alert" className="rounded-[28px] border border-red-500/20 bg-red-500/10 p-8 text-center sm:rounded-[40px]">
          <p className="text-sm font-bold text-red-400">{loadError || 'Team not found.'}</p>
          <button
            type="button"
            onClick={() => void fetchData()}
            className="mt-5 rounded-xl border border-white/10 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-colors hover:bg-white/5"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const rosterIsFull = players.length >= MAX_ROSTER_SIZE;
  const rosterProgress = Math.min((players.length / MAX_ROSTER_SIZE) * 100, 100);

  return (
    <div className="space-y-8 md:space-y-10 animate-reveal">
      <div className="space-y-3">
        <Link
          href="/admin/teams"
          className="flex w-fit items-center gap-2 text-[10px] font-black uppercase tracking-widest text-neutral-500 transition-colors hover:text-blue-500"
        >
          <ArrowLeft className="h-3 w-3" /> Back to Teams
        </Link>
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <h1 className="min-w-0 break-words text-3xl font-black italic uppercase tracking-tighter text-white sm:text-4xl">
            {team.name} <span className="text-blue-500 not-italic">Squad.</span>
          </h1>
          <StatusBadge status={team.registrationStatus} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(300px,360px)_minmax(0,1fr)] xl:gap-10">
        <section
          ref={formSectionRef}
          aria-labelledby="add-player-heading"
          className="h-fit rounded-[28px] border border-white/5 bg-white/[0.02] p-5 backdrop-blur-3xl sm:rounded-[40px] sm:p-8"
        >
          <div className="mb-8 flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-500">
              {editingPlayer ? <Pencil className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
            </div>
            <div>
              <h2 id="add-player-heading" className="text-xl font-bold uppercase italic tracking-tight text-white">
                {editingPlayer ? `Edit ${editingPlayer.name}` : 'Add Player'}
              </h2>
              <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-neutral-600">
                {editingPlayer ? 'Update player profile and optional photo' : `Maximum ${MAX_ROSTER_SIZE} players per team`}
              </p>
            </div>
          </div>

          <form onSubmit={handleSavePlayer} aria-busy={isSaving}>
            <fieldset disabled={isSaving || (rosterIsFull && !editingPlayer)} className="space-y-6 disabled:opacity-70">
            {rosterIsFull && !editingPlayer ? (
              <div role="status" className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs font-bold text-emerald-300">
                Squad complete: all {MAX_ROSTER_SIZE} player places are filled. Remove a player before adding another.
              </div>
            ) : null}
            {formError ? (
              <div role="alert" className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-xs font-bold text-red-400">
                {formError}
              </div>
            ) : null}

            <div className="flex flex-col items-center">
              <label htmlFor="passport-upload" className="mb-3 text-[10px] font-black uppercase tracking-widest text-neutral-500">Player Photo</label>
              <div className="group relative">
                <input
                  ref={passportInputRef}
                  id="passport-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePassportChange}
                  className="sr-only"
                  aria-describedby={photoError ? 'passport-help passport-error' : 'passport-help'}
                  aria-invalid={Boolean(photoError)}
                />
                <label
                  htmlFor="passport-upload"
                  className="relative flex h-28 w-28 cursor-pointer items-center justify-center overflow-hidden rounded-[28px] border-2 border-dashed border-white/20 bg-white/5 transition-all hover:border-blue-500/50 hover:bg-white/10 sm:h-32 sm:w-32"
                >
                  {passportPreview ? (
                    <Image src={passportPreview} alt={`${passportFile ? 'Selected replacement' : editingPlayer ? 'Current' : 'Selected'} player photo preview`} fill sizes="128px" className="object-cover" unoptimized />
                  ) : (
                    <span className="flex flex-col items-center gap-2 text-neutral-600 transition-colors group-hover:text-blue-500">
                      <ImagePlus className="h-7 w-7" />
                      <span className="text-[8px] font-black uppercase tracking-widest">Choose Photo</span>
                    </span>
                  )}
                </label>
                {passportFile ? (
                  <button
                    type="button"
                    onClick={clearPassport}
                    aria-label={editingPlayer ? 'Discard selected replacement photo' : 'Remove selected player photo'}
                    className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition-colors hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
              <p id="passport-help" className="mt-3 text-center text-[9px] font-bold uppercase tracking-widest text-neutral-600">Optional • JPG, PNG, or WebP • Max 1MB</p>
              {photoError ? <p id="passport-error" role="alert" className="mt-2 text-center text-[10px] font-bold text-red-400">{photoError}</p> : null}
              {editingPlayer?.passportPic && !passportFile && !isSavedPhotoRemoved ? (
                <button
                  type="button"
                  onClick={markSavedPhotoForRemoval}
                  className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 text-[9px] font-black uppercase tracking-widest text-red-300 transition-colors hover:border-red-500/40 hover:bg-red-500/15 focus:outline-none focus:ring-2 focus:ring-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove saved photo
                </button>
              ) : null}
              {editingPlayer?.passportPic && isSavedPhotoRemoved ? (
                <div role="status" className="mt-3 flex flex-col items-center gap-2 text-center">
                  <p className="text-[9px] font-black uppercase tracking-widest text-orange-300">Saved photo will be removed when you save</p>
                  <button
                    type="button"
                    onClick={restoreSavedPhoto}
                    className="min-h-10 rounded-xl border border-white/10 px-4 text-[9px] font-black uppercase tracking-widest text-neutral-300 transition-colors hover:border-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    Undo removal
                  </button>
                </div>
              ) : null}
            </div>

            <div className="space-y-2">
              <label htmlFor="player-name" className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Full Name *</label>
              <input
                id="player-name"
                required
                minLength={2}
                maxLength={100}
                autoComplete="name"
                className="w-full rounded-2xl border border-white/5 bg-white/5 px-5 py-4 text-sm text-white outline-none transition-all placeholder:text-neutral-700 focus:border-blue-500/50"
                value={formData.name}
                onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
                placeholder="e.g. John Doe"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="player-nationality" className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Nationality *</label>
              <input
                id="player-nationality"
                required
                minLength={2}
                maxLength={100}
                className="w-full rounded-2xl border border-white/5 bg-white/5 px-5 py-4 text-sm text-white outline-none transition-all placeholder:text-neutral-700 focus:border-blue-500/50"
                value={formData.nationality}
                onChange={(event) => setFormData((current) => ({ ...current, nationality: event.target.value }))}
                placeholder="e.g. Nigeria"
              />
            </div>

            {editingPlayer ? (
              <div className="space-y-2">
                <label htmlFor="destination-team" className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                  Squad Assignment *
                </label>
                <Select
                  id="destination-team"
                  required
                  controlSize="large"
                  fontWeight="normal"
                  surface="glass"
                  value={destinationTeamId}
                  onChange={(event) => setDestinationTeamId(event.target.value)}
                  aria-describedby="destination-team-help"
                >
                  {availableTeams.map((availableTeam) => (
                    <option key={availableTeam._id} value={availableTeam._id}>
                      {availableTeam.name}{availableTeam._id === id ? ' — Current squad' : ''}
                    </option>
                  ))}
                </Select>
                <p id="destination-team-help" className="text-[9px] font-bold uppercase leading-relaxed tracking-widest text-neutral-600">
                  Choose another team to transfer this player. Destination roster and tournament locks are checked when you save.
                </p>
                {destinationTeamId !== id ? (
                  <p role="status" className="rounded-2xl border border-orange-500/20 bg-orange-500/10 p-3 text-[10px] font-bold text-orange-200">
                    Saving will move this player out of {team.name} and open the destination squad.
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="player-position" className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Position *</label>
                <Select
                  id="player-position"
                  required
                  controlSize="large"
                  fontWeight="normal"
                  surface="glass"
                  value={formData.position}
                  onChange={(event) => setFormData((current) => ({
                    ...current,
                    position: event.target.value as PlayerPosition,
                  }))}
                >
                  <option value="GK">Goalkeeper (GK)</option>
                  <option value="DF">Defender (DF)</option>
                  <option value="MF">Midfielder (MF)</option>
                  <option value="FW">Forward (FW)</option>
                </Select>
              </div>

              <div className="space-y-2">
                <label htmlFor="jersey-number" className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Jersey # *</label>
                <input
                  id="jersey-number"
                  required
                  type="number"
                  min={1}
                  max={99}
                  step={1}
                  inputMode="numeric"
                  className="w-full rounded-2xl border border-white/5 bg-white/5 px-5 py-4 text-sm text-white outline-none transition-all placeholder:text-neutral-700 focus:border-blue-500/50"
                  value={formData.jerseyNumber}
                  onChange={(event) => setFormData((current) => ({ ...current, jerseyNumber: event.target.value }))}
                  placeholder="10"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving || (rosterIsFull && !editingPlayer)}
              className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-blue-600 font-bold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : editingPlayer ? <Pencil className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
              {isSaving ? (editingPlayer ? 'Saving Changes...' : 'Registering Player...') : editingPlayer ? 'Save Player Changes' : rosterIsFull ? 'Squad Limit Reached' : 'Register Player'}
            </button>
            {editingPlayer ? (
              <button
                type="button"
                onClick={resetPlayerForm}
                disabled={isSaving}
                className="h-11 w-full rounded-2xl border border-white/10 text-[10px] font-black uppercase tracking-widest text-neutral-400 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel Editing
              </button>
            ) : null}
            </fieldset>
          </form>
        </section>

        <section
          aria-labelledby="current-squad-heading"
          className="min-w-0 overflow-hidden rounded-[28px] border border-white/5 bg-white/[0.02] backdrop-blur-3xl sm:rounded-[40px]"
        >
          <div className="flex items-center justify-between border-b border-white/5 p-5 sm:p-8">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h2 id="current-squad-heading" className="text-lg font-bold uppercase italic tracking-tight text-white sm:text-xl">Current Squad</h2>
                <p aria-live="polite" className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                  {players.length} of {MAX_ROSTER_SIZE} players registered
                </p>
              </div>
            </div>
            <div className="hidden w-28 sm:block" aria-hidden="true">
              <div className="mb-2 text-right text-[9px] font-black uppercase tracking-widest text-neutral-600">
                {MAX_ROSTER_SIZE - Math.min(players.length, MAX_ROSTER_SIZE)} places left
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-blue-500 transition-[width] duration-300"
                  style={{ width: `${rosterProgress}%` }}
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">
                  <th className="px-5 py-5 sm:px-8 sm:py-6">#</th>
                  <th className="px-5 py-5 sm:px-8 sm:py-6">Player</th>
                  <th className="px-5 py-5 text-center sm:px-8 sm:py-6">Pos</th>
                  <th className="px-5 py-5 text-right sm:px-8 sm:py-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {players.map((player) => {
                  const isDeleting = deletingPlayerId === player._id;
                  const playerActionsLocked = Boolean(deletingPlayerId) || isSaving;
                  return (
                    <tr key={player._id} className="group transition-colors hover:bg-white/[0.02]">
                      <td className="px-5 py-5 sm:px-8 sm:py-6">
                        <span className="text-lg font-black italic text-neutral-700 transition-colors group-hover:text-blue-500">
                          {String(player.jerseyNumber).padStart(2, '0')}
                        </span>
                      </td>
                      <td className="px-5 py-5 sm:px-8 sm:py-6">
                        <div className="flex items-center gap-3">
                          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/5 bg-white/5 text-xs font-black text-neutral-600">
                            {isOptimizableImageUrl(player.passportPic) ? (
                              <Image
                                src={player.passportPic}
                                alt={player.name + ' passport photo'}
                                fill
                                sizes="40px"
                                className="object-cover"
                              />
                            ) : player.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold uppercase text-white transition-colors group-hover:text-blue-500">{player.name}</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-600">{player.nationality}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-5 text-center sm:px-8 sm:py-6">
                        <span className="inline-block rounded-lg bg-white/5 px-2 py-1 text-[10px] font-black text-neutral-400 transition-colors group-hover:text-white">
                          {player.position}
                        </span>
                      </td>
                      <td className="px-5 py-5 text-right sm:px-8 sm:py-6">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditPlayer(player)}
                            disabled={playerActionsLocked}
                            aria-label={'Edit ' + player.name}
                            title="Edit Player"
                            className="rounded-lg p-2 text-neutral-600 transition-colors hover:bg-blue-500/10 hover:text-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeletePlayer(player)}
                            disabled={playerActionsLocked}
                            aria-label={'Remove ' + player.name + ' from squad'}
                            className={clsx(
                              'rounded-lg p-2 text-neutral-600 transition-colors hover:bg-red-500/10 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50',
                              isDeleting && 'cursor-not-allowed opacity-50',
                            )}
                          >
                            {isDeleting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {players.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-20 text-center">
                      <p className="text-xs font-bold uppercase tracking-widest text-neutral-600">No players registered yet</p>
                      <p className="mt-2 text-[10px] font-medium text-neutral-700">Use the form to add the first player.</p>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
