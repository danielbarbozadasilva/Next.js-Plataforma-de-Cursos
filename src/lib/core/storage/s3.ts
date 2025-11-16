/**
 * Serviço de Storage - AWS S3
 *
 * Gerencia upload, download e armazenamento de arquivos (vídeos, imagens, PDFs)
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import path from "path";

// Configuração do cliente S3
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET_NAME = process.env.AWS_BUCKET_NAME || "";
const CLOUDFRONT_URL = process.env.AWS_CLOUDFRONT_URL; // CDN opcional

/**
 * Interface para resultado de upload
 */
export interface UploadResult {
  key: string;
  url: string;
  cdnUrl?: string;
  size: number;
  contentType: string;
}

/**
 * Tipos de arquivo permitidos
 */
export enum FileType {
  VIDEO = "video",
  IMAGE = "image",
  DOCUMENT = "document",
  ATTACHMENT = "attachment",
}

/**
 * Configuração de tipos MIME permitidos por tipo de arquivo
 */
const ALLOWED_MIME_TYPES: Record<FileType, string[]> = {
  [FileType.VIDEO]: [
    "video/mp4",
    "video/mpeg",
    "video/quicktime",
    "video/x-msvideo",
    "video/x-flv",
    "video/webm",
  ],
  [FileType.IMAGE]: [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
  ],
  [FileType.DOCUMENT]: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  [FileType.ATTACHMENT]: [
    "application/zip",
    "application/x-zip-compressed",
    "application/x-rar-compressed",
    "application/pdf",
  ],
};

/**
 * Tamanhos máximos por tipo (em bytes)
 */
const MAX_FILE_SIZE: Record<FileType, number> = {
  [FileType.VIDEO]: 5 * 1024 * 1024 * 1024, // 5 GB
  [FileType.IMAGE]: 10 * 1024 * 1024, // 10 MB
  [FileType.DOCUMENT]: 50 * 1024 * 1024, // 50 MB
  [FileType.ATTACHMENT]: 100 * 1024 * 1024, // 100 MB
};

/**
 * Gera um nome único para o arquivo
 */
function generateUniqueKey(
  fileType: FileType,
  originalName: string,
  userId?: string
): string {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(16).toString("hex");
  const extension = path.extname(originalName);
  const prefix = userId ? `${userId}/${fileType}` : fileType;

  return `${prefix}/${timestamp}-${randomString}${extension}`;
}

/**
 * Valida o tipo e tamanho do arquivo
 */
function validateFile(
  fileType: FileType,
  contentType: string,
  size: number
): void {
  // Valida tipo MIME
  const allowedTypes = ALLOWED_MIME_TYPES[fileType];
  if (!allowedTypes.includes(contentType)) {
    throw new Error(
      `Invalid file type. Allowed types: ${allowedTypes.join(", ")}`
    );
  }

  // Valida tamanho
  const maxSize = MAX_FILE_SIZE[fileType];
  if (size > maxSize) {
    throw new Error(
      `File too large. Maximum size: ${(maxSize / 1024 / 1024).toFixed(0)} MB`
    );
  }
}

/**
 * Upload de arquivo para S3
 */
export async function uploadFile(
  file: Buffer | Uint8Array,
  fileType: FileType,
  originalName: string,
  contentType: string,
  userId?: string
): Promise<UploadResult> {
  try {
    // Valida o arquivo
    validateFile(fileType, contentType, file.length);

    // Gera chave única
    const key = generateUniqueKey(fileType, originalName, userId);

    // Configura metadados
    const metadata: Record<string, string> = {
      originalName,
      uploadedAt: new Date().toISOString(),
    };

    if (userId) {
      metadata.userId = userId;
    }

    // Upload para S3
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: contentType,
      Metadata: metadata,
      // Configurações de segurança
      ServerSideEncryption: "AES256",
      // Cache control para CDN
      CacheControl: fileType === FileType.VIDEO ? "max-age=31536000" : "max-age=86400",
    });

    await s3Client.send(command);

    // Constrói URLs
    const url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    const cdnUrl = CLOUDFRONT_URL ? `${CLOUDFRONT_URL}/${key}` : undefined;

    return {
      key,
      url: cdnUrl || url,
      cdnUrl,
      size: file.length,
      contentType,
    };
  } catch (error) {
    console.error("Error uploading file to S3:", error);
    throw new Error("Failed to upload file");
  }
}

/**
 * Deleta arquivo do S3
 */
export async function deleteFile(key: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
    console.log(`File deleted from S3: ${key}`);
  } catch (error) {
    console.error("Error deleting file from S3:", error);
    throw new Error("Failed to delete file");
  }
}

/**
 * Gera URL assinada (presigned) para acesso temporário
 * Útil para vídeos privados
 */
export async function getSignedDownloadUrl(
  key: string,
  expiresIn = 3600
): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (error) {
    console.error("Error generating signed URL:", error);
    throw new Error("Failed to generate signed URL");
  }
}

/**
 * Gera URL assinada para upload direto do cliente
 * Permite upload sem passar pelo servidor Next.js
 */
export async function getSignedUploadUrl(
  fileType: FileType,
  fileName: string,
  contentType: string,
  userId?: string,
  expiresIn = 300 // 5 minutos
): Promise<{ uploadUrl: string; key: string }> {
  try {
    // Valida tipo de arquivo
    const allowedTypes = ALLOWED_MIME_TYPES[fileType];
    if (!allowedTypes.includes(contentType)) {
      throw new Error(`Invalid file type: ${contentType}`);
    }

    // Gera chave única
    const key = generateUniqueKey(fileType, fileName, userId);

    // Cria comando de upload
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType,
      ServerSideEncryption: "AES256",
    });

    // Gera URL assinada
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });

    return {
      uploadUrl,
      key,
    };
  } catch (error) {
    console.error("Error generating signed upload URL:", error);
    throw new Error("Failed to generate upload URL");
  }
}

/**
 * Verifica se um arquivo existe
 */
export async function fileExists(key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
    return true;
  } catch (error: any) {
    if (error.name === "NotFound") {
      return false;
    }
    throw error;
  }
}

/**
 * Obtém metadados de um arquivo
 */
export async function getFileMetadata(key: string) {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const response = await s3Client.send(command);

    return {
      contentType: response.ContentType,
      contentLength: response.ContentLength,
      lastModified: response.LastModified,
      metadata: response.Metadata,
    };
  } catch (error) {
    console.error("Error getting file metadata:", error);
    throw new Error("Failed to get file metadata");
  }
}

/**
 * Copia arquivo dentro do bucket (útil para backup)
 */
export async function copyFile(
  sourceKey: string,
  destinationKey: string
): Promise<void> {
  try {
    const { CopyObjectCommand } = await import("@aws-sdk/client-s3");

    const command = new CopyObjectCommand({
      Bucket: BUCKET_NAME,
      CopySource: `${BUCKET_NAME}/${sourceKey}`,
      Key: destinationKey,
    });

    await s3Client.send(command);
    console.log(`File copied: ${sourceKey} -> ${destinationKey}`);
  } catch (error) {
    console.error("Error copying file:", error);
    throw new Error("Failed to copy file");
  }
}
