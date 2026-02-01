# External Integrations

**Analysis Date:** 2026-02-01

## APIs & External Services

**None**

This is a purely client-side application with no external API calls or services.

**Potential Future Integrations (commented out):**
- Data loading via `fetch()` in `src/core/DataProvider.ts` (example code present but commented)
- Shader file loading via `fetch()` in `src/core/ShaderManager.ts` (optional feature)

## Data Storage

**Databases:**
- None - Data is generated procedurally in-memory via `src/core/DataProvider.ts`

**File Storage:**
- Local filesystem only
- Static assets served from project directory (currently no external file storage)

**Caching:**
- Browser only - No server-side caching
- Shader program caching in-memory via `ShaderManager.shaderCache` (client-side Map)

## Authentication & Identity

**Auth Provider:**
- None - No user authentication system

**Implementation:**
- Not applicable - Single-user application with no account system

## Monitoring & Observability

**Error Tracking:**
- None - Uses console.log/error for debugging
- Built-in debug info display in `src/components/DebugInfo.vue`

**Logs:**
- Console logging throughout application
- WebGL debug info displayed on screen:
  - FPS counter
  - Camera position and rotation
  - Point count
- No external logging service

## CI/CD & Deployment

**Hosting:**
- Not configured - Can be deployed to any static hosting service

**CI Pipeline:**
- None - No `.github/` or CI configuration present
- No automated testing or deployment

**Build Output:**
- Static files generated via `yarn build` to `dist/` directory
- Deployable to Vercel, Netlify, GitHub Pages, or any static host

## Environment Configuration

**Required env vars:**
- None

**Optional env vars:**
- None

**Secrets location:**
- Not applicable - No secrets or API keys required

**Configuration:**
- All configuration in `vite.config.ts`
- No environment-specific configurations
- Settings hardcoded or via `src/composables/settings.ts` reactive state

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

**Local Event System:**
- Vue component events (not webhooks):
  - `webgl-ready` - WebGL context initialized
  - `webgl-error` - WebGL initialization failed
  - `mouse-move` - Mouse drag events for camera control
  - `mouse-wheel` - Scroll events for zoom
  - `key-event` - Keyboard input for movement

## Browser APIs Used

**WebGL:**
- Native WebGL 2.0 API (with WebGL 1.0 fallback)
- Used via `canvas.getContext('webgl2')` in `src/components/WebGLCanvas.vue`

**Graphics APIs:**
- WebGL 2.0 (preferred) or WebGL 1.0
- No Three.js, Babylon.js, or other 3D libraries
- Direct GPU access for rendering point clusters

**Other Browser APIs:**
- `requestAnimationFrame` - Animation loop in `src/views/WebGLPlayground.vue`
- `ResizeObserver` - Canvas resizing in `src/components/WebGLCanvas.vue`
- `fetch()` - Optional file loading (commented out examples)

## External Dependencies (Runtime)

**CDN Dependencies:**
- None - All dependencies bundled locally

**Third-Party Scripts:**
- None - No external script tags or CDNs

**Browser Polyfills:**
- None - Assumes modern browser with ES2020 support

---

*Integration audit: 2026-02-01*
