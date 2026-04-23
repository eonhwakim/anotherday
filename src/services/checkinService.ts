import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabaseClient';
import { STORAGE_BUCKETS, STORAGE_CACHE_CONTROL } from '../constants/storage';
import { requireAuthenticatedUserId } from '../lib/auth';
import { buildUploadObjectPath, prepareImageUpload } from '../lib/storageUpload';
import { runSingleFlight } from '../lib/requestCache';
import { ServiceError } from '../lib/serviceError';

// ─── 사진 인증 관련 서비스 ─────────────────────────────────────

/** 카메라/갤러리에서 이미지 선택 */
export async function pickImage(): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    throw new ServiceError(
      '사진 라이브러리 권한이 필요합니다. 앱 설정에서 권한을 허용해주세요.',
      'pickImage',
      'media library permission denied',
    );
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });

  if (result.canceled || !result.assets[0]) {
    return null;
  }

  return result.assets[0].uri;
}

/** 카메라로 사진 촬영 */
export async function takePhoto(): Promise<string | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    throw new ServiceError(
      '카메라 권한이 필요합니다. 앱 설정에서 카메라 권한을 허용해주세요.',
      'takePhoto',
      'camera permission denied',
    );
  }

  try {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled || !result.assets?.[0]) {
      return null;
    }
    return result.assets[0].uri;
  } catch (error) {
    throw new ServiceError(
      '카메라를 실행하지 못했습니다. 잠시 후 다시 시도해주세요.',
      'takePhoto',
      error instanceof Error ? error.message : 'camera launch failed',
    );
  }
}

const UPLOAD_TIMEOUT_MS = 30_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`사진 업로드 시간이 초과되었습니다. (${ms / 1000}초)`)), ms),
    ),
  ]);
}

export interface UploadedCheckinPhoto {
  objectPath: string;
  publicUrl: string;
}

/** Supabase Storage에 이미지 업로드 후 파일 경로와 public URL 반환 */
export async function uploadCheckinPhotoAsset(
  userId: string,
  imageUri: string,
): Promise<UploadedCheckinPhoto> {
  // 더블탭·중복 클릭 방어: 같은 (userId, imageUri) 조합은 단일 업로드로 병합
  return runSingleFlight(`uploadCheckinPhoto:${userId}:${imageUri}`, async () => {
    const actorUserId = await requireAuthenticatedUserId(userId);
    const { arrayBuffer, contentType, extension } = await prepareImageUpload(imageUri);
    const objectPath = buildUploadObjectPath(actorUserId, `${Date.now()}.${extension}`);

    try {
      const { error } = await withTimeout(
        supabase.storage.from(STORAGE_BUCKETS.CHECKIN_PHOTOS).upload(objectPath, arrayBuffer, {
          contentType,
          cacheControl: STORAGE_CACHE_CONTROL,
          upsert: false,
        }),
        UPLOAD_TIMEOUT_MS,
      );

      if (error) {
        throw new ServiceError(
          '사진을 서버에 저장하지 못했습니다. 잠시 후 다시 시도해주세요.',
          'uploadCheckinPhoto',
          error.message,
        );
      }

      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKETS.CHECKIN_PHOTOS)
        .getPublicUrl(objectPath);

      return {
        objectPath,
        publicUrl: urlData.publicUrl,
      };
    } catch (error) {
      if (error instanceof ServiceError) {
        throw error;
      }

      throw new ServiceError(
        '사진 업로드에 실패했습니다. 네트워크 상태를 확인해주세요.',
        'uploadCheckinPhoto',
        error instanceof Error ? error.message : 'unknown upload error',
      );
    }
  });
}

/** 이전 호출부 호환용 */
export async function uploadCheckinPhoto(userId: string, imageUri: string): Promise<string> {
  const uploaded = await uploadCheckinPhotoAsset(userId, imageUri);
  return uploaded.publicUrl;
}

export async function deleteCheckinPhoto(objectPath: string): Promise<void> {
  const { error } = await supabase.storage
    .from(STORAGE_BUCKETS.CHECKIN_PHOTOS)
    .remove([objectPath]);

  if (error) {
    throw new ServiceError(
      '업로드한 사진 정리에 실패했습니다.',
      'deleteCheckinPhoto',
      error.message,
    );
  }
}

// ─── 체크인/PASS DB 로직 ───────────────────────────────────────

/** 체크인 등록 (DONE) */
export async function submitCheckin(
  userId: string,
  goalId: string,
  date: string, // YYYY-MM-DD
  photoUrl: string | null,
  memo: string | null,
): Promise<boolean> {
  try {
    const actorUserId = await requireAuthenticatedUserId(userId);
    const { error } = await supabase.from('checkins').insert({
      user_id: actorUserId,
      goal_id: goalId,
      date,
      photo_url: photoUrl,
      memo,
      status: 'done',
    });

    if (error) {
      console.error('submitCheckin error:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('submitCheckin failed:', e);
    return false;
  }
}
