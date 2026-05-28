function isAbsoluteHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

export function resolveImageUrl(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null;
  if (isAbsoluteHttpUrl(imageUrl)) return imageUrl;

  const cloudfrontBase = import.meta.env.VITE_CLOUDFRONT_URL;
  if (!cloudfrontBase) return imageUrl;

  const base = cloudfrontBase.endsWith('/') ? cloudfrontBase.slice(0, -1) : cloudfrontBase;
  const path = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
  return `${base}${path}`;
}
