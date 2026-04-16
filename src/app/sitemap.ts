import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://solidfm5aside.com';
  
  const routes = [
    '',
    '/fixtures',
    '/results',
    '/standings',
    '/bracket',
    '/gallery',
    '/register-team',
    '/login',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  return routes;
}
