export interface Admin {
  _id: string;
  name: string;
  email: string;
  role: 'viewer' | 'admin' | 'super_admin';
  isVerified: boolean;
}

export interface AuthState {
  admin: Admin | null;
  hasHydrated: boolean;
  setAuth: (admin: Admin) => void;
  refreshSession: () => void;
  setHasHydrated: (val: boolean) => void;
  logout: () => void;
}
