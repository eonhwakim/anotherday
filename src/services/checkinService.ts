import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabaseClient';
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
  } catch (e: any) {
    // 시뮬레이터 등 카메라 하드웨어가 없는 경우 → 갤러리로 전환
    console.warn('[takePhoto] 카메라 사용 불가, 갤러리로 전환:', e?.message);
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

/** Supabase Storage에 이미지 업로드 후 public URL 반환 */
export async function uploadCheckinPhoto(userId: string, imageUri: string): Promise<string | null> {
  try {
    const fileName = `${userId}/${Date.now()}.jpg`;

    // React Native의 fetch로 로컬 파일을 읽어 ArrayBuffer로 변환 (외부 의존성 불필요)
    const response = await fetch(imageUri);
    const arrayBuffer = await response.arrayBuffer();

    const { error } = await supabase.storage.from('checkin-photos').upload(fileName, arrayBuffer, {
      contentType: 'image/jpeg',
      upsert: false,
    });

    if (error) {
      console.error('[Checkin] Upload error:', error.message);
      return null;
    }

    const { data: urlData } = supabase.storage.from('checkin-photos').getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (e) {
    console.error('[Checkin] Upload failed:', e);
    return null;
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
    const { error } = await supabase.from('checkins').insert({
      user_id: userId,
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
