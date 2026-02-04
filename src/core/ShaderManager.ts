export interface ShaderSource {
  vertex: string
  fragment: string
}

export interface CompiledShader {
  program: WebGLProgram
  attributes: Record<string, number>
  uniforms: Record<string, WebGLUniformLocation | null>
}

export class ShaderManager {
  private gl: WebGL2RenderingContext | WebGLRenderingContext
  private shaderCache = new Map<string, CompiledShader>()

  constructor(gl: WebGL2RenderingContext | WebGLRenderingContext) {
    this.gl = gl
  }

  /**
   * Load shader source from server
   * You can store shaders as .vert/.frag files and load them dynamically
   */
  async loadShaderFromFile(vertexPath: string, fragmentPath: string): Promise<ShaderSource> {
    try {
      const [vertexResponse, fragmentResponse] = await Promise.all([
        fetch(vertexPath),
        fetch(fragmentPath)
      ])

      if (!vertexResponse.ok || !fragmentResponse.ok) {
        throw new Error(`Failed to load shaders: ${vertexPath}, ${fragmentPath}`)
      }

      const vertex = await vertexResponse.text()
      const fragment = await fragmentResponse.text()

      return { vertex, fragment }
    } catch (error) {
      console.error('Error loading shaders:', error)
      throw error
    }
  }

  /**
   * Create shader program from source strings
   */
  createShaderProgram(shaderSource: ShaderSource, name?: string): CompiledShader {
    const cacheKey = name || `${shaderSource.vertex.slice(0, 50)}_${shaderSource.fragment.slice(0, 50)}`
    
    // Check cache first
    if (this.shaderCache.has(cacheKey)) {
      return this.shaderCache.get(cacheKey)!
    }

    const vertexShader = this.compileShader(shaderSource.vertex, this.gl.VERTEX_SHADER)
    const fragmentShader = this.compileShader(shaderSource.fragment, this.gl.FRAGMENT_SHADER)

    const program = this.gl.createProgram()
    if (!program) {
      throw new Error('Failed to create shader program')
    }

    this.gl.attachShader(program, vertexShader)
    this.gl.attachShader(program, fragmentShader)
    this.gl.linkProgram(program)

    // Clean up individual shaders (they're now part of the program)
    this.gl.deleteShader(vertexShader)
    this.gl.deleteShader(fragmentShader)

    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      const error = this.gl.getProgramInfoLog(program)
      this.gl.deleteProgram(program)
      throw new Error(`Shader program linking failed: ${error}`)
    }

    // Extract attributes and uniforms
    const compiledShader: CompiledShader = {
      program,
      attributes: this.extractAttributes(program),
      uniforms: this.extractUniforms(program)
    }

    // Cache the compiled shader
    this.shaderCache.set(cacheKey, compiledShader)

    console.log(`Shader compiled successfully: ${name || 'unnamed'}`, {
      attributes: Object.keys(compiledShader.attributes),
      uniforms: Object.keys(compiledShader.uniforms)
    })

    return compiledShader
  }

  private compileShader(source: string, type: number): WebGLShader {
    const shader = this.gl.createShader(type)
    if (!shader) {
      throw new Error('Failed to create shader')
    }

    this.gl.shaderSource(shader, source)
    this.gl.compileShader(shader)

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const error = this.gl.getShaderInfoLog(shader)
      this.gl.deleteShader(shader)
      const shaderType = type === this.gl.VERTEX_SHADER ? 'vertex' : 'fragment'
      throw new Error(`${shaderType} shader compilation failed: ${error}`)
    }

    return shader
  }

  private extractAttributes(program: WebGLProgram): Record<string, number> {
    const attributes: Record<string, number> = {}
    const attributeCount = this.gl.getProgramParameter(program, this.gl.ACTIVE_ATTRIBUTES)

    for (let i = 0; i < attributeCount; i++) {
      const attribute = this.gl.getActiveAttrib(program, i)
      if (attribute) {
        const location = this.gl.getAttribLocation(program, attribute.name)
        attributes[attribute.name] = location
      }
    }

    return attributes
  }

  private extractUniforms(program: WebGLProgram): Record<string, WebGLUniformLocation | null> {
    const uniforms: Record<string, WebGLUniformLocation | null> = {}
    const uniformCount = this.gl.getProgramParameter(program, this.gl.ACTIVE_UNIFORMS)

    for (let i = 0; i < uniformCount; i++) {
      const uniform = this.gl.getActiveUniform(program, i)
      if (uniform) {
        const location = this.gl.getUniformLocation(program, uniform.name)
        uniforms[uniform.name] = location
      }
    }

    return uniforms
  }

  /**
   * Use a compiled shader program
   */
  useProgram(shader: CompiledShader): void {
    this.gl.useProgram(shader.program)
  }

  /**
   * Get GPU-optimized shaders that calculate matrices in vertex shader.
   * This eliminates the need for JavaScript matrix calculations!
   * @see Camera.getShaderUniforms() - Method providing camera position, matrices, and projection values
   * @see Camera - Camera class with Y-up coordinate system documentation
   */
  getGPUMatrixShaders(): ShaderSource {
    return {
      vertex: `
        attribute vec3 a_position;
        attribute float a_clusterId;

        // Camera matrices from CPU (pre-computed for efficiency)
        uniform mat4 u_viewMatrix;     // View matrix from quaternion camera
        uniform mat4 u_mvpMatrix;      // Combined projection * view matrix
        uniform vec3 u_cameraPosition;
        uniform vec2 u_cameraRotation;  // Not used with MVP matrix
        uniform float u_fov;
        uniform float u_near;
        uniform float u_far;
        uniform float u_aspect;
        uniform float u_pointSize;
        uniform float u_hilighted_cluster;

        // Hover detection uniforms
        uniform vec2 u_cursorWorldPos;
        uniform float u_cameraDistThreshold;
        uniform float u_cursorDistThreshold;

        varying float v_isHilighted;
        varying float v_revCamDist;
        varying float v_isHovered;

        void main() {
          // No animation - just static points
          vec3 position = a_position;

          // Use pre-computed MVP matrix (Projection * View)
          // Order: Projection is applied first, then View (right-to-left order)
          // This uses quaternion-based view matrix which eliminates gimbal lock
          float revCamDistance = 1.0 - clamp(length(u_cameraPosition - position)/100.0, 0.0, 1.0);

          gl_Position = u_mvpMatrix * vec4(position, 1.0);
          gl_PointSize = clamp(u_pointSize * revCamDistance, 4.0, 50.0);

          // Two-distance threshold hover detection
          float distToCamera = length(u_cameraPosition - position);
          bool cameraNear = distToCamera < u_cameraDistThreshold;

          float distToCursor = length(u_cursorWorldPos - position);
          bool cursorNear = distToCursor < u_cursorDistThreshold;

          // Combined: Both conditions must be true
          v_isHovered = float(cameraNear && cursorNear);

          v_isHilighted = abs(a_clusterId - u_hilighted_cluster) < 0.4 ? 1.0 : 0.0;
          v_revCamDist = revCamDistance;
        }
      `,
      fragment: `
        precision mediump float;

        varying float v_isHilighted;
        varying float v_revCamDist;
        varying float v_isHovered;

        void main() {
          vec2 coord = gl_PointCoord - vec2(0.5);
          float distance = length(coord);

          if (distance > 0.5) {
            discard;
          }

          float intensity = 1.0 - distance * 2.0;

          vec3 c_base = v_isHilighted > 0.5 ? vec3(1.0, 0.5, 0.2) : vec3(1.0);
          vec3 c_far = v_isHilighted > 0.5 ? vec3(0.1, 0.0, 0.1) : vec3(0.0, 0.0, 0.3);

          // 2x brightness boost when hovered
          vec3 c_hovered = v_isHovered > 0.5 ? c_base * 2.0 : c_base;

          // Mix based on hover state (apply boost to both near and far colors)
          vec3 c_far_hovered = v_isHovered > 0.5 ? vec3(0.2, 0.1, 0.2) : c_far;
          vec3 color = mix(c_far_hovered, c_hovered, v_revCamDist);

          gl_FragColor = vec4(color, intensity);
        }
      `
    }
  }



  /**
   * Configure WebGL for high-performance additive point rendering
   */
  setupAdditivePointRendering(): void {
    // Disable depth writes (but keep depth test for early Z rejection)
    this.gl.depthMask(false)
    this.gl.enable(this.gl.DEPTH_TEST)
    this.gl.depthFunc(this.gl.LEQUAL)
    
    // Additive blending for glow effects
    this.gl.enable(this.gl.BLEND)
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE)
    
    // Optional: Enable point sprite for older hardware
    // this.gl.enable(this.gl.VERTEX_PROGRAM_POINT_SIZE) // Usually enabled by default in modern WebGL
  }

  /**
   * Configure WebGL for standard alpha-blended rendering
   */
  setupAlphaPointRendering(): void {
    this.gl.depthMask(true)
    this.gl.enable(this.gl.DEPTH_TEST)
    this.gl.depthFunc(this.gl.LESS)
    
    this.gl.enable(this.gl.BLEND)
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA)
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    for (const shader of this.shaderCache.values()) {
      this.gl.deleteProgram(shader.program)
    }
    this.shaderCache.clear()
  }
}
