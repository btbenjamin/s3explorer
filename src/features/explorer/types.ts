export type ObjectSummary = {
  key: string
  size: number
  lastModified?: string
  etag?: string
}

export type FolderSummary = {
  name: string
  prefix: string
}

export type ExplorerResponse = {
  prefix: string
  objects: ObjectSummary[]
  folders: FolderSummary[]
  isTruncated: boolean
  nextCursor: string | null
}

export type ObjectAccess = {
  key: string
  signedUrl: string
  contentType: string
  contentLength: number
  lastModified?: string
}
