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
   * Get GPU-optimized shaders that calculate matrices in vertex shader
   * This eliminates the need for JavaScript matrix calculations!
   */
  getGPUMatrixShaders(): ShaderSource {
    return {
      vertex: `
        attribute vec3 a_position;
        attribute float a_clusterId;

        // Camera parameters instead of pre-calculated matrices
        uniform vec3 u_cameraPosition;
        uniform vec2 u_cameraRotation;  // [pitch, yaw]
        uniform float u_fov;
        uniform float u_near;
        uniform float u_far;
        uniform float u_aspect;
        uniform float u_pointSize;
        uniform float u_hilighted_cluster;

        varying float v_isHilighted;

        // Corrected GPU matrix calculation functions
        mat4 perspective(float fov, float aspect, float near, float far) {
          float f = 1.0 / tan(fov * 0.5);
          float nf = 1.0 / (near - far);
          
          // GLSL mat4 constructor is column-major, so each vec4 is a column
          return mat4(
            vec4(f / aspect, 0.0, 0.0, 0.0),              // column 0
            vec4(0.0, f, 0.0, 0.0),                        // column 1  
            vec4(0.0, 0.0, (far + near) * nf, -1.0),      // column 2
            vec4(0.0, 0.0, 2.0 * far * near * nf, 0.0)    // column 3
          );
        }
        
        mat4 lookAt(vec3 eye, vec3 target, vec3 up) {
          vec3 zAxis = normalize(eye - target);
          vec3 xAxis = normalize(cross(up, zAxis));  
          vec3 yAxis = cross(zAxis, xAxis);
          
          // GLSL mat4 constructor is column-major, so each vec4 is a column
          return mat4(
            vec4(xAxis.x, yAxis.x, zAxis.x, 0.0),          // column 0
            vec4(xAxis.y, yAxis.y, zAxis.y, 0.0),          // column 1
            vec4(xAxis.z, yAxis.z, zAxis.z, 0.0),          // column 2
            vec4(-dot(xAxis, eye), -dot(yAxis, eye), -dot(zAxis, eye), 1.0)  // column 3
          );
        }
        
        // Fixed rotation convention - camera looks down -Z when rotation is (0,0)
        vec3 getForwardVector(vec2 rotation) {
          float pitch = rotation.x;
          float yaw = rotation.y;
          
          return vec3(
            cos(pitch) * sin(yaw),
            -sin(pitch),
            -cos(pitch) * cos(yaw)
          );
        }

        void main() {
          // No animation - just static points
          vec3 position = a_position;

          // Calculate matrices on GPU (parallel for all vertices!)
          vec3 forward = getForwardVector(u_cameraRotation);
          vec3 target = u_cameraPosition + forward;
          vec3 up = vec3(0.0, 1.0, 0.0);
          
          mat4 projection = perspective(u_fov, u_aspect, u_near, u_far);
          mat4 view = lookAt(u_cameraPosition, target, up);
          mat4 mvp = projection * view;
          
          gl_Position = mvp * vec4(position, 1.0);
          gl_PointSize = u_pointSize;

          v_isHilighted = (a_clusterId == u_hilighted_cluster) ? 1.0 : 0.0;
        }
      `,
      fragment: `
        precision mediump float;

        varying float v_isHilighted;

        void main() {
          vec2 coord = gl_PointCoord - vec2(0.5);
          float distance = length(coord);
          
          if (distance > 0.5) {
            discard;
          }

          float intensity = 1.0 - distance * 0.5;
          float glow = 1.0 - distance * 2.0;
          glow = max(glow, 0.0);

          // vec3 base = v_isHilighted > 0.5 ? vec3(1.0, 0.5, 0.2) : vec3(1.0);
          // vec3 color = base * intensity + vec3(glow * 0.3);
          vec3 color = vec3(1.0);
          
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
