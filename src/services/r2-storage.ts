import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

function getEnv(name: string, runtimeEnv?: Record<string, string | undefined>): string {
  return (
    runtimeEnv?.[name] ||
    (typeof process !== 'undefined' ? process.env[name] : '') ||
    (import.meta as any).env?.[name] ||
    ''
  );
}

function getR2Config(runtimeEnv?: Record<string, string | undefined>) {
  const accountId = getEnv('R2_ACCOUNT_ID', runtimeEnv);
  const accessKeyId = getEnv('R2_ACCESS_KEY_ID', runtimeEnv);
  const secretAccessKey = getEnv('R2_SECRET_ACCESS_KEY', runtimeEnv);
  const bucketName = getEnv('R2_BUCKET_NAME', runtimeEnv) || 'senadda-media';
  const publicUrl = (getEnv('R2_PUBLIC_URL', runtimeEnv) || 'https://media.senadda.id').replace(/\/$/, '');
  const useR2 = getEnv('USE_R2_STORAGE', runtimeEnv);
  const configured = Boolean(useR2 === 'true' && accountId && accessKeyId && secretAccessKey);

  return { accountId, accessKeyId, secretAccessKey, bucketName, publicUrl, configured };
}

export function isR2StorageConfigured(runtimeEnv?: Record<string, string | undefined>): boolean {
  return getR2Config(runtimeEnv).configured;
}

export const isR2Configured = getR2Config().configured;

let s3ClientInstance: S3Client | null = null;
let s3ClientKey = '';

export function getR2Client(runtimeEnv?: Record<string, string | undefined>): S3Client {
  const cfg = getR2Config(runtimeEnv);
  if (!cfg.configured) {
    throw new Error('Cloudflare R2 credentials are not configured in environment variables.');
  }

  const key = `${cfg.accountId}::${cfg.accessKeyId}::${cfg.secretAccessKey}`;
  if (!s3ClientInstance || s3ClientKey !== key) {
    s3ClientInstance = new S3Client({
      region: 'auto',
      endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey
      }
    });
    s3ClientKey = key;
  }
  return s3ClientInstance;
}

export async function uploadToR2(
  path: string,
  data: ArrayBuffer | Uint8Array | Buffer,
  contentType: string,
  runtimeEnv?: Record<string, string | undefined>
): Promise<string> {
  const cfg = getR2Config(runtimeEnv);
  const client = getR2Client(runtimeEnv);
  const body = Buffer.isBuffer(data) ? data : Buffer.from(data as any);

  await client.send(
    new PutObjectCommand({
      Bucket: cfg.bucketName,
      Key: path,
      Body: body,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable'
    })
  );

  return `${cfg.publicUrl}/${path}`;
}

export async function deleteFromR2(
  path: string,
  runtimeEnv?: Record<string, string | undefined>
): Promise<void> {
  const cfg = getR2Config(runtimeEnv);
  const client = getR2Client(runtimeEnv);
  await client.send(
    new DeleteObjectCommand({
      Bucket: cfg.bucketName,
      Key: path
    })
  );
}
