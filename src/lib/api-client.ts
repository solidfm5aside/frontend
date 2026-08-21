import axios from 'axios';
import { useAuthStore } from '@/store/use-auth-store';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

const apiClient = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
});

let refreshRequest: Promise<void> | null = null;

const redirectToLogin = () => {
  if (typeof window === 'undefined' || window.location.pathname === '/login') return;

  const loginUrl = new URL('/login', window.location.origin);
  if (window.location.pathname.startsWith('/admin/')) {
    loginUrl.searchParams.set('from', window.location.pathname);
  }
  window.location.assign(loginUrl.toString());
};

apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || (
      error.request
        ? 'Unable to reach the server. Please try again.'
        : 'An unexpected error occurred'
    );
    const request = error.config as (typeof error.config & { _retry?: boolean }) | undefined;
    const requestUrl = request?.url || '';
    const isAuthenticationAttempt = [
      '/auth/login',
      '/auth/register',
      '/auth/refresh-token',
      '/auth/forgot-password',
      '/auth/reset-password',
    ].some((path) => requestUrl.includes(path));

    if (status === 401 && request && !request._retry && !isAuthenticationAttempt) {
      const { refreshSession, logout } = useAuthStore.getState();

      request._retry = true;

      try {
        if (!refreshRequest) {
          refreshRequest = axios
            .post(
              `${apiBaseUrl}/auth/refresh-token`,
              {},
              { withCredentials: true }
            )
            .then((response) => {
              if (!response.data?.success) {
                throw new Error('The session could not be refreshed');
              }
              refreshSession();
            })
            .finally(() => {
              refreshRequest = null;
            });
        }

        await refreshRequest;
        return apiClient(request);
      } catch {
        logout();
        redirectToLogin();
      }
    }

    if (error instanceof Error) error.message = message;
    return Promise.reject(error);
  }
);

export default apiClient;
