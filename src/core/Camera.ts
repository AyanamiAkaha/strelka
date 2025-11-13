import { Vec3 } from './Math'

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
  public position: Vec3
  public rotation: { x: number, y: number }
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
    this.position = new Vec3(0, 0, 10)
    this.rotation = { x: 0, y: 0 }
    this.distance = 10
  }

  public toDebugInfo(): { position: Vec3; rotation: { x: number; y: number }; distance: number } {
    return {
      position: this.position,
      rotation: this.rotation,
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
    this.rotation.y += deltaX * this.mouseSensitivity
    this.rotation.x += deltaY * this.mouseSensitivity
    
    // Clamp vertical rotation to prevent gimbal lock
    this.rotation.x = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.rotation.x))
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
    const forward = new Vec3(
      Math.sin(this.rotation.y) * Math.cos(this.rotation.x),
      -Math.sin(this.rotation.x),
      Math.cos(this.rotation.y) * Math.cos(this.rotation.x)
    )
    
    const right = new Vec3(
      Math.cos(this.rotation.y),
      0,
      -Math.sin(this.rotation.y)
    )
    
    const up = new Vec3(0, 1, 0)
    
    // Apply movement
    if (this.controls.forward) {
      this.position = Vec3.add(this.position, Vec3.multiply(forward, speed))
    }
    if (this.controls.backward) {
      this.position = Vec3.subtract(this.position, Vec3.multiply(forward, speed))
    }
    if (this.controls.right) {
      this.position = Vec3.add(this.position, Vec3.multiply(right, speed))
    }
    if (this.controls.left) {
      this.position = Vec3.subtract(this.position, Vec3.multiply(right, speed))
    }
    if (this.controls.up) {
      this.position = Vec3.add(this.position, Vec3.multiply(up, speed))
    }
    if (this.controls.down) {
      this.position = Vec3.subtract(this.position, Vec3.multiply(up, speed))
    }
    
    // No matrix updates needed - shader handles everything!
  }

  /**
   * Reset camera to default position
   */
  reset(): void {
    this.position = new Vec3(0, 0, 10)
    this.rotation = { x: 0, y: 0 }
    this.distance = 10
  }

  /**
   * Get camera parameters for shader uniforms (no matrix calculations!)
   */
  getShaderUniforms(aspect: number) {
    return {
      u_cameraPosition: this.position.toArray(),
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
  getForward(): Vec3 {
    return new Vec3(
      Math.sin(this.rotation.y) * Math.cos(this.rotation.x),
      -Math.sin(this.rotation.x),
      Math.cos(this.rotation.y) * Math.cos(this.rotation.x)
    )
  }

  /**
   * Get camera right direction
   */
  getRight(): Vec3 {
    return new Vec3(
      Math.cos(this.rotation.y),
      0,
      -Math.sin(this.rotation.y)
    )
  }

  /**
   * Get camera up direction
   */
  getUp(): Vec3 {
    return Vec3.cross(this.getRight(), this.getForward())
  }
}
