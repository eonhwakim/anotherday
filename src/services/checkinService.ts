import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabaseClient';
import { STORAGE_BUCKETS, STORAGE_CACHE_CONTROL } from '../constants/storage';
import { requireAuthenticatedUserId } from '../lib/auth';
import { buildUploadObjectPath, prepareImageUpload } from '../lib/storageUpload';
import { Alert } from 'react-native';

// ─── 사진 인증 관련 서비스 ─────────────────────────────────────

/** 카메라/갤러리에서 이미지 선택 */
export async function pickImage(): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('권한 필요', '사진 라이브러리 접근 권한이 필요합니다.');
    return null;
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

/** 카메라로 사진 촬영 (카메라 불가 시 갤러리 fallback) */
export async function takePhoto(): Promise<string | null> {
  // 1) 카메라 먼저 시도
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status === 'granted') {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (result.canceled || !result.assets?.[0]) {
        return null;
      }
      return result.assets[0].uri;
    }
  } catch (e) {
    console.warn('[takePhoto] 카메라 사용 불가, 갤러리로 전환:', e instanceof Error ? e.message : e);
  }

  // 2) 카메라 사용 불가 → 갤러리에서 사진 선택
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '사진 라이브러리 접근 권한이 필요합니다.');
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled || !result.assets?.[0]) {
      return null;
    }
    return result.assets[0].uri;
  } catch (e2) {
    console.error('[takePhoto] 갤러리도 실행 실패:', e2);
    Alert.alert(
      '오류',
      '카메라와 갤러리 모두 사용할 수 없습니다.\n앱 설정에서 권한을 확인해주세요.',
    );
    return null;
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

/** Supabase Storage에 이미지 업로드 후 public URL 반환 — 실패 시 throw */
export async function uploadCheckinPhoto(userId: string, imageUri: string): Promise<string> {
  const actorUserId = await requireAuthenticatedUserId(userId);
  const { arrayBuffer, contentType, extension } = await prepareImageUpload(imageUri);
  const fileName = buildUploadObjectPath(actorUserId, `${Date.now()}.${extension}`);

  const { error } = await withTimeout(
    supabase.storage.from(STORAGE_BUCKETS.CHECKIN_PHOTOS).upload(fileName, arrayBuffer, {
      contentType,
      cacheControl: STORAGE_CACHE_CONTROL,
      upsert: false,
    }),
    UPLOAD_TIMEOUT_MS,
  );

  if (error) {
    throw new Error(error.message);
  }

  const { data: urlData } = supabase.storage
    .from(STORAGE_BUCKETS.CHECKIN_PHOTOS)
    .getPublicUrl(fileName);

  return urlData.publicUrl;
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
