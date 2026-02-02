export interface JsonPoint {
  x: number
  y: number
  z: number
  cluster?: number | null
}

export interface TableInfo {
  name: string
  hasCluster: boolean
}

export interface SqliteQueryResult {
  columns: string[]
  values: unknown[][]
}
