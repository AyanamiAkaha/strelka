# Coding Conventions

**Analysis Date:** 2026-02-01

## Naming Patterns

**Files:**
- Classes: PascalCase (e.g., `Camera.ts`, `ShaderManager.ts`, `DataProvider.ts`)
- Components: PascalCase with `.vue` extension (e.g., `WebGLCanvas.vue`, `ControlsOverlay.vue`, `DebugInfo.vue`)
- Composables: camelCase (e.g., `settings.ts`)
- Types: PascalCase (e.g., `Vec3` class files)

**Functions:**
- camelCase for all function and method names
- Examples: `add`, `subtract`, `normalize`, `toArray`, `update`, `reset`, `handleKeyEvent`, `getShaderUniforms`

**Variables:**
- camelCase for all variables
- Private fields: camelCase with `private` modifier (e.g., `private gl: WebGL2RenderingContext`)
- Public fields: camelCase with `public` modifier (e.g., `public position: Vec3`)
- Constants: camelCase (e.g., `cScale`, `ppc`, `clusterCenters`)

**Types:**
- Interfaces: PascalCase (e.g., `ShaderSource`, `CompiledShader`, `CameraControls`, `PointData`)
- Classes: PascalCase (e.g., `Vec3`, `Camera`, `ShaderManager`, `DataProvider`)
- Type aliases: PascalCase (not commonly used in this codebase)

## Code Style

**Formatting:**
- No explicit Prettier configuration detected
- Indentation appears to be 2 spaces
- Semicolons are consistently used
- Trailing commas in multi-line arrays/objects

**Linting:**
- ESLint configured in `package.json` but no config file found
- Lint script: `eslint . --ext .vue,.js,.jsx,.cjs,.mjs,.ts,.tsx,.cts,.mts --fix --ignore-path .gitignore`
- TypeScript strict mode enabled in `tsconfig.json`
- Additional strict flags: `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`

## Import Organization

**Order:**
1. External framework imports (Vue, WebGL types)
2. Internal core imports (`@/core/`)
3. Component imports (`@/components/`)
4. Composable imports (`@/composables/`)

**Path Aliases:**
- `@/*` → `src/*`
- Configured in `tsconfig.json` and `vite.config.ts`
- Example: `import { Camera } from '@/core/Camera'`
- Example: `import WebGLCanvas from '@/components/WebGLCanvas.vue'`

## Error Handling

**Patterns:**
- Try-catch blocks with error re-throwing after logging
- Throw descriptive `Error` objects with context
- `console.error()` for error logging
- WebGL error checking: `gl.getError()` compared to `gl.NO_ERROR`

**Example from `src/core/ShaderManager.ts`:**
```typescript
try {
  // operation
} catch (error) {
  console.error('Error loading shaders:', error)
  throw error
}

if (!program) {
  throw new Error('Failed to create shader program')
}
```

## Logging

**Framework:** `console` API (no structured logging framework)

**Patterns:**
- `console.log()` for initialization and important events
- `console.error()` for error conditions
- `console.log()` with objects for WebGL initialization details
- No debug/trace/info levels - all logs use standard log/error

**Examples from codebase:**
```typescript
console.log('Vue app starting...')
console.log('WebGL initialized:', {
  version: gl.value.getParameter(gl.value.VERSION),
  vendor: gl.value.getParameter(gl.value.VENDOR),
  renderer: gl.value.getParameter(gl.value.RENDERER)
})
console.error('WebGL error before draw:', error)
```

## Comments

**When to Comment:**
- JSDoc-style comments for all public methods, functions, and interfaces
- Inline comments for complex WebGL operations
- Explanatory comments for GPU optimization decisions

**JSDoc/TSDoc:**
- Used consistently on public methods
- Includes `@param` and `@returns` tags
- Example from `src/core/Camera.ts`:
```typescript
/**
 * Handle keyboard input
 */
handleKeyEvent(key: string, pressed: boolean): void
```

## Function Design

**Size:**
- Methods generally 10-50 lines
- Large methods broken into smaller private helpers
- Shader code as template strings can be 60+ lines

**Parameters:**
- Typically 1-5 parameters
- Objects for multiple related parameters (e.g., `{ deltaX, deltaY, buttons }`)
- Optional parameters with TypeScript syntax

**Return Values:**
- Explicit return types required (TypeScript strict mode)
- `void` for methods with side effects
- Objects for multiple return values
- Examples: `Vec3`, `PointData`, `ShaderSource`, `{ position, rotation, distance }`

## Module Design

**Exports:**
- Named exports for classes, interfaces, and functions
- One primary export per file (class or collection of related functions)
- Composables use exported `ref` variables
- Example: `export class Vec3`, `export interface PointData`

**Barrel Files:**
- Not used in this codebase
- Direct imports from source files
- Path alias `@/core/` used for core module grouping

---

*Convention analysis: 2026-02-01*
