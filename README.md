# strelka

High-performance 3D point cloud visualization for exploring large embedding datasets with cluster highlighting and freeflight camera controls.

**Key differentiators:**

- **No Level-of-Detail** — renders all points every frame, no decimation or culling. The GPU handles it.
- **Freeflight camera** — full 6DOF quaternion-based movement (WASD + mouse look), not just orbital rotation.
- **Up to 30 million points** — tested with 100K-500K point datasets, supports up to 30M.
- **Pure WebGL** — direct WebGL API, no Three.js or Babylon.js abstractions.

## Quick Start

```bash
yarn install
yarn dev          # Opens http://localhost:3000
```

## Documentation

- **[USAGE.md](USAGE.md)** — How to use the application: controls, data formats, loading data, troubleshooting
- **[DEVELOPER.md](DEVELOPER.md)** — Architecture, code conventions, key concepts, debugging
- **[CHANGELOG.md](CHANGELOG.md)** — Version history
- **[CONTRIBUTING.md](CONTRIBUTING.md)** — How to contribute

## Tech Stack

| Layer | Technology |
|-------|------------|
| UI | Vue 3 (Composition API, `<script setup>`) |
| Language | TypeScript (strict mode) |
| Rendering | Pure WebGL / WebGL2 |
| 3D Math | gl-matrix (quaternions, matrices, vectors) |
| Data | JSON, SQLite (sql.js WebAssembly) |
| Build | Vite 5, Yarn 3 (Berry PnP) |

## Commands

```bash
yarn dev          # Dev server (auto-opens browser)
yarn build        # Production build to dist/
yarn type-check   # TypeScript validation
```

## License

BSD 3-Clause License. See [LICENSE](LICENSE).

Copyright (c) 2026, 綾波赤羽 <ayanami@akaha.today>
