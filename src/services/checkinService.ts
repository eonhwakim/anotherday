import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabaseClient';

// ─── 사진 인증 관련 서비스 ─────────────────────────────────────

/** 카메라/갤러리에서 이미지 선택 */
export async function pickImage(): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
    base64: true,
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
    return null;
  }

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
    base64: true,
  });

  if (result.canceled || !result.assets[0]) {
    return null;
  }

  return result.assets[0].uri;
}

/** Supabase Storage에 이미지 업로드 후 public URL 반환 */
export async function uploadCheckinPhoto(
  userId: string,
  imageUri: string
): Promise<string | null> {
  try {
    const fileName = `${userId}/${Date.now()}.jpg`;

    // URI에서 fetch하여 blob으로 변환
    const response = await fetch(imageUri);
    const blob = await response.blob();

    // blob → arraybuffer
    const arrayBuffer = await new Response(blob).arrayBuffer();

    const { error } = await supabase.storage
      .from('checkin-photos')
      .upload(fileName, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (error) {
      console.error('Upload error:', error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('checkin-photos')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (e) {
    console.error('Upload failed:', e);
    return null;
  }
}
