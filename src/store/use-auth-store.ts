import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  admin: any | null;
  accessToken: string | null;
  refreshToken: string | null;
  setAuth: (admin: any, accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      admin: null,
      accessToken: null,
      refreshToken: null,
      setAuth: (admin, accessToken, refreshToken) =>
        set({ admin, accessToken, refreshToken }),
      logout: () => set({ admin: null, accessToken: null, refreshToken: null }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
