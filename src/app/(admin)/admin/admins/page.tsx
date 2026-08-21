'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import {
  Crown,
  LoaderCircle,
  ShieldCheck,
  ShieldOff,
  UserCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/store/use-auth-store';
import { PageSpinner } from '@/components/ui/Spinner';

type AdminRole = 'viewer' | 'admin' | 'super_admin';

interface ManagedAdmin {
  _id: string;
  name: string;
  email: string;
  role: AdminRole;
  isVerified: boolean;
  lastLogin?: string;
  createdAt?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface AdminAction {
  adminId: string;
  role: AdminRole;
}

const ROLE_LABELS: Record<AdminRole, string> = {
  viewer: 'Viewer',
  admin: 'Admin',
  super_admin: 'Super Admin',
};

const ROLE_STYLES: Record<AdminRole, string> = {
  viewer: 'border-white/10 bg-white/5 text-neutral-400',
  admin: 'border-blue-500/20 bg-blue-500/10 text-blue-400',
  super_admin: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function describeLastLogin(lastLogin?: string) {
  if (!lastLogin) return 'Never signed in';
  const date = new Date(lastLogin);
  return Number.isNaN(date.getTime())
    ? 'Sign-in date unavailable'
    : `Last sign-in ${date.toLocaleDateString()}`;
}

export default function AdminManagementPage() {
  const currentAdmin = useAuthStore((state) => state.admin);
  const [admins, setAdmins] = useState<ManagedAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [adminAction, setAdminAction] = useState<AdminAction | null>(null);
  const requestIdRef = useRef(0);

  const fetchAdmins = useCallback(async (silent = false) => {
    const requestId = ++requestIdRef.current;
    if (!silent) setIsLoading(true);
    setLoadError(null);

    try {
      const response = await apiClient.get<ApiResponse<ManagedAdmin[]>, ApiResponse<ManagedAdmin[]>>('/auth');
      if (!response.success) throw new Error(response.message || 'Failed to load administrator accounts');
      if (requestId !== requestIdRef.current) return;
      setAdmins(response.data);
    } catch (error: unknown) {
      if (requestId !== requestIdRef.current) return;
      const message = getErrorMessage(error, 'Failed to load administrator accounts');
      setLoadError(message);
      if (silent) toast.error(message);
    } finally {
      if (requestId === requestIdRef.current && !silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentAdmin?.role === 'super_admin') {
      void fetchAdmins();
    } else {
      setIsLoading(false);
    }

    return () => {
      requestIdRef.current += 1;
    };
  }, [currentAdmin?.role, fetchAdmins]);

  const updateRole = async (admin: ManagedAdmin, role: AdminRole) => {
    if (adminAction || role === admin.role || admin._id === currentAdmin?._id) return;

    const description = role === 'viewer'
      ? `Remove ${admin.name}'s admin access? Their current sessions will end.`
      : role === 'super_admin'
        ? `Promote ${admin.name} to Super Admin? They will be able to manage every administrator.`
        : admin.role === 'super_admin'
          ? `Demote ${admin.name} to Admin? Their current sessions will end.`
          : `Grant ${admin.name} Admin access?`;

    if (!window.confirm(description)) return;

    setAdminAction({ adminId: admin._id, role });
    try {
      const response = await apiClient.patch<ApiResponse<ManagedAdmin>, ApiResponse<ManagedAdmin>>(
        `/auth/admins/${encodeURIComponent(admin._id)}/role`,
        { role },
      );
      if (!response.success) throw new Error(response.message || 'Failed to update administrator access');

      setAdmins((current) => current.map((item) => (
        item._id === admin._id ? { ...item, ...response.data } : item
      )));
      toast.success(response.message || `${admin.name}'s access was updated`);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to update administrator access'));
    } finally {
      setAdminAction(null);
    }
  };

  if (isLoading) return <PageSpinner />;

  if (currentAdmin?.role !== 'super_admin') {
    return (
      <div className="space-y-8 animate-reveal">
        <div>
          <h1 className="text-4xl font-black italic uppercase leading-none tracking-tighter text-white md:text-5xl">Admins.</h1>
          <p className="mt-2 text-[10px] font-black uppercase italic tracking-[0.3em] text-neutral-500">Administrator Access</p>
        </div>
        <div role="alert" className="rounded-[28px] border border-red-500/20 bg-red-500/10 p-8 text-sm font-bold text-red-300 sm:rounded-[40px]">
          Only a Super Admin can view or change administrator access.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 md:space-y-10 animate-reveal">
      <div>
        <h1 className="text-4xl font-black italic uppercase leading-none tracking-tighter text-white md:text-5xl">Admins.</h1>
        <p className="mt-2 text-[10px] font-black uppercase italic tracking-[0.3em] text-neutral-500">Manage Portal Access</p>
      </div>

      <section aria-labelledby="role-guide-heading" className="grid gap-3 md:grid-cols-3">
        <h2 id="role-guide-heading" className="sr-only">Administrator role guide</h2>
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
          <div className="flex items-center gap-3 text-neutral-400">
            <ShieldOff className="h-4 w-4" />
            <h3 className="text-[10px] font-black uppercase tracking-widest">Viewer</h3>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-neutral-600">Signed-in account without access to the admin portal.</p>
        </div>
        <div className="rounded-2xl border border-blue-500/10 bg-blue-500/5 p-5">
          <div className="flex items-center gap-3 text-blue-400">
            <ShieldCheck className="h-4 w-4" />
            <h3 className="text-[10px] font-black uppercase tracking-widest">Admin</h3>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-neutral-600">Can manage competition content, teams, players, venues, and fixtures.</p>
        </div>
        <div className="rounded-2xl border border-amber-500/10 bg-amber-500/5 p-5">
          <div className="flex items-center gap-3 text-amber-300">
            <Crown className="h-4 w-4" />
            <h3 className="text-[10px] font-black uppercase tracking-widest">Super Admin</h3>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-neutral-600">Has full Admin access and can safely grant or revoke staff access.</p>
        </div>
      </section>

      {loadError ? (
        <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400 sm:flex-row sm:items-center sm:justify-between">
          <span>{loadError}</span>
          <button type="button" onClick={() => void fetchAdmins()} className="text-[10px] font-black uppercase tracking-widest text-white underline underline-offset-4">Try Again</button>
        </div>
      ) : null}

      <section aria-labelledby="admin-accounts-heading" className="overflow-hidden rounded-[28px] border border-white/5 bg-white/[0.01] shadow-2xl backdrop-blur-3xl sm:rounded-[40px]">
        <div className="flex flex-col gap-2 border-b border-white/5 p-5 sm:p-8">
          <h2 id="admin-accounts-heading" className="text-xl font-black uppercase italic tracking-tight text-white">Administrator Accounts</h2>
          <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-600">Access changes end the affected account&apos;s active sessions.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-5 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 sm:px-8">Account</th>
                <th className="px-5 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 sm:px-8">Role</th>
                <th className="px-5 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 sm:px-8">Status</th>
                <th className="px-5 py-5 text-right text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 sm:px-8">Safe Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {admins.map((admin) => {
                const isCurrentAccount = admin._id === currentAdmin._id;
                const isBusy = adminAction?.adminId === admin._id;
                const controlsLocked = Boolean(adminAction) || isCurrentAccount;
                return (
                  <tr key={admin._id} className="transition-colors hover:bg-white/[0.02]">
                    <td className="px-5 py-6 sm:px-8">
                      <p className="text-sm font-bold text-white">
                        {admin.name}
                        {isCurrentAccount ? <span className="ml-2 text-[9px] font-black uppercase tracking-widest text-blue-400">You</span> : null}
                      </p>
                      <p className="mt-1 break-all text-[10px] font-bold text-neutral-600">{admin.email}</p>
                    </td>
                    <td className="px-5 py-6 sm:px-8">
                      <span className={clsx('inline-flex rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-widest', ROLE_STYLES[admin.role])}>
                        {ROLE_LABELS[admin.role]}
                      </span>
                    </td>
                    <td className="px-5 py-6 sm:px-8">
                      <p className={clsx('text-[10px] font-black uppercase tracking-widest', admin.isVerified ? 'text-emerald-400' : 'text-amber-300')}>
                        {admin.isVerified ? 'Verified' : 'Pending verification'}
                      </p>
                      <p className="mt-1 text-[9px] font-bold text-neutral-600">{describeLastLogin(admin.lastLogin)}</p>
                    </td>
                    <td className="px-5 py-6 text-right sm:px-8">
                      {isCurrentAccount ? (
                        <span className="text-[9px] font-black uppercase tracking-widest text-neutral-600">Protected current account</span>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          {admin.role === 'viewer' ? (
                            <button
                              type="button"
                              onClick={() => void updateRole(admin, 'admin')}
                              disabled={controlsLocked}
                              className="flex h-10 items-center gap-2 rounded-xl bg-emerald-500/10 px-4 text-[9px] font-black uppercase tracking-widest text-emerald-400 transition-colors hover:bg-emerald-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isBusy && adminAction.role === 'admin' ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <UserCheck className="h-3.5 w-3.5" />}
                              {admin.isVerified ? 'Grant Admin' : 'Verify & Grant'}
                            </button>
                          ) : null}

                          {admin.role === 'admin' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => void updateRole(admin, 'super_admin')}
                                disabled={controlsLocked}
                                className="flex h-10 items-center gap-2 rounded-xl bg-amber-500/10 px-4 text-[9px] font-black uppercase tracking-widest text-amber-300 transition-colors hover:bg-amber-500 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {isBusy && adminAction.role === 'super_admin' ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Crown className="h-3.5 w-3.5" />}
                                Make Super
                              </button>
                              <button
                                type="button"
                                onClick={() => void updateRole(admin, 'viewer')}
                                disabled={controlsLocked}
                                className="flex h-10 items-center gap-2 rounded-xl border border-red-500/20 px-4 text-[9px] font-black uppercase tracking-widest text-red-400 transition-colors hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {isBusy && adminAction.role === 'viewer' ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <ShieldOff className="h-3.5 w-3.5" />}
                                Revoke
                              </button>
                            </>
                          ) : null}

                          {admin.role === 'super_admin' ? (
                            <button
                              type="button"
                              onClick={() => void updateRole(admin, 'admin')}
                              disabled={controlsLocked}
                              className="flex h-10 items-center gap-2 rounded-xl border border-white/10 px-4 text-[9px] font-black uppercase tracking-widest text-neutral-400 transition-colors hover:border-blue-500/40 hover:text-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isBusy && adminAction.role === 'admin' ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                              Make Admin
                            </button>
                          ) : null}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!loadError && admins.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center text-[10px] font-black uppercase italic tracking-[0.3em] text-neutral-600">No administrator accounts found</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
