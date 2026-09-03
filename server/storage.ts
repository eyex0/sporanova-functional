import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from "./_core/env";

let client: S3Client | null = null;

function storageConfig() {
  if (!ENV.storage.bucket) throw new Error("S3_BUCKET is not configured");
  if (!ENV.storage.accessKeyId || !ENV.storage.secretAccessKey) throw new Error("S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY are required");
  return ENV.storage;
}

function getClient() {
  if (!client) {
    const config = storageConfig();
    client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle,
      credentials: { accessKeyId: config.accessKeyId!, secretAccessKey: config.secretAccessKey! },
    });
  }
  return client;
}

function normalizeKey(value: string) {
  return value.replace(/^\/+/, "").replace(/\.\./g, "_").replace(/[\x00-\x1f]/g, "_");
}

function versionedKey(value: string) {
  const normalized = normalizeKey(value);
  const dot = normalized.lastIndexOf(".");
  const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
  return dot === -1 ? `${normalized}-${suffix}` : `${normalized.slice(0, dot)}-${suffix}${normalized.slice(dot)}`;
}

export async function storagePut(relKey: string, data: Buffer | Uint8Array | string, contentType = "application/octet-stream") {
  const config = storageConfig();
  const key = versionedKey(relKey);
  await getClient().send(new PutObjectCommand({ Bucket: config.bucket, Key: key, Body: data, ContentType: contentType }));
  return { key, url: await storageGetSignedUrl(key) };
}

export async function storageGet(relKey: string) {
  const key = normalizeKey(relKey);
  return { key, url: await storageGetSignedUrl(key) };
}

export async function storageGetSignedUrl(relKey: string, expiresIn = 900) {
  const config = storageConfig();
  return getSignedUrl(getClient(), new GetObjectCommand({ Bucket: config.bucket, Key: normalizeKey(relKey) }), { expiresIn });
}

export async function storageDelete(relKey: string) {
  const config = storageConfig();
  await getClient().send(new DeleteObjectCommand({ Bucket: config.bucket, Key: normalizeKey(relKey) }));
}
