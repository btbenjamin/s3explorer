import {
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  S3Client,
  _Object,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const envSchema = z.object({
  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().min(1),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  S3_BUCKET: z.string().min(1),
})

const env = envSchema.parse({
  S3_ENDPOINT: process.env.S3_ENDPOINT || "https://s3.gra.io.cloud.ovh.net",
  S3_REGION: process.env.S3_REGION || "gra",
  S3_ACCESS_KEY: process.env.S3_ACCESS_KEY || "xxxxx",
  S3_SECRET_KEY: process.env.S3_SECRET_KEY || "xxxxx",
  S3_BUCKET: process.env.S3_BUCKET || "xxxx-bucket",
})

const s3 = new S3Client({
  region: env.S3_REGION,
  endpoint: env.S3_ENDPOINT,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY,
    secretAccessKey: env.S3_SECRET_KEY,
  },
  forcePathStyle: true,
})

const normalizePrefix = (prefix?: string) => {
  if (!prefix) return ''
  const trimmed = prefix.replace(/^\/+/, '')
  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`
}

const safeMapObjects = (objects: _Object[] = []) =>
  objects
    .filter((object): object is _Object & { Key: string } => Boolean(object.Key))
    .map((object) => ({
      key: object.Key,
      size: object.Size ?? 0,
      lastModified: object.LastModified?.toISOString(),
      etag: object.ETag,
    }))

const listRequestSchema = z.object({
  prefix: z.string().optional(),
  limit: z.number().int().positive().max(200).default(50),
  cursor: z.string().optional(),
})

export const listObjects = createServerFn({ method: 'GET' })
  .inputValidator((input: unknown) => listRequestSchema.parse(input))
  .handler(async ({ data }) => {
    const prefix = normalizePrefix(data.prefix)

    const response = await s3.send(
      new ListObjectsV2Command({
        Bucket: env.S3_BUCKET,
        Prefix: prefix || undefined,
        Delimiter: '/',
        ContinuationToken: data.cursor,
        MaxKeys: data.limit,
      }),
    )

    const objects = safeMapObjects(response.Contents)
      .sort((a, b) => {
        if (!a.lastModified && !b.lastModified) return 0
        if (!a.lastModified) return 1
        if (!b.lastModified) return -1
        return a.lastModified > b.lastModified ? -1 : 1
      })
      .slice(0, data.limit)

    const folders = (response.CommonPrefixes ?? [])
      .map((entry) => entry.Prefix?.replace(prefix, '') ?? '')
      .filter((name) => Boolean(name) && name !== prefix)
      .map((name) => ({
        name: name.replace(/\/$/, ''),
        prefix: `${prefix}${name}`,
      }))

    return {
      prefix,
      objects,
      folders,
      isTruncated: Boolean(response.IsTruncated),
      nextCursor: response.NextContinuationToken ?? null,
    }
  })

const objectAccessSchema = z.object({
  key: z.string().min(1),
  disposition: z.enum(['inline', 'attachment']).default('inline'),
})

export const getObjectAccess = createServerFn({ method: 'GET' })
  .inputValidator((input: unknown) => objectAccessSchema.parse(input))
  .handler(async ({ data }) => {
    const head = await s3.send(
      new HeadObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: data.key,
      }),
    )

    const signedUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: data.key,
        ResponseContentDisposition:
          data.disposition === 'attachment' ? 'attachment' : 'inline',
        ResponseContentType: head.ContentType,
      }),
      { expiresIn: 300 },
    )

    return {
      key: data.key,
      signedUrl,
      contentType: head.ContentType ?? 'application/octet-stream',
      contentLength: head.ContentLength ?? 0,
      lastModified: head.LastModified?.toISOString(),
    }
  })
