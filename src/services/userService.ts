import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabaseClient';
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
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('updateProfile error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as User };
  } catch (e) {
    console.error('updateProfile failed:', e);
    return { success: false, error: e instanceof Error ? e.message : String(e) };
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
    // 파일명: profiles/{userId}/{timestamp}.jpg
    const fileName = `profiles/${userId}/${Date.now()}.jpg`;

    const response = await fetch(imageUri);
    const blob = await response.blob();
    const arrayBuffer = await new Response(blob).arrayBuffer();

    // checkin-photos 버킷 재사용 (없으면 생성 필요)
    const { error } = await supabase.storage
      .from('checkin-photos')
      .upload(fileName, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (error) {
      console.error('Profile image upload error:', error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('checkin-photos')
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
