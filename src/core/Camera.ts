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
  /** Mouse wheel zoom speed */
  public zoomSpeed: number = 0.1
  
  // Projection settings
  /** Vertical field of view in degrees */
  public fov: number = 45
  /** Near clipping plane distance */
  public near: number = 0.1
  /** Far clipping plane distance */
  public far: number = 100.0
  
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
   * Convert mouse screen position to world space (simplified plane approximation)
   *
   * Projects mouse ray to a plane at camera distance for approximate world position.
   * This is sufficient for hover detection where exact world position is not critical.
   *
   * @param mouseX - Mouse X coordinate in pixels (from event.clientX)
   * @param mouseY - Mouse Y coordinate in pixels (from event.clientY)
   * @param canvasWidth - Canvas width in pixels
   * @param canvasHeight - Canvas height in pixels
   * @returns World position {x, y, z}
   */
  convertMouseToWorld(mouseX: number, mouseY: number, canvasWidth: number, canvasHeight: number): {x: number, y: number, z: number} {
    // Normalize mouse to NDC (-1 to 1), flip Y (screen Y is down, WebGL Y is up)
    const ndcX = (mouseX / canvasWidth) * 2.0 - 1.0;
    const ndcY = -((mouseY / canvasHeight) * 2.0 - 1.0);

    // Get forward vector from camera orientation
    const forward = vec3.create();
    vec3.set(forward, 0, 0, -1);
    vec3.transformQuat(forward, forward, this.orientation);
    vec3.normalize(forward, forward);

    // Simple approximation: project point on plane at camera distance (10 units)
    // This works for hover detection because we only need a reference plane,
    // not the exact world intersection point
    const distanceToPlane = 10.0;
    const worldX = this.position[0] + forward[0] * distanceToPlane * ndcX;
    const worldY = this.position[1] + forward[1] * distanceToPlane * ndcY;
    const worldZ = this.position[2] + forward[2] * distanceToPlane;

    return { x: worldX, y: worldY, z: worldZ };
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
   * Handle mouse movement for looking around
   *
   * @param deltaX - Horizontal mouse movement in pixels
   * @param deltaY - Vertical mouse movement in pixels
   * @returns void
   */
  handleMouseMove(deltaX: number, deltaY: number): void {
    const pitchChange = -deltaY * this.mouseSensitivity   // Negate to fix inverted vertical
    const yawChange = -deltaX * this.mouseSensitivity      // Negate to fix inverted horizontal

    // Apply pitch rotation
    const temp = quat.create()
    quat.rotateX(temp, this.orientation, pitchChange)

    // Apply yaw rotation to result (order matters: X then Y)
    quat.rotateY(this.orientation, temp, yawChange)

    // Normalize periodically to prevent quaternion drift
    quat.normalize(this.orientation, this.orientation)
  }

  /**
   * Handle mouse wheel for zooming
   *
   * @param delta - Mouse wheel scroll delta (positive = zoom in, negative = zoom out)
   * @returns void
   */
  handleMouseWheel(delta: number): void {
    this.distance += delta * this.zoomSpeed
    this.distance = Math.max(1, Math.min(50, this.distance))
  }

  /**
   * Update camera position based on input (call every frame)
   *
   * @param deltaTime - Time since last frame in seconds (default: 1/60)
   * @returns void
   */
  update(deltaTime: number = 1/60): void {
    const speed = this.moveSpeed * deltaTime * (this.controls.fast ? this.fastMoveMultiplier : 1)

    // Get movement vectors from quaternion orientation
    const forward = this.getForward()
    const right = this.getRight()
    const up = this.getUp()

    // Apply movement - forward/backward moves in camera's look direction
    if (this.controls.forward) {
      vec3.add(this.position, this.position, vec3.scale(vec3.create(), forward, speed))
    }
    if (this.controls.backward) {
      vec3.sub(this.position, this.position, vec3.scale(vec3.create(), forward, speed))
    }
    if (this.controls.right) {
      vec3.add(this.position, this.position, vec3.scale(vec3.create(), right, speed))
    }
    if (this.controls.left) {
      vec3.sub(this.position, this.position, vec3.scale(vec3.create(), right, speed))
    }
    if (this.controls.up) {
      vec3.add(this.position, this.position, vec3.scale(vec3.create(), up, speed))
    }
    if (this.controls.down) {
      vec3.sub(this.position, this.position, vec3.scale(vec3.create(), up, speed))
    }

    // No matrix updates needed - shader handles everything!
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
