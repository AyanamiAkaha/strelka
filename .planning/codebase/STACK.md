# Technology Stack

**Analysis Date:** 2026-02-01

## Languages

**Primary:**
- TypeScript 5.3.0 - All source code in `src/`
- GLSL (OpenGL Shading Language) - Embedded shaders in `src/core/ShaderManager.ts`

**Secondary:**
- Vue Single File Components (.vue) - Components in `src/components/` and `src/views/`
- HTML/CSS - Entry point `index.html` and styles in `src/public/style.css`

## Runtime

**Environment:**
- Node.js v24.11.1 - Development runtime
- Modern browsers (Chrome, Firefox, Safari, Edge) - WebGL 1.0+ support required

**Package Manager:**
- Yarn 3.8.7
- Lockfile: `yarn.lock` (present)
- Configuration: `.yarnrc.yml`

## Frameworks

**Core:**
- Vue 3.3.8 - Reactive UI framework, Composition API with `<script setup>` syntax
- Vite 5.0.0 - Build tool and dev server with HMR

**Testing:**
- Not configured (no test framework present)

**Build/Dev:**
- @vitejs/plugin-vue 4.5.0 - Vue 3 SFC compilation for Vite
- TypeScript ~5.3.0 - Static type checking
- vue-tsc 1.8.22 - Vue-specific type checking

## Key Dependencies

**Critical:**
- Vue 3.3.8 - Core application framework, used throughout all components
- @vitejs/plugin-vue 4.5.0 - Enables Vue SFC support in Vite build

**Infrastructure:**
- Vite 5.0.0 - Build tool, dev server, module bundler
- TypeScript 5.3.0 - Type system and compiler
- vue-tsc 1.8.22 - Vue component type validation

**Notable Absence:**
- No 3D graphics libraries (Three.js, Babylon.js, etc.)
- No external WebGL abstractions - pure WebGL API usage

## Configuration

**Environment:**
- No environment variables required (`.env` files not present)
- Configured via `vite.config.ts`

**Build:**
- `vite.config.ts` - Vite configuration
- `tsconfig.json` - TypeScript compiler configuration
- `tsconfig.node.json` - TypeScript config for Node scripts
- `.yarnrc.yml` - Yarn package manager configuration

**TypeScript Config Highlights:**
- Target: ES2020
- Module: ESNext
- Strict mode enabled
- Path alias `@/*` → `src/*`
- Libs: ES2020, DOM, DOM.Iterable

**Vite Config Highlights:**
- Dev server port: 3000
- Auto-open browser on start
- Assets include: `.glsl`, `.vert`, `.frag` files

## Platform Requirements

**Development:**
- Node.js v24.11.1+ (or compatible version)
- Yarn 3.8.7+ (or npm - package.json compatible)
- Modern browser with WebGL 1.0+ support

**Production:**
- Static files output to `dist/` directory
- No server-side processing required
- Can be deployed to any static hosting (Vercel, Netlify, GitHub Pages, etc.)
- Browser requirements: WebGL 1.0+ (available in all modern browsers)

---

*Stack analysis: 2026-02-01*
