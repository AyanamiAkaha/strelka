import type { Plugin } from 'vite'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Dev-only plugin: serve local files at GET /local-image?path=<encoded path>
 * so <img> can display local images (browsers block file:// from http(s) pages).
 *
 * Supports absolute and relative paths (relative resolved against cwd).
 * Set LOCAL_IMAGE_BASE to restrict (e.g. /home/user/pics);
 * if unset, any path is allowed (dev only).
 */
export function localImagePlugin(): Plugin {
  const allowedBase = process.env.LOCAL_IMAGE_BASE ?? ''

  return {
    name: 'local-image',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith('/local-image?')) {
          const u = new URL(req.url, 'http://x')
          const raw = u.searchParams.get('path')
          if (!raw) {
            res.statusCode = 400
            res.end('missing path')
            return
          }
          let filePath: string
          try {
            // resolve() handles both absolute and relative paths (relative → cwd-based)
            filePath = path.resolve(decodeURIComponent(raw))
          } catch {
            res.statusCode = 400
            res.end('invalid path')
            return
          }
          if (allowedBase && !filePath.startsWith(path.resolve(allowedBase))) {
            res.statusCode = 403
            res.end('path outside allowed base')
            return
          }
          if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
            res.statusCode = 404
            res.end('not found')
            return
          }
          const ext = path.extname(filePath).toLowerCase()
          const types: Record<string, string> = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.svg': 'image/svg+xml',
          }
          res.setHeader('Content-Type', types[ext] ?? 'application/octet-stream')
          res.setHeader('Cache-Control', 'no-cache')
          fs.createReadStream(filePath).pipe(res)
          return
        }
        next()
      })
    },
  }
}
