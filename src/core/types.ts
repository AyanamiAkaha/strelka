export interface JsonPoint {
  x: number
  y: number
  z: number
  cluster?: number | null
  tag?: string | null
  image?: string | null
}

export interface TableInfo {
  name: string
  hasCluster: boolean
  hasTag: boolean
  hasImage: boolean
}

export interface SqliteQueryResult {
  columns: string[]
  values: unknown[][]
}
