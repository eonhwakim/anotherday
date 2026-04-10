import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabaseClient';
import {
  STORAGE_BUCKETS,
  STORAGE_CACHE_CONTROL,
  STORAGE_FOLDERS,
} from '../constants/storage';
import { requireAuthenticatedUserId } from '../lib/auth';
import { buildUploadObjectPath, prepareImageUpload } from '../lib/storageUpload';
import { ServiceError } from '../lib/serviceError';
import type { User } from '../types/domain';

/**
 * 사용자 프로필 정보 수정
 */
export async function updateProfile(
  userId: string,
  updates: {
    nickname?: string;
    name?: string | null;
    gender?: string | null;
    age?: number | null;
    profile_image_url?: string | null;
  }
): Promise<{ success: boolean; data?: User; error?: string }> {
  try {
    const actorUserId = await requireAuthenticatedUserId(userId);
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', actorUserId)
      .select()
      .single();

    if (error) {
      console.error('updateProfile error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as User };
  } catch (e) {
    console.error('updateProfile failed:', e);
    return {
      success: false,
      error: e instanceof ServiceError ? e.userMessage : e instanceof Error ? e.message : String(e),
    };
  }
}

/**
 * 프로필 이미지 업로드
 * (기존 checkin-photos 버킷 사용, profiles/{userId}/ 경로에 저장)
 */
export async function uploadProfileImage(
  userId: string,
  imageUri: string
): Promise<string | null> {
  try {
    const actorUserId = await requireAuthenticatedUserId(userId);
    const { arrayBuffer, contentType, extension } = await prepareImageUpload(imageUri);
    const fileName = buildUploadObjectPath(
      STORAGE_FOLDERS.PROFILES,
      actorUserId,
      `${Date.now()}.${extension}`,
    );

    // checkin-photos 버킷 재사용 (없으면 생성 필요)
    const { error } = await supabase.storage
      .from(STORAGE_BUCKETS.CHECKIN_PHOTOS)
      .upload(fileName, arrayBuffer, {
        contentType,
        cacheControl: STORAGE_CACHE_CONTROL,
        upsert: false,
      });

    if (error) {
      console.error('Profile image upload error:', error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKETS.CHECKIN_PHOTOS)
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (e) {
    console.error('Profile image upload failed:', e);
    return null;
  }
}

/**
 * 갤러리에서 이미지 선택
 */
export async function pickProfileImage(): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    alert('갤러리 접근 권한이 필요합니다.');
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
    base64: false, // base64 불필요
  });

  if (result.canceled || !result.assets[0]) {
    return null;
  }

  return result.assets[0].uri;
}
