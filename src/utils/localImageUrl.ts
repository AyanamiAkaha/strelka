/**
 * Resolve image URLs for display.
 *
 * - http:// / https:// → pass through unchanged
 * - file://             → strip prefix, proxy via /local-image?path=...
 * - everything else     → treat as local path, proxy via /local-image?path=...
 *
 * The /local-image proxy is provided by local-image-plugin.ts (Vite dev server
 * middleware). In production builds the proxy does not exist — local paths will 404.
 */
export function localImageSrc(url: string | null): string {
  if (url == null || url === '') return ''
  // Pass through remote URLs
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  // Strip file:// prefix if present
  const localPath = url.startsWith('file://') ? url.slice(7) : url
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}/local-image?path=${encodeURIComponent(localPath)}`
}
