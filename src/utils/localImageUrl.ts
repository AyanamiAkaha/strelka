/**
 * Browsers block file:// URLs in <img> when the page is served over http(s).
 * In dev we proxy file:// through the Vite server at /local-image?path=...
 * so images load. Use this as the img src when the raw URL is file://.
 */
export function localImageSrc(url: string | null): string {
  if (url == null || url === '') return ''
  if (url.startsWith('file://')) {
    const path = url.slice(7) // strip "file://"
    return `${typeof window !== 'undefined' ? window.location.origin : ''}/local-image?path=${encodeURIComponent(path)}`
  }
  return url
}
