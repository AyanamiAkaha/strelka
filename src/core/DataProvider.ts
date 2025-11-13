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
  static getPointData(): PointData {
    const ppc = 4000;
    const clusterCenters: Array<[number, number, number]> = [
      [-2, -1, 1],
      [0, 3, -2],
      [2, 0, 0],
    ]
    const clusterShapes: Array<[number, number, number]> = [
      [0.5, 0.5, 0.5],
      [0.3, 0.7, 0.3],
      [0.6, 0.4, 0.6],
    ]
    
    const positions = new Float32Array(ppc * clusterCenters.length * 3)
    const clusterIds = new Float32Array(ppc * clusterCenters.length)

    for (let i = 0; i < ppc * clusterCenters.length; i++) {
      const clusterId = Math.floor(Math.random() * clusterCenters.length)
      const z = clusterCenters[clusterId]
      const s = clusterShapes[clusterId]
      const point = [
        z[0] + (Math.random() - 0.5) * s[0],
        z[1] + (Math.random() - 0.5) * s[1],
        z[2] + (Math.random() - 0.5) * s[2],
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
   * Example: Load point data from a JSON file
   * Uncomment and modify this if you want to load from files
   */
  /*
  static async loadPointDataFromFile(url: string): Promise<PointData> {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to load data from ${url}`)
      }
      
      const data = await response.json()
      
      // Assuming JSON format: { points: [[x, y, z, clusterId], ...] }
      const positions = new Float32Array(data.points.length * 3)
      const clusterIds = new Float32Array(data.points.length)
      
      data.points.forEach((point: [number, number, number, number], index: number) => {
        positions[index * 3] = point[0]
        positions[index * 3 + 1] = point[1]  
        positions[index * 3 + 2] = point[2]
        clusterIds[index] = point[3]
      })
      
      return {
        positions,
        clusterIds,
        count: data.points.length
      }
    } catch (error) {
      console.error('Error loading point data:', error)
      throw error
    }
  }
  */

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
