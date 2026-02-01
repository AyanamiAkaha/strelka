import { vec3, quat } from './Math'

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
  public position: vec3
  private orientation: quat
  public distance: number
  
  // Camera settings
  public moveSpeed: number = 5.0
  public fastMoveMultiplier: number = 3.0
  public mouseSensitivity: number = 0.002
  public zoomSpeed: number = 0.1
  
  // Projection settings
  public fov: number = 45
  public near: number = 0.1
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
   */
  private quatToEuler(q: quat): { x: number, y: number } {
    // Extract Euler angles from quaternion for display only
    const pitch = Math.asin(2 * (q[3] * q[1] - q[0] * q[2]))
    const yaw = Math.atan2(2 * (q[3] * q[0] + q[1] * q[2]),
                         1 - 2 * (q[0] * q[0] + q[1] * q[1]))
    return { x: pitch, y: yaw }
  }

  public toDebugInfo(): { position: { x: number; y: number; z: number }; rotation: { x: number; y: number }; distance: number } {
    return {
      position: { x: this.position[0], y: this.position[1], z: this.position[2] },
      rotation: this.quatToEuler(this.orientation),
      distance: this.distance
    }
  }

  /**
   * Handle keyboard input
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
   */
  handleMouseMove(deltaX: number, deltaY: number): void {
    const pitchChange = deltaY * this.mouseSensitivity
    const yawChange = deltaX * this.mouseSensitivity

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
   */
  handleMouseWheel(delta: number): void {
    this.distance += delta * this.zoomSpeed
    this.distance = Math.max(1, Math.min(50, this.distance))
  }

  /**
   * Update camera position based on input (call every frame)
   */
  update(deltaTime: number = 1/60): void {
    const speed = this.moveSpeed * deltaTime * (this.controls.fast ? this.fastMoveMultiplier : 1)

    // Calculate movement direction based on camera rotation
    // Match the shader's getForwardVector calculation exactly
    const forward = vec3.create()
    vec3.set(forward,
      Math.cos(this.rotation.x) * Math.sin(this.rotation.y),
      -Math.sin(this.rotation.x),
      -Math.cos(this.rotation.x) * Math.cos(this.rotation.y)
    )

    const right = vec3.create()
    vec3.set(right,
      Math.cos(this.rotation.y),
      0,
      -Math.sin(this.rotation.y)
    )

    const up = vec3.create()
    vec3.set(up, 0, 1, 0)

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
   */
  reset(): void {
    vec3.set(this.position, 0, 0, 10)
    quat.identity(this.orientation)
    this.distance = 10
  }

  /**
   * Get camera parameters for shader uniforms (no matrix calculations!)
   */
  getShaderUniforms(aspect: number) {
    return {
      u_cameraPosition: [this.position[0], this.position[1], this.position[2]],
      u_cameraRotation: [this.rotation.x, this.rotation.y],
      u_fov: this.fov * Math.PI / 180, // Convert to radians
      u_near: this.near,
      u_far: this.far,
      u_aspect: aspect
    }
  }

  /**
   * Get camera forward direction
   */
  getForward(): vec3 {
    const v = vec3.create()
    vec3.set(v,
      Math.cos(this.rotation.x) * Math.sin(this.rotation.y),
      -Math.sin(this.rotation.x),
      -Math.cos(this.rotation.x) * Math.cos(this.rotation.y)
    )
    return v
  }

  /**
   * Get camera right direction
   */
  getRight(): vec3 {
    const v = vec3.create()
    vec3.set(v,
      Math.cos(this.rotation.y),
      0,
      -Math.sin(this.rotation.y)
    )
    return v
  }

  /**
   * Get camera up direction
   */
  getUp(): vec3 {
    const up = vec3.create()
    vec3.cross(up, this.getRight(), this.getForward())
    return up
  }
}
