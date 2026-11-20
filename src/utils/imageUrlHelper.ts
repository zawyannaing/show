/**
 * Transforms Supabase Storage URLs into high-speed CDN proxy URLs.
 * In Myanmar, direct *.supabase.co connections are frequently blocked or throttled by mobile ISPs.
 * Routing through /api/storage/ enables Cloudflare CDN caching and 100% reliable image delivery across all devices.
 */
export function getOptimizedImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Base64 data URLs or local relative paths stay as-is
  if (trimmed.startsWith('data:') || trimmed.startsWith('/')) {
    return trimmed;
  }

  // Rewrite Supabase public storage URLs to our high-speed server proxy
  if (trimmed.includes('.supabase.co/storage/v1/object/public/')) {
    const pathPart = trimmed.split('.supabase.co/storage/v1/object/public/')[1];
    return `/api/storage/${pathPart}`;
  }

  return trimmed;
}
