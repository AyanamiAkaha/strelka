# WebGL Vue Playground# WebGL 3D Point Clusters Tutorial



A Vue 3 + TypeScript boilerplate for WebGL experimentation and learning. Designed for experienced developers who want to explore WebGL fundamentals without library abstractions.A comprehensive tutorial example demonstrating core WebGL concepts through rendering animated clusters of points in 3D space. This example is designed for experienced programmers who want to learn WebGL fundamentals without external libraries.



## Features## Overview



- **Pure WebGL**: Direct WebGL API usage, no graphics librariesThis tutorial covers essential WebGL concepts:

- **Vue 3 + TypeScript**: Modern frontend stack with type safety

- **Shader Management**: Load shaders from server or embed in code- **WebGL Context Initialization**: Setting up the rendering context and configuring basic settings

- **FPS Camera**: WASD movement with mouse look controls- **Shader Programming**: Writing and compiling vertex and fragment shaders

- **Matrix Math**: Complete 3D math utilities for transformations- **3D Transformations**: Model-View-Projection matrices for 3D rendering

- **Hot Reload**: Vite development server with instant updates- **Buffer Management**: Efficiently uploading and managing vertex data on the GPU

- **Extensible**: Clean architecture for adding your own WebGL experiments- **Interactive Camera**: Mouse-controlled orbital camera with zoom

- **Point Rendering**: Techniques for rendering and animating point primitives

## Project Structure

## File Structure

```

src/```

├── components/          # Vue componentswebgl-playground/

│   ├── WebGLCanvas.vue     # Main canvas with WebGL context├── index.html          # HTML structure with embedded shaders

│   ├── ControlsOverlay.vue # Controls help overlay├── main.js             # Complete WebGL application

│   └── DebugInfo.vue       # Real-time debug information└── README.md           # This documentation

├── core/               # Core WebGL utilities```

│   ├── Camera.ts          # FPS camera with WASD controls

│   ├── ShaderManager.ts   # Shader loading and compilation## Key WebGL Concepts Demonstrated

│   ├── DataProvider.ts    # Point data interface (implement your own)

│   └── Math.ts           # Matrix and vector math utilities### 1. WebGL Context and Setup

├── views/              # Main application views

│   └── WebGLPlayground.vue # Main playground view```javascript

└── shaders/            # GLSL shader files (optional)// Get WebGL context with fallback

```this.gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl');



## Getting Started// Enable depth testing and blending

this.gl.enable(this.gl.DEPTH_TEST);

1. **Install dependencies:**this.gl.enable(this.gl.BLEND);

   ```bashthis.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

   npm install```

   ```

### 2. Shader Compilation and Linking

2. **Start development server:**

   ```bashThe example demonstrates the complete shader pipeline:

   npm run dev

   ```**Vertex Shader (`#vertexShader`)**:

- Transforms 3D positions using MVP matrices

3. **Open http://localhost:3000**- Adds procedural animation based on time and cluster ID

- Passes color and cluster information to fragment shader

## Controls

**Fragment Shader (`#fragmentShader`)**:

- **Mouse**: Look around (click and drag)- Creates circular points (instead of default squares)

- **WASD**: Move camera- Applies distance-based shading for depth perception

- **Q/E**: Move up/down- Adds glow effects for visual enhancement

- **Shift**: Move faster

- **R**: Reset camera position### 3. Matrix Mathematics

- **Mouse Wheel**: Zoom (alternative movement)

Essential 3D graphics matrices implemented from scratch:

## Core Components

- **Identity Matrix**: Base transformation

### WebGL Canvas (`WebGLCanvas.vue`)- **Perspective Projection**: 3D to 2D projection with proper depth

- Initializes WebGL context (WebGL2 with WebGL1 fallback)- **Look-At Matrix**: Camera positioning and orientation

- Handles mouse and keyboard input- **Matrix Multiplication**: Combining transformations

- Manages canvas resizing and viewport

- Emits events for camera control### 4. Vertex Buffer Objects (VBOs)



### Camera System (`Camera.ts`)Efficient data management:

- FPS-style camera with full 6DOF movement

- Smooth WASD movement with momentum```javascript

- Mouse look with configurable sensitivity// Create buffers for different vertex attributes

- Matrix generation for view/projection transformsthis.buffers = {

- Zoom and reset functionality    position: this.gl.createBuffer(),    // 3D positions

    color: this.gl.createBuffer(),       // RGB colors

### Shader Management (`ShaderManager.ts`)    clusterId: this.gl.createBuffer()    // Cluster identification

- Load shaders from server files or embed in code};

- Automatic compilation with error reporting```

- Shader caching for performance

- Automatic attribute/uniform extraction### 5. Attribute and Uniform Management

- Default point rendering shaders included

- **Attributes**: Per-vertex data (position, color, cluster ID)

### Data Provider (`DataProvider.ts`)- **Uniforms**: Global shader parameters (matrices, time, point size)

- **Interface for your point data**: `([x, y, z], clusterId)`

- **Implement your own logic**: File loading, procedural generation, API calls## Scene Description

- Helper functions for color generation

- Example implementations (spiral clusters, random clusters)The scene consists of 5 colored point clusters:



## Implementing Your Data1. **Red Cluster** (center): Main focal point at origin

2. **Green Cluster**: Positioned at (3, 2, -2)

The `DataProvider.ts` is intentionally left as a stub. Implement your data loading/generation:3. **Blue Cluster**: Positioned at (-2, -1, 3)

4. **Yellow Cluster**: Positioned at (2, -3, 1)

```typescript5. **Magenta Cluster**: Positioned at (-3, 2, -1)

// In DataProvider.ts

static getPointData(): PointData {Each cluster contains 70-100 points distributed in a spherical pattern with slight color variations and procedural animation.

  // Your implementation here:

  // - Load from JSON/binary files## Controls

  // - Generate procedurally

  // - Fetch from APIs- **Mouse Drag**: Rotate camera around the scene center

  // - Read from databases- **Mouse Scroll**: Zoom in/out (2-50 units distance)

  - **R Key**: Reset camera to default position

  return {

    positions: new Float32Array([...]), // [x,y,z,x,y,z,...]## Animation Details

    clusterIds: new Float32Array([...]), // [id,id,id,...]

    count: pointCountPoints have subtle procedural animation:

  }- Vertical oscillation based on sine wave

}- Horizontal drift based on cosine wave

```- Each cluster has different animation phase

- Animation speed: 0.5 cycles per second

## Shader Loading Options

## Technical Implementation Notes

### Option 1: Embedded Shaders (Default)

```typescript### Point Rendering

const shaderSource = shaderManager.getDefaultPointShaders()- Uses `gl.POINTS` primitive type

const shader = shaderManager.createShaderProgram(shaderSource)- Point size controlled via `gl_PointSize` in vertex shader

```- Fragment shader creates circular points using `gl_PointCoord`

- Distance-based alpha and intensity for depth perception

### Option 2: Load from Server

```typescript### Camera System

// Put .vert and .frag files in public/shaders/- Orbital camera centered at world origin

const shaderSource = await shaderManager.loadShaderFromFile(- Spherical coordinate system for smooth rotation

  '/shaders/points.vert',- Constrained vertical rotation to prevent gimbal lock

  '/shaders/points.frag'- Smooth zoom with reasonable limits

)

const shader = shaderManager.createShaderProgram(shaderSource)### Performance Considerations

```- Static vertex data uploaded once to GPU

- Minimal CPU-GPU data transfer per frame

## Matrix Mathematics- Efficient matrix calculations

- Batched point rendering in single draw call

Complete 3D math utilities included:

- 4x4 Matrix operations (multiply, identity, perspective, lookAt)## Learning Progression

- 3D Vector operations (add, subtract, cross, dot, normalize)

- Perspective projection matricesThis example builds understanding in logical steps:

- Camera/view matrices

- All optimized for WebGL usage1. **Start Here**: Examine the shader code in `index.html`

2. **WebGL Setup**: Study initialization in `initWebGL()` and `initShaders()`

## Development Tips3. **Data Management**: Understand buffer creation and upload in `initBuffers()`

4. **3D Math**: Explore matrix functions for transformations

1. **Use browser DevTools**: Check console for WebGL errors and debug info5. **Rendering Loop**: Follow the complete render pipeline in `render()`

2. **Shader Debugging**: Use WebGL inspector browser extensions6. **Interaction**: See how mouse events translate to 3D camera movement

3. **Performance**: Monitor with built-in FPS counter

4. **Hot Reload**: Shaders and code update instantly during development## Extension Ideas



## Building for ProductionOnce you understand this example, try these modifications:



```bash1. **Add More Clusters**: Increase the number and variety of point clusters

npm run build2. **Different Animations**: Experiment with other mathematical functions for motion

```3. **Lighting Effects**: Add simple directional lighting calculations

4. **Point Sprites**: Use textures instead of procedural circular points

Outputs optimized static files to `dist/` directory.5. **Instanced Rendering**: Render thousands of clusters efficiently

6. **Post-Processing**: Add bloom or other screen-space effects

## WebGL Learning Resources

## Browser Compatibility

This playground gives you direct access to WebGL concepts:

- Vertex/Fragment shader pipeline- Requires WebGL 1.0 support (available in all modern browsers)

- Buffer management and vertex attributes- Tested on Chrome, Firefox, Safari, and Edge

- Uniform variables and transformations- Mobile devices supported with touch gesture mapping

- Viewport and projection matrices

- Depth testing and blending## Performance Notes

- Point/line/triangle primitives

- Renders ~425 points at 60fps on modern hardware

Perfect for learning WebGL fundamentals before moving to higher-level libraries like Three.js or Babylon.js.- GPU memory usage: <1MB for vertex data

- No external dependencies or framework overhead

## Extending the Playground- Suitable for educational use and as a starting point for more complex projects



Add your own experiments:## Debugging Tips

1. Create new shader programs for different rendering techniques

2. Implement different primitive types (lines, triangles, meshes)1. Open browser developer tools (F12) for detailed console logs

3. Add lighting models (Phong, PBR, etc.)2. Check for WebGL errors in console

4. Experiment with texture mapping3. Verify shader compilation messages

5. Add post-processing effects4. Monitor GPU performance using browser's performance tools

6. Implement instanced rendering for performance5. Use WebGL inspector extensions for deeper debugging



The architecture is designed to be minimal but extensible - add what you need without fighting the framework.---

*This tutorial demonstrates pure WebGL without any abstractions, providing a solid foundation for understanding modern 3D graphics programming.*
