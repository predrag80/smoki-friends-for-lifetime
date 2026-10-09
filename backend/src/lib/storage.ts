import {
  DeleteObjectsCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";

import { getEnv } from "../config/env.js";

let client: S3Client | null = null;

function getConfig() {
  const env = getEnv();
  if (!env.STORAGE_ENDPOINT || !env.STORAGE_BUCKET || !env.STORAGE_ACCESS_KEY_ID || !env.STORAGE_SECRET_ACCESS_KEY) {
    throw new Error("Object storage is not configured (STORAGE_* variables).");
  }
  return {
    bucket: env.STORAGE_BUCKET,
    client: (client ??= new S3Client({
      endpoint: env.STORAGE_ENDPOINT,
      region: env.STORAGE_REGION,
      forcePathStyle: env.STORAGE_FORCE_PATH_STYLE,
      credentials: { accessKeyId: env.STORAGE_ACCESS_KEY_ID, secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY }
    }))
  };
}

/** Private bucket only; files are served to their owner through GET /media/:id. */
export async function putObject(key: string, body: Buffer, contentType: string): Promise<void> {
  const { client, bucket } = getConfig();
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
}

export async function getObject(key: string): Promise<Buffer> {
  const { client, bucket } = getConfig();
  const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!response.Body) throw new Error(`Empty object body for ${key}`);
  return Buffer.from(await response.Body.transformToByteArray());
}

export async function deleteObjects(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const { client, bucket } = getConfig();
  for (let index = 0; index < keys.length; index += 1000) {
    const batch = keys.slice(index, index + 1000);
    await client.send(
      new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true } })
    );
  }
}

export function mediaKey(userId: string, kind: "source" | "photo" | "video" | "film", id: string, extension: string) {
  return `users/${userId}/${kind}/${id}.${extension}`;
}
