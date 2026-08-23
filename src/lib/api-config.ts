/**
 * Browser API traffic must stay on the frontend origin so Safari can retain
 * the backend's Secure, HttpOnly session cookies. `next.config.ts` proxies
 * this exact path to the backend and preserves the refresh-cookie path.
 */
export const BROWSER_API_BASE_URL = '/api/v1';
