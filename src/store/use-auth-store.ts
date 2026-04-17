import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthState } from '@/types';

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      admin: null,
      accessToken: null,
      refreshToken: null,
      hasHydrated: false,
      setAuth: (admin, accessToken, refreshToken) => {
        // Set cookie for middleware (server-side)
        if (typeof document !== 'undefined') {
          document.cookie = `token=${accessToken}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
        }
        set({ admin, accessToken, refreshToken, hasHydrated: true });
      },
      setHasHydrated: (val) => set({ hasHydrated: val }),
      logout: () => {
        // Remove cookie for middleware
        if (typeof document !== 'undefined') {
          document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        }
        set({ admin: null, accessToken: null, refreshToken: null });
      },
    }),
    {
      name: 'auth-storage',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
