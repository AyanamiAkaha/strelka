# Changelog

All notable changes to this project are documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/).

## [1.3.0] - 2026-03-03

### Added
- Gamepad support for camera control (standard mapping gamepads)
- Left stick: move left/right/up/down, right stick: look yaw/pitch
- LT/RT: move backward/forward with analog sensitivity
- LB: speed boost, RB: center selection mode
- D-pad: cluster navigation and threshold adjustment
- A/B buttons: decrease/increase look speed
- X/Y buttons: increase/decrease smoothing
- L3: reset camera position
- Gamepad selection modal with button mapping diagram
- Gamepad debug info in DebugInfo overlay

## [1.2.0] - 2026-02-06

### Added
- Point hover detection via GPU-based distance thresholds (camera distance + cursor distance)
- Screen-space overlay displaying tag and image metadata for hovered points
- Optional `tag` and `image` columns in JSON and SQLite data formats
- Image Path Base setting for prepending a base path to image URLs
- World-to-screen coordinate projection in Camera class
- Scroll wheel adjusts hover detection distance threshold
- Edge clamping for overlay positioning near screen borders

### Fixed
- Hover threshold calculation after JSON data loading
- Shader cursor position passing (all 3 components)
- Overlay edge clamping preserves gap between overlay and point

## [1.1.0] - 2026-02-02

### Changed
- Camera rotation migrated from Euler angles to quaternions (gl-matrix)
- Eliminates gimbal lock at all rotation angles
- Camera movement uses quaternion-derived local coordinate frame

### Fixed
- Camera rotation axes inverted (negated pitch/yaw delta)
- Rotation sensitivity tuned (reduced from 0.002 to 0.0014)

## [1.0.0] - 2026-02-04

### Added
- JSON data loading with validation and error display
- SQLite data loading via sql.js WebAssembly
- SQLite table selection UI for multi-table databases
- Data source toggle (Generate / Load) with camera reset
- Cluster highlighting with interactive slider (None / Noise / Cluster N)
- Collapsible error panel with auto-dismiss on successful load
- GPU memory management (buffer cleanup on data switch and unmount)
- Loading overlay with contextual messages
- Drag-and-drop file loading
- Data validation with 30M point limit enforcement

### Fixed
- GPU memory leaks on data source switching
- Duplicate data loading on file selection
- Render loop guard for zero-point datasets

## [0.1.0] - 2026-02-01

### Added
- Initial WebGL point cloud rendering with additive blending
- Procedural spiral cluster data generation
- FPS camera with WASD movement and mouse look
- Shader management with embedded GLSL shaders
- Vue 3 + TypeScript application scaffold
- Debug info overlay (FPS, camera state)
- Controls overlay with generation settings
