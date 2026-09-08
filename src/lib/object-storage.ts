import { randomUUID } from "node:crypto";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

type UploadInput = {
  body: Uint8Array;
  contentType: string;
  filename?: string;
  prefix: string;
};

type StoredObject = {
  body: Uint8Array;
  contentLength: number;
  contentType: string;
};

let client: S3Client | undefined;

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`La variable ${name} es obligatoria para usar el bucket`);
  return value;
}

function bucketName() {
  return required("AWS_S3_BUCKET_NAME");
}

function storageClient() {
  if (!client) {
    client = new S3Client({
      credentials: {
        accessKeyId: required("AWS_ACCESS_KEY_ID"),
        secretAccessKey: required("AWS_SECRET_ACCESS_KEY"),
      },
      endpoint: required("AWS_ENDPOINT_URL"),
      forcePathStyle: process.env.AWS_S3_URL_STYLE === "path",
      region: process.env.AWS_DEFAULT_REGION?.trim() || "auto",
    });
  }
  return client;
}

function extension(contentType: string, filename?: string) {
  const fromName = filename?.match(/\.([a-zA-Z0-9]{1,10})$/)?.[1]?.toLowerCase();
  if (fromName) return fromName === "jpeg" ? "jpg" : fromName;
  return (
    (
      { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" } as Record<
        string,
        string
      >
    )[contentType] ?? "bin"
  );
}

export function decodeDataImage(value: string) {
  const match = /^data:(image\/(?:webp|png|jpeg));base64,([A-Za-z0-9+/=]+)$/.exec(value);
  if (!match) throw new Error("IMAGE_DATA_INVALID");
  return { body: Buffer.from(match[2], "base64"), contentType: match[1] };
}

export async function uploadObject({ body, contentType, filename, prefix }: UploadInput) {
  const key = `${prefix.replace(/^\/+|\/+$/g, "")}/${randomUUID()}.${extension(contentType, filename)}`;
  await storageClient().send(
    new PutObjectCommand({
      Bucket: bucketName(),
      Body: body,
      ContentType: contentType,
      Key: key,
    }),
  );
  return key;
}

export async function getObject(key: string): Promise<StoredObject> {
  const object = await storageClient().send(new GetObjectCommand({ Bucket: bucketName(), Key: key }));
  if (!object.Body) throw new Error("BUCKET_OBJECT_EMPTY");
  const body = await object.Body.transformToByteArray();
  return {
    body,
    contentLength: object.ContentLength ?? body.length,
    contentType: object.ContentType ?? "application/octet-stream",
  };
}

export async function deleteObject(key: string) {
  await storageClient().send(new DeleteObjectCommand({ Bucket: bucketName(), Key: key }));
}

export async function deleteObjectsBestEffort(keys: Array<string | null | undefined>) {
  await Promise.allSettled(keys.filter((key): key is string => Boolean(key)).map(deleteObject));
}
