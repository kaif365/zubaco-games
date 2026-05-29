/**
 * Resolves the CloudFront URL for a given asset path.
 * The path should be relative to the 'overlays' folder content.
 * 
 * @param path - Relative path (e.g., "stage-1/Stage_1.png" or "end_overlay.png")
 * @returns Full CloudFront URL
 */
export const getCloudFrontAssetUrl = (path: string): string => {
  const baseUrl = import.meta.env.VITE_CLOUDFRONT_URL;
  
  if (!baseUrl) {
    // Fallback or warning if URL is not configured
    if (import.meta.env.DEV) {
      console.warn('VITE_CLOUDFRONT_URL is not defined in environment variables.');
    }
    return path; 
  }

  // Ensure there's a trailing slash on baseUrl and no leading slash on path
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;

  return `${normalizedBase}/${normalizedPath}`;
};
