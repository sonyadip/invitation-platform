import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const r2AccountId =
  (typeof process !== 'undefined' ? process.env.R2_ACCOUNT_ID : '') ||
  (import.meta as any).env?.R2_ACCOUNT_ID;

const r2AccessKeyId =
  (typeof process !== 'undefined' ? process.env.R2_ACCESS_KEY_ID : '') ||
  (import.meta as any).env?.R2_ACCESS_KEY_ID;

const r2SecretAccessKey =
  (typeof process !== 'undefined' ? process.env.R2_SECRET_ACCESS_KEY : '') ||
  (import.meta as any).env?.R2_SECRET_ACCESS_KEY;

const r2BucketName =
  (typeof process !== 'undefined' ? process.env.R2_BUCKET_NAME : '') ||
  (import.meta as any).env?.R2_BUCKET_NAME ||
  'senadda-media';

const r2PublicUrl = (
  (typeof process !== 'undefined' ? process.env.R2_PUBLIC_URL : '') ||
  (import.meta as any).env?.R2_PUBLIC_URL ||
  'https://media.senadda.id'
).replace(/\/$/, '');

const useR2 =
  (typeof process !== 'undefined' ? process.env.USE_R2_STORAGE : '') ||
  (import.meta as any).env?.USE_R2_STORAGE;

export const isR2Configured = Boolean(
  useR2 === 'true' && r2AccountId && r2AccessKeyId && r2SecretAccessKey
);

let s3ClientInstance: S3Client | null = null;

export function getR2Client(): S3Client {
  if (!s3ClientInstance) {
    if (!isR2Configured) {
      throw new Error('Cloudflare R2 credentials are not configured in environment variables.');
    }
    s3ClientInstance = new S3Client({
      region: 'auto',
      endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: r2AccessKeyId!,
        secretAccessKey: r2SecretAccessKey!
      }
    });
  }
  return s3ClientInstance;
}

export async function uploadToR2(
  path: string,
  data: ArrayBuffer | Uint8Array | Buffer,
  contentType: string
): Promise<string> {
  const client = getR2Client();
  const body = Buffer.isBuffer(data) ? data : Buffer.from(data);

  await client.send(
    new PutObjectCommand({
      Bucket: r2BucketName,
      Key: path,
      Body: body,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable'
    })
  );

  return `${r2PublicUrl}/${path}`;
}

export async function deleteFromR2(path: string): Promise<void> {
  const client = getR2Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: r2BucketName,
      Key: path
    })
  );
}
