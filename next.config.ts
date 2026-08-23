import type { NextConfig } from "next";

const browserApiPath = '/api/v1';
const deploymentUpstreamApiUrl = process.env.BACKEND_API_URL
  || process.env.NEXT_PUBLIC_API_URL;

if (process.env.VERCEL && !deploymentUpstreamApiUrl) {
  throw new Error('Set BACKEND_API_URL to the backend URL ending in /api/v1 before deploying');
}

const configuredUpstreamApiUrl = deploymentUpstreamApiUrl
  || 'http://localhost:5000/api/v1';

const normalizeUpstreamApiUrl = (value: string): string => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('BACKEND_API_URL must be an absolute http(s) URL ending in /api/v1');
  }

  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('BACKEND_API_URL must be an absolute http(s) URL without embedded credentials');
  }

  const pathname = url.pathname.replace(/\/+$/, '');
  if (pathname !== browserApiPath || url.search || url.hash) {
    throw new Error('BACKEND_API_URL must end exactly in /api/v1 and cannot include a query or hash');
  }

  url.pathname = pathname;
  return url.toString().replace(/\/$/, '');
};

const upstreamApiUrl = normalizeUpstreamApiUrl(configuredUpstreamApiUrl);

const nextConfig: NextConfig = {
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: `${browserApiPath}/:path*`,
        destination: `${upstreamApiUrl}/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
};

export default nextConfig;
