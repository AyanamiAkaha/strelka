import initSqlJs from 'sql.js'
import { parseJsonData } from './validators'
import { validateTableSchema } from './validators'

// Initialize sql.js module with WebAssembly support (lazy initialization)
let SQL: any = null

/**
 * Ensure SQL module is initialized before use
 * @returns Promise that resolves with initialized SQL module
 */
async function ensureSqlInitialized(): Promise<any> {
  if (!SQL) {
    SQL = await initSqlJs({
      locateFile: (file: string) => {
        return `/node_modules/sql.js/dist/${file}`
      }
    })
  }
  return SQL
}

export interface PointData {
  // Array of [x, y, z] coordinates flattened: [x1, y1, z1, x2, y2, z2, ...]
  positions: Float32Array

  // Array of cluster IDs: [clusterId1, clusterId2, ...]
  clusterIds: Float32Array

  // Optional tag indices: index into tagLookup or -1, null if no tag column
  tagIndices: Float32Array | null

  // Optional image indices: index into imageLookup or -1, null if no image column
  imageIndices: Float32Array | null

  // Map of unique tag strings to their indices
  tagLookup: Map<string, number> | null

  // Map of unique image strings to their indices
  imageLookup: Map<string, number> | null

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
   * Get the initialized sql.js module for SQLite operations
   * @returns Initialized SQL module ready for database operations
   */
  static async initSqliteModule(): Promise<any> {
    return SQL
  }
  
  /**
   * Main function to get point data
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
      tagIndices: null,
      imageIndices: null,
      tagLookup: null,
      imageLookup: null,
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
   * Load point data from a SQLite database file
   * Uses FileReader.readAsArrayBuffer() for binary SQLite files, db.prepare() + db.each() for efficient incremental processing
   *
   * @param file - File object from file input or drag-and-drop
   * @param tableName - Optional table name to extract data from. If not provided, returns table list only
   * @returns Promise<{ pointData: PointData, tables: string[] }> with parsed point data and available tables
   * @throws Error if database is corrupt, table schema invalid, or dataset exceeds 30M points
   */
  static async loadSqliteFile(file: File, tableName?: string): Promise<{ pointData: PointData, tables: string[] }> {
    const sqlModule = await ensureSqlInitialized()

    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        try {
          // Create Uint8Array from ArrayBuffer and initialize SQLite database
          const uint8Array = new Uint8Array(e.target?.result as ArrayBuffer)
          const db = new sqlModule.Database(uint8Array)

          // List tables to verify database integrity
          const tableResults = db.exec("SELECT name FROM sqlite_master WHERE type='table'")
          
          if (!tableResults || tableResults.length === 0) {
            throw new Error('Database corrupt or unreadable')
          }

          const tables = this.getTableList(db)

          // If no table specified, return empty pointData with table list
          if (!tableName) {
            resolve({
              pointData: {
                positions: new Float32Array(0),
                clusterIds: new Float32Array(0),
                tagIndices: null,
                imageIndices: null,
                tagLookup: null,
                imageLookup: null,
                count: 0
              },
              tables
            })
            return
          }

          // Validate table schema and check for cluster column
          const tableInfo = validateTableSchema(db, tableName)

          // Check row count and enforce 30M point limit
          const countResults = db.exec(`SELECT COUNT(*) FROM ${tableName}`)
          const count = countResults[0].values[0][0] as number

          if (count > 30_000_000) {
            throw new Error(`Dataset too large: ${count} points (max 30,000,000)`)
          }

          // Pre-allocate Float32Arrays for WebGL
          const positions = new Float32Array(count * 3)
          const clusterIds = new Float32Array(count)
          let index = 0

          // Process rows incrementally with db.each() to avoid loading all data into memory at once
          db.each(
            `SELECT x, y, z${tableInfo.hasCluster ? ', cluster' : ''} FROM ${tableName}`,
            {},
            (row: any) => {
              // Row is object with column names as keys, not array
              positions[index * 3] = row.x as number
              positions[index * 3 + 1] = row.y as number
              positions[index * 3 + 2] = row.z as number
              clusterIds[index] = tableInfo.hasCluster ? (row.cluster as number ?? -1) : -1
              index++
            },
            () => {
              // Done callback
              resolve({
                pointData: {
                  positions,
                  clusterIds,
                  tagIndices: null,
                  imageIndices: null,
                  tagLookup: null,
                  imageLookup: null,
                  count
                },
                tables
              })
            }
          )
        } catch (error) {
          reject(error)
        }
      }

      reader.onerror = () => {
        const error = new Error('Failed to read database file')
        console.error('FileReader error:', reader.error)
        reject(error)
      }

      reader.readAsArrayBuffer(file)
    })
  }

  /**
   * Helper method to list all tables in a SQLite database
   * Queries sqlite_master system table to discover available tables
   *
   * @param db - SQLite Database instance from sql.js
   * @returns Array of table names
   */
  static getTableList(db: any): string[] {
    const tableResults = db.exec("SELECT name FROM sqlite_master WHERE type='table'")
    
    if (!tableResults || tableResults.length === 0) {
      return []
    }

    // Map values array to string array of table names
    return tableResults[0].values.map((row: unknown[]) => row[0] as string)
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
      tagIndices: null,
      imageIndices: null,
      tagLookup: null,
      imageLookup: null,
      count: totalPoints
    }
  }
}
