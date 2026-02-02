import { parseJsonData } from './validators'

export interface PointData {
  // Array of [x, y, z] coordinates flattened: [x1, y1, z1, x2, y2, z2, ...]
  positions: Float32Array
  
  // Array of cluster IDs: [clusterId1, clusterId2, ...]  
  clusterIds: Float32Array
  
  // Total number of points
  count: number
}

/**
 * Data provider for point cluster generation
 * 
 * This is intentionally left as a simple interface/stub.
 * You can implement your own data generation logic here:
 * - Load from files (JSON, binary, etc.)
 * - Generate procedurally
 * - Fetch from APIs
 * - Read from databases
 */
export class DataProvider {
  
  /**
   * Main function to get point data
   * TODO: Implement your own data generation/loading logic here
   * 
   * Expected format:
   * - positions: Float32Array of [x, y, z, x, y, z, ...] coordinates
   * - clusterIds: Float32Array of cluster identifiers for each point
   * - count: total number of points
   * 
   * @returns PointData object with positions, cluster IDs, and count
   */
  static getPointData(pointsPerCluster: number): PointData {
    const cScale = 20;
    const ppc = pointsPerCluster;
    // const ppc = 5;
    const clusterCenters: Array<[number, number, number]> = [
      [-5, -2, 3],
      [0, -7, -7],
      [5, 7, 0],
      [-3, 7, 2],
      [-0, 0, 0],
    ]
    const clusterShapes: Array<[number, number, number]> = [
      [0.5, 0.5, 0.5],
      [0.3, 0.7, 0.3],
      [0.6, 0.4, 0.6],
      [0.4, 0.6, 0.4],
      [3, 3, 3]
    ]
    
    const positions = new Float32Array(ppc * clusterCenters.length * 3)
    const clusterIds = new Float32Array(ppc * clusterCenters.length)

    for (let i = 0; i < ppc * clusterCenters.length; i++) {
      const clusterId = Math.floor(Math.random() * clusterCenters.length)
      const zero = clusterCenters[clusterId]
      const s = clusterShapes[clusterId]
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI * 2
      const r = Math.cbrt(Math.random()) // Uniform distribution in sphere

      const x = r * s[0] * Math.sin(phi) * Math.cos(theta) * cScale
      const y = r * s[1] * Math.sin(phi) * Math.sin(theta) * cScale
      const z = r * s[2] * Math.cos(phi) * cScale
      
      const point: [number, number, number] = [
        zero[0] + x,
        zero[1] + y,
        zero[2] + z,
      ]
      positions[i * 3] = point[0]
      positions[i * 3 + 1] = point[1]
      positions[i * 3 + 2] = point[2]
      clusterIds[i] = clusterId
    }
    
    return {
      positions,
      clusterIds,
      count: ppc * clusterCenters.length
    }
  }

  /**
   * Load point data from a JSON file
   * Uses FileReader to read file and delegates validation/parsing to parseJsonData()
   *
   * @param file - File object from file input or drag-and-drop
   * @returns Promise<PointData> with parsed point data for WebGL
   * @throws Error if file cannot be read or JSON is invalid
   */
  static async loadFromFile(file: File): Promise<PointData> {
    const reader = new FileReader()
    return new Promise((resolve, reject) => {
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string
          const pointData = parseJsonData(content)
          resolve(pointData)
        } catch (error) {
          reject(error)
        }
      }
      reader.onerror = () => {
        const error = new Error('Failed to read file')
        console.error('FileReader error:', reader.error)
        reject(error)
      }
      reader.readAsText(file)
    })
   }


  /**
   * Example: Generate specific cluster patterns
   * You can create functions like this for different data patterns
    */
  static generateSpiralClusters(clusterCount: number = 5, pointsPerCluster: number = 200): PointData {
    const totalPoints = clusterCount * pointsPerCluster
    const positions = new Float32Array(totalPoints * 3)
    const clusterIds = new Float32Array(totalPoints)
    
    let pointIndex = 0
    
    for (let cluster = 0; cluster < clusterCount; cluster++) {
      // Position clusters in a circle
      const clusterAngle = (cluster / clusterCount) * Math.PI * 2
      const clusterRadius = 5
      const centerX = Math.cos(clusterAngle) * clusterRadius
      const centerZ = Math.sin(clusterAngle) * clusterRadius
      const centerY = 0
      
      // Generate spiral pattern within each cluster
      for (let i = 0; i < pointsPerCluster; i++) {
        const t = i / pointsPerCluster
        const spiralAngle = t * Math.PI * 4
        const spiralRadius = t * 2
        
        const x = centerX + Math.cos(spiralAngle) * spiralRadius
        const y = centerY + (Math.random() - 0.5) * 0.5 + t * 2
        const z = centerZ + Math.sin(spiralAngle) * spiralRadius
        
        positions[pointIndex * 3] = x
        positions[pointIndex * 3 + 1] = y
        positions[pointIndex * 3 + 2] = z
        
        clusterIds[pointIndex] = cluster
        pointIndex++
      }
    }
    
    return {
      positions,
      clusterIds, 
      count: totalPoints
    }
  }
}
