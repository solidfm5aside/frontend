import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthState } from '@/types';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

const setSessionMarker = () => {
  if (typeof document === 'undefined') return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `admin_session=1; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax${secure}`;
};

const clearSessionMarkers = () => {
  if (typeof document === 'undefined') return;
  document.cookie = 'admin_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
  document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      admin: null,
      hasHydrated: false,
      setAuth: (admin) => {
        setSessionMarker();
        set({ admin, hasHydrated: true });
      },
      refreshSession: () => {
        setSessionMarker();
      },
      setHasHydrated: (val) => set({ hasHydrated: val }),
      logout: () => {
        clearSessionMarkers();
        set({ admin: null });

        if (typeof window !== 'undefined') {
          void fetch(`${apiBaseUrl}/auth/logout`, {
            method: 'POST',
            credentials: 'include',
            keepalive: true,
          }).catch(() => undefined);
        }
      },
    }),
    {
      name: 'auth-storage',
      version: 3,
      migrate: (persistedState) => ({
        admin: (persistedState as Partial<AuthState> | undefined)?.admin ?? null,
      }),
      partialize: (state) => ({ admin: state.admin }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
