import { ServiceError } from './serviceError';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

const EXTENSION_TO_MIME: Record<string, keyof typeof MIME_TO_EXTENSION> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
};

function inferMimeType(imageUri: string, blobType?: string): keyof typeof MIME_TO_EXTENSION | null {
  if (blobType && blobType in MIME_TO_EXTENSION) {
    return blobType as keyof typeof MIME_TO_EXTENSION;
  }

  const normalizedUri = imageUri.split('?')[0].toLowerCase();
  const extension = normalizedUri.split('.').pop();
  if (!extension) return null;

  return EXTENSION_TO_MIME[extension] ?? null;
}

export async function prepareImageUpload(imageUri: string): Promise<{
  arrayBuffer: ArrayBuffer;
  contentType: keyof typeof MIME_TO_EXTENSION;
  extension: string;
  size: number;
}> {
  const response = await fetch(imageUri);
  if (!response.ok) {
    throw new ServiceError(
      '이미지 파일을 읽지 못했습니다.',
      'prepareImageUpload',
      `fetch failed for ${imageUri}`,
    );
  }

  const blob = await response.blob();
  const contentType = inferMimeType(imageUri, blob.type);
  if (!contentType) {
    throw new ServiceError(
      'JPG, PNG, WEBP, HEIC 이미지 파일만 업로드할 수 있습니다.',
      'prepareImageUpload',
      `unsupported mime type: ${blob.type || 'unknown'}`,
    );
  }

  if (blob.size > MAX_UPLOAD_BYTES) {
    throw new ServiceError(
      '이미지 용량은 5MB 이하만 업로드할 수 있습니다.',
      'prepareImageUpload',
      `file size ${blob.size} exceeds ${MAX_UPLOAD_BYTES}`,
    );
  }

  return {
    arrayBuffer: await blob.arrayBuffer(),
    contentType,
    extension: MIME_TO_EXTENSION[contentType],
    size: blob.size,
  };
}

export function buildUploadObjectPath(...parts: string[]): string {
  return parts
    .map((part) => part.trim())
    .filter(Boolean)
    .join('/');
}
