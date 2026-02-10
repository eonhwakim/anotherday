import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../stores/authStore';
import { pickProfileImage, uploadProfileImage, updateProfile } from '../../services/userService';
import { COLORS } from '../../constants/defaults';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

export default function ProfileEditScreen() {
  const navigation = useNavigation();
  const { user, refreshProfile, setUser } = useAuthStore();

  const [nickname, setNickname] = useState(user?.nickname || '');
  const [name, setName] = useState(user?.name || '');
  const [gender, setGender] = useState(user?.gender || '');
  const [age, setAge] = useState(user?.age?.toString() || '');
  const [imageUri, setImageUri] = useState(user?.profile_image_url || null);
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setNickname(user.nickname);
      setName(user.name || '');
      setGender(user.gender || '');
      setAge(user.age?.toString() || '');
      setImageUri(user.profile_image_url);
    }
  }, [user]);

  const handlePickImage = async () => {
    const uri = await pickProfileImage();
    if (uri) {
      setImageUri(uri);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if (!nickname.trim()) {
      Alert.alert('알림', '닉네임을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      let finalImageUrl = imageUri;

      if (imageUri && !imageUri.startsWith('http')) {
        const uploadedUrl = await uploadProfileImage(user.id, imageUri);
        if (uploadedUrl) {
          finalImageUrl = uploadedUrl;
        } else {
          Alert.alert('오류', '이미지 업로드에 실패했습니다.');
          setLoading(false);
          return;
        }
      }

      const updates = {
        nickname: nickname.trim(),
        name: name.trim() || null,
        gender: gender || null,
        age: age ? parseInt(age, 10) : null,
        profile_image_url: finalImageUrl,
      };

      const result = await updateProfile(user.id, updates);

      if (result.success && result.data) {
        setUser(result.data);
        navigation.goBack();
      } else {
        Alert.alert('실패', result.error || '프로필 수정 중 오류가 발생했습니다.');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('오류', '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.scroll}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.title}>프로필 수정</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.profileImageContainer}>
            <TouchableOpacity onPress={handlePickImage} style={styles.imageWrapper}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.profileImage} />
              ) : (
                <View style={[styles.profileImage, styles.placeholderImage]}>
                  <Ionicons name="person" size={36} color={COLORS.primaryLight} />
                </View>
              )}
              <View style={styles.cameraIcon}>
                <Ionicons name="camera" size={14} color="#FFF" />
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <Input
              label="닉네임"
              value={nickname}
              onChangeText={setNickname}
              placeholder="닉네임을 입력하세요"
            />
            
            <Input
              label="이름"
              value={name}
              onChangeText={setName}
              placeholder="이름을 입력하세요"
            />

            <Text style={styles.label}>성별</Text>
            <View style={styles.genderContainer}>
              {['남성', '여성'].map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[
                    styles.genderBtn,
                    gender === g && styles.genderBtnActive
                  ]}
                  onPress={() => setGender(g)}
                >
                  <Text style={[
                    styles.genderText,
                    gender === g && styles.genderTextActive
                  ]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Input
              label="나이"
              value={age}
              onChangeText={setAge}
              placeholder="나이를 입력하세요"
              keyboardType="number-pad"
            />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title="저장하기"
            onPress={handleSave}
            loading={loading}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  profileImageContainer: {
    alignItems: 'center',
    marginVertical: 28,
  },
  imageWrapper: {
    position: 'relative',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  placeholderImage: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.12)',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
  },
  form: {
    padding: 16,
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  genderBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  genderBtnActive: {
    borderColor: 'rgba(255,255,255,0.20)',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  genderText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.50)',
  },
  genderTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
    backgroundColor: COLORS.background,
  },
});
