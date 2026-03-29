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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../stores/authStore';
import { useTeamStore } from '../../stores/teamStore';
import { updateTeamProfile, uploadTeamProfileImage } from '../../services/teamService';
import { COLORS } from '../../constants/defaults';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import CyberFrame from '../../components/ui/CyberFrame';
import { RootStackParamList } from '../../types/navigation';

type TeamProfileEditRouteProp = RouteProp<RootStackParamList, 'TeamProfileEdit'>;

export default function TeamProfileEditScreen() {
  const navigation = useNavigation();
  const route = useRoute<TeamProfileEditRouteProp>();
  const { teamId } = route.params;
  const { teams, fetchTeams } = useTeamStore();
  const team = teams.find((t) => t.id === teamId);

  const [name, setName] = useState(team?.name || '');
  const [imageUri, setImageUri] = useState<string | null>(team?.profile_image_url || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (team) {
      setName(team.name);
      setImageUri(team.profile_image_url || null);
    }
  }, [team]);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('알림', '갤러리 접근 권한이 필요합니다.');
      return null;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('알림', '팀 이름을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      let finalImageUrl = imageUri;

      if (imageUri && !imageUri.startsWith('http')) {
        const uploadedUrl = await uploadTeamProfileImage(teamId, imageUri);
        if (uploadedUrl) {
          finalImageUrl = uploadedUrl;
        } else {
          Alert.alert('오류', '이미지 업로드에 실패했습니다.');
          setLoading(false);
          return;
        }
      }

      const result = await updateTeamProfile(teamId, {
        name: name.trim(),
        profile_image_url: finalImageUrl,
      });

      if (result.success) {
        const user = useAuthStore.getState().user;
        if (user) await fetchTeams(user.id);
        navigation.goBack();
      } else {
        Alert.alert('실패', result.error || '팀 프로필 수정에 실패했습니다.');
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
            <Text style={styles.title}>팀 프로필 설정</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.profileImageContainer}>
            <TouchableOpacity onPress={handlePickImage} style={styles.imageWrapper}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.profileImage} />
              ) : (
                <View style={[styles.profileImage, styles.placeholderImage]}>
                  <Ionicons name="people" size={36} color={COLORS.primaryLight} />
                </View>
              )}
              <View style={styles.cameraIcon}>
                <Ionicons name="camera" size={14} color="#FFF" />
              </View>
            </TouchableOpacity>
          </View>

          <CyberFrame style={styles.formFrame} contentStyle={styles.form} glassOnly={false}>
            <Input
              label="팀 이름"
              value={name}
              onChangeText={setName}
              placeholder="팀 이름을 입력하세요"
            />
          </CyberFrame>
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
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(55, 53, 53, 0.1)',
  },
  backBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  profileImageContainer: { alignItems: 'center', paddingVertical: 24 },
  imageWrapper: { position: 'relative' },
  profileImage: { width: 100, height: 100, borderRadius: 50 },
  placeholderImage: {
    backgroundColor: 'rgba(255, 107, 61, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF6B3D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formFrame: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
  },
  form: { paddingHorizontal: 16, paddingVertical: 20 },
  footer: { 
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
});
