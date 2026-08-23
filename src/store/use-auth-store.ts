import { create } from 'zustand';
import { AuthState } from '@/types';
import { BROWSER_API_BASE_URL } from '@/lib/api-config';

const clearPersistedAuthState = () => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem('auth-storage');
  } catch {
    // HttpOnly-cookie authentication must still work when Safari storage is unavailable.
  }
};

const clearLegacyTokenCookie = () => {
  if (typeof document === 'undefined') return;
  document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
};

const setSessionMarker = () => {
  if (typeof document === 'undefined') return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `admin_session=1; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax${secure}`;
};

const clearLegacySessionMarkers = () => {
  if (typeof document === 'undefined') return;
  document.cookie = 'admin_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
  document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
};

clearPersistedAuthState();
clearLegacyTokenCookie();

export const useAuthStore = create<AuthState>()(
  (set) => ({
    admin: null,
    // The HttpOnly cookie is authoritative; no browser storage hydration is required.
    hasHydrated: true,
    setAuth: (admin) => {
      setSessionMarker();
      set({ admin, hasHydrated: true });
    },
    refreshSession: () => {
      setSessionMarker();
      set({ hasHydrated: true });
    },
    setHasHydrated: (val) => set({ hasHydrated: val }),
    logout: () => {
      clearPersistedAuthState();
      clearLegacySessionMarkers();
      set({ admin: null });

      if (typeof window !== 'undefined') {
        void fetch(`${BROWSER_API_BASE_URL}/auth/logout`, {
          method: 'POST',
          credentials: 'include',
          keepalive: true,
        }).catch(() => undefined);
      }
    }
  })
);
