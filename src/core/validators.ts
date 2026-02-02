import { JsonPoint } from './types'
import { PointData } from './DataProvider'

/**
 * Validates a single JSON point object
 * @param point - Unknown value to validate as a point
 * @param index - Index of the point in the array (for error messages)
 * @returns null if valid, error string otherwise
 */
export function validateJsonPoint(point: unknown, index: number): string | null {
  // Check if point is a non-null object
  if (typeof point !== 'object' || point === null) {
    return `Point ${index} is not an object`
  }

  const p = point as Record<string, unknown>

  // Check for required coordinates: x, y, z must exist
  if (p.x === undefined || p.y === undefined || p.z === undefined) {
    return `Point ${index} missing required coordinates (x, y, z)`
  }

  // Type check: typeof x/y/z === 'number' (strict, no coercion)
  if (typeof p.x !== 'number') {
    return `Point ${index} has non-number x coordinate (type: ${typeof p.x})`
  }
  if (typeof p.y !== 'number') {
    return `Point ${index} has non-number y coordinate (type: ${typeof p.y})`
  }
  if (typeof p.z !== 'number') {
    return `Point ${index} has non-number z coordinate (type: ${typeof p.z})`
  }

  // Check cluster field if present: must be number or null
  if ('cluster' in p) {
    if (p.cluster !== null && typeof p.cluster !== 'number') {
      return `Point ${index} has invalid cluster ID (must be number or null, got ${typeof p.cluster})`
    }
    // -1 and null are valid noise cluster values
  }

  return null
}

/**
 * Parses JSON text and converts to WebGL-compatible Float32Array buffers
 * @param jsonText - JSON string to parse
 * @returns PointData object with positions, clusterIds, and count
 * @throws Error if JSON is invalid or violates constraints
 */
export function parseJsonData(jsonText: string): PointData {
  try {
    const data = JSON.parse(jsonText) as unknown[]

    // Check if result is array, else throw error
    if (!Array.isArray(data)) {
      throw new Error('JSON must be an array of points')
    }

    // Check array length > 30M point limit
    if (data.length > 30_000_000) {
      throw new Error(`Dataset too large: ${data.length} points (max 30,000,000)`)
    }

    // Validate each point
    for (let i = 0; i < data.length; i++) {
      const error = validateJsonPoint(data[i], i)
      if (error) {
        throw new Error(error)
      }
    }

    // On success, create Float32Array positions (length * 3) and clusterIds (length)
    const positions = new Float32Array(data.length * 3)
    const clusterIds = new Float32Array(data.length)

    // Fill buffers and clusterIds
    for (let i = 0; i < data.length; i++) {
      const point = data[i] as JsonPoint
      positions[i * 3] = point.x
      positions[i * 3 + 1] = point.y
      positions[i * 3 + 2] = point.z

      // Fill clusterIds: use cluster value or -1 (noise) if missing/null
      const clusterId = (point.cluster === undefined || point.cluster === null) ? -1 : point.cluster
      clusterIds[i] = clusterId
    }

    return {
      positions,
      clusterIds,
      count: data.length
    }
  } catch (error) {
    // Catch errors and console.error() before re-throwing
    console.error('JSON parsing failed:', error)
    throw error
  }
}
