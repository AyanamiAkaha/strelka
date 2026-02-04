import { JsonPoint } from './types'
import { PointData } from './DataProvider'
import { TableInfo } from './types'

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

  // Check tag field if present: must be string or null
  if ('tag' in p) {
    if (p.tag !== null && typeof p.tag !== 'string') {
      return `Point ${index} has invalid tag (must be string or null, got ${typeof p.tag})`
    }
  }

  // Check image field if present: must be string or null
  if ('image' in p) {
    if (p.image !== null && typeof p.image !== 'string') {
      return `Point ${index} has invalid image (must be string or null, got ${typeof p.image})`
    }
  }

  return null
}

/**
 * Helper to normalize optional values to null
 * @param value - Unknown value to normalize
 * @returns null if value is undefined, null, or ""; otherwise returns string value
 */
function normalizeOptionalValue(value: unknown): string | null {
  if (value === undefined || value === null || value === "") {
    return null
  }
  return String(value)
}

/**
 * Parses JSON text and converts to WebGL-compatible Float32Array buffers
 * @param jsonText - JSON string to parse
 * @returns PointData object with positions, clusterIds, optional tag/image indices and lookups, and count
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

    // Detect optional columns by checking first row
    const firstRow = data[0] as Record<string, unknown>
    const hasTag = 'tag' in firstRow
    const hasImage = 'image' in firstRow

    // Create maps for unique tag/image values (index-based storage)
    const tagLookup = hasTag ? new Map<string, number>() : null
    const imageLookup = hasImage ? new Map<string, number>() : null

    // On success, create Float32Array positions (length * 3) and clusterIds (length)
    const positions = new Float32Array(data.length * 3)
    const clusterIds = new Float32Array(data.length)

    // Allocate tag/image indices if columns detected
    const tagIndices = hasTag ? new Float32Array(data.length) : null
    const imageIndices = hasImage ? new Float32Array(data.length) : null

    // First pass: populate maps with unique non-null tag/image values
    if (hasTag && tagLookup) {
      for (let i = 0; i < data.length; i++) {
        const point = data[i] as JsonPoint
        const tag = normalizeOptionalValue(point.tag)
        if (tag !== null && !tagLookup.has(tag)) {
          tagLookup.set(tag, tagLookup.size)
        }
      }
    }

    if (hasImage && imageLookup) {
      for (let i = 0; i < data.length; i++) {
        const point = data[i] as JsonPoint
        const image = normalizeOptionalValue(point.image)
        if (image !== null && !imageLookup.has(image)) {
          imageLookup.set(image, imageLookup.size)
        }
      }
    }

    // Second pass: fill all arrays
    for (let i = 0; i < data.length; i++) {
      const point = data[i] as JsonPoint
      positions[i * 3] = point.x
      positions[i * 3 + 1] = point.y
      positions[i * 3 + 2] = point.z

      // Fill clusterIds: use cluster value or -1 (noise) if missing/null
      const clusterId = (point.cluster === undefined || point.cluster === null) ? -1 : point.cluster
      clusterIds[i] = clusterId

      // Fill tag/image indices using maps
      if (hasTag && tagIndices && tagLookup) {
        const tag = normalizeOptionalValue(point.tag)
        tagIndices[i] = tag !== null ? tagLookup.get(tag)! : -1
      }

      if (hasImage && imageIndices && imageLookup) {
        const image = normalizeOptionalValue(point.image)
        imageIndices[i] = image !== null ? imageLookup.get(image)! : -1
      }
    }

    return {
      positions,
      clusterIds,
      tagIndices,
      imageIndices,
      tagLookup,
      imageLookup,
      count: data.length
    }
  } catch (error) {
    // Catch errors and console.error() before re-throwing
    console.error('JSON parsing failed:', error)
    throw error
  }
}

/**
 * Validates SQLite table schema for required columns and cluster presence
 * @param db - SQLite Database instance from sql.js
 * @param tableName - Name of the table to validate
 * @returns TableInfo object with table name and hasCluster boolean
 * @throws Error if table not found or missing required columns
 */
export function validateTableSchema(db: any, tableName: string): TableInfo {
  // Query table schema using PRAGMA table_info
  const pragmaResults = db.exec(`PRAGMA table_info(${tableName})`)

  // Check if table exists (no results = table not found)
  if (!pragmaResults || pragmaResults.length === 0) {
    throw new Error(`Table not found: ${tableName}`)
  }

  // Extract column names from PRAGMA result (column index 1: 'name')
  const schemaResult = pragmaResults[0]
  const columnNames = schemaResult.values.map((row: unknown[]) => row[1] as string)

  // Check for required columns: x, y, z
  const requiredColumns = ['x', 'y', 'z']
  const missingColumns = requiredColumns.filter(col => !columnNames.includes(col))

  if (missingColumns.length > 0) {
    throw new Error(
      `Table must have x, y, z columns. Table ${tableName} missing: ${missingColumns.join(', ')}`
    )
  }

  // Check if cluster column exists (optional)
  const hasCluster = columnNames.includes('cluster')

  // Check if tag and image columns exist (optional)
  const hasTag = columnNames.includes('tag')
  const hasImage = columnNames.includes('image')

  return {
    name: tableName,
    hasCluster,
    hasTag,
    hasImage
  }
}

