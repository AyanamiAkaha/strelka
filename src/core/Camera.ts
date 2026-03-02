import { vec3, quat, mat4 } from './Math'
import { vec4 } from 'gl-matrix'

/**
 * Quaternion-based camera for 3D WebGL rendering.
 *
 * Uses gl-matrix quaternions for orientation to eliminate gimbal lock at extreme angles.
 * Movement is in local camera space (forward, right, up vectors derived from orientation),
 * not fixed world up vector.
 *
 * Coordinate system: Y-up, right-handed WebGL conventions.
 * - Y-axis points up
 * - Positive Z points out of screen (toward viewer)
 * - Positive X points right
 *
 * Implementation references:
 * - Phase 1: Euler rotation fix (CAM-01, CAM-02)
 * - Phase 1.1: Quaternion migration (CAM-03)
 *
 * @see https://glmatrix.net/docs/ for gl-matrix library
 */
export interface CameraControls {
  forward: boolean
  backward: boolean
  left: boolean
  right: boolean
  up: boolean
  down: boolean
  fast: boolean
}

/** Result of picking the point closest to the cursor in screen space. */
export type ClosestPointResult = {
  index: number
  worldPos: [number, number, number]
  screenPos: [number, number]
  distance: number
}

export class Camera {
  // Camera state
  /** Camera position in world space */
  public position: vec3
  private orientation: quat
  /** Distance from look target */
  public distance: number

  // Camera settings
  /** Base movement speed */
  public moveSpeed: number = 5.0
  /** Multiplier when shift is held */
  public fastMoveMultiplier: number = 3.0
  /** Mouse rotation sensitivity */
  public mouseSensitivity: number = 0.0014  // Reduced from 0.002 to match original speed (~30% slower)
  /** Invert Y-axis for mouse look (false = normal, true = inverted/flight-stick) */
  public invertY: boolean = false

  // Projection settings
  /** Vertical field of view in degrees */
  public fov: number = 45
  /** Near clipping plane distance */
  public near: number = 0.1
  /** Far clipping plane distance */
  public far: number = 100.0

  // Smoothing state
  /** EMA smoothing factor: 0 = instant (off), higher = smoother. Formula: 1 - exp(-factor * dt) */
  public smoothingFactor: number = 0
  private velocity: vec3
  private targetVelocity: vec3
  /** Accumulated yaw delta from mouse/gamepad (radians) */
  private pendingYaw: number = 0
  /** Accumulated pitch delta from mouse/gamepad (radians) */
  private pendingPitch: number = 0

  // Analog input from gamepad (set externally each frame)
  private analogMove: vec3
  private analogYaw: number = 0
  private analogPitch: number = 0

  // Control state
  private controls: CameraControls = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
    fast: false
  }

  constructor() {
    this.position = vec3.create()
    vec3.set(this.position, 0, 0, 10)
    this.orientation = quat.create()
    this.distance = 10
    this.velocity = vec3.create()
    this.targetVelocity = vec3.create()
    this.analogMove = vec3.create()
  }

  /**
   * Convert quaternion to Euler angles for debug display only
   *
   * @param q - Quaternion orientation
   * @returns Object with x (pitch) and y (yaw) angles in radians
   */
  private quatToEuler(q: quat): { x: number, y: number } {
    // Extract Euler angles from quaternion for display only
    const pitch = Math.asin(2 * (q[3] * q[1] - q[0] * q[2]))
    const yaw = Math.atan2(2 * (q[3] * q[0] + q[1] * q[2]),
                         1 - 2 * (q[0] * q[0] + q[1] * q[1]))
    return { x: pitch, y: yaw }
  }

  /**
   * Get debug information for camera state display
   *
   * @returns Debug info object with position (x, y, z), rotation (x, y), distance
   */
  public toDebugInfo(): { position: { x: number; y: number; z: number }; rotation: { x: number; y: number }; distance: number } {
    return {
      position: { x: this.position[0], y: this.position[1], z: this.position[2] },
      rotation: this.quatToEuler(this.orientation),
      distance: this.distance
    }
  }

  /**
   * Handle keyboard input
   *
   * @param key - Keyboard key code
   * @param pressed - Whether key is pressed (true) or released (false)
   * @returns void
   */
  handleKeyEvent(key: string, pressed: boolean): void {
    switch (key.toLowerCase()) {
      case 'w':
        this.controls.forward = pressed
        break
      case 's':
        this.controls.backward = pressed
        break
      case 'a':
        this.controls.left = pressed
        break
      case 'd':
        this.controls.right = pressed
        break
      case 'q':
        this.controls.down = pressed
        break
      case 'e':
        this.controls.up = pressed
        break
      case 'shift':
        this.controls.fast = pressed
        break
      case 'r':
        if (pressed) this.reset()
        break
    }
  }

  /**
   * Get the point closest to the cursor in screen space.
   * Caller must pass the current MVP matrix (e.g. from getShaderUniforms).
   * Only considers points within maxDistanceFromCamera (world-space; matches u_cameraDistThreshold)
   * and within maxDistancePixels of the cursor (default 30, matches fragment shader hover highlight).
   * Camera-distance cull is applied first for efficiency with large point sets.
   *
   * @param mvpMatrix - Current projection * view matrix (e.g. uniforms.u_mvpMatrix)
   * @param positions - Float32Array of x,y,z per point (interleaved)
   * @param cursorX - Cursor X in canvas pixel space (origin top-left)
   * @param cursorY - Cursor Y in canvas pixel space (origin top-left)
   * @param canvasWidth - Canvas width in pixels
   * @param canvasHeight - Canvas height in pixels
   * @param maxDistanceFromCamera - Max world-space distance from camera (points beyond are skipped)
   * @param maxDistancePixels - Max screen-space distance to cursor (default 30)
   * @returns Closest point info or null if none within thresholds or behind camera
   */
  getClosestPoint(
    mvpMatrix: mat4,
    positions: Float32Array,
    cursorX: number,
    cursorY: number,
    canvasWidth: number,
    canvasHeight: number,
    maxDistanceFromCamera: number,
    maxDistancePixels: number = 30
  ): ClosestPointResult | null {
    let closest: ClosestPointResult | null = null
    let minDistance = Infinity
    const count = positions.length / 3
    const maxDistSq = maxDistanceFromCamera * maxDistanceFromCamera
    const cam = this.position

    for (let i = 0; i < count; i++) {
      const px = positions[i * 3]
      const py = positions[i * 3 + 1]
      const pz = positions[i * 3 + 2]

      // Cull by distance from camera first (cheap, avoids MVP for far points)
      const dxCam = px - cam[0]
      const dyCam = py - cam[1]
      const dzCam = pz - cam[2]
      if (dxCam * dxCam + dyCam * dyCam + dzCam * dzCam > maxDistSq) continue

      const worldPos = vec4.fromValues(px, py, pz, 1.0)
      const clipPos = vec4.create()
      vec4.transformMat4(clipPos, worldPos, mvpMatrix)

      if (clipPos[3] <= 0) continue // Behind camera

      const ndcX = clipPos[0] / clipPos[3]
      const ndcY = clipPos[1] / clipPos[3]
      const screenX = (ndcX + 1) * canvasWidth / 2
      const screenY = (1 - ndcY) * canvasHeight / 2

      const dx = screenX - cursorX
      const dy = screenY - cursorY
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance < minDistance && distance <= maxDistancePixels) {
        minDistance = distance
        closest = {
          index: i,
          worldPos: [px, py, pz],
          screenPos: [screenX, screenY],
          distance
        }
      }
    }
    return closest
  }

  /**
   * Handle mouse movement for looking around
   *
   * @param deltaX - Horizontal mouse movement in pixels
   * @param deltaY - Vertical mouse movement in pixels
   * @returns void
   */
  handleMouseMove(deltaX: number, deltaY: number): void {
    const pitchChange = (this.invertY ? 1 : -1) * deltaY * this.mouseSensitivity
    const yawChange = -deltaX * this.mouseSensitivity      // Negate to fix inverted horizontal

    if (this.smoothingFactor > 0) {
      // Accumulate deltas — applied gradually in update()
      this.pendingPitch += pitchChange
      this.pendingYaw += yawChange
      // Cap to prevent runaway accumulation from rapid mouse movement
      const MAX_PENDING = 1.0 // ~57 degrees
      this.pendingPitch = Math.max(-MAX_PENDING, Math.min(MAX_PENDING, this.pendingPitch))
      this.pendingYaw = Math.max(-MAX_PENDING, Math.min(MAX_PENDING, this.pendingYaw))
    } else {
      // Instant (current behavior)
      const temp = quat.create()
      quat.rotateX(temp, this.orientation, pitchChange)
      quat.rotateY(this.orientation, temp, yawChange)
      quat.normalize(this.orientation, this.orientation)
    }
  }

  /**
   * Mouse wheel is no longer used for zoom (handled by playground for threshold adjustment).
   */
  handleMouseWheel(_delta: number): void {
    // no-op
  }

  /**
   * Update camera position based on input (call every frame)
   *
   * @param deltaTime - Time since last frame in seconds (default: 1/60)
   * @returns void
   */
  /**
   * Set analog movement input from gamepad (local camera space).
   * Values should be in [-1, 1] range. Applied additively with keyboard.
   */
  setAnalogMovement(x: number, y: number, z: number): void {
    vec3.set(this.analogMove, x, y, z)
  }

  /**
   * Set analog look input from gamepad (radians/sec).
   * Applied additively with mouse when smoothing is on, or directly when off.
   */
  setAnalogLook(yaw: number, pitch: number): void {
    this.analogYaw = yaw
    this.analogPitch = pitch
  }

  update(deltaTime: number = 1/60): void {
    const speedMultiplier = this.controls.fast ? this.fastMoveMultiplier : 1

    // Get movement vectors from quaternion orientation
    const forward = this.getForward()
    const right = this.getRight()
    const up = this.getUp()

    // Compute target velocity from keyboard (binary) + gamepad (analog)
    vec3.set(this.targetVelocity, 0, 0, 0)

    // Keyboard input (binary -1/0/1 per axis)
    let kbX = 0, kbY = 0, kbZ = 0
    if (this.controls.forward)  kbZ += 1
    if (this.controls.backward) kbZ -= 1
    if (this.controls.right)    kbX += 1
    if (this.controls.left)     kbX -= 1
    if (this.controls.up)       kbY += 1
    if (this.controls.down)     kbY -= 1

    // Combine keyboard + analog gamepad input
    const inputX = kbX + this.analogMove[0]
    const inputY = kbY + this.analogMove[1]
    const inputZ = kbZ + this.analogMove[2]

    // Build target velocity in world space
    vec3.scaleAndAdd(this.targetVelocity, this.targetVelocity, forward, inputZ * this.moveSpeed * speedMultiplier)
    vec3.scaleAndAdd(this.targetVelocity, this.targetVelocity, right, inputX * this.moveSpeed * speedMultiplier)
    vec3.scaleAndAdd(this.targetVelocity, this.targetVelocity, up, inputY * this.moveSpeed * speedMultiplier)

    // Handle analog look (gamepad sticks)
    if (this.smoothingFactor > 0) {
      this.pendingPitch += this.analogPitch * deltaTime
      this.pendingYaw += this.analogYaw * deltaTime
      const MAX_PENDING = 1.0
      this.pendingPitch = Math.max(-MAX_PENDING, Math.min(MAX_PENDING, this.pendingPitch))
      this.pendingYaw = Math.max(-MAX_PENDING, Math.min(MAX_PENDING, this.pendingYaw))
    } else if (this.analogYaw !== 0 || this.analogPitch !== 0) {
      // Instant analog look (no smoothing)
      const tempQ = quat.create()
      quat.rotateX(tempQ, this.orientation, this.analogPitch * deltaTime)
      quat.rotateY(this.orientation, tempQ, this.analogYaw * deltaTime)
      quat.normalize(this.orientation, this.orientation)
    }

    if (this.smoothingFactor > 0) {
      // EMA smoothing: alpha = 1 - exp(-smoothingFactor * dt) is frame-rate independent
      const alpha = 1 - Math.exp(-this.smoothingFactor * deltaTime)

      // Smooth velocity toward target
      vec3.lerp(this.velocity, this.velocity, this.targetVelocity, alpha)

      // Snap to zero to prevent infinite drift
      if (vec3.length(this.velocity) < 0.001 && vec3.length(this.targetVelocity) < 0.001) {
        vec3.set(this.velocity, 0, 0, 0)
      }

      // Apply smoothed velocity
      vec3.scaleAndAdd(this.position, this.position, this.velocity, deltaTime)

      // Apply smoothed rotation from pending deltas
      if (Math.abs(this.pendingPitch) > 0.00001 || Math.abs(this.pendingYaw) > 0.00001) {
        const rotAlpha = 1 - Math.exp(-this.smoothingFactor * deltaTime)
        const appliedPitch = this.pendingPitch * rotAlpha
        const appliedYaw = this.pendingYaw * rotAlpha

        const tempQ = quat.create()
        quat.rotateX(tempQ, this.orientation, appliedPitch)
        quat.rotateY(this.orientation, tempQ, appliedYaw)
        quat.normalize(this.orientation, this.orientation)

        this.pendingPitch -= appliedPitch
        this.pendingYaw -= appliedYaw

        // Snap to zero
        if (Math.abs(this.pendingPitch) < 0.00001) this.pendingPitch = 0
        if (Math.abs(this.pendingYaw) < 0.00001) this.pendingYaw = 0
      }
    } else {
      // No smoothing: instant movement (original behavior)
      vec3.scaleAndAdd(this.position, this.position, this.targetVelocity, deltaTime)
    }

    // Reset analog input (must be set each frame by caller)
    vec3.set(this.analogMove, 0, 0, 0)
    this.analogYaw = 0
    this.analogPitch = 0
  }

  /**
   * Reset camera to default position
   *
   * @returns void
   */
  reset(): void {
    vec3.set(this.position, 0, 0, 10)
    quat.identity(this.orientation)
    this.distance = 10
    vec3.set(this.velocity, 0, 0, 0)
    vec3.set(this.targetVelocity, 0, 0, 0)
    this.pendingYaw = 0
    this.pendingPitch = 0
    vec3.set(this.analogMove, 0, 0, 0)
    this.analogYaw = 0
    this.analogPitch = 0
  }

  /**
   * Get camera parameters for shader uniforms
   * Computes view matrix from quaternion to eliminate gimbal lock in shader
   *
   * @param aspect - Canvas aspect ratio (width / height)
   * @returns Object with shader uniforms: { u_cameraPosition, u_viewMatrix, u_mvpMatrix, u_fov, u_near, u_far, u_aspect }
   */
  getShaderUniforms(aspect: number) {
    // Get local camera axes from quaternion (these are camera's local space)
    const forward = this.getForward()
    const up = this.getUp()

    // Target is where camera looks: current position + forward direction
    const target = vec3.create()
    vec3.add(target, this.position, forward)

    // View matrix transforms world to camera space
    // Order: eye (position), center (look target), up (camera's local up from quaternion)
    const view = mat4.create()
    mat4.lookAt(view, this.position, target, up)

    // Projection matrix (perspective)
    const projection = mat4.create()
    mat4.perspective(projection, this.fov * Math.PI / 180, aspect, this.near, this.far)

    // MVP = Projection * View * Model (Model is identity for world-space points)
    // Note: Matrix multiplication order is right-to-left in gl-matrix
    const mvp = mat4.create()
    mat4.multiply(mvp, projection, view)

    return {
      u_cameraPosition: [this.position[0], this.position[1], this.position[2]],
      u_cameraRotation: [0, 0],  // Not used with MVP matrix
      u_viewMatrix: view,           // Pass view matrix to shader
      u_mvpMatrix: mvp,           // Pass combined matrix to shader
      u_fov: this.fov * Math.PI / 180,
      u_near: this.near,
      u_far: this.far,
      u_aspect: aspect
    }
  }

  /**
   * Convert world position to screen coordinates
   *
   * Projects world position using MVP matrix to get screen coordinates for overlay positioning.
   * Returns null if point is behind camera (w <= 0 in clip space).
   *
   * @param worldPos - World position {x, y, z} to convert
   * @param canvasWidth - Canvas width in pixels
   * @param canvasHeight - Canvas height in pixels
   * @returns Screen position {x, y} in pixels, or null if behind camera
   */
  worldToScreen(worldPos: {x: number, y: number, z: number}, canvasWidth: number, canvasHeight: number): {x: number, y: number} | null {
    // Get MVP matrix from camera
    const aspect = canvasWidth / canvasHeight;
    const uniforms = this.getShaderUniforms(aspect);
    const mvp = uniforms.u_mvpMatrix;

    // Transform world position to clip space
    const clipPos = vec4.create();
    vec4.set(clipPos, worldPos.x, worldPos.y, worldPos.z, 1.0);
    vec4.transformMat4(clipPos, clipPos, mvp);

    // Perspective divide (clip space w)
    if (clipPos[3] <= 0) {
      return null; // Point is behind camera
    }

    // Convert to NDC (-1 to 1)
    const ndcX = clipPos[0] / clipPos[3];
    const ndcY = clipPos[1] / clipPos[3];

    // Convert NDC to screen coordinates (0 to canvasWidth/Height)
    // Flip Y because WebGL Y is up, screen Y is down
    const screenX = (ndcX + 1.0) * 0.5 * canvasWidth;
    const screenY = (1.0 - ndcY) * 0.5 * canvasHeight;

    return { x: screenX, y: screenY };
  }

  /**
   * Get camera forward direction
   *
   * @returns Forward direction vector in world space
   */
  getForward(): vec3 {
    const forward = vec3.create()
    vec3.transformQuat(forward, [0, 0, -1], this.orientation)
    return forward
  }

  /**
   * Get camera right direction
   *
   * @returns Right direction vector in world space
   */
  getRight(): vec3 {
    const right = vec3.create()
    vec3.transformQuat(right, [1, 0, 0], this.orientation)
    return right
  }

  /**
   * Get camera up direction
   *
   * @returns Up direction vector in world space
   */
  getUp(): vec3 {
    const up = vec3.create()
    vec3.transformQuat(up, [0, 1, 0], this.orientation)
    return up
  }
}
