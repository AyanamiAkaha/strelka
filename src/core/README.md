// Example usage of the cleaned-up GPU-based rendering approach
// This shows how to use the new shader-based system for 50k+ points

import { Camera } from './Camera'
import { ShaderManager, CompiledShader } from './ShaderManager'
import { DataProvider } from './DataProvider'

export class CleanRenderer {
  private gl: WebGL2RenderingContext | WebGLRenderingContext
  private camera: Camera
  private shaderManager: ShaderManager
  private shader: CompiledShader
  private pointData: ReturnType<typeof DataProvider.getPointData>

  constructor(gl: WebGL2RenderingContext | WebGLRenderingContext) {
    this.gl = gl
    this.camera = new Camera()
    this.shaderManager = new ShaderManager(gl)
    
    // Use GPU-optimized shaders that calculate matrices in vertex shader
    const shaderSource = this.shaderManager.getGPUMatrixShaders()
    this.shader = this.shaderManager.createShaderProgram(shaderSource, 'gpu-matrix-shader')
    
    // Generate point data
    this.pointData = DataProvider.getPointData()
    this.setupBuffers()
  }

  private setupBuffers(): void {
    // Setup position buffer
    const positionBuffer = this.gl.createBuffer()
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer)
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.pointData.positions, this.gl.STATIC_DRAW)
    this.gl.enableVertexAttribArray(this.shader.attributes.a_position)
    this.gl.vertexAttribPointer(this.shader.attributes.a_position, 3, this.gl.FLOAT, false, 0, 0)
    
    // Setup cluster ID buffer
    const clusterBuffer = this.gl.createBuffer()
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, clusterBuffer)
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.pointData.clusterIds, this.gl.STATIC_DRAW)
    this.gl.enableVertexAttribArray(this.shader.attributes.a_clusterId)
    this.gl.vertexAttribPointer(this.shader.attributes.a_clusterId, 1, this.gl.FLOAT, false, 0, 0)
  }

  // The magic: render method with no JavaScript matrix calculations!
  render(canvas: HTMLCanvasElement, time: number): void {
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT)
    this.shaderManager.useProgram(this.shader)
    
    // Update camera (just movement, no matrix calculations)
    this.camera.update()
    
    // Upload camera parameters to GPU (just a few floats!)
    const cameraUniforms = this.camera.getShaderUniforms(canvas.width / canvas.height)
    
    this.gl.uniform3fv(this.shader.uniforms.u_cameraPosition, cameraUniforms.u_cameraPosition)
    this.gl.uniform2fv(this.shader.uniforms.u_cameraRotation, cameraUniforms.u_cameraRotation)
    this.gl.uniform1f(this.shader.uniforms.u_fov, cameraUniforms.u_fov)
    this.gl.uniform1f(this.shader.uniforms.u_near, cameraUniforms.u_near)
    this.gl.uniform1f(this.shader.uniforms.u_far, cameraUniforms.u_far)
    this.gl.uniform1f(this.shader.uniforms.u_aspect, cameraUniforms.u_aspect)
    this.gl.uniform1f(this.shader.uniforms.u_pointSize, 4.0)
    
    // Draw - GPU calculates all matrices in parallel!
    this.gl.drawArrays(this.gl.POINTS, 0, this.pointData.count)
  }

  getCamera(): Camera {
    return this.camera
  }
}

/*
Usage in your main app:

const renderer = new CleanRenderer(gl)

function renderLoop(timestamp: number) {
  renderer.render(canvas, timestamp)
  requestAnimationFrame(renderLoop)
}

// Handle input
canvas.addEventListener('mousemove', (e) => {
  if (mouseDown) {
    renderer.getCamera().handleMouseMove(e.movementX, e.movementY)
  }
})

canvas.addEventListener('keydown', (e) => {
  renderer.getCamera().handleKeyEvent(e.key, true)
})

// That's it! No matrix math in JavaScript, everything runs on GPU
*/
