import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

const MAX_IMAGE_DIMENSION = 1440;
const DEFAULT_SAVE_COMPRESS = 0.75;

type ProcessableAsset = {
  uri: string;
  width?: number;
  height?: number;
};

export async function optimizeImageForUpload(asset: ProcessableAsset): Promise<string> {
  const width = asset.width ?? 0;
  const height = asset.height ?? 0;
  const longestEdge = Math.max(width, height);
  const needsResize = longestEdge === 0 || longestEdge > MAX_IMAGE_DIMENSION;

  try {
    const context = ImageManipulator.manipulate(asset.uri);

    // 메타데이터가 없거나(0) 너무 큰 경우 무조건 리사이즈로 풀해상도 유출을 방지
    if (needsResize) {
      if (height > width) {
        context.resize({ height: MAX_IMAGE_DIMENSION });
      } else {
        context.resize({ width: MAX_IMAGE_DIMENSION });
      }
    }

    const ref = await context.renderAsync();
    const result = await ref.saveAsync({
      compress: DEFAULT_SAVE_COMPRESS,
      format: SaveFormat.JPEG,
    });
    return result.uri;
  } catch (e) {
    console.warn('[optimizeImageForUpload] fallback to original uri:', e);
    return asset.uri;
  }
}
