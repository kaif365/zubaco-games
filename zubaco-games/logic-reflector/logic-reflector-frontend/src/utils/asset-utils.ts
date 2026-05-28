export const getCloudFrontAssetUrl = (path: string): string => {
  const baseUrl = import.meta.env.VITE_CLOUDFRONT_URL || import.meta.env.VITE_CDN_BASE_URL;
  if (!baseUrl) {
    if (import.meta.env.DEV) {
      console.warn('VITE_CLOUDFRONT_URL or VITE_CDN_BASE_URL is not defined');
    }
    return path;
  }
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  return `${normalizedBase}/${normalizedPath}`;
};
