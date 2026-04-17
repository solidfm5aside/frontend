export interface Admin {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'super_admin';
  isVerified: boolean;
}

export interface AuthState {
  admin: Admin | null;
  accessToken: string | null;
  refreshToken: string | null;
  hasHydrated: boolean;
  setAuth: (admin: Admin, accessToken: string, refreshToken: string) => void;
  setHasHydrated: (val: boolean) => void;
  logout: () => void;
}
