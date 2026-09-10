import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../stores/authStore';
import { pickProfileImage, uploadProfileImage, updateProfile } from '../../services/userService';
import { colors, ds } from '../../design/recipes';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { SelectableCard, SelectableCardGroup } from '../../components/ui/SelectableCard';
import GradientBackground from '../../components/ui/GradientBackground';
import PageHeader from '../../components/ui/PageHeader';

export default function ProfileEditScreen() {
  const navigation = useNavigation();
  const { user, setUser, deleteAccount } = useAuthStore();

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

  const handleDeleteAccount = () => {
    Alert.alert(
      '계정 삭제',
      '계정을 삭제하면 모든 데이터(목표, 인증 기록, 팀 정보 등)가 영구적으로 삭제되며 복구할 수 없습니다.\n\n정말 삭제하시겠어요?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제하기',
          style: 'destructive',
          onPress: () => {
            Alert.alert('최종 확인', '이 작업은 되돌릴 수 없습니다. 계정을 삭제할까요?', [
              { text: '취소', style: 'cancel' },
              {
                text: '영구 삭제',
                style: 'destructive',
                onPress: async () => {
                  const success = await deleteAccount();
                  if (!success) {
                    Alert.alert('오류', '계정 삭제에 실패했습니다. 다시 시도해주세요.');
                  }
                },
              },
            ]);
          },
        },
      ],
    );
  };

  return (
    <GradientBackground curve>
      <SafeAreaView style={ds.safe} edges={['top']}>
        <ScrollView
          style={ds.scroll}
          contentContainerStyle={ds.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <PageHeader title="프로필 수정" onBack={() => navigation.goBack()} />

          <View style={styles.profileImageContainer}>
            <TouchableOpacity onPress={handlePickImage} style={styles.imageWrapper}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.profileImage} />
              ) : (
                <View style={[styles.profileImage, styles.placeholderImage]}>
                  <Ionicons name="person" size={36} color={colors.primaryLight} />
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
            <SelectableCardGroup style={styles.genderContainer}>
              <SelectableCard
                label="남성"
                active={gender === '남성'}
                onPress={() => setGender('남성')}
              />
              <SelectableCard
                label="여성"
                active={gender === '여성'}
                onPress={() => setGender('여성')}
              />
            </SelectableCardGroup>

            <Input
              label="나이"
              value={age}
              onChangeText={setAge}
              placeholder="나이를 입력하세요"
              keyboardType="number-pad"
            />
          </View>

          <TouchableOpacity
            style={styles.deleteLinkWrap}
            onPress={handleDeleteAccount}
            activeOpacity={0.6}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="탈퇴하기"
          >
            <Text style={styles.deleteLink}>탈퇴하기</Text>
          </TouchableOpacity>

          <Text style={styles.accountDeleteHint}>
            탈퇴 시 모든 데이터가 삭제되며 복구할 수 없습니다.
          </Text>
        </ScrollView>

        <View style={styles.footer}>
          <Button title="저장하기" onPress={handleSave} loading={loading} />
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
  },
  profileImageContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 28,
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
    backgroundColor: colors.chipNeutral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  /** 다른 탭과 같은 반투명 흰 카드 규격 */
  form: {
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: 20,
    gap: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: colors.textFaint,
    marginBottom: 6,
  },
  genderContainer: {
    marginBottom: 16,
  },
  /** 탈퇴도 카드가 아니라 조용한 텍스트 링크로 */
  deleteLinkWrap: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 4,
  },
  deleteLink: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
  accountDeleteHint: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 40,
  },
  footer: {
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24, // 하단 여백 추가
  },
});
