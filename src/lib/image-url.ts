const OPTIMIZED_IMAGE_HOSTS = new Set(['res.cloudinary.com', 'ui-avatars.com']);

/**
 * Next/Image rejects remote hosts that are not explicitly configured. Keep
 * persisted legacy data from crashing a page while still allowing local
 * application assets and the configured image services.
 */
export const isOptimizableImageUrl = (value?: string): value is string => {
  if (!value) return false;
  if (value.startsWith('/')) return true;

  try {
    const url = new URL(value);
    return url.protocol === 'https:' && OPTIMIZED_IMAGE_HOSTS.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
};
